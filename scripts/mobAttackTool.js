import { getMultiattackFromActor } from "./multiattack.js";

export function initMobAttackTool() {
	Hooks.on("getSceneControlButtons", (controls) => {
		const playerAccess = game.settings.get("mob-attack-tool","playerAccess");
		console.log("Mob Attack Tool | Player Access:", playerAccess);
		const bar = controls.find(c => c.name === "token");
		bar.tools.push({
			name: "Mob Attack Tool",
			title: "Mob Attack",
			icon: "fas fa-dice",
			visible: (playerAccess ? true : game.user.isGM),
			onClick: async () => mobAttackTool(),
			button: true
		});
	});
}

async function mobAttackTool() {
	const MODULE = "mob-attack-tool";

	// Check selected tokens
	if (canvas.tokens.controlled.length == 0) {
		ui.notifications.warn('You need to select one or more tokens!');
		return;
	}

	// Check targeted token
	if (!checkTarget()) return; 		

	let targetToken = canvas.tokens.objects.children.filter(isTargeted)[0];
	let targetAC = targetToken.actor.data.data.attributes.ac.value;
	let numSelected = canvas.tokens.controlled.length;
	let pluralTokensOrNot = ((numSelected == 1) ? `` : `s`);

	// Format tool dialog content
	const dialogContentStart = `<form id="mobattack-tool" class="dialog-content";>`;
	const targetACtext = game.user.isGM ? ` Your target has an AC of ${targetAC}.` : ``;
	const dialogContentLabel = `<p>Choose weapon option:</p><p class="hint">You have selected ${numSelected} token${pluralTokensOrNot}.${targetACtext}</p>`;
	const dialogContentEnd = `</form>`;
	
	let content = dialogContentStart + dialogContentLabel + `<div class="flexcol">`;

	// Show weapon options per selected token type
	let monsters = {};
	for (let token of canvas.tokens.controlled) {
		if (monsters[token.actor.id]) {
			if (monsters[token.actor.id].id == token.actor.id) {
				monsters[token.actor.id].amount += 1;
			}
		} else {
			monsters[token.actor.id] = {id: token.actor.id, amount: 1, optionVisible: false, img: token.actor.img, name: token.actor.name};
		}
	}

	let weapons = {};
	let availableAttacks = {};
	for (let token of canvas.tokens.controlled) {
		if (monsters[token.actor.id]) {
			if (!monsters[token.actor.id].optionVisible) {
				content += `<hr>` + await formatMonsterLabel(monsters[token.actor.id]);
				monsters[token.actor.id].optionVisible = true;
				if (game.settings.get(MODULE, "showMultiattackDescription")) {
					if (token.actor.items.entries.filter(i => i.name.startsWith("Multiattack")).length > 0) {
						content += `<div class="hint">${token.actor.items.filter(i => i.name.startsWith("Multiattack"))[0].data.data.description.value}</div>`;
					} else if (token.actor.items.entries.filter(i => i.name.startsWith("Extra Attack")).length > 0) {
						content += `<div class="hint">${token.actor.items.filter(i => i.name.startsWith("Extra Attack"))[0].data.data.description.value}</div>`;
					}
				}
			}
		}

		// Check if Core is 0.8.x or even newer
		let coreVersion08x = parseInt(game.data.version.slice(2)) > 7;
		let items = (coreVersion08x) ? token.actor.items.contents : token.actor.items.entries;
		for (let item of items) {
			if (item.data.type == "weapon" || (item.data.type == "spell" && item.data.data.level == 0 && item.data.data.damage.parts.length > 0 && item.data.data.save.ability === "")) {
				if (weapons[item.id]?.id === item.id) {
					availableAttacks[item.id] += 1;
				} else {
					weapons[item.id] = item;
					availableAttacks[item.id] = 1;
					content += await formatWeaponLabel(weapons, item);
				}
			}
		}
	}

	
	let selectRollTypeText = await renderTemplate('modules/mob-attack-tool/templates/mat-select-rolltype-text.html');
	let endTurnText = await renderTemplate('modules/mob-attack-tool/templates/mat-end-turn-text.html');
	let exportToMacroText = await renderTemplate('modules/mob-attack-tool/templates/mat-export-to-macro-text.html');

	content += `</div><hr>` + ((game.settings.get(MODULE,"askRollType")) ? selectRollTypeText : ``);
	content += ((game.settings.get(MODULE,"endMobTurn")) ? endTurnText : ``) + exportToMacroText + dialogContentEnd + `<hr>`;

	new Dialog({
		title: "Mob Attack Tool",
		content: content,
		buttons: {
			one: {
				label: "Mob Attack",
				icon: `<i class="fas fa-fist-raised"></i>`,
				callback: (html) => {

					let attacks = {};
					let weaponLocators = [];
					let numAttacksMultiplier = 1;
					let isVersatile = false;
					let key;
					for (let [weaponID, weaponData] of Object.entries(weapons)) {
						isVersatile = weaponData.data.data.damage.versatile != "";
						weaponID += ((isVersatile) ?  ` (Versatile)` : ``);
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
					if (game.settings.get(MODULE,"askRollType")) {
						let rtValue = Math.floor(game.settings.get(MODULE,"rollTypeValue"));
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

					// Create macro
					if (html.find(`input[name="exportMobAttack"]`)[0].checked) {
						let key = Object.keys(attacks)[0];
						if (key.endsWith(`(Versatile)`)) key = key.slice(0,key.indexOf(` (Versatile)`));
						let macroName = `${weapons[key].name} Mob Attack of ${canvas.tokens.controlled.length} ${canvas.tokens.controlled[0].name}(s)`;
						
						Macro.create({
							type: "script", 
							name: macroName,
							command: `MobAttacks.quickRoll({numSelected: ${numSelected}, weaponLocators: ${JSON.stringify(weaponLocators)}, attacks: ${JSON.stringify(attacks)}, withAdvantage: ${withAdvantage}, withDisadvantage: ${withDisadvantage}, rollTypeValue: ${rollTypeValue}, rollTypeMessage: "${rollTypeMessage}", endMobTurn: ${endMobTurn}, monsters: ${JSON.stringify(monsters)}})`,
							img: weapons[key].img,
						});
					ui.notifications.info(`Macro ${macroName} was saved to the macro directory`);
					}

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
						"monsters": monsters
					};

					if (game.settings.get(MODULE,"mobRules") === 0) {
						rollMobAttack(mobAttackData);
					} else {
						rollMobAttackIndividually(mobAttackData);
					}
					
				}
			}
		},
		default: "one"
	},{width: 430}).render(true);
}


String.prototype.capitalize = function() {
    return this.charAt(0).toUpperCase() + this.slice(1);
}


export function MobAttacks() {
	function quickRoll(data) {
		if (!checkTarget()) return; 
		
		// Collect necessary data for mob attack
		let targetToken = canvas.tokens.objects.children.filter(isTargeted)[0];
		let targetAC = targetToken.actor.data.data.attributes.ac.value;
		data["targetToken"] = targetToken;
		data["targetAC"] = targetAC;

		let weapons = {};
		let attacker, weapon;
		let attacks = {}, oldMacroCompatibility = false;
		data.weaponLocators.forEach(locator => {
			attacker = game.actors.get(locator["actorID"]);
			weapon = attacker.items.getName(locator["weaponName"])
			weapons[weapon.id] = weapon;

			// compatibility with macro's from before v0.1.21:
			if (data.attacks[locator["weaponName"]]) {
				oldMacroCompatibility = true;
				attacks[weapon.id] = data.attacks[locator["weaponName"]];
			}
		})
		data["weapons"] = weapons;
		if (oldMacroCompatibility) {
			data["attacks"] = attacks;
		}

		(async () => {
			if (game.settings.get("mob-attack-tool","mobRules") === 0) {
				return rollMobAttack(data);
			} else {
				return rollMobAttackIndividually(data);
			}
		})();
	}

	return {
		quickRoll:quickRoll
	};
}


function checkTarget() {
	if (canvas.tokens.objects.children.filter(isTargeted).length > 1) {
		ui.notifications.warn("Make sure only a single token is targeted!");
		return false;
	}

	let targetToken = canvas.tokens.objects.children.filter(isTargeted)[0];
	if (!targetToken) {
		ui.notifications.warn("Select a target with a valid AC value!");
		return false;
	}
	return true;
}


async function rollMobAttackIndividually(data) {

	// Cycle through selected weapons
	let attackData = [];
	let messageData = {messages: {}};
	let isVersatile;
	for ( let [key, value] of Object.entries(data.attacks) ) {
		isVersatile = false;
		if (key.endsWith(`(Versatile)`.replace(" ", "-"))) {
			isVersatile = true;
			key = key.slice(0,key.indexOf(` (Versatile)`));
		}
		const weaponData = data.weapons[key];
		const actorName = weaponData.actor.name;
		// messageData.attackers.push(actorName);
		const finalAttackBonus = getAttackBonus(weaponData);

		let attackFormula = '';
		
		if (data.withAdvantage === true) {
			attackFormula = `2d20kh + ${finalAttackBonus}`;
		} else if (data.withDisadvantage === true) {
			attackFormula = `2d20kl + ${finalAttackBonus}`;
		} else {
			attackFormula = `1d20 + ${finalAttackBonus}`
		}

		//TODO: check for crits and crit fails. Add separate props.
		let numHitAttacks = 0;
		let numCrits = 0;
		let numCritFails = 0;

		// Check how many attackers have this weapon
		let availableAttacks = data.numSelected;
		if (!game.settings.get("mob-attack-tool","shareWeapons")) {
			availableAttacks = value;
		}

		// Evaluate how many individually rolled attacks hit
		let attackRoll, attackRollEvaluated = [], successfulAttackRolls = [];
		for (let i = 0; i < availableAttacks; i++) {	
			attackRoll = new Roll(attackFormula);

			// Check if Core is 0.8.x or even newer
			let coreVersion08x = parseInt(game.data.version.slice(2)) > 7;
			if (coreVersion08x) {
				attackRollEvaluated[i] = await attackRoll.evaluate({async: true});
			} else {
				attackRollEvaluated[i] = attackRoll.evaluate();	
			}

			if (game.settings.get("mob-attack-tool", "showIndividualAttackRolls")) {
				if (game.modules.get("dice-so-nice")?.active) game.dice3d.showForRoll(attackRoll);
			}

			// Always count 20's as hits and 1's as misses. Maybe add option flag?
			if (attackRollEvaluated[i].total - finalAttackBonus == 20) {
				numCrits++;
				numHitAttacks += 1;
				successfulAttackRolls.push(attackRollEvaluated[i]);
			} else if (attackRollEvaluated[i].total - finalAttackBonus == 1) {
				numCritFails++;
			} else if (attackRollEvaluated[i].total >= data.targetAC && attackRollEvaluated[i].total - finalAttackBonus > 1) {
				numHitAttacks += 1;
				successfulAttackRolls.push(attackRollEvaluated[i]);
			}
		}
		
		const hitTarget = numHitAttacks > 0;
		let crits, hitOrMiss;
		if (hitTarget) {
			crits = numCrits;
			hitOrMiss = (crits === 1) ? ` hits ` : ` hit `;
		} else {
			crits = numCritFails;
			hitOrMiss = (crits === 1) ? ` misses ` : ` miss `;
		}
		const critMsg = (crits > 0) ? `, ${crits}${hitOrMiss}critically` : ``;
		const pluralOrNot = ((numHitAttacks === 1) ? ` attack${(availableAttacks > 1) ? `s` : ``} hits${(numCrits > 0) ? ` critically` : ``}!` : ` attack${(availableAttacks > 1) ? `s` : ``} hit${critMsg}!`);
		const targetACtext = game.user.isGM ? ` (AC ${data.targetAC})` : ``;

		let actorAmount = data.numSelected;
		if (data.monsters?.[weaponData.actor.id]?.["amount"]) {
			actorAmount = data.monsters[weaponData.actor.id]["amount"];
		}

		// Mob attack results message
		let msgData = {
			actorAmount: actorAmount,
			actorName: actorName,
			targetName: data.targetToken.name,
			targetACtext: targetACtext,
			finalAttackBonus: finalAttackBonus,
			weaponName: `${weaponData.name}${(isVersatile) ? ` (Versatile)` : ``}`,
			availableAttacks: availableAttacks,
			numSelected: data.numSelected,
			attackUseText: (availableAttacks === 1) ? ` uses a ${weaponData.name} attack` : `s use ${weaponData.name} attacks`,
			numHitAttacks: numHitAttacks,
			hitTarget: hitTarget,
			pluralOrNot: pluralOrNot
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

	let totalPluralOrNot = ((messageData.totalHitAttacks === 1) ? ` attack hits in total!` : ` attacks hit in total!`);
	messageData["totalPluralOrNot"] = totalPluralOrNot;

	// Send message
	let messageText = await renderTemplate('modules/mob-attack-tool/templates/mat-msg-individual-rolls.html', messageData);
	sendChatMessage(messageText);

	// Process damage rolls
	for (let attack of attackData) {
		await processIndividualDamageRolls(attack.data, attack.weaponData, attack.finalAttackBonus, attack.successfulAttackRolls, attack.numHitAttacks, attack.numCrits, attack.isVersatile);
		await new Promise(resolve => setTimeout(resolve, 500));
	}

	if (data.endMobTurn) {
		await endGroupedMobTurn(data);
	}
}


async function processIndividualDamageRolls(data, weaponData, finalAttackBonus, successfulAttackRolls, numHitAttacks, numCrits, isVersatile) {
	// Check for betterrolls5e and midi-qol
	let betterrollsActive = false;
	if (game.modules.get("betterrolls5e")?.active) betterrollsActive = true;
	let midi_QOL_Active = false;
	if (game.modules.get("midi-qol")?.active) midi_QOL_Active = true;
	
	// Process attack and damage rolls
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
			let showAttackRolls = game.settings.get("mob-attack-tool", "showIndividualAttackRolls");
			if (showAttackRolls) {
				for (let i = 0; i < numHitAttacks; i++) {
					let attackFormula = "0d0 + " + (successfulAttackRolls[i].total).toString();
					if (successfulAttackRolls[i].total - finalAttackBonus == 20 && numCrits > 0) {
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
				await mobAttackRoll.addField(["attack", {formula: "0d0 + " + (data.targetAC).toString(), title: `Attack - Target AC`}]);
				let [diceFormulas, damageTypes, damageTypeLabels] = getDamageFormulaAndType(weaponData,isVersatile);
				for (let diceFormula of diceFormulas) {
					let damageRoll = new Roll(diceFormula, {mod: weaponData.actor.data.data.abilities[weaponData.abilityMod].mod});
					await damageRoll.alter(numHitAttacks, numCrits, {multiplyNumeric: true});
					await mobAttackRoll.addField(["damage", {formula: damageRoll.formula, damageType: damageTypes[diceFormulas.indexOf(diceFormula)], title: `Damage - ${damageTypes[diceFormulas.indexOf(diceFormula)]}`, isCrit: false}]);
				}
				
			}
			if (weaponData.data.data.consume.type === "ammo") {
				try {
					await mobAttackRoll.addField(["ammo", {name: weaponData.actor.items.get(weaponData.data.data.consume.target).name}]);	
					await mobAttackRoll.toMessage();
				} catch (error) {
					console.error("Mob Attack Tool | There was an error while trying to add an ammo field (Better Rolls):",error);
					ui.notifications.error(`There was an error while trying to add an ammo field to this ${weaponData.name} attack.`);
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
			await damageRoll.alter(numHitAttacks, numCrits, {multiplyNumeric: true}).roll();
			
			// Roll Dice so Nice dice
			if (game.modules.get("dice-so-nice")?.active) game.dice3d.showForRoll(damageRoll);
			
			new MidiQOL.DamageOnlyWorkflow(
				weaponData.options.actor, 
				data.targetToken, 
				damageRoll.total, 
				damageTypeLabels[0], 
				[data.targetToken], 
				damageRoll, 
				{
					flavor: `${weaponData.name} - Damage Roll (${damageType})${(numCrits > 0) ? ` (Crit included)` : ``}`, 
					itemData: weaponData, 
					itemCardId: "new"
				}
			);
			
		
		// Neither Better Rolls nor Midi-QOL active
		} else {
			for (let i = 0; i < numHitAttacks; i++) {
				await new Promise(resolve => setTimeout(resolve, 300));
				if (game.settings.get("mob-attack-tool", "showIndividualAttackRolls")) {
					await successfulAttackRolls[i].toMessage(
						{
							flavor: `${weaponData.name} - Attack Roll`,
							speaker: {
								actor: weaponData.actor.id,
								alias: weaponData.actor.name
							}
						}
					);
					await new Promise(resolve => setTimeout(resolve, 200));
				}
				let damageOptions = {};
				if (successfulAttackRolls[i].total - finalAttackBonus == 20 && numCrits > 0) {
					damageOptions = {"critical": true, "event": {"altKey": true}};
					numCrits--
				} else {
					damageOptions = {"critical": false, "event": {"altKey": true}};
				}
				await weaponData.rollDamage(damageOptions);
			}
		}
	}
}


async function rollMobAttack(data) {

	// Cycle through selected weapons
	let attackData = [];
	let messageData = {messages: {}};
	let isVersatile;
	for ( let [key, value] of Object.entries(data.attacks) ) { 
		isVersatile = false;
		if (key.endsWith(`(Versatile)`.replace(" ", "-"))) {
			isVersatile = true;
			key = key.slice(0,key.indexOf(` (Versatile)`));
		}
		const weaponData = data.weapons[key]; 
		const actorName = weaponData.actor.name;
		const finalAttackBonus = getAttackBonus(weaponData);
		const d20Needed = calcD20Needed(finalAttackBonus, data.targetAC, data.rollTypeValue);
		const attackersNeeded = calcAttackersNeeded(d20Needed);

		// Check whether how many attackers can use this weapon
		let availableAttacks = data.numSelected;
		if (!game.settings.get("mob-attack-tool","shareWeapons")) {
			availableAttacks = value;
		}
		
		if (availableAttacks / attackersNeeded >= 1) {
			const numHitAttacks = Math.floor(availableAttacks/attackersNeeded);
			const pluralOrNot = ((numHitAttacks === 1) ? " attack hits!" : " attacks hit!");
			const sOrNot = ((numHitAttacks > 1) ? "s" : "");
			const targetACtext = game.user.isGM ? `Target AC ${data.targetAC}` : ``;

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
				weaponName: `${weaponData.name}${(isVersatile) ? ` (Versatile)` : ``}`,
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
			ui.notifications.warn("Attack bonus too low or not enough mob attackers to hit the target!");
			return;
		}
	}

	let totalPluralOrNot = ((messageData.totalHitAttacks === 1) ? ` attack hits in total!` : ` attacks hit in total!`);
	messageData["totalPluralOrNot"] = totalPluralOrNot;
	let messageText = await renderTemplate('modules/mob-attack-tool/templates/mat-msg-mob-rules.html', messageData);
	sendChatMessage(messageText);

	for (let attack of attackData) {
		await processMobRulesDamageRolls(attack.data, attack.weaponData, attack.numHitAttacks, attack.isVersatile);
		await new Promise(resolve => setTimeout(resolve, 500));
	}

	if (data.endMobTurn) {
		await endGroupedMobTurn(data);
	}
}


async function processMobRulesDamageRolls(data, weaponData, numHitAttacks, isVersatile) {
	// Process hit attacks

	// Check for betterrolls5e and midi-qol
	let betterrollsActive = false;
	if (game.modules.get("betterrolls5e")?.active) betterrollsActive = true;
	let midi_QOL_Active = false;
	if (game.modules.get("midi-qol")?.active) midi_QOL_Active = true;

	// betterrolls5e active
	if (betterrollsActive) {
		let mobAttackRoll = BetterRolls.rollItem(weaponData, {},
			[
				["header"],
				["desc"],
				["attack", {formula: "0d0 + " + (data.targetAC).toString(), title: `Attack - Target AC`}]
			]
		);
		// Add damage fields from each successful hit to the same card
		let showAttackRolls = game.settings.get("mob-attack-tool", "showIndividualAttackRolls");
		if (showAttackRolls) {
			for (let i = 0; i < numHitAttacks; i++) {
				await mobAttackRoll.addField(["damage",{index: "all"}]);
			}
		} else {
			let [diceFormulas, damageTypes, damageTypeLabels] = getDamageFormulaAndType(weaponData,isVersatile);
			for (let diceFormula of diceFormulas) {
				let damageRoll = new Roll(diceFormula, {mod: weaponData.actor.data.data.abilities[weaponData.abilityMod].mod});
				await damageRoll.alter(numHitAttacks, 0, {multiplyNumeric: true});
				await mobAttackRoll.addField(["damage", {formula: damageRoll.formula, damageType: damageTypes[diceFormulas.indexOf(diceFormula)], title: `Damage - ${damageTypes[diceFormulas.indexOf(diceFormula)]}`, isCrit: false}]);
			}
		}
		if (weaponData.data.data.consume.type === "ammo") {
			try {
				await mobAttackRoll.addField(["ammo",{name: weaponData.actor.items.get(weaponData.data.data.consume.target).name}]);
				await mobAttackRoll.toMessage();
			} catch (error) {
				console.error("Mob Attack Tool | There was an error while trying to add an ammo field (Better Rolls):",error);
				ui.notifications.error(`There was an error while trying to add an ammo field to this ${weaponData.name} attack.`);
			}
		} else {
			await mobAttackRoll.toMessage();
		}
		
	// neither midi-qol or betterrolls5e active
	} else if (!midi_QOL_Active) {
		for (let i = 0; i < numHitAttacks; i++) {
			await weaponData.rollDamage({"critical": false, "event": {"altKey": true}});	
			await new Promise(resolve => setTimeout(resolve, 300));						
		}

	// midi-qol is active,  betterrolls5e is not active
	} else {
		await new Promise(resolve => setTimeout(resolve, 300));

		let [diceFormulas, damageTypes, damageTypeLabels] = getDamageFormulaAndType(weaponData,isVersatile);
		let diceFormula = diceFormulas.join(" + ");
		let damageType = damageTypes.join(", ");
		let damageRoll = new Roll(diceFormula,{mod: weaponData.actor.data.data.abilities[weaponData.abilityMod].mod});
		await damageRoll.alter(numHitAttacks,0,{multiplyNumeric: true}).roll();

		if (game.modules.get("dice-so-nice")?.active) game.dice3d.showForRoll(damageRoll);
		let dmgWorkflow = new MidiQOL.DamageOnlyWorkflow(
			weaponData.options.actor, 
			data.targetToken, 
			damageRoll.total, 
			damageTypeLabels[0], 
			[data.targetToken], 
			damageRoll, 
			{
				flavor: `${weaponData.name} - Damage Roll (${damageType})`, 
				itemCardId: weaponData.itemCardId
			}
		);
	}
}


async function endGroupedMobTurn(data) {
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


async function formatMonsterLabel(monsterData) {
	let labelData = {
		actorAmount: `${monsterData.amount}x`,
		actorImg: monsterData.img,
		actorNameImg: monsterData.name.replace(" ","-"),
		actorName: monsterData.name
	};
	let monsterLabel = await renderTemplate('modules/mob-attack-tool/templates/mat-format-monster-label.html',labelData);
	return monsterLabel;
}


async function formatWeaponLabel(weapons, itemData) {
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
		let autoDetect = game.settings.get("mob-attack-tool","autoDetectMultiattacks");
		if (autoDetect > 0) [numAttacksTotal, preChecked] = getMultiattackFromActor(itemData.name, itemData.actor, weapons);
		if (autoDetect === 1 || isVersatile) preChecked = false;
		
		let labelData = {
			numAttacksName: `numAttacks${(itemData.id + ((isVersatile) ? ` (Versatile)` : ``)).replace(" ","-")}`,
			numAttack: numAttacksTotal,
			weaponImg: itemData.img,
			weaponNameImg: itemData.name.replace(" ","-"),
			weaponName: `${itemData.name}${((isVersatile) ? ` (Versatile)` : ``)}`,
			weaponAttackBonus: getAttackBonus(itemData),
			weaponDamageText: weaponDamageText,
			useButtonName: `use${(itemData.id + ((isVersatile) ? ` (Versatile)` : ``)).replace(" ","-")}`,
			useButtonValue: (preChecked) ? `checked` : ``
		};
		weaponLabel += await renderTemplate('modules/mob-attack-tool/templates/mat-format-weapon-label.html', labelData);
	}
	return weaponLabel;
}


function calcD20Needed(attackBonus, targetAC, rollTypeValue) {
	let d20Needed = targetAC - (attackBonus + rollTypeValue);
	if (d20Needed < 1) {
		return 1;
	} else if (d20Needed > 20) {
		return 20;
	} else {
		return d20Needed;
	}
}


function calcAttackersNeeded(d20Needed) {
	let attackersNeeded = 0;
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
	return attackersNeeded;
}


function isTargeted(token) {
	if (token.isTargeted) {
		let targetUsers = token.targeted.entries().next().value;
		for (let i = 0; i < targetUsers.length; i++) {
			if (targetUsers[i].id === game.user.id) {
				return true;
			}
		}
	};
}


function sendChatMessage(text) {
	// Check if Core version is 0.8 or newer:
	let coreVersion08x = parseInt(game.data.version.slice(2)) > 7;
	let whisperIDs = (coreVersion08x) ? game.users.contents.filter(u => u.isGM).map(u => u.id) : game.users.entities.filter(u => u.isGM).map(u => u.id);

	let chatData = {
		user: game.user.id,
		speaker: {alias: "Mob Attack Results"},
		content: text,
		whisper: whisperIDs
	};
	ChatMessage.create(chatData,{});
}


function getAttackBonus(weaponData) {
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


function getDamageFormulaAndType(weaponData, versatile) {
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