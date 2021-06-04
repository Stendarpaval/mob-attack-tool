import { moduleName, coreVersion08x } from "./mobAttack.js";
import { checkTarget, endGroupedMobTurn, formatMonsterLabel, formatWeaponLabel, getDamageFormulaAndType, calcD20Needed, calcAttackersNeeded, isTargeted, sendChatMessage, getAttackBonus, getScalingFactor } from "./utils.js";
import { getMultiattackFromActor } from "./multiattack.js";


export async function rollMobAttackIndividually(data) {

	// Cycle through selected weapons
	let attackData = [];
	let messageData = {messages: {}};
	let isVersatile;
	for ( let [key, value] of Object.entries(data.attacks) ) {
		isVersatile = false;
		if (key.endsWith(`(${game.i18n.localize("Versatile")})`.replace(" ", "-"))) {
			isVersatile = true;
			key = key.slice(0,key.indexOf(` (${game.i18n.localize("Versatile")})`));
		}
		const weaponData = data.weapons[key];
		const actorName = weaponData.actor.name;
		const finalAttackBonus = getAttackBonus(weaponData);

		let attackFormula = '';
		
		if (data.withAdvantage === true) {
			attackFormula = `2d20kh + ${finalAttackBonus}`;
		} else if (data.withDisadvantage === true) {
			attackFormula = `2d20kl + ${finalAttackBonus}`;
		} else {
			attackFormula = `1d20 + ${finalAttackBonus}`
		}

		// Check how many attackers have this weapon
		let numHitAttacks = 0;
		let numCrits = 0;
		let numCritFails = 0;
		let availableAttacks = value;

		// Evaluate how many individually rolled attacks hit
		let attackRoll, attackRollEvaluated = [], successfulAttackRolls = [];
		let atkRollData = [];

		// Determine crit threshold
		let critThreshold = 20;
		if (weaponData.type === "weapon" && weaponData.actor.getFlag("dnd5e","weaponCriticalThreshold") > 0) {
			critThreshold = weaponData.actor.getFlag("dnd5e","weaponCriticalThreshold");
		} else if (weaponData.type === "spell" && weaponData.actor.getFlag("dnd5e","spellCriticalThreshold") > 0) {
			critThreshold = weaponData.actor.getFlag("dnd5e","spellCriticalThreshold");
		}

		for (let i = 0; i < availableAttacks; i++) {	
			attackRoll = new Roll(attackFormula);
			attackRollEvaluated[i] = (coreVersion08x()) ? await attackRoll.evaluate({async: true}) : attackRoll.evaluate();

			// Check settings for rolling 3d dice from Dice So Nice
			if (game.user.getFlag(moduleName,"showIndividualAttackRolls") ?? game.settings.get(moduleName,"showIndividualAttackRolls")) {
				if (game.modules.get("dice-so-nice")?.active && game.settings.get(moduleName, "enableDiceSoNice")) {
					if (!game.settings.get(moduleName, "hideDSNAttackRoll") || !game.user.isGM) game.dice3d.showForRoll(attackRoll);
				}
			}

			// Determine crits and natural 1s
			if (attackRollEvaluated[i].total - finalAttackBonus >= critThreshold) {
				numCrits++;
				numHitAttacks += 1;
				successfulAttackRolls.push(attackRollEvaluated[i]);
				atkRollData.push({roll: attackRollEvaluated[i].total, color: "max", finalAttackBonus: finalAttackBonus});
			} else if (attackRollEvaluated[i].total - finalAttackBonus === 1) {
				numCritFails++;
				if (game.user.getFlag(moduleName,"showAllAttackRolls") ?? game.settings.get(moduleName,"showAllAttackRolls")) {
					atkRollData.push({roll: attackRollEvaluated[i].total, color: "min", finalAttackBonus: finalAttackBonus});
				}
			} else if (attackRollEvaluated[i].total >= ((data.targetAC) ? data.targetAC : 0) && attackRollEvaluated[i].total - finalAttackBonus > 1) {
				numHitAttacks += 1;
				successfulAttackRolls.push(attackRollEvaluated[i]);
				atkRollData.push({roll: attackRollEvaluated[i].total, color: "", finalAttackBonus: finalAttackBonus});
			} else if (game.user.getFlag(moduleName,"showAllAttackRolls") ?? game.settings.get(moduleName,"showAllAttackRolls")) {
				atkRollData.push({roll: attackRollEvaluated[i].total, color: "discarded", finalAttackBonus: finalAttackBonus});
			}
		}
		
		const hitTarget = numHitAttacks > 0;
		let crits, hitOrMiss;
		if (hitTarget) {
			crits = numCrits;
			hitOrMiss = game.i18n.localize((crits === 1) ? "MAT.attackHitSingular" : "MAT.attackHitPlural");
		} else {
			crits = numCritFails;
			hitOrMiss = game.i18n.localize((crits === 1) ? "MAT.attackMissSingular" : "MAT.attackMissPlural");
		}
		const critMsg = (crits > 0) ? `, ${crits}${hitOrMiss}${game.i18n.localize("MAT.critHitDescription")}` : ``;
		const pluralOrNot = ((numHitAttacks === 1) ? ` ${game.i18n.localize((availableAttacks > 1) ? "MAT.oneAttackPlural" : "MAT.oneAttackSingular")}${(numCrits > 0) ? ` ${game.i18n.localize("MAT.critHitDescription")}` : ``}!` : ` ${game.i18n.localize((availableAttacks > 1) ? "MAT.multipleAttackPlural" : "MAT.multipleAttackSingular")}${critMsg}!`);
		const targetACtext = game.user.isGM ? ` (AC ${data.targetAC})` : ``;

		let actorAmount = data.numSelected;
		if (data.monsters?.[weaponData.actor.id]?.["amount"]) {
			actorAmount = data.monsters[weaponData.actor.id]["amount"];
		}

		// Mob attack results message
		let msgData = {
			actorAmount: actorAmount,
			weaponName: `${weaponData.name}${(isVersatile) ? ` (${game.i18n.localize("Versatile")})` : ``}`,
			availableAttacks: availableAttacks,
			numHitAttacks: numHitAttacks,
			pluralOrNot: pluralOrNot,
			atkRollData: atkRollData,
			showIndividualAttackRolls: (atkRollData.length === 0) ? false : game.user.getFlag(moduleName,"showIndividualAttackRolls") ?? game.settings.get(moduleName,"showIndividualAttackRolls")
		}

		// Store message data for later
		if (!messageData.messages[actorName]) {
			messageData.messages[actorName] = [msgData];
		} else {
			messageData.messages[actorName].push(msgData);
		}

		if (!messageData["totalHitAttacks"]) {
			messageData["totalHitAttacks"] = numHitAttacks;
		} else {
			messageData["totalHitAttacks"] += numHitAttacks;
		}


		attackData.push({
			data: data,
			weaponData: weaponData,
			finalAttackBonus: finalAttackBonus,
			successfulAttackRolls: successfulAttackRolls,
			numHitAttacks: numHitAttacks,
			numCrits: numCrits,
			isVersatile: isVersatile
		})

		await new Promise(resolve => setTimeout(resolve, 250));	
	}

	let totalPluralOrNot = ` ${game.i18n.localize((messageData.totalHitAttacks === 1) ? "MAT.numTotalHitsSingular" : "MAT.numTotalHitsPlural")}`;
	messageData["totalPluralOrNot"] = totalPluralOrNot;

	// Send message
	let messageText = await renderTemplate('modules/mob-attack-tool/templates/mat-msg-individual-rolls.html', messageData);
	await sendChatMessage(messageText);

	// Process damage rolls
	for (let attack of attackData) {
		await processIndividualDamageRolls(attack.data, attack.weaponData, attack.finalAttackBonus, attack.successfulAttackRolls, attack.numHitAttacks, attack.numCrits, attack.isVersatile);
		await new Promise(resolve => setTimeout(resolve, 500));
	}

	if (data.endMobTurn) {
		await endGroupedMobTurn(data);
	}
}


export async function processIndividualDamageRolls(data, weaponData, finalAttackBonus, successfulAttackRolls, numHitAttacks, numCrits, isVersatile) {

	// Check for betterrolls5e and midi-qol
	let betterrollsActive = false;
	if (game.modules.get("betterrolls5e")?.active) betterrollsActive = true;
	let midi_QOL_Active = false;
	if (game.modules.get("midi-qol")?.active && game.settings.get(moduleName, "enableMidi")) midi_QOL_Active = true;

	// Determine crit threshold
	let critThreshold = 20;
	if (weaponData.type === "weapon" && weaponData.actor.getFlag("dnd5e","weaponCriticalThreshold") > 0) {
		critThreshold = weaponData.actor.getFlag("dnd5e","weaponCriticalThreshold");
	} else if (weaponData.type === "spell" && weaponData.actor.getFlag("dnd5e","spellCriticalThreshold") > 0) {
		critThreshold = weaponData.actor.getFlag("dnd5e","spellCriticalThreshold");
	}
	
	// Process attack and damage rolls
	let showAttackRolls = game.user.getFlag(moduleName,"showIndividualAttackRolls") ?? game.settings.get(moduleName,"showIndividualAttackRolls");
	let showDamageRolls = game.user.getFlag(moduleName,"showIndividualDamageRolls") ?? game.settings.get(moduleName,"showIndividualDamageRolls");
	if (numHitAttacks != 0) {
		// Better Rolls 5e active
		if (betterrollsActive) {
			let mobAttackRoll = BetterRolls.rollItem(weaponData, {},
				[
					["header"],
					["desc"]
				]
			);
			let attackFieldOptions = {};
			let damageFieldOptions = {};
			if (showAttackRolls && showDamageRolls) {
				for (let i = 0; i < numHitAttacks; i++) {
					let attackFormula = "0d0 + " + (successfulAttackRolls[i].total).toString();
					if (successfulAttackRolls[i].total - finalAttackBonus >= critThreshold && numCrits > 0) {
					 	attackFieldOptions =  {formula: attackFormula, forceCrit: true};
						damageFieldOptions = {index: "all", isCrit: true};
						numCrits--;
					} else {
					 	attackFieldOptions = {formula: attackFormula};
					 	damageFieldOptions = {index: "all", isCrit: false};
					}
					await mobAttackRoll.addField(["attack", attackFieldOptions]);
					await mobAttackRoll.addField(["damage", damageFieldOptions]);
				}
			} else {
				if (midi_QOL_Active && data.targetAC > 0) await mobAttackRoll.addField(["attack", {formula: "0d0 + " + (data.targetAC).toString(), title: game.i18n.localize("MAT.midiDamageLabel")}]);
				let [diceFormulas, damageTypes, damageTypeLabels] = getDamageFormulaAndType(weaponData,isVersatile);
				for (let diceFormula of diceFormulas) {
					let damageRoll = new Roll(diceFormula, {mod: weaponData.actor.data.data.abilities[weaponData.abilityMod].mod});
					let numDice = 0;
					for (let term of damageRoll.terms.filter(t => t.number > 0 && t.faces > 0)) {
						numDice += term.number;
					}
					await damageRoll.alter(numHitAttacks, numDice * numCrits, {multiplyNumeric: true});
					await mobAttackRoll.addField(["damage", {formula: damageRoll.formula, damageType: damageTypes[diceFormulas.indexOf(diceFormula)], title: `${game.i18n.localize("Damage")} - ${damageTypes[diceFormulas.indexOf(diceFormula)]}`, isCrit: false}]);
				}
			}
			if (weaponData.data.data.consume.type === "ammo") {
				try {
					await mobAttackRoll.addField(["ammo", {name: weaponData.actor.items.get(weaponData.data.data.consume.target).name}]);	
					await mobAttackRoll.toMessage();
				} catch (error) {
					console.error("Mob Attack Tool | There was an error while trying to add an ammo field (Better Rolls):",error);
					ui.notifications.error(game.i18n.format("MAT.ammoError", {weaponName: weaponData.name}));
				}
			} else {
				await mobAttackRoll.toMessage();
			}

		// Midi-QOL active, Better Rolls inactive
		} else if (midi_QOL_Active) {
			await new Promise(resolve => setTimeout(resolve, 300));
			let [diceFormulas, damageTypes, damageTypeLabels] = getDamageFormulaAndType(weaponData,isVersatile);

			let diceFormula = diceFormulas.join(" + ");
			let damageType = damageTypes.join(", ");
			let damageRoll = new Roll(diceFormula, {mod: weaponData.actor.data.data.abilities[weaponData.abilityMod].mod});
			
			// Add critical damage dice
			let critDice = [], critDie;
			let damageRollDiceTerms = damageRoll.terms.filter(t => t.number > 0 && t.faces > 0);
			for (let term of damageRollDiceTerms) {
				critDie = new Die({number: term.number, faces: term.faces});
				critDice.push(critDie);
			}
			await damageRoll.alter(numHitAttacks, 0, {multiplyNumeric: true});
			if (numCrits > 0) {
				for (let i = 0; i < critDice.length; i++) {
					await critDice[i].alter(numCrits, 0, {multiplyNumeric: false});
					if (damageRollDiceTerms[i].faces === critDice[i].faces) {
						damageRollDiceTerms[i].number += critDice[i].number;
					}
					damageRoll._formula = damageRoll.formula;
				}
			}
			damageRoll = await damageRoll.evaluate({async: true});
			
			// Roll Dice so Nice dice
			if (game.modules.get("dice-so-nice")?.active && game.settings.get(moduleName, "enableDiceSoNice")) game.dice3d.showForRoll(damageRoll);
			
			new MidiQOL.DamageOnlyWorkflow(
				weaponData.actor, 
				(data.targetToken) ? data.targetToken : undefined, 
				damageRoll.total, 
				damageTypeLabels[0], 
				(data.targetToken) ? [data.targetToken] : [], 
				damageRoll, 
				{
					flavor: `${weaponData.name} - ${game.i18n.localize("Damage Roll")} (${damageType})${(numCrits > 0) ? ` (${game.i18n.localize("MAT.critIncluded")})` : ``}`, 
					itemData: weaponData, 
					itemCardId: "new"
				}
			);
			
		// Neither Better Rolls nor Midi-QOL active
		} else {
			if (showDamageRolls) {
				for (let i = 0; i < numHitAttacks; i++) {
					await new Promise(resolve => setTimeout(resolve, 300));
					let damageOptions = {};
					if (successfulAttackRolls[i].total - finalAttackBonus >= critThreshold && numCrits > 0) {
						damageOptions = {"critical": true, "event": {"altKey": true}};
						numCrits--
					} else {
						damageOptions = {"critical": false, "event": {"shiftKey": true}};
					}
					await weaponData.rollDamage(damageOptions);
				}
			} else {
				// Condense the damage rolls.
				// await new Promise(resolve => setTimeout(resolve, 300));
				let [diceFormulas, damageTypes, damageTypeLabels] = getDamageFormulaAndType(weaponData,isVersatile);
				let diceFormula = diceFormulas.join(" + ");
				let damageType = damageTypes.join(", ");
				let damageRoll = new Roll(diceFormula, {mod: weaponData.actor.data.data.abilities[weaponData.abilityMod].mod})

				// Add critical damage dice
				let critDice = [], critDie;
				let damageRollDiceTerms = damageRoll.terms.filter(t => t.number > 0 && t.faces > 0);
				for (let term of damageRollDiceTerms) {
					critDie = new Die({number: term.number, faces: term.faces});
					critDice.push(critDie);
				}
				await damageRoll.alter(numHitAttacks, 0, {multiplyNumeric: true});
				if (numCrits > 0) {
					for (let i = 0; i < critDice.length; i++) {
						await critDice[i].alter(numCrits, 0, {multiplyNumeric: false});
						if (damageRollDiceTerms[i].faces === critDice[i].faces) {
							damageRollDiceTerms[i].number += critDice[i].number;
						}
						damageRoll._formula = damageRoll.formula;
					}
				}
				damageRoll = await damageRoll.evaluate({async: true});
				
				await damageRoll.toMessage(
					{
						flavor: `${weaponData.name} - ${game.i18n.localize("Damage Roll")} (${damageType})${(numCrits > 0) ? ` (${game.i18n.localize("MAT.critIncluded")})` : ``}`
					}
				);
			}
		}
	}
}