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
			}
		}

		// Check if Core is 0.8.x or even newer
		let coreVersion08x = parseInt(game.data.version.slice(2)) > 7;
		let items = (coreVersion08x) ? token.actor.items.contents : token.actor.items.entries;

		for (let item of items) {
			if (item.data.type == "weapon" || (item.data.type == "spell" && item.data.data.level == 0 && item.data.data.damage.parts.length > 0 && item.data.data.save.ability === "")) {
				if (weapons[item.data.name]) {
					if (weapons[item.data.name].id === item.id) {
						availableAttacks[item.data.name] += 1;
						// console.log("Mob Attack Tool | Weapon already known.");
					}
				} else {
					weapons[item.data.name] = item;
					availableAttacks[item.data.name] = 1;
					content += await formatWeaponLabel(weapons, item.data, false);
				}
			}
		};	
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
					for (let [weapon, weaponData] of Object.entries(weapons)) {
						if (html.find(`input[name="use` + weapon.replace(" ","-") + `"]`)[0].checked) {
							numAttacksMultiplier = parseInt(html.find(`input[name="numAttacks${weapon.replace(" ","-")}"]`)[0].value);
							if (numAttacksMultiplier === NaN) {
								numAttacksMultiplier = 0;
							}
							attacks[weapon] = availableAttacks[weapon] * numAttacksMultiplier;
							weaponLocators.push({"actorID": weaponData.actor.id, "weaponName": weaponData.name});
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
						let macroName = `${weapons[Object.keys(attacks)[0]].name} Mob Attack of ${canvas.tokens.controlled.length} ${canvas.tokens.controlled[0].name}(s)`;
						
						Macro.create({
							type: "script", 
							name: macroName,
							command: `MobAttacks.quickRoll({numSelected: ${numSelected}, weaponLocators: ${JSON.stringify(weaponLocators)}, attacks: ${JSON.stringify(attacks)}, withAdvantage: ${withAdvantage}, withDisadvantage: ${withDisadvantage}, rollTypeValue: ${rollTypeValue}, rollTypeMessage: "${rollTypeMessage}", endMobTurn: ${endMobTurn}})`,
							img: weapons[Object.keys(attacks)[0]].img,
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
						"endMobTurn": endMobTurn
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
		data.weaponLocators.forEach(locator => {
			attacker = game.actors.get(locator["actorID"]);
			weapon = attacker.items.getName(locator["weaponName"])
			weapons[weapon.name] = weapon;
		})
		data["weapons"] = weapons;

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

	// Check for betterrolls5e and midi-qol
	let betterrollsActive = false;
	if (game.modules.get("betterrolls5e")?.active) betterrollsActive = true;
	let midi_QOL_Active = false;
	if (game.modules.get("midi-qol")?.active) midi_QOL_Active = true;

	// Cycle through selected weapons
	for ( let [key, value] of Object.entries(data.attacks) ) {
		const actorName = data.weapons[key].actor.name;
		const finalAttackBonus = getAttackBonus(data.weapons[key]);

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
			} else if (attackRollEvaluated[i].total >= data.targetAC && attackRollEvaluated[i].total - finalAttackBonus > 1) {
				numHitAttacks += 1;
				successfulAttackRolls.push(attackRollEvaluated[i]);
			}
		}
		
		const critMsg = (numCrits > 0) ? `, ${numCrits} of them critically` : ``;
		const pluralOrNot = ((numHitAttacks == 1) ? ` attack hits${(numCrits > 0) ? ` critically` : ``}!` : ` attacks hit${critMsg}!`);
		const targetACtext = game.user.isGM ? ` (AC ${data.targetAC})` : ``;

		// Mob attack results message
		let msgData = {
			targetName: data.targetToken.name,
			targetACtext: targetACtext,
			finalAttackBonus: finalAttackBonus,
			weaponName: key,
			availableAttacks: availableAttacks,
			numSelected: data.numSelected,
			attackUseText: (availableAttacks === 1) ? ` uses a ${key} attack` : `s use ${key} attacks`,
			numHitAttacks: numHitAttacks,
			pluralOrNot: pluralOrNot
		}
		let msgText = await renderTemplate('modules/mob-attack-tool/templates/mat-msg-individual-rolls.html', msgData);
		sendChatMessage(msgText);

		// Process attack and damage rolls
		if (numHitAttacks != 0) {
			// Better Rolls 5e active
			if (betterrollsActive) {
				let mobAttackRoll = BetterRolls.rollItem(data.weapons[key], {},
					[
						["header"],
						["desc"]
					]
				);
				let attackFieldOptions = {};
				let damageFieldOptions = {};
				let showAttackRolls = game.settings.get("mob-attack-tool", "showIndividualAttackRolls");
				for (let i = 0; i < numHitAttacks; i++) {
					if (successfulAttackRolls[i].total - finalAttackBonus == 20 && numCrits > 0) {
						let attackFormula = showAttackRolls ? "0d0 + " + (successfulAttackRolls[i].total).toString() : "0d0 + " + (data.targetAC).toString();
					 	attackFieldOptions =  {formula: attackFormula, forceCrit: true};
						damageFieldOptions = {index: "all", isCrit: true};
						numCrits--;
						console.log("attack data:",successfulAttackRolls[i].total, "num crits remaining:",numCrits);
					} else {
						let attackFormula = showAttackRolls ? "0d0 + " + (successfulAttackRolls[i].total).toString() : "0d0 + " + (data.targetAC).toString();
					 	attackFieldOptions = {formula: attackFormula};
					 	damageFieldOptions = {index: "all", isCrit: false};
					}
					if (i === 0 || showAttackRolls) await mobAttackRoll.addField(["attack", attackFieldOptions]);
					await mobAttackRoll.addField(["damage", damageFieldOptions]);
				}
				if (data.weapons[key].data.data.consume.type === "ammo") {
					try {
						await mobAttackRoll.addField(["ammo", {name: data.weapons[key].actor.items.get(data.weapons[key].data.data.consume.target).name}]);	
						await mobAttackRoll.toMessage();
					} catch (error) {
						console.error("Mob Attack Tool | There was an error while trying to add an ammo field (Better Rolls):",error);
						ui.notifications.error(`There was an error while trying to add an ammo field to this ${key} attack.`);
					}
				} else {
					await mobAttackRoll.toMessage();
				}
				

			// Midi-QOL active, Better Rolls inactive
			} else if (midi_QOL_Active) {
				await new Promise(resolve => setTimeout(resolve, 300));
				let [diceFormulas, damageTypes, damageTypeLabels] = getDamageFormulaAndType(data.weapons[key],false);

				let diceFormula = diceFormulas.join(" + ");
				let damageType = damageTypes.join(", ");
				let damageRoll = new Roll(diceFormula, {mod: data.weapons[key].actor.data.data.abilities[data.weapons[key].abilityMod].mod});

				//TODO: use better crit formula
				await damageRoll.alter(numHitAttacks, numCrits, {multiplyNumeric: true}).roll();
				
				if (game.modules.get("dice-so-nice")?.active) game.dice3d.showForRoll(damageRoll);
				
				//TODO: find out how to properly tell MidiQOL about multiple damage types
				new MidiQOL.DamageOnlyWorkflow(
					data.weapons[key].options.actor, 
					data.targetToken, 
					damageRoll.total, 
					damageTypeLabels[0], 
					[data.targetToken], 
					damageRoll, 
					{
						flavor: `${key} - Damage Roll (${damageType})${(numCrits > 0) ? ` (Crit included)` : ``}`, 
						itemData: data.weapons[key], 
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
								flavor: `${data.weapons[key].name} - Attack Roll`,
								speaker: {
									actor: data.weapons[key].actor.id,
									alias: data.weapons[key].actor.name
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
					await data.weapons[key].rollDamage(damageOptions);
				}
			}
		}
	await new Promise(resolve => setTimeout(resolve, 750));	
	}
	if (data.endMobTurn) {
		await endGroupedMobTurn(data);
	}
}


async function rollMobAttack(data) {

	// Check for betterrolls5e and midi-qol
	let betterrollsActive = false;
	if (game.modules.get("betterrolls5e")?.active) betterrollsActive = true;
	let midi_QOL_Active = false;
	if (game.modules.get("midi-qol")?.active) midi_QOL_Active = true;

	// Cycle through selected weapons
	for ( let [key, value] of Object.entries(data.attacks) ) { 
		const actorName = data.weapons[key].actor.name;
		const finalAttackBonus = getAttackBonus(data.weapons[key]);
		const d20Needed = calcD20Needed(finalAttackBonus, data.targetAC, data.rollTypeValue);
		const attackersNeeded = calcAttackersNeeded(d20Needed);

		// Check whether how many attackers can use this weapon
		let availableAttacks = data.numSelected;
		if (!game.settings.get("mob-attack-tool","shareWeapons")) {
			availableAttacks = value;
		}
		
		// Process hit attacks
		if (availableAttacks / attackersNeeded >= 1) {
			const numHitAttacks = Math.floor(availableAttacks/attackersNeeded);
			const pluralOrNot = ((numHitAttacks == 1) ? " attack hits!" : " attacks hit!");
			const targetACtext = game.user.isGM ? ` (AC ${data.targetAC})` : ``;

			// Mob attack results message
			let msgData = {
				targetName: data.targetToken.name,
				targetACtext: targetACtext,
				d20Needed: d20Needed,
				finalAttackBonus: finalAttackBonus,
				weaponName: key,
				availableAttacks: availableAttacks,
				attackersNeeded: attackersNeeded,
				numSelected: data.numSelected,
				numHitAttacks: numHitAttacks,
				pluralOrNot: pluralOrNot
			}
			let msgText = await renderTemplate('modules/mob-attack-tool/templates/mat-msg-mob-rules.html', msgData);
			sendChatMessage(msgText);
			
			// betterrolls5e active
			if (betterrollsActive) {
				let mobAttackRoll = BetterRolls.rollItem(data.weapons[key], {},
					[
						["header"],
						["desc"],
						["attack", {formula: "0d0 + " + (data.targetAC).toString()}]
					]
				);
				// Add damage fields from each successful hit to the same card
				for (let i = 0; i < numHitAttacks; i++) {
					await mobAttackRoll.addField(["damage",{index: "all"}]);
				}
				if (data.weapons[key].data.data.consume.type === "ammo") {
					try {
						await mobAttackRoll.addField(["ammo",{name: data.weapons[key].actor.items.get(data.weapons[key].data.data.consume.target).name}]);
						await mobAttackRoll.toMessage();
					} catch (error) {
						console.error("Mob Attack Tool | There was an error while trying to add an ammo field (Better Rolls):",error);
						ui.notifications.error(`There was an error while trying to add an ammo field to this ${key} attack.`);
					}
				} else {
					await mobAttackRoll.toMessage();
				}
				
			// neither midi-qol or betterrolls5e active
			} else if (!midi_QOL_Active) {
				for (let i = 0; i < numHitAttacks; i++) {
					await data.weapons[key].rollDamage({"critical": false, "event": {"altKey": true}});	
					await new Promise(resolve => setTimeout(resolve, 300));						
				}

			// midi-qol is active,  betterrolls5e is not active
			} else {
				await new Promise(resolve => setTimeout(resolve, 300));

				let [diceFormulas, damageTypes, damageTypeLabels] = getDamageFormulaAndType(data.weapons[key],false);
				let diceFormula = diceFormulas.join(" + ");
				let damageType = damageTypes.join(", ");
				let damageRoll = new Roll(diceFormula,{mod: data.weapons[key].actor.data.data.abilities[data.weapons[key].abilityMod].mod});
				await damageRoll.alter(numHitAttacks,0,{multiplyNumeric: true}).roll();

				if (game.modules.get("dice-so-nice")?.active) game.dice3d.showForRoll(damageRoll);
				let dmgWorkflow = new MidiQOL.DamageOnlyWorkflow(
					data.weapons[key].options.actor, 
					data.targetToken, 
					damageRoll.total, 
					damageTypeLabels[0], 
					[data.targetToken], 
					damageRoll, 
					{
						flavor: `${key} - Damage Roll (${damageType})`, 
						itemCardId: data.weapons[key].itemCardId
					}
				);
			}
			await new Promise(resolve => setTimeout(resolve, 750));	
		} else {
			ui.notifications.warn("Attack bonus too low or not enough mob attackers to hit the target!");
		}
	}

	if (data.endMobTurn) {
		await endGroupedMobTurn(data);
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


async function formatWeaponLabel(weapons, itemData, isVersatile) {	
	let damageData = getDamageFormulaAndType(weapons[itemData.name], isVersatile);
	let weaponDamageText = ``;
	for (let i = 0; i < damageData[0].length; i++) {
		((i > 0) ? weaponDamageText += `<br>${damageData[0][i]} ${damageData[1][i].capitalize()}` : weaponDamageText += `${damageData[0][i]} ${damageData[1][i].capitalize()}`);
	}

	let labelData = {
		numAttacksName: `numAttacks${(itemData.name + ((isVersatile) ? ` (Versatile)` : ``)).replace(" ","-")}`,
		numAttack: 1,
		weaponImg: itemData.img,
		weaponNameImg: itemData.name.replace(" ","-"),
		weaponName: itemData.name + ((isVersatile) ? ` (Versatile)` : ``),
		weaponAttackBonus: getAttackBonus(weapons[itemData.name]),
		weaponDamageText: weaponDamageText,
		useButtonName: `use${(itemData.name + ((isVersatile) ? ` (Versatile)` : ``)).replace(" ","-")}`
	};
	let weaponLabel = await renderTemplate('modules/mob-attack-tool/templates/mat-format-weapon-label.html', labelData);
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
		speaker: game.user,
		content: text,
		whisper: whisperIDs
	};
	ChatMessage.create(chatData,{});
}


function getAttackBonus(weaponData) {
	const actorName = weaponData.actor.name;
	let weaponAbility = weaponData.abilityMod;
	if (weaponAbility === "" || typeof weaponAbility === "undefined" || weaponAbility == null) {
		if (!weaponData.type == "spell") {
			weaponAbility =  "str";
		} else {
			weaponAbility = weaponData.actor.data.data.attributes.spellcasting;
		}
	}
	const actorAbilityMod = parseInt(weaponData.actor.data.data.abilities[weaponAbility].mod);
	const attackBonus = parseInt(weaponData.data.data.attackBonus);
	let profBonus;
	if (!weaponData.type == "spell") {
		profBonus = parseInt(((weaponData.data.data.proficient) ? weaponData.actor.data.data.attributes.prof : 0));
	} else {
		profBonus = parseInt(weaponData.actor.data.data.attributes.prof);
	}
	let finalAttackBonus = actorAbilityMod + attackBonus + profBonus;

	return finalAttackBonus;
}


function getScalingFactor(weaponData) {
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
	for (let diceFormulaParts of weaponData.data.data.damage.parts) {
		damageTypeLabels.push(diceFormulaParts[1]);
		damageTypes.push(diceFormulaParts[1].capitalize());
		if (weaponData.type == "spell") {
			if (weaponData.data.data.scaling.mode == "cantrip") {
				let rollFormula = new Roll(((versatile) ? weaponData.data.data.damage.versatile : diceFormulaParts[0]),{mod: weaponData.actor.data.data.abilities[weaponData.abilityMod].mod});
				rollFormula.alter(0,cantripScalingFactor,{multiplyNumeric: false})
				diceFormulas.push(rollFormula.formula);
			} else {
				diceFormulas.push(((versatile) ? weaponData.data.data.damage.versatile : diceFormulaParts[0]).replace("@mod",weaponData.actor.data.data.abilities[weaponData.abilityMod].mod));
			}
		} else {
			diceFormulas.push(((versatile) ? weaponData.data.data.damage.versatile : diceFormulaParts[0]).replace("@mod",weaponData.actor.data.data.abilities[weaponData.abilityMod].mod));
		}
	}
	return [diceFormulas, damageTypes, damageTypeLabels];
}