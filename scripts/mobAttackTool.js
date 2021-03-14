export function initMobAttackTool() {
	Hooks.on("getSceneControlButtons", (controls) => {
		const bar = controls.find(c => c.name === "token");
		bar.tools.push({
			name: "Mob Attack Tool",
			title: "Mob Attack",
			icon: "fas fa-dice",
			visible: game.user.isGM,
			onClick: () => mobAttackTool(),
			button: true
		});
	});
}

function mobAttackTool() {
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

	// Format tool dialog content
	const dialogContentStart = `<form id="multiattack-lm" class="dialog-content";>`;
	const dialogContentLabel = `<p>Choose weapon option:</p><p class="hint">You have selected ${numSelected} tokens. Your target has an AC of ${targetAC}.</p>`;
	const dialogContentEnd = `</form>`;
	let content = dialogContentStart + dialogContentLabel + `<div class="flexcol">`;

	// Show weapon options per selected token type
	let monsters = {};
	let weapons = {};
	for (let token of canvas.tokens.controlled) {
		if (monsters[token.actor.name]) {
			if (monsters[token.actor.name]._id == token.actor._id) {
				console.log("Mob Attack Tool | Actor already known.");
			}
		} else {
			monsters[token.actor.name] = token.actor;
			content += `<hr/>` + formatMonsterLabel(token.actor);
		}
		let items = token.actor.items.entries;
		items.forEach((item) => {
			if (item.data.type == "weapon") {
				if (weapons[item.data.name]) {
					if (weapons[item.data.name]._id == item._id) {
						console.log("Mob Attack Tool | Weapon already known.");
					}
				} else {
					weapons[item.data.name] = item;
					content += formatWeaponLabel(weapons,item.data);	
				}
			} else if (item.data.type == "spell" && item.data.data.level == 0 && item.data.data.damage.parts.length > 0 && item.data.data.save.ability === "") {
				if (weapons[item.data.name]) {
					if (weapons[item.data.name]._id == item._id) {
						console.log("Mob Attack Tool | Cantrip already known.");
					}
				} else {
					weapons[item.data.name] = item;
					content += formatWeaponLabel(weapons,item.data);
				}
			}
		});	
	}

	let selectRollTypeText =
		`<hr>
		<div><label>Select roll type: </label>
		<select id="rollType" name="rollType">
			<option value="advantage">Advantage</option>
			<option value="normal" selected>Normal</option>
			<option value="disadvantage">Disadvantage</option>
		</select></div>`;

	let exportToMacroText =
		`<hr>
		<div style="display:grid; grid-template-columns:100px 30px; column-gap:5px;">
		<label style="grid-column-start:1; grid-column-end:1; align-self:center;">Export to macro: </label>
		<input style="grid-column-start:2; grid-column-end:2; align-self:center;" type="checkbox" name="exportMobAttack" value="false"/>
		</div>`;

	content += `</div>` + ((game.settings.get(MODULE,"askRollType")) ? selectRollTypeText : ``);
	content += exportToMacroText + dialogContentEnd + `<br>`;

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

					for (let [weapon, weaponData] of Object.entries(weapons)) {
						if (html.find(`input[name="use` + weapon.replace(" ","-") + `"]`)[0].checked) {
							attacks[weapon] = numSelected;
							weaponLocators.push({"actorID": weaponData.actor._id, "weaponName": weaponData.name});
						}
					}

					let rollTypeValue = 0;
					let rollTypeMessage = ``;
					if (game.settings.get(MODULE,"askRollType")) {
						let rtValue = Math.floor(game.settings.get(MODULE,"rollTypeValue"));
						if (html.find("[name=rollType]")[0].value === "advantage") {
							rollTypeValue = rtValue;
							rollTypeMessage = ` + ${rtValue} [adv]`; 
						} else if (html.find("[name=rollType]")[0].value === "disadvantage") {
							rollTypeValue = -1 * rtValue;
							rollTypeMessage = ` - ${rtValue} [disadv]`;
						}
					}

					if (html.find(`input[name="exportMobAttack"]`)[0].checked) {
						let macroName = `${weapons[Object.keys(attacks)[0]].name} Mob Attack of ${canvas.tokens.controlled.length} ${canvas.tokens.controlled[0].name}(s)`;
						
						Macro.create({
							type: "script", 
							name: macroName,
							command: `MobAttacks.quickRoll({numSelected: ${numSelected}, weaponLocators: ${JSON.stringify(weaponLocators)}, attacks: ${JSON.stringify(attacks)}, rollTypeValue: ${rollTypeValue}, rollTypeMessage: "${rollTypeMessage}"})`,
							img: weapons[Object.keys(attacks)[0]].img,
						});
					ui.notifications.info(`Macro ${macroName} was saved to the macro directory`);
					}

					let mobAttackData = {
						"targetToken": targetToken,
						"targetAC": targetAC,
						"numSelected": numSelected,
						"weapons": weapons,
						"attacks": attacks,
						"rollTypeValue": rollTypeValue,
						"rollTypeMessage": rollTypeMessage
					};

					rollMobAttack(mobAttackData);
				}
			},
			two: {
				label: "Cancel",
				icon: `<i class="fas fa-times"></i>`
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
			return rollMobAttack(data);
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


async function rollMobAttack(data) {

	// Check for betterrolls5e and midi-qol
	let betterrollsActive = false;
	if (game.modules.get("betterrolls5e")?.active) betterrollsActive = true;
	let midi_QOL_Active = false;
	if (game.modules.get("midi-qol")?.active) midi_QOL_Active = true;

	for ( let [key, value] of Object.entries(data.attacks) ) { 
		const actorName = data.weapons[key].actor.name;
		const finalAttackBonus = getAttackBonus(data.weapons[key]);
		const d20Needed = calcD20Needed(finalAttackBonus, data.targetAC, data.rollTypeValue);
		const attackersNeeded = calcAttackersNeeded(d20Needed);

		if (data.numSelected / attackersNeeded >= 1) {
			const numHitAttacks = Math.floor(data.numSelected/attackersNeeded);
			const pluralOrNot = ((numHitAttacks == 1) ? " attack hits!" : " attacks hit!");

			// Mob attack results message
			sendChatMessage(
				`<strong>Mob Attack Results</strong>
				<table style="width:100%">
				<tr><td>Target: </td><td>${data.targetToken.name} (AC ${data.targetAC})</td></tr>
				<tr><td>d20 Needed: </td><td>${d20Needed} (+${finalAttackBonus} to hit${data.rollTypeMessage})</td></tr>
				</table>
				${data.numSelected} Attackers vs ${attackersNeeded} Needed
				<br><hr>
				<strong>Conclusion:</strong> ${numHitAttacks}${pluralOrNot}`
			);
			
			// betterrolls5e active
			if (betterrollsActive) {
				let mobAttackRoll = BetterRolls.rollItem(data.weapons[key], {},
					[
						["header"],
						["desc"],
						["attack", {triggersCrit: false, isCrit: false, formula: "0d0 + " + (data.targetAC).toString()}]
					]
				);
				// Add damage fields from each successful hit to the same card
				for (let i = 0; i < numHitAttacks; i++) {
					await mobAttackRoll.addField(["damage",{index: "all"}]);
				}
				await mobAttackRoll.addField(["ammo"]);
				await mobAttackRoll.toMessage();

			// neither midi-qol or betterrolls5e active
			} else if (!midi_QOL_Active) {
				for (let i = 0; i < numHitAttacks; i++) {
					await data.weapons[key].rollDamage({"critical": false, "event": {"shiftKey": true}});	
					await new Promise(resolve => setTimeout(resolve, 300));						
				}

			// midi-qol is active,  betterrolls5e is not active
			} else {
				let diceFormulas = [];
				let damageTypes = [];
				let damageTypeLabels = []
				for (let diceFormulaParts of data.weapons[key].data.data.damage.parts) {
					damageTypeLabels.push(diceFormulaParts[1]);
					damageTypes.push(diceFormulaParts[1].capitalize());
					diceFormulas.push(diceFormulaParts[0]);
				}
				let damageType = damageTypes.join(", ");
				let diceFormula = diceFormulas.join(" + ");
				let damageRoll = new Roll(diceFormula,{mod: data.weapons[key].actor.data.data.abilities[weapons[key].abilityMod].mod});
				damageRoll.alter(numHitAttacks,0,{multiplyNumeric: true}).roll();
				
				if (game.modules.get("dice-so-nice")?.active) game.dice3d.showForRoll(damageRoll);
				let dmgWorkflow = new MidiQOL.DamageOnlyWorkflow(data.weapons[key].actor, data.targetToken, damageRoll.total, damageTypes[0], [data.targetToken], damageRoll, {"flavor": `${key} - Damage Roll (${damageType})`, itemCardId: data.weapons[key].itemCardId});
			}
			await new Promise(resolve => setTimeout(resolve, 750));	
		} else {
			ui.notifications.warn("Attack bonus too low or not enough mob attackers to hit the target!");
		}
	}
}


function formatMonsterLabel(actorData) {
	let image = `<label><img src="${actorData.img}" title="${actorData.name.replace(" ","-")}" width="36" height="36" style="border:none; margin:0px 5px 0px 0px; grid-column-start:1 grid-column-end:2; align-self:center;"></label>`;
	let monsterName = `<label style="grid-column-start:2; grid-column-end:3; align-self:center; text-overflow:ellipsis; white-space:nowrap; overflow:hidden;">${actorData.name}</label>`;
	let monsterLabel = `<div style="display:grid; grid-template-columns:36px 240px 50px; column-gap:5px;">${image}${monsterName}</div>`;
	return monsterLabel;
}


function formatWeaponLabel(weapons,itemData) {
	let image = `<label style="grid-column-start:2; grid-column-end:3; align-self:center;"><img src="${itemData.img}" title="${itemData.name.replace(" ","-")}" width="30" height="30" style="margin:0px 5px 0px 0px; border:none;"></label>`;
	let weaponAttackBonus = `<label class="hint" style="grid-column-start:4; grid-column-end:5; align-self:center;">+${getAttackBonus(weapons[itemData.name])} to hit</label>`;
	let damageData = getWeaponDamage(weapons[itemData.name]);
	let weaponDamageText = ``;
	for (let i = 0; i < damageData[0].length; i++) {
		((i > 0) ? weaponDamageText += `<br>${damageData[0][i]} ${damageData[1][i].capitalize()}` : weaponDamageText += `${damageData[0][i]} ${damageData[1][i].capitalize()}`);
	}
	let weaponDamage = `<label class="hint" style="white-space: pre-wrap; grid-column-start:5; grid-column-end:6; align-self:center; text-align:center;">${weaponDamageText}</label>`;
	let weaponName = `<label style="grid-column-start:3; grid-column-end:4; align-self:center; text-overflow:ellipsis; white-space:nowrap; overflow:hidden;">${itemData.name}</label>`;
	let useButton = `<input type="checkbox" name="use${itemData.name.replace(" ","-")}" style="grid-column-start:6; grid-column-end:7; align-self: center;"/>`;

	let weaponLabel =  `<div style="display:grid; grid-template-columns:10px 30px 130px 60px 130px 30px; column-gap:5px;"><label style="grid-column-start:1; grid-column-end:2; align-self:center;"></label>${image}${weaponName}${weaponAttackBonus}${weaponDamage}${useButton}</div>`;
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
			if (targetUsers[i]._id === game.user.id) {
				return true;
			}
		}
	};
}


function sendChatMessage(text) {
	let chatData = {
		user: game.user.id,
		speaker: game.user,
		content: text,
		whisper: game.users.entities.filter(u => u.isGM).map(u => u._id),
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


function getWeaponDamage(weaponData) {
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
	let diceFormula = [];
	let damageType = [];
	for (let i = 0; i < weaponData.data.data.damage.parts.length; i++) {
		let diceFormulaParts = weaponData.data.data.damage.parts[i];
		if (weaponData.type == "spell") {
			if (weaponData.data.data.scaling.mode == "cantrip") {
				let rollFormula = new Roll(diceFormulaParts[0],{mod: weaponData.actor.data.data.abilities[weaponData.abilityMod].mod});
				rollFormula.alter(0,cantripScalingFactor,{multiplyNumeric: false})
				diceFormula.push(rollFormula.formula);
			} else {
				diceFormula.push(diceFormulaParts[0].replace("@mod",weaponData.actor.data.data.abilities[weaponData.abilityMod].mod));
			}
		} else {
			diceFormula.push(diceFormulaParts[0].replace("@mod",weaponData.actor.data.data.abilities[weaponData.abilityMod].mod));
		}
		damageType.push(diceFormulaParts[1]);
	}
	return [diceFormula, damageType];
}