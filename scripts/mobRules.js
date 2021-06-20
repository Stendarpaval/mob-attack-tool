import { moduleName, coreVersion08x } from "./mobAttack.js";
import { checkTarget, endGroupedMobTurn, getDamageFormulaAndType, calcD20Needed, calcAttackersNeeded, isTargeted, sendChatMessage, getAttackBonus, getScalingFactor, callMidiMacro } from "./utils.js";
import { getMultiattackFromActor } from "./multiattack.js";


export async function rollMobAttack(data) {

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
		const d20Needed = calcD20Needed(finalAttackBonus, data.targetAC, data.rollTypeValue);
		const attackersNeeded = calcAttackersNeeded(d20Needed);

		// Check whether how many attackers can use this weapon
		let availableAttacks = value;
		
		if (availableAttacks / attackersNeeded >= 1) {
			const numHitAttacks = Math.floor(availableAttacks/attackersNeeded);
			const pluralOrNot = ` ${game.i18n.localize((numHitAttacks === 1) ? "MAT.oneAttackSingular" : "MAT.oneAttackPlural")}!`;
			const sOrNot = ((numHitAttacks > 1) ? "s" : "");
			const targetACtext = game.user.isGM ? `${game.i18n.localize("MAT.targetAC")} ${data.targetAC}` : ``;

			let actorAmount = data.numSelected;
			if (data.monsters?.[weaponData.actor.id]?.["amount"]) {
				actorAmount = data.monsters[weaponData.actor.id]["amount"];
			}

			// Mob attack results message
			let msgData = {
				actorAmount: actorAmount,
				targetName: data.targetToken.name,
				targetACtext: targetACtext,
				d20Needed: d20Needed,
				finalAttackBonus: finalAttackBonus,
				weaponName: `${weaponData.name}${(isVersatile) ? ` (${game.i18n.localize("Versatile")})` : ``}`,
				availableAttacks: availableAttacks,
				attackersNeeded: attackersNeeded,
				numSelected: data.numSelected,
				numHitAttacks: numHitAttacks,
				pluralOrNot: pluralOrNot,
				sOrNot: sOrNot
			}

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
				numHitAttacks: numHitAttacks,
				isVersatile: isVersatile
			})

			await new Promise(resolve => setTimeout(resolve, 250));
		} else {
			ui.notifications.warn(game.i18n.format("MAT.lowAttackBonusOrSmallMob",{weaponName: weaponData.name}));
		}
	}
	if (attackData.length === 0) {
		return;
	} else {
		let totalPluralOrNot = ` ${game.i18n.localize((messageData.totalHitAttacks === 1) ? "MAT.numTotalHitsSingular" : "MAT.numTotalHitsPlural")}`;
		messageData["totalPluralOrNot"] = totalPluralOrNot;
		let messageText = await renderTemplate('modules/mob-attack-tool/templates/mat-msg-mob-rules.html', messageData);
		await sendChatMessage(messageText);

		for (let attack of attackData) {
			await processMobRulesDamageRolls(attack.data, attack.weaponData, attack.numHitAttacks, attack.isVersatile);
			await new Promise(resolve => setTimeout(resolve, 500));
		}

		if (data.endMobTurn) {
			await endGroupedMobTurn(data);
		}
	}
}


export async function processMobRulesDamageRolls(data, weaponData, numHitAttacks, isVersatile) {

	// Check for betterrolls5e and midi-qol
	let betterrollsActive = false;
	if (game.modules.get("betterrolls5e")?.active && game.settings.get(moduleName, "enableBetterRolls")) betterrollsActive = true;
	let midi_QOL_Active = false;
	if (game.modules.get("midi-qol")?.active && game.settings.get(moduleName, "enableMidi")) midi_QOL_Active = true;

	let showDamageRolls = game.user.getFlag(moduleName,"showIndividualDamageRolls") ?? game.settings.get(moduleName,"showIndividualDamageRolls");

	// betterrolls5e active
	if (betterrollsActive) {
		let mobAttackRoll = BetterRolls.rollItem(weaponData, {},
			[
				["header"],
				["desc"]
			]
		);
		if (midi_QOL_Active) await mobAttackRoll.addField(["attack", {formula: "0d0 + " + (data.targetAC).toString(), title: game.i18n.localize("MAT.midiDamageLabel")}]);
		
		// Add damage fields from each successful hit to the same card
		let showAttackRolls = game.user.getFlag(moduleName,"showIndividualAttackRolls") ?? game.settings.get(moduleName,"showIndividualAttackRolls");
		if (showAttackRolls) {
			for (let i = 0; i < numHitAttacks; i++) {
				await mobAttackRoll.addField(["damage",{index: "all"}]);
			}
		} else {
			let [diceFormulas, damageTypes, damageTypeLabels] = getDamageFormulaAndType(weaponData,isVersatile);
			for (let diceFormula of diceFormulas) {
				let damageRoll = new Roll(diceFormula, {mod: weaponData.actor.data.data.abilities[weaponData.abilityMod].mod});
				await damageRoll.alter(numHitAttacks, 0, {multiplyNumeric: true});
				await mobAttackRoll.addField(["damage", {formula: damageRoll.formula, damageType: damageTypes[diceFormulas.indexOf(diceFormula)], title: `${game.i18n.localize("Damage")} - ${damageTypes[diceFormulas.indexOf(diceFormula)]}`, isCrit: false}]);
			}
		}
		if (weaponData.data.data.consume.type === "ammo") {
			try {
				await mobAttackRoll.addField(["ammo",{name: weaponData.actor.items.get(weaponData.data.data.consume.target).name}]);
				await mobAttackRoll.toMessage();
			} catch (error) {
				console.error("Mob Attack Tool | There was an error while trying to add an ammo field (Better Rolls):",error);
				ui.notifications.error(game.i18n.format("MAT.ammoError", {weaponName: weaponData.name}));
			}
		} else {
			await mobAttackRoll.toMessage();
		}

	// midi-qol is active,  betterrolls5e is not active
	} else if (midi_QOL_Active) {
		await new Promise(resolve => setTimeout(resolve, 100));

		let [diceFormulas, damageTypes, damageTypeLabels] = getDamageFormulaAndType(weaponData,isVersatile);
		let diceFormula = diceFormulas.join(" + ");
		let damageType = damageTypes.join(", ");
		let damageRoll = new Roll(diceFormula,{mod: weaponData.actor.data.data.abilities[weaponData.abilityMod].mod});
		await damageRoll.alter(numHitAttacks,0,{multiplyNumeric: true}).roll();

		if (game.modules.get("dice-so-nice")?.active && game.settings.get(moduleName, "enableDiceSoNice")) game.dice3d.showForRoll(damageRoll);
		
		let workflow = new MidiQOL.DamageOnlyWorkflow(
			weaponData.actor, 
			data.targetToken, 
			damageRoll.total, 
			damageTypeLabels[0], 
			[data.targetToken], 
			damageRoll, 
			{
				flavor: `${weaponData.name} - ${game.i18n.localize("Damage Roll")} (${damageType})`, 
				itemData: weaponData.data,
				itemCardId: `new`
			}
		);

		// prepare data for Midi's On Use Macro feature
		if (game.settings.get(moduleName, "enableMidiOnUseMacro")) {
			await new Promise(resolve => setTimeout(resolve, 300));
			const macroData = {
				actor: weaponData.actor.data,
				actorUuid: weaponData.actor.uuid,
				tokenId: workflow.tokenId,
				tokenUuid: workflow.tokenUuid,
				targets: (data.targetToken) ? [data.targetToken] : [],
				hitTargets: (data.targetToken) ? [data.targetToken] : [],
				damageRoll: damageRoll,
				damageRollHTML: workflow.damageRollHTML,
				attackRoll: workflow?.attackRoll,
				attackTotal: workflow.attackTotal,
				itemCardId: (game.settings.get(moduleName, "dontSendItemCardId")) ? null : workflow.itemCardId,
				isCritical: false,
				isFumble: false,
				spellLevel: 0,
				powerLevel: 0,
				damageTotal: damageRoll.total,
				damageDetail: workflow.damageDetail,
				damageList: workflow.damageList,
				otherDamageTotal: 0,
				otherDamageDetail: workflow.otherDamageDetail,
				otherDamageList: [{damage: damageRoll.total, type: damageTypes[0]}],
				rollOptions: {advantage: data.withAdvantage, disadvantage: data.withDisadvantage, versatile: isVersatile, fastForward: true},
				advantage: data.withAdvantage,
				disadvantage: data.withDisadvantage,
				event: null,
				uuid: workflow.uuid,
				rollData: weaponData.actor.getRollData(),
				tag: "OnUse",
				concentrationData: getProperty(weaponData.actor.data.flags, "midi-qol.concentration-data"),
				templateId: workflow.templateId, 
				templateUuid: workflow.templateUuid
			}
			for (let i = 0; i < numHitAttacks; i++) {
				await callMidiMacro(weaponData, macroData);	
			}
		}
		Hooks.call("midi-qol.DamageRollComplete", workflow);

	// neither midi-qol or betterrolls5e active
	} else {
		if (showDamageRolls) {
			await new Promise(resolve => setTimeout(resolve, 100));	
			for (let i = 0; i < numHitAttacks; i++) {
				await weaponData.rollDamage({"critical": false, "event": {"shiftKey": true}});	
				await new Promise(resolve => setTimeout(resolve, 300));	
			}	
		} else {
			// Condense the damage rolls.
			let [diceFormulas, damageTypes, damageTypeLabels] = getDamageFormulaAndType(weaponData,isVersatile);
			let diceFormula = diceFormulas.join(" + ");
			let damageType = damageTypes.join(", ");
			let damageRoll = new Roll(diceFormula, {mod: weaponData.actor.data.data.abilities[weaponData.abilityMod].mod})
			await damageRoll.alter(numHitAttacks, 0, {multiplyNumeric: true});
			damageRoll = await damageRoll.evaluate({async: true});
			await damageRoll.toMessage(
				{
					flavor: `${weaponData.name} - ${game.i18n.localize("Damage Roll")} (${damageType})`
				}
			);
		}
	}
}