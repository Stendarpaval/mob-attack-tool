import { moduleName, coreVersion08x } from "./mobAttack.js";
import { getMultiattackFromActor } from "./multiattack.js";


String.prototype.capitalize = function() {
    return this.charAt(0).toUpperCase() + this.slice(1);
}


export function checkSelectedTokens() {
	let mobList = game.settings.get(moduleName,"hiddenMobList");
	if (canvas.tokens.controlled.length === 0 && Object.keys(mobList).length === 0) {
		ui.notifications.warn(game.i18n.localize("MAT.selectTokenWarning"));
		return false;
	}
	return true;
}


export function checkTarget() {
	if (canvas.tokens.objects.children.filter(isTargeted).length > 1) {
		ui.notifications.warn(game.i18n.localize("MAT.singleTargetWarning"));
		return false;
	}

	let targetToken = canvas.tokens.objects.children.filter(isTargeted)[0];
	if (!targetToken && game.settings.get(moduleName, "mobRules") === 0) {
		ui.notifications.warn(game.i18n.localize("MAT.targetValidACWarning"));
		return false;
	}
	return true;
}


export async function prepareMonsters(actorList, keepCheckboxes=false, oldMonsters={}, weapons={}, availableAttacks={}) {
	let monsters = {};
	for (let actor of actorList) {
		if (monsters[actor.id]) {
			if (monsters[actor.id].id === actor.id) {
				monsters[actor.id].amount += 1;
			}
		} else {
			monsters[actor.id] = {id: actor.id, amount: 1, optionVisible: false, img: actor.img, name: actor.name};
		}
	}

	for (let actor of actorList) {
		if (monsters[actor.id]) {
			if (!monsters[actor.id].optionVisible) {
				let monsterData = {
					id: monsters[actor.id].id,
					amount: monsters[actor.id].amount,
					actorId: monsters[actor.id].id,
					actorAmount: `${monsters[actor.id].amount}x`,
					actorImg: monsters[actor.id].img,
					actorNameImg: monsters[actor.id].name.replace(" ","-"),
					actorName: monsters[actor.id].name,
					weapons: {}
				};
				monsters[actor.id] = {...monsterData};
				monsters[actor.id].optionVisible = true;
				if (game.settings.get(moduleName, "showMultiattackDescription")) {
					if (actor.items[(coreVersion08x()) ? "contents" : "entries"].filter(i => i.name.startsWith("Multiattack")).length > 0) {
						monsters[actor.id]["multiattackDesc"] = $(actor.items.filter(i => i.name.startsWith("Multiattack"))[0].data.data.description.value)[0].textContent;
					} else if (actor.items[(coreVersion08x()) ? "contents" : "entries"].filter(i => i.name.startsWith("Extra Attack")).length > 0) {
						monsters[actor.id]["multiattackDesc"] = $(actor.items.filter(i => i.name.startsWith("Extra Attack"))[0].data.data.description.value)[0].textContent;
					}
				}
			}
		}

		let actorWeapons = {};
		let items = (coreVersion08x()) ? actor.items.contents : actor.items.entries;
		for (let item of items) {
			if (item.data.type == "weapon" || (item.data.type == "spell" && (item.data.data.level === 0 || item.data.data.preparation.mode === "atwill") && item.data.data.damage.parts.length > 0 && item.data.data.save.ability === "")) {
				if (weapons[item.id]?.id === item.id) {
					availableAttacks[item.id] += 1;
				} else {
					weapons[item.id] = item;
					availableAttacks[item.id] = 1;
					actorWeapons[item.id] = item;
				}
			}
		}
		let numAttacksTotal, preChecked;
		let numCheckedWeapons = 0;
		let highestDamageFormula = 0, maxDamage, maxDamageWeapon;
		let averageDamageRoll;
		let averageDamage = {};
		let options = {};
		let autoDetect = game.settings.get(moduleName,"autoDetectMultiattacks");
		for (let [weaponID, weaponData] of Object.entries(actorWeapons)) {
			if (autoDetect === 2) {
				[numAttacksTotal, preChecked] = getMultiattackFromActor(weaponData.name, weaponData.actor, weapons, options);
				if (preChecked) numCheckedWeapons++;
			}
			let damageData = getDamageFormulaAndType(weaponData, false);
			damageData = (typeof damageData[0][0] === "undefined") ? "0" : damageData[0][0];
			maxDamage = new Roll(damageData).alter(((numAttacksTotal > 1) ? numAttacksTotal : 1),0,{multiplyNumeric: true});
			maxDamage = maxDamage.evaluate({maximize: true, async: true});
			maxDamage = maxDamage.total;
			damageData = getDamageFormulaAndType(weaponData, false);
			averageDamageRoll = new Roll(damageData[0].join(" + "));
			let averageDamageValue = 0;
			for (let dTerm of averageDamageRoll.terms.filter(t => t.number > 0 && t.faces > 0)) {
				averageDamageValue += ((dTerm.faces + 1) / 2) * dTerm.number;
			}
			if (coreVersion08x()) {
				for (let nTerm of averageDamageRoll.terms.filter(t => t.number > 0 && !t.faces)) {
					averageDamageValue += nTerm.number;
				}
			} else {
				for (let nTerm of averageDamageRoll.terms.filter(t => !t.formula && parseInt(t))) {
					averageDamageValue += nTerm;
				}
			}
			averageDamage[weaponID] = Math.ceil(averageDamageValue);
			if (highestDamageFormula < maxDamage) {
				highestDamageFormula = maxDamage;
				maxDamageWeapon = weaponData;
			}
		}
		
		if (numCheckedWeapons === 0) {
			options["checkMaxDamageWeapon"] = true;
			options["maxDamageWeapon"] = maxDamageWeapon;
		}
		
		for (let [weaponID, weaponData] of Object.entries(actorWeapons)) {
			let checkVersatile = weaponData.data.data.damage.versatile != "";
			for (let j = 0; j < 1 + ((checkVersatile) ? 1 : 0); j++) {
				let isVersatile = (j < 1) ? false : weaponData.data.data.damage.versatile != "";
				let damageData = getDamageFormulaAndType(weaponData, isVersatile);
				let weaponDamageText = ``;
				for (let i = 0; i < damageData[0].length; i++) {
					((i > 0) ? weaponDamageText += `<br>${damageData[0][i]} ${damageData[1][i].capitalize()}` : weaponDamageText += `${damageData[0][i]} ${damageData[1][i].capitalize()}`);
				}
				let numAttacksTotal = 1, preChecked = false;
				let autoDetect = game.settings.get(moduleName,"autoDetectMultiattacks");
				if (autoDetect > 0) [numAttacksTotal, preChecked] = getMultiattackFromActor(weaponData.name, weaponData.actor, weapons, options);
				if (autoDetect === 1 || isVersatile) preChecked = false;
				let weaponRangeText = ``;
				if (weaponData.data.data.range.long > 0) {
					weaponRangeText = `${weaponData.data.data.range.value}/${weaponData.data.data.range.long} ${weaponData.data.data.range.units}.`;
				} else if (weaponData.data.data.range.value > 0) {
					weaponRangeText = `${weaponData.data.data.range.value} ${weaponData.data.data.range.units}.`;
				} else if (weaponData.data.data.range.units === "touch") {
					weaponRangeText = "Touch";
				} else if (weaponData.data.data.range.units === "self") {
					weaponRangeText = "Self";
				} else {
					weaponRangeText = '-';
				}
				
				let labelData = {
					numAttacksName: `numAttacks${(weaponData.id + ((isVersatile) ? ` (${game.i18n.localize("Versatile")})` : ``)).replace(" ","-")}`,
					numAttack: numAttacksTotal,
					weaponId: weaponData.id,
					weaponImg: weaponData.img,
					weaponNameImg: weaponData.name.replace(" ","-"),
					weaponName: `${weaponData.name}${((isVersatile) ? ` (${game.i18n.localize("Versatile")})` : ``)}`,
					weaponAttackBonus: getAttackBonus(weaponData),
					weaponRange: weaponRangeText,
					weaponDamageText: weaponDamageText,
					useButtonName: `use${(weaponData.id + ((isVersatile) ? ` (${game.i18n.localize("Versatile")})` : ``)).replace(" ","-")}`,
					useButtonValue: (keepCheckboxes) ? oldMonsters[actor.id]["weapons"][weaponID].useButtonValue : (preChecked) ? `checked` : ``,
					averageDamage: averageDamage[weaponID]
				};
				if (j === 0) {
					monsters[actor.id]["weapons"][weaponID] = {...labelData};
				} else if (j === 1) {
					monsters[actor.id]["weapons"][weaponID + ` (${game.i18n.localize("Versatile")})`] = {...labelData};
				}
			}
		}
	}
	return [monsters, weapons, availableAttacks];
}


export async function prepareMobAttack(html, weapons, availableAttacks, targetToken, targetAC, numSelected, monsters) {
	let mobList = game.settings.get(moduleName,"hiddenMobList");
	if (game.settings.get("mob-attack-tool", "hiddenChangedMob")) {
		let mobName = game.settings.get(moduleName,'hiddenMobName');
		let mobData = mobList[mobName];

		let dialogId = game.settings.get(moduleName, "currentDialogId");
		let mobDialog = game.mobAttackTool.dialogs.get(dialogId);
		let actorList = mobDialog.actorList;

		monsters = {}; 
		weapons = {};
		availableAttacks = {};
		numSelected = mobData.numSelected;
		[monsters, weapons, availableAttacks] = await prepareMonsters(actorList);
	}

	let attacks = {};
	let weaponLocators = [];
	let numAttacksMultiplier = 1;
	let isVersatile = false;
	for (let [weaponID, weaponData] of Object.entries(weapons)) {
		isVersatile = weaponData.data.data.damage.versatile != "";
		weaponID += ((isVersatile) ?  ` (${game.i18n.localize("Versatile")})` : ``);

		if (html.find(`input[name="use` + weaponData.id.replace(" ","-") + `"]`)[0].checked) {
			numAttacksMultiplier = parseInt(html.find(`input[name="numAttacks${weaponData.id.replace(" ","-")}"]`)[0].value);
			if (numAttacksMultiplier === NaN) {
				numAttacksMultiplier = 0;
			}
			attacks[weaponData.id] = availableAttacks[weaponData.id] * numAttacksMultiplier;
			weaponLocators.push({"actorID": weaponData.actor.id, "weaponName": weaponData.name, "weaponID": weaponData.id});
		}
		if (html.find(`input[name="use` + weaponID.replace(" ","-") + `"]`)[0].checked) {
			numAttacksMultiplier = parseInt(html.find(`input[name="numAttacks${weaponID.replace(" ","-")}"]`)[0].value);
			if (numAttacksMultiplier === NaN) {
				numAttacksMultiplier = 0;
			}
			attacks[weaponID] = availableAttacks[weaponData.id] * numAttacksMultiplier;
			weaponLocators.push({"actorID": weaponData.actor.id, "weaponName": weaponData.name, "weaponID": weaponID});
		}
	}
	let withAdvantage = false;
	let withDisadvantage = false;
	let rollTypeValue = 0;
	let rollTypeMessage = ``;
	if (game.settings.get(moduleName,"askRollType")) {
		let rtValue = Math.floor(game.settings.get(moduleName,"rollTypeValue"));
		if (html.find("[name=rollType]")[0].value === "advantage") {
			rollTypeValue = rtValue;
			withAdvantage = true;
			rollTypeMessage = ` + ${rtValue} [adv]`; 
		} else if (html.find("[name=rollType]")[0].value === "disadvantage") {
			rollTypeValue = -1 * rtValue;
			withDisadvantage = true;
			rollTypeMessage = ` - ${rtValue} [disadv]`;
		}
	}

	// End the turn of mob attackers grouped together in initiative
	let endMobTurn = html.find(`input[name="endMobTurn"]`)[0].checked;

	// Remember what user chose last time
	await game.user.setFlag(moduleName,"endMobTurnValue",endMobTurn);


	// Bundle data together
	let mobAttackData = {
		"targetToken": targetToken,
		"targetAC": targetAC,
		"numSelected": numSelected,
		"weapons": weapons,
		"attacks": attacks,
		"withAdvantage": withAdvantage,
		"withDisadvantage": withDisadvantage,
		"rollTypeValue": rollTypeValue,
		"rollTypeMessage": rollTypeMessage,
		"endMobTurn": endMobTurn,
		"monsters": monsters,
		"weaponLocators": weaponLocators
	};

	return mobAttackData;
}


export async function loadMob(event, selectedMob) {
	let dialogId = game.settings.get(moduleName, "currentDialogId");
	let mobDialog = game.mobAttackTool.dialogs.get(dialogId);

	let mobList = game.settings.get(moduleName,"hiddenMobList");
	
	await game.settings.set(moduleName, "hiddenChangedMob", true);
	await game.settings.set(moduleName,'hiddenMobName',selectedMob);
	
	let mobData = mobList[selectedMob];
	if (mobData === undefined || mobData === null) return;
	let weapons = {}, monsters = {}, availableAttacks = {};
	let actorList = [];
	for (let monster of mobData.monsters) {
		for (let i = 0; i < monster.amount; i++) {
			actorList.push(game.actors.get(monster.id));	
		}
	}
	[monsters, weapons, availableAttacks] = await prepareMonsters(actorList);
	
	mobList[selectedMob]["weapons"] = weapons;
	mobDialog.actorList = actorList;
	await game.settings.set(moduleName,"hiddenMobList",mobList);

	let mobIndex = mobDialog.mobListIndex;
	for (let i = 0; i < Object.keys(mobList).length; i++) {
		if (Object.keys(mobList)[i] === selectedMob) {
			mobDialog.mobListIndex = i;
			break;
		}
	}
	mobDialog.render(true);
}


export async function endGroupedMobTurn(data) {
	if (game.combat != null) {
		let mobActors = [];

		for (let [key, value] of Object.entries(data.attacks)) {
			mobActors.push(data.weapons[key].actor);
		}

		if (mobActors.filter(m => m.id === game.combat.combatant.actor.id).length > 0) {
			let turnIndex = game.combat.turns.indexOf(game.combat.combatant);
			let lastMobTurn = turnIndex;
			let currentRound = game.combat.round;
			for (let i = turnIndex + 1; i < game.combat.turns.length; i++) {
				if (mobActors.filter(m => m.id === game.combat.turns[i].actor.id).length > 0) {
					lastMobTurn++;
				} else {
					break;
				}
			}
			if (lastMobTurn === game.combat.turns.length - 1) {
				await game.combat.nextRound();
			} else {
				await game.combat.update({round: currentRound, turn: lastMobTurn + 1});
			}
		} else {
			console.log("Mob Attack Tool | Mob turn could not be ended because the mob attack was used during another combatant's turn.");
		}
	}
}


export function getDamageFormulaAndType(weaponData, versatile) {
	let cantripScalingFactor = getScalingFactor(weaponData);
	let diceFormulas = [];
	let damageTypes = [];
	let damageTypeLabels = []
	let partsLength = weaponData.data.data.damage.parts.length;
	let lengthIndex = 0;
	for (let diceFormulaParts of weaponData.data.data.damage.parts) {
		damageTypeLabels.push(diceFormulaParts[1]);
		damageTypes.push(diceFormulaParts[1].capitalize());
		if (weaponData.type == "spell") {
			if (weaponData.data.data.scaling.mode == "cantrip") {
				let rollFormula = new Roll(((versatile && lengthIndex === 0) ? weaponData.data.data.damage.versatile : diceFormulaParts[0]),{mod: weaponData.actor.data.data.abilities[weaponData.abilityMod].mod});
				rollFormula.alter(0,cantripScalingFactor,{multiplyNumeric: false})
				diceFormulas.push(rollFormula.formula);
			} else {
				diceFormulas.push(((versatile && lengthIndex === 0) ? weaponData.data.data.damage.versatile : diceFormulaParts[0]).replace("@mod",weaponData.actor.data.data.abilities[weaponData.abilityMod].mod));
			}
		} else {
			diceFormulas.push(((versatile && lengthIndex === 0) ? weaponData.data.data.damage.versatile : diceFormulaParts[0]).replace("@mod",weaponData.actor.data.data.abilities[weaponData.abilityMod].mod));
		}
		lengthIndex++;
	}
	return [diceFormulas, damageTypes, damageTypeLabels];
}


export function calcD20Needed(attackBonus, targetAC, rollTypeValue) {
	let d20Needed = targetAC - (attackBonus + rollTypeValue);
	if (d20Needed < 1) {
		return 1;
	} else if (d20Needed > 20) {
		return 20;
	} else {
		return d20Needed;
	}
}


export function calcAttackersNeeded(d20Needed) {
	let attackersNeeded = 0;
	if (game.settings.get(moduleName,"hiddenTableCheckBox")) {
		let customTable = coreVersion08x() ? game.settings.get(moduleName,"tempSetting") : game.settings.get(moduleName,"tempSetting")[0];
		let tableArray = {};
		for (let i = 0; i < Math.floor(customTable.length/3); i++) {
			tableArray[i] = customTable.slice(3 * i, 3 * i + 3);
			if (parseInt(tableArray[i][0]) <= d20Needed && d20Needed <= parseInt(tableArray[i][1])) {
				attackersNeeded = Math.abs(parseInt(tableArray[i][2]));
			}
		}
	} else {
		if (1 <= d20Needed && d20Needed <= 5) {
			attackersNeeded = 1;
		} else if (6 <= d20Needed && d20Needed <= 12) {
			attackersNeeded = 2;
		} else if (13 <= d20Needed && d20Needed <= 14) {
			attackersNeeded = 3;
		} else if (15 <= d20Needed && d20Needed <= 16) {
			attackersNeeded = 4;
		} else if (17 <= d20Needed && d20Needed <= 18) {
			attackersNeeded = 5;
		} else if (d20Needed == 19) {
			attackersNeeded = 10;
		} else if (d20Needed >= 20) {
			attackersNeeded = 20;
		}
	}
	return attackersNeeded;
}


export function isTargeted(token) {
	if (token.isTargeted) {
		let targetUsers = token.targeted.entries().next().value;
		for (let i = 0; i < targetUsers.length; i++) {
			if (targetUsers[i].id === game.user.id) {
				return true;
			}
		}
	};
}


export async function sendChatMessage(text) {
	let whisperIDs = (coreVersion08x()) ? game.users.contents.filter(u => u.isGM).map(u => u.id) : game.users.entities.filter(u => u.isGM).map(u => u.id);

	let chatData = {
		user: game.user.id,
		speaker: {alias: game.i18n.localize("MAT.mobAttackResults")},
		content: text,
		whisper: (game.settings.get(moduleName,"showMobAttackResultsToPlayers")) ? [] : whisperIDs,
	};
	if(game.settings.get(moduleName,"showMobAttackResultsToPlayers")) chatData = ChatMessage.applyRollMode(chatData, game.settings.get("core", "rollMode"));
	await ChatMessage.create(chatData,{}); 
}


export function getAttackBonus(weaponData) {
	const actorName = weaponData.actor.name;
	let weaponAbility = weaponData.abilityMod;
	if (weaponAbility === "" || typeof weaponAbility === "undefined" || weaponAbility == null) {
		if (!weaponData.type === "spell") {
			weaponAbility =  "str";
		} else {
			weaponAbility = weaponData.actor.data.data.attributes.spellcasting;
		}
	}
	const actorAbilityMod = parseInt(weaponData.actor.data.data.abilities[weaponAbility].mod);
	const attackBonus = parseInt(weaponData.data.data.attackBonus) || 0;
	let profBonus;
	if (weaponData.type != "spell") {
		profBonus = parseInt(((weaponData.data.data.proficient) ? weaponData.actor.data.data.attributes.prof : 0));
	} else {
		profBonus = parseInt(weaponData.actor.data.data.attributes.prof);
	}
	let finalAttackBonus = actorAbilityMod + attackBonus + profBonus;

	return finalAttackBonus;
}


export function getScalingFactor(weaponData) {
	let cantripScalingFactor = 1;
	if (weaponData.type == "spell") {
		let casterLevel = weaponData.actor.data.data.details.level || weaponData.actor.data.data.details.spellLevel;
		if (5 <= casterLevel && casterLevel <= 10) {
			cantripScalingFactor = 2;
		} else if (11 <= casterLevel && casterLevel <= 16) {
			cantripScalingFactor = 3;
		} else if (17 <= casterLevel) {
			cantripScalingFactor = 4;
		}
	}
	return cantripScalingFactor;
}