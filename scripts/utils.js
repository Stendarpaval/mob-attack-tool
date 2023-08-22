import { moduleName } from "./mobAttack.js";
import { getMultiattackFromActor } from "./multiattack.js";

// This is based in large part on midi-qol's callMacro method
export async function callMidiMacro(item, midiMacroData) {
	const macroName = getProperty(item, "data.flags.midi-qol.onUseMacroName");
	if (!macroName) {
		console.log(`No On Use Macro found at ${item.name}.`);
		return;
	}
	const macroData = {
		...midiMacroData,
		itemUuid: item?.uuid,
		item: item?.toObject(false),
		saves: [],
		superSavers: [],
		failedSaves: [],
		id: item.id
	}
	try {
		if (macroName.startsWith("ItemMacro")) {
			var itemMacro;
			if (macroName === "ItemMacro") {
				itemMacro = getProperty(item.flags, "itemacro.macro");
				macroData.sourceItemUuid = item?.uuid;
			} else {
				const parts = macroName.split(".");
				const itemName = parts.slice(1).join(".");
				item = macroData.actor.items.find(i => i.name === itemName && getProperty(i.flags, "itemacro.macro"))
				if (item) {
					itemMacro = getProperty(item.flags, "itemacro.macro");
					macroData.sourceItemUuid = item?.uuid;
				} else return {};
			}
			const speaker = { alias: macroData.actor.name };
			const actor = macroData.actor;
			const token = canvas.tokens.get(macroData.tokenId);
			const character = game.user.character;
			const args = [macroData];

			if (!itemMacro?.data?.command) {
				console.log(`Mob Attack Tool - Could not find item macro ${macroName}`);
				return {};
			}
			return (new Function(`"use strict";
				return (async function ({speaker, actor, token, character, item, args}={}) {
					${itemMacro.data.command}
					});`))().call(this, { speaker, actor, token, character, item, args });
		} else {
			const macroCommand = game.macros.getName(macroName);
			if (macroCommand) {
				return macroCommand.execute(macroData) || {};
			}
		}
	} catch (err) {
		ui.notifications.error(`There was an error while executing an "On Use" macro. See the console (F12) for details.`);
		console.error(err);
	}
	return {};
}

export function checkTarget() {
	let targetToken = canvas.tokens.placeables.find(t => t.isTargeted);
	if (!targetToken && game.settings.get(moduleName, "mobRules") === 0) {
		ui.notifications.warn(game.i18n.localize("MAT.targetValidACWarning"));
		return false;
	}
	return true;
}

export async function getTargetData(monsters) {
	let targetTokens = canvas.tokens.placeables.filter(t => t.isTargeted);
	for (let i = 0; i < targetTokens.length; i++) {
		if (targetTokens[i].actor === null && game.modules.get("multilevel-tokens").active) {
			let mltFlags = targetTokens[i].flags["multilevel-tokens"];
			if (targetTokens.filter(t => t.id === mltFlags.stoken).length > 0) {
				targetTokens.splice(i, 1);
				i--;
			}
		}
	}
	let weaponsOnTarget = {};
	for (let [monsterID, monsterData] of Object.entries(duplicate(monsters))) {
		Object.assign(weaponsOnTarget, monsterData.weapons);
		for (let i = 0; i < monsterData.amount - 1; i++) {
			for (let weaponID of Object.keys(monsterData.weapons)) {
				if (weaponsOnTarget[weaponID]) {
					weaponsOnTarget[weaponID + String(i)] = monsterData.weapons[weaponID];
				}
			}
		}
	}

	let weaponsOnTargetArray = [];
	for (let [weaponID, weaponData] of Object.entries(weaponsOnTarget)) {
		if (weaponData.useButtonValue !== `checked`) {
			delete weaponsOnTarget[weaponID];
		} else {
			for (let j = 0; j < weaponData.numAttack; j++) {
				let singleWeaponData = duplicate(weaponData);
				singleWeaponData.numAttack = 1;
				weaponsOnTargetArray.push(singleWeaponData);
			}
		}
	}

	let targets = [];
	let targetCount = 0;
	let arrayStart = 0;
	let targetAC = 10;
	let arrayLength = Math.floor(weaponsOnTargetArray.length / targetTokens.length);
	let armorClassMod = game.settings.get(moduleName, "savedArmorClassMod");
	if (arrayLength === 0) arrayLength = 1;
	for (let targetToken of targetTokens) {
		if (targetToken.actor === null && game.modules.get("multilevel-tokens").active) {
			let mltFlags = targetToken.flags["multilevel-tokens"];
			if (mltFlags?.sscene) {
				targetAC = game.scenes.get(mltFlags.sscene).tokens.get(mltFlags.stoken).actor.system.attributes.ac.value;
			} else {
				targetAC = canvas.tokens.get(mltFlags.stoken).actor.system.attributes.ac.value;
			}
		} else {
			targetAC = targetToken?.actor.system.attributes.ac.value;
		}
		let targetImg = targetToken?.document.texture.src ?? "icons/svg/mystery-man.svg";
		if (VideoHelper.hasVideoExtension(targetImg)) {
			targetImg = await game.video.createThumbnail(targetImg, { width: 100, height: 100 });
		}
		targets.push({
			targetId: targetToken?.id,
			targetImg: targetImg,
			targetImgName: targetToken?.name ?? "Unknown target",
			isGM: game.user.isGM,
			weapons: weaponsOnTargetArray.slice(arrayStart, arrayLength * (1 + targetCount)),
			noWeaponMsg: '',
			targetIndex: targetCount,
			targetAC: targetAC + armorClassMod,
			targetACtext: ((game.user.isGM) ? ` ${game.i18n.localize("MAT.dialogTargetArmorClassMessage")}` : ``)
		})

		let targetTotalNumAttacks = targets[targets.length - 1].weapons.length;
		let targetTotalAverageDamage = 0;
		for (let weapon of targets[targets.length - 1].weapons) {
			targetTotalAverageDamage += weapon.averageDamage;
		}
		targets[targets.length - 1]["targetTotalNumAttacks"] = targetTotalNumAttacks;
		targets[targets.length - 1]["targetTotalAverageDamage"] = targetTotalAverageDamage;

		if (targetCount === targetTokens.length - 1) {
			for (let i = 0; i < (weaponsOnTargetArray.length - arrayLength * (1 + targetCount)); i++) {
				targets[i].weapons.push(weaponsOnTargetArray[weaponsOnTargetArray.length - 1 - i]);
				targets[i].targetTotalNumAttacks += 1;
				targets[i].targetTotalAverageDamage += weaponsOnTargetArray[weaponsOnTargetArray.length - 1 - i].averageDamage;
			}
		}
		arrayStart = arrayLength * (1 + targetCount);
		targetCount++;
	}

	for (let target of targets) {
		if (target.weapons.length === 0) {
			target.noWeaponMsg = "None";
		}
	}
	return targets;
}

export async function prepareMonsters(actorList, keepCheckboxes = false, oldMonsters = {}, weapons = {}, availableAttacks = {}) {
	let monsters = {};
	for (let actor of actorList) {
		if (monsters[actor.id]) {
			if (monsters[actor.id].id === actor.id) {
				monsters[actor.id].amount += 1;
			}
		} else {
			monsters[actor.id] = { id: actor.id, amount: 1, optionVisible: false, img: actor.img, name: actor.name };
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
					actorNameImg: monsters[actor.id].name.replace(" ", "-"),
					actorName: monsters[actor.id].name,
					weapons: {}
				};
				monsters[actor.id] = { ...monsterData };
				monsters[actor.id].optionVisible = true;
				if (game.settings.get(moduleName, "showMultiattackDescription")) {
					if (actor.items.contents.filter(i => i.name.startsWith("Multiattack")).length > 0) {
						monsters[actor.id]["multiattackDesc"] = $(actor.items.filter(i => i.name.startsWith("Multiattack"))[0].system.description.value)[0].textContent;
					} else if (actor.items.contents.filter(i => i.name.startsWith("Extra Attack")).length > 0) {
						monsters[actor.id]["multiattackDesc"] = $(actor.items.filter(i => i.name.startsWith("Extra Attack"))[0].system.description.value)[0].textContent;
					}
				}
			}
		}

		let actorWeapons = {};
		let items = actor.items.contents;
		for (let item of items) {
			if (item.type == "weapon" || (item.type == "spell" && (item.system.level === 0 || item.system.preparation.mode === "atwill") && item.system.damage.parts.length > 0 && item.system.save.ability === "")) {
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
		let autoDetect = game.settings.get(moduleName, "autoDetectMultiattacks");
		for (let [weaponID, weaponData] of Object.entries(actorWeapons)) {
			if (autoDetect === 2) {
				[numAttacksTotal, preChecked] = getMultiattackFromActor(weaponData.name, weaponData.actor, weapons, options);
				if (preChecked) numCheckedWeapons++;
			}
			let damageData = getDamageFormulaAndType(weaponData, false);
			damageData = (typeof damageData[0][0] === "undefined") ? "0" : damageData[0][0];
			maxDamage = new Roll(damageData).alter(((numAttacksTotal > 1) ? numAttacksTotal : 1), 0, { multiplyNumeric: true });
			maxDamage = maxDamage.evaluate({ maximize: true, async: true });
			maxDamage = maxDamage.total;
			damageData = getDamageFormulaAndType(weaponData, false);
			averageDamageRoll = new Roll(damageData[0].join(" + "));
			let averageDamageValue = 0;
			for (let dTerm of averageDamageRoll.terms.filter(t => t.number > 0 && t.faces > 0)) {
				averageDamageValue += ((dTerm.faces + 1) / 2) * dTerm.number;
			}
			for (let nTerm of averageDamageRoll.terms.filter(t => t.number > 0 && !t.faces)) {
				averageDamageValue += nTerm.number;
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
			let checkVersatile = weaponData.system.damage.versatile != "";
			for (let j = 0; j < 1 + ((checkVersatile) ? 1 : 0); j++) {
				let isVersatile = (j < 1) ? false : weaponData.system.damage.versatile != "";
				let damageData = getDamageFormulaAndType(weaponData, isVersatile);
				let weaponDamageText = ``;
				for (let i = 0; i < damageData[0].length; i++) {
					((i > 0) ? weaponDamageText += `<br>${damageData[0][i]} ${damageData[1][i].capitalize()}` : weaponDamageText += `${damageData[0][i]} ${damageData[1][i].capitalize()}`);
				}
				numAttacksTotal = 1, preChecked = false;
				autoDetect = game.settings.get(moduleName, "autoDetectMultiattacks");
				if (autoDetect > 0) [numAttacksTotal, preChecked] = getMultiattackFromActor(weaponData.name, weaponData.actor, weapons, options);
				if (autoDetect === 1 || isVersatile) preChecked = false;
				let weaponRangeText = ``;
				if (weaponData.system.range.long > 0) {
					weaponRangeText = `${weaponData.system.range.value}/${weaponData.system.range.long} ${weaponData.system.range.units}.`;
				} else if (weaponData.system.range.value > 0) {
					weaponRangeText = `${weaponData.system.range.value} ${weaponData.system.range.units}.`;
				} else if (weaponData.system.range.units === "touch") {
					weaponRangeText = "Touch";
				} else if (weaponData.system.range.units === "self") {
					weaponRangeText = "Self";
				} else {
					weaponRangeText = '-';
				}

				let labelData = {
					numAttacksName: `numAttacks${(weaponData.id + ((isVersatile) ? ` (${game.i18n.localize("Versatile")})` : ``)).replace(" ", "-")}`,
					numAttack: numAttacksTotal,
					weaponActorName: weaponData.actor.name,
					weaponId: weaponData.id,
					weaponImg: weaponData.img,
					weaponNameImg: weaponData.name.replace(" ", "-"),
					weaponName: `${weaponData.name}${((isVersatile) ? ` (${game.i18n.localize("Versatile")})` : ``)}`,
					weaponAttackBonus: getAttackBonus(weaponData),
					weaponRange: weaponRangeText,
					weaponDamageText: weaponDamageText,
					useButtonName: `use${(weaponData.id + ((isVersatile) ? ` (${game.i18n.localize("Versatile")})` : ``)).replace(" ", "-")}`,
					useButtonValue: (keepCheckboxes) ? oldMonsters[actor.id]["weapons"][weaponID].useButtonValue : (preChecked) ? `checked` : ``,
					averageDamage: averageDamage[weaponID]
				};
				if (j === 0) {
					monsters[actor.id]["weapons"][weaponID] = { ...labelData };
				} else if (j === 1) {
					monsters[actor.id]["weapons"][weaponID + ` (${game.i18n.localize("Versatile")})`] = { ...labelData };
				}
			}
		}
	}
	return [monsters, weapons, availableAttacks];
}

export async function prepareMobAttack(html, selectedTokenIds, weapons, availableAttacks, targets, targetAC, numSelected, monsters) {
	let mobList = game.settings.get(moduleName, "hiddenMobList");
	if (game.settings.get("mob-attack-tool", "hiddenChangedMob")) {
		let mobName = game.settings.get(moduleName, 'hiddenMobName');
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
		isVersatile = weaponData.system.damage.versatile != "";
		weaponID += ((isVersatile) ? ` (${game.i18n.localize("Versatile")})` : ``);

		if (html.find(`input[name="use` + weaponData.id.replace(" ", "-") + `"]`)[0].checked) {
			attacks[weaponData.id] = [];
			for (let target of targets) {
				if (target.weapons.filter(w => w.weaponId === weaponData.id).length > 0) {
					attacks[weaponData.id].push({ targetId: target.targetId, targetNumAttacks: target.weapons.filter(w => w.weaponId === weaponData.id).length });
				}
			}
			if (targets.length === 0) {
				numAttacksMultiplier = parseInt(html.find(`input[name="numAttacks${weaponData.id.replace(" ", "-")}"]`)[0].value);
				if (Number.isNaN(numAttacksMultiplier)) {
					numAttacksMultiplier = 0;
				}
				attacks[weaponData.id].push({ targetId: null, targetNumAttacks: availableAttacks[weaponData.id] * numAttacksMultiplier });
			}
			weaponLocators.push({ "actorID": weaponData.actor.id, "weaponName": weaponData.name, "weaponID": weaponData.id });
		}
		if (html.find(`input[name="use` + weaponID.replace(" ", "-") + `"]`)[0].checked) {
			attacks[weaponID] = [];
			for (let target of targets) {
				if (target.weapons.filter(w => w.weaponId === weaponData.id).length > 0) {
					attacks[weaponID].push({ targetId: target.targetId, targetNumAttacks: target.weapons.filter(w => w.weaponId === weaponData.id).length });
				}
			}
			if (targets.length === 0) {
				numAttacksMultiplier = parseInt(html.find(`input[name="numAttacks${weaponID.replace(" ", "-")}"]`)[0].value);
				if (Number.isNaN(numAttacksMultiplier)) {
					numAttacksMultiplier = 0;
				}
				attacks[weaponID].push({ targetId: null, targetNumAttacks: availableAttacks[weaponData.id] * numAttacksMultiplier });
			}
			weaponLocators.push({ "actorID": weaponData.actor.id, "weaponName": weaponData.name, "weaponID": weaponID });
		}
	}
	let withAdvantage = false;
	let withDisadvantage = false;
	let rollTypeValue = 0;
	let rollTypeMessage = ``;
	if (game.settings.get(moduleName, "askRollType")) {
		let rtValue = Math.floor(game.settings.get(moduleName, "rollTypeValue"));
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

	// Bundle data together
	let mobAttackData = {
		targets,
		targetAC,
		numSelected,
		selectedTokenIds,
		weapons,
		attacks,
		withAdvantage,
		withDisadvantage,
		rollTypeValue,
		rollTypeMessage,
		monsters,
		weaponLocators
	};

	return mobAttackData;
}

export async function loadMob(event, selectedMob) {
	let dialogId = game.settings.get(moduleName, "currentDialogId");
	let mobDialog = game.mobAttackTool.dialogs.get(dialogId);

	let mobList = game.settings.get(moduleName, "hiddenMobList");

	await game.settings.set(moduleName, "hiddenChangedMob", true);
	await game.settings.set(moduleName, 'hiddenMobName', selectedMob);

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
	await game.settings.set(moduleName, "hiddenMobList", mobList);
	Hooks.call("mobUpdate", { mobList, mobName: selectedMob, type: "load" });
	if (game.combat) await game.combat.update();

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

		const mobList = game.settings.get("mob-attack-tool", "hiddenMobList");
		const combatants = game.combat.turns;
		let mobCreatures = {};
		let otherCreatures = [];
		for (let combatant of combatants) {
			let savedMob;
			for (let mobName of Object.keys(mobList)) {
				if (mobList[mobName].selectedTokenIds.includes(combatant.tokenId)) {
					savedMob = mobList[mobName];
					break;
				}
			}
			if (savedMob) {
				if (Object.keys(mobList).includes(savedMob.mobName)) {
					if (!mobCreatures[savedMob.mobName]?.length) {
						mobCreatures[savedMob.mobName] = [combatant._id];
					} else {
						mobCreatures[savedMob.mobName].push(combatant._id);
					}
				}
			} else {
				otherCreatures.push(combatant);
			}
		}

		let skipComplete = false;
		for (let mobName of Object.keys(mobList)) {
			if (mobCreatures[mobName]?.includes(game.combat.combatant._id) && canvas.tokens.controlled.filter(t => t.id)?.includes(game.combat.combatant._id)) {
				let turnIndex = game.combat.turns.indexOf(game.combat.combatant);
				let lastMobTurn = turnIndex;
				let currentRound = game.combat.round;
				for (let i = turnIndex + 1; i < game.combat.turns.length; i++) {
					if (mobCreatures[mobName].includes(game.combat.turns[i]._id)) {
						lastMobTurn++;
					} else {
						break;
					}
				}
				if (lastMobTurn === game.combat.turns.length - 1) {
					await game.combat.nextRound();
					skipComplete = true;
				} else if (Object.keys(mobList).length > 0) {
					await game.combat.update({ round: currentRound, turn: lastMobTurn + 1 });
					skipComplete = true;
				}
				break;
			}
		}
		if (!skipComplete) {
			// skip turn of selected tokens (not a saved mob per se),
			// but only if they include the current combatant.
			if (canvas.tokens.controlled.filter(t => t.id === game.combat.combatant.tokenId).length > 0) {
				let turnIndex = game.combat.turns.indexOf(game.combat.combatant);
				let lastMobTurn = turnIndex;
				let currentRound = game.combat.round;
				for (let i = turnIndex + 1; i < game.combat.turns.length; i++) {
					if (data.selectedTokenIds.filter(t => t.tokenId === game.combat.turns[i].tokenId).length > 0) {
						lastMobTurn++;
					} else {
						break;
					}
				}
				if (lastMobTurn === game.combat.turns.length - 1) {
					await game.combat.nextRound();
				} else {
					await game.combat.update({ round: currentRound, turn: lastMobTurn + 1 });
				}
			}
		}
	}
}

export function getDamageFormulaAndType(weaponData, versatile) {
	let cantripScalingFactor = getScalingFactor(weaponData);
	let diceFormulas = [];
	let damageTypes = [];
	let damageTypeLabels = []
	let lengthIndex = 0;
	for (let diceFormulaParts of weaponData.system.damage.parts) {
		damageTypeLabels.push(diceFormulaParts[1]);
		damageTypes.push(diceFormulaParts[1].capitalize());
		if (weaponData.type == "spell") {
			if (weaponData.system.scaling.mode == "cantrip") {
				let rollFormula = new Roll(((versatile && lengthIndex === 0) ? weaponData.system.damage.versatile : diceFormulaParts[0]), { mod: weaponData.actor.system.abilities[weaponData.abilityMod].mod });
				rollFormula.alter(0, cantripScalingFactor, { multiplyNumeric: false })
				diceFormulas.push(rollFormula.formula);
			} else {
				diceFormulas.push(((versatile && lengthIndex === 0) ? weaponData.system.damage.versatile : diceFormulaParts[0]).replace("@mod", weaponData.actor.system.abilities[weaponData.abilityMod].mod));
			}
		} else {
			diceFormulas.push(((versatile && lengthIndex === 0) ? weaponData.system.damage.versatile : diceFormulaParts[0]).replace("@mod", weaponData.actor.system.abilities[weaponData.abilityMod].mod));
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
	if (game.settings.get(moduleName, "hiddenTableCheckBox")) {
		let customTable = game.settings.get(moduleName, "tempSetting");
		let tableArray = {};
		for (let i = 0; i < Math.floor(customTable.length / 3); i++) {
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
	}
}

export async function sendChatMessage(text) {
	let whisperIDs = game.users.contents.filter(u => u.isGM).map(u => u.id);

	let chatData = {
		user: game.user.id,
		speaker: { alias: game.i18n.localize("MAT.mobAttackResults") },
		content: text,
		whisper: (game.settings.get(moduleName, "showMobAttackResultsToPlayers")) ? [] : whisperIDs,
	};
	if (game.settings.get(moduleName, "showMobAttackResultsToPlayers")) chatData = ChatMessage.applyRollMode(chatData, game.settings.get("core", "rollMode"));
	await ChatMessage.create(chatData, {});
}

export function getAttackBonus(weaponData) {
	let weaponAbility = weaponData.abilityMod;
	if (weaponAbility === "" || typeof weaponAbility === "undefined" || weaponAbility == null) {
		if (!weaponData.type === "spell") {
			weaponAbility = "str";
		} else {
			weaponAbility = weaponData.actor.system.attributes.spellcasting;
		}
	}
	const actorAbilityMod = parseInt(weaponData.actor.system.abilities[weaponAbility].mod);
	const attackBonus = parseInt(weaponData.system.attackBonus) || 0;
	let profBonus;
	if (weaponData.type != "spell") {
		profBonus = parseInt(((weaponData.system.proficient) ? weaponData.actor.system.attributes.prof : 0));
	} else {
		profBonus = parseInt(weaponData.actor.system.attributes.prof);
	}
	let finalAttackBonus = actorAbilityMod + attackBonus + profBonus;

	return finalAttackBonus;
}

export function getScalingFactor(weaponData) {
	let cantripScalingFactor = 1;
	if (weaponData.type == "spell") {
		let casterLevel = weaponData.actor.system.details.level || weaponData.actor.system.details.spellLevel;
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
