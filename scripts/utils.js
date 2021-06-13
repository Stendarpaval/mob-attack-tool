import { moduleName, coreVersion08x } from "./mobAttack.js";
import { getMultiattackFromActor } from "./multiattack.js";


String.prototype.capitalize = function() {
    return this.charAt(0).toUpperCase() + this.slice(1);
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


export async function formatMonsterLabel(monsterData) {
	let labelData = {
		actorId: monsterData.id,
		actorAmount: `${monsterData.amount}x`,
		actorImg: monsterData.img,
		actorNameImg: monsterData.name.replace(" ","-"),
		actorName: monsterData.name
	};
	let monsterLabel = await renderTemplate('modules/mob-attack-tool/templates/mat-format-monster-label.html',labelData);
	return monsterLabel;
}


export async function formatWeaponLabel(itemData, weapons, options) {
	let weaponLabel = ``;
	let checkVersatile = itemData.data.data.damage.versatile != "";
	for (let j = 0; j < 1 + ((checkVersatile) ? 1 : 0); j++) {
		let isVersatile = (j < 1) ? false : itemData.data.data.damage.versatile != "";
		let damageData = getDamageFormulaAndType(itemData, isVersatile);
		let weaponDamageText = ``;
		for (let i = 0; i < damageData[0].length; i++) {
			((i > 0) ? weaponDamageText += `<br>${damageData[0][i]} ${damageData[1][i].capitalize()}` : weaponDamageText += `${damageData[0][i]} ${damageData[1][i].capitalize()}`);
		}
		let numAttacksTotal = 1, preChecked = false;
		let autoDetect = game.settings.get(moduleName,"autoDetectMultiattacks");
		if (autoDetect > 0) [numAttacksTotal, preChecked] = getMultiattackFromActor(itemData.name, itemData.actor, weapons, options);
		if (autoDetect === 1 || isVersatile) preChecked = false;
		
		let labelData = {
			numAttacksName: `numAttacks${(itemData.id + ((isVersatile) ? ` (${game.i18n.localize("Versatile")})` : ``)).replace(" ","-")}`,
			numAttack: numAttacksTotal,
			weaponId: itemData.id,
			weaponImg: itemData.img,
			weaponNameImg: itemData.name.replace(" ","-"),
			weaponName: `${itemData.name}${((isVersatile) ? ` (${game.i18n.localize("Versatile")})` : ``)}`,
			weaponAttackBonus: getAttackBonus(itemData),
			weaponDamageText: weaponDamageText,
			useButtonName: `use${(itemData.id + ((isVersatile) ? ` (${game.i18n.localize("Versatile")})` : ``)).replace(" ","-")}`,
			useButtonValue: (preChecked) ? `checked` : ``
		};
		weaponLabel += await renderTemplate('modules/mob-attack-tool/templates/mat-format-weapon-label.html', labelData);
	}
	return weaponLabel;
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