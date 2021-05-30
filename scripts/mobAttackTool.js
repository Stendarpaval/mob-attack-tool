import { moduleName, coreVersion08x } from "./mobAttack.js";
import { checkTarget, formatMonsterLabel, formatWeaponLabel, getDamageFormulaAndType, calcD20Needed, calcAttackersNeeded, isTargeted, sendChatMessage, getAttackBonus, getScalingFactor } from "./utils.js";
import { rollMobAttackIndividually, processIndividualDamageRolls } from "./individualRolls.js";
import { rollMobAttack, processMobRulesDamageRolls } from "./mobRules.js";
import { getMultiattackFromActor } from "./multiattack.js";


export function initMobAttackTool() {
	Hooks.on("getSceneControlButtons", (controls) => {
		const playerAccess = game.settings.get(moduleName,"playerAccess");
		const bar = controls.find(c => c.name === "token");
		bar.tools.push({
			name: game.i18n.localize("MAT.name"),
			title: game.i18n.localize("MAT.mobAttack"),
			icon: "fas fa-dice",
			visible: (playerAccess ? true : game.user.isGM),
			onClick: async () => mobAttackTool(),
			button: true
		});
	});
}


async function mobAttackTool() {

	// Check selected tokens
	let mobList = game.settings.get(moduleName,"hiddenMobList");
	if (canvas.tokens.controlled.length === 0 && Object.keys(mobList).length === 0) {
		ui.notifications.warn(game.i18n.localize("MAT.selectTokenWarning"));
		return;
	}

	// Check targeted token
	if (!checkTarget()) return;
	let targetToken = canvas.tokens.objects.children.filter(isTargeted)[0];
	let targetAC;
	if (targetToken) {
		targetAC = targetToken.actor.data.data.attributes.ac.value;
	}

	let numSelected = canvas.tokens.controlled.length;
	let pluralTokensOrNot = ((numSelected === 1) ? `` : `s`);

	if (canvas.tokens.controlled.length > 0 || Object.keys(mobList).length === 0) {
		await game.settings.set(moduleName,'hiddenMobName',`Mob of ${canvas.tokens.controlled[0].name}`);
	} else {
		await game.settings.set(moduleName,'hiddenMobName',`${Object.keys(mobList)[0]}`);
	}

	// Format tool dialog content
	const dialogContentStart = `<form id="mobattack-tool" class="mat-dialog-content";>`;
	const dialogMobSelectionData = {mobName: game.settings.get('mob-attack-tool','hiddenMobName')};
	const dialogMobSelection = await renderTemplate('modules/mob-attack-tool/templates/mat-dialog-mob-selection.html', dialogMobSelectionData);
	const targetACtext = ((game.user.isGM && targetToken) ? ` ${game.i18n.localize("MAT.dialogTargetArmorClassMessage")} ${targetAC}.` : (!targetToken) ? ` ${game.i18n.localize("MAT.noTargetAllAttacksHitText")}` : ``);
	const dialogContentLabel = `<p>${game.i18n.localize("MAT.dialogChooseWeaponOption")}:</p><p class="hint">${game.i18n.localize("MAT.dialogNumSelected")} ${numSelected} token${pluralTokensOrNot}.${targetACtext}</p>`;
	const dialogContentEnd = `</form>`;
	
	let content = dialogContentStart + dialogMobSelection + dialogContentLabel + `<p class="hint">${game.i18n.localize("MAT.dialogClickIconText")}</p><div name="mobListOptions">`;

	// Show weapon options per selected token type
	let monsters = {};
	let weapons = {};
	let availableAttacks = {};
	let actorList = [];
	if (canvas.tokens.controlled.length > 0 || Object.keys(mobList).length === 0) {
		for (let token of canvas.tokens.controlled) {
			actorList.push(token.actor);
		}
	} else {
		for (let monster of mobList[Object.keys(mobList)[0]].monsters) {
			for (let i = 0; i < monster.amount; i++) {
				actorList.push(game.actors.get(monster.id));	
			}
		}
	}

	[content, monsters, weapons, availableAttacks] = await prepareMonstersAndWeapons(content, actorList, monsters, weapons, availableAttacks);
	let dialogOptions = {selectRollType: game.settings.get(moduleName,"askRollType"), endMobTurn: game.settings.get(moduleName,"endMobTurn")};
	let dialogOptionsText = await renderTemplate('modules/mob-attack-tool/templates/mat-dialog-options.html', dialogOptions);
	content += `</div><hr>` + dialogOptionsText + dialogContentEnd + `<hr>`;

	const dialog = await MobAttackDialog.create(weapons, availableAttacks, targetToken, targetAC, numSelected, monsters, {content: content});
}


async function prepareMonstersAndWeapons(content, actors, monsters, weapons, availableAttacks) {
	for (let actor of actors) {
		if (monsters[actor.id]) {
			if (monsters[actor.id].id == actor.id) {
				monsters[actor.id].amount += 1;
			}
		} else {
			monsters[actor.id] = {id: actor.id, amount: 1, optionVisible: false, img: actor.img, name: actor.name};
		}
	}

	for (let actor of actors) {
		if (monsters[actor.id]) {
			if (!monsters[actor.id].optionVisible) {
				content += `<hr>` + await formatMonsterLabel(monsters[actor.id]);
				monsters[actor.id].optionVisible = true;
				if (game.settings.get(moduleName, "showMultiattackDescription")) {
					if (actor.items[(coreVersion08x()) ? "contents" : "entries"].filter(i => i.name.startsWith("Multiattack")).length > 0) {
						content += `<div class="hint">${actor.items.filter(i => i.name.startsWith("Multiattack"))[0].data.data.description.value}</div>`;
					} else if (actor.items[(coreVersion08x()) ? "contents" : "entries"].filter(i => i.name.startsWith("Extra Attack")).length > 0) {
						content += `<div class="hint">${actor.items.filter(i => i.name.startsWith("Extra Attack"))[0].data.data.description.value}</div>`;
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
			content += await formatWeaponLabel(weaponData, actorWeapons, options);
		}
	}

	await game.settings.set(moduleName,'hiddenDialogContent',content);

	return [content, monsters, weapons, availableAttacks];
}


class MobAttackDialog extends Dialog {
	constructor(weapons, availableAttacks, targetToken, targetAC, numSelected, monsters, dialogData={}, options={}) {
		super(dialogData, options);
		this.options.classes = ["mat-monster-icon", "mat-weapon-icon"];
		let weaponArray = [];
		for (let [weaponID, weaponData] of Object.entries(weapons)) {
			weaponArray.push(weaponData);
		}
		let monsterArray = [];
		for (let [monsterID, monsterData] of Object.entries(monsters)) {
			monsterArray.push(monsterData);
		}
		this.weapons = {...weapons};
		this.monsterArray = monsterArray;
		this.weaponArray = weaponArray;
		game.settings.set(moduleName, "hiddenChangedMob", false);
	}


	activateListeners(html) {
		super.activateListeners(html);

		// render the item's sheet if its image is clicked
		html.on('click', '.mat-weapon-icon', (event) => {
			const weapon = this.weaponArray.find((weapon) => weapon.id === event.currentTarget.dataset?.itemId);
			weapon?.sheet.render(true);
		})
		// render the mob attacker's sheet if its image is clicked
		html.on('click', '.mat-monster-icon', (event) => {
			const monster = this.monsterArray.find((monster) => monster.id === event.currentTarget.dataset?.itemId);
			game.actors.get(monster?.id)?.sheet.render(true);
		})

		// save the current mob
		async function saveMobList(mobList, mobName, monsterArray, numSelected) {
			mobList[mobName] = {mobName: mobName, monsters: monsterArray, numSelected: numSelected, userId: game.user.id};
			await game.settings.set(moduleName,"hiddenMobList",mobList);	
			ui.notifications.info(game.i18n.format("MAT.savedMobNotify",{mobName: mobName}));
		}

		html.on('click', '.saveMobButton', async (event) => {
			let mobList = game.settings.get(moduleName,"hiddenMobList");
			let mobName = html.find(`input[name="mobName"]`)[0].value;
			if (!Object.keys(mobList).includes(mobName)) {
				await saveMobList(mobList, mobName, this.monsterArray, canvas.tokens.controlled.length);
			} else {
				new Dialog({
					title: "Save Mob",
					content: `<p>${game.i18n.format("MAT.overwriteMobDialog",{mobName: mobName})}</p>`,
					buttons: {
						yes: {
							label: game.i18n.localize("Yes"),
							icon: `<i class="fa fa-check"></i>`,
							callback: async () => {
								await saveMobList(mobList, mobName, this.monsterArray, canvas.tokens.controlled.length);
							}
						},
						no: {
							label: game.i18n.localize("No"),
							icon: `<i class="fa fa-times"></i>`
						}
					},
					default: "yes"
				}).render(true);
			}	
		})

		// load a previously saved mob
		html.on('click', '.loadMobButton', async (event) => {
			let mobList = game.settings.get(moduleName,"hiddenMobList");
			for (let [key,value] of Object.entries(mobList)) {
				if (mobList[key].userId === game.user.id) {
					mobList[key]["visible"] = true;
				} else {
					mobList[key]["visible"] = false;
				}
			}
			let dialogMobList = await renderTemplate('modules/mob-attack-tool/templates/mat-dialog-mob-list.html', mobList);
			let initialMobName = html.find(`input[name="mobName"]`)[0].value;

			let selectedMob = await new Promise((resolve) => {
				new Dialog({
					title: game.i18n.localize("MAT.selectMob"),
					content: dialogMobList,
					buttons: {
						select: {
							label: game.i18n.localize("Select"),
							icon: `<i class="fa fa-check"></i>`,
							callback: async (html) => {
								let mobSelected = html.find(`[name="selectMob"]`)[0].value;
								if (html.find(`input[name="resetMobs"]`)[0].checked) {
									await game.settings.set("mob-attack-tool","hiddenMobList",{});
									ui.notifications.info(game.i18n.localize("MAT.resetMobsNotify"));
									mobSelected = initialMobName;
									await game.settings.set(moduleName,'hiddenMobName',mobSelected);
								}
								resolve(mobSelected);
							}
						}
					},
					default: "select"
				}).render(true);
			});
			if (selectedMob === initialMobName || selectedMob === "" || game.settings.get(moduleName,"hiddenMobList") === {}) return;
			await game.settings.set(moduleName, "hiddenChangedMob", true);
			html.find(`input[name="mobName"]`)[0].value = selectedMob;
			await game.settings.set(moduleName,'hiddenMobName',selectedMob);
			
			let mobData = mobList[selectedMob];
			let weapons = {}, monsters = {}, availableAttacks = {};
			let newContent = ``;
			let actorList = [];
			for (let monster of mobData.monsters) {
				for (let i = 0; i < monster.amount; i++) {
					actorList.push(game.actors.get(monster.id));	
				}
			}
			[newContent, monsters, weapons, availableAttacks] = await prepareMonstersAndWeapons(newContent, actorList, monsters, weapons, availableAttacks);
			
			mobList[selectedMob]["weapons"] = weapons;
			await game.settings.set(moduleName,"hiddenMobList",mobList);

			html.find(`div[name="mobListOptions"]`)[0].innerHTML = newContent;	
		})
	}


	async _updateObject(event, formData) {
		console.log(event);
		console.log(formData);
	}


	static async executeMobAttack(html, weapons, availableAttacks, targetToken, targetAC, numSelected, monsters) {
		let mobList = game.settings.get(moduleName,"hiddenMobList");
		if (game.settings.get("mob-attack-tool", "hiddenChangedMob")) {
			html.find(`div[name="mobListOptions"]`)[0].innerHTML = game.settings.get(moduleName,'hiddenDialogContent');
			let mobName = game.settings.get(moduleName,'hiddenMobName');
			let mobData = mobList[mobName];
			let actorList = [];
			for (let monster of mobData.monsters) {
				for (let i = 0; i < monster.amount; i++) {
					actorList.push(game.actors.get(monster.id));	
				}
			}
			let content = ``;
			monsters = {}; 
			weapons = {};
			availableAttacks = {};
			numSelected = mobData.numSelected;
			[content, monsters, weapons, availableAttacks] = await prepareMonstersAndWeapons(content, actorList, monsters, weapons, availableAttacks);
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

		// Create macro
		if (html.find(`input[name="exportMobAttack"]`)[0].checked) {
			let key = Object.keys(attacks)[0];
			if (key.endsWith(`(${game.i18n.localize("Versatile")})`)) key = key.slice(0,key.indexOf(` (${game.i18n.localize("Versatile")})`));
			let macroName;
			if (canvas.tokens.controlled.length > 0 || Object.keys(mobList).length === 0) {
				macroName = `${weapons[key].name} ${game.i18n.localize("MAT.macroNamePrefix")} ${canvas.tokens.controlled.length} ${canvas.tokens.controlled[0].name}${game.i18n.localize("MAT.macroNamePostfix")}`;
			} else {
				macroName = `${weapons[key].name} ${game.i18n.localize("MAT.macroNamePrefix")} ${mobList[Object.keys(mobList)[0]].numSelected} ${Object.keys(mobList)[0]}${game.i18n.localize("MAT.macroNamePostfix")}`;
			}

			if (game.settings.get(moduleName, "hiddenChangedMob")) {
				numSelected = mobList[Object.keys(mobList)[0]].numSelected;
			}
			
			Macro.create({
				type: "script", 
				name: macroName,
				command: `MobAttacks.quickRoll({numSelected: ${numSelected}, weaponLocators: ${JSON.stringify(weaponLocators)}, attacks: ${JSON.stringify(attacks)}, withAdvantage: ${withAdvantage}, withDisadvantage: ${withDisadvantage}, rollTypeValue: ${rollTypeValue}, rollTypeMessage: "${rollTypeMessage}", endMobTurn: ${endMobTurn}, monsters: ${JSON.stringify(monsters)}})`,
				img: weapons[key].img,
			});
		ui.notifications.info(`Macro ${macroName} ${game.i18n.localize("MAT.macroNotification")}`);
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

		if (game.settings.get(moduleName,"mobRules") === 0) {
			rollMobAttack(mobAttackData);
		} else {
			rollMobAttackIndividually(mobAttackData);
		}
	}

	static async create(weapons, availableAttacks, targetToken, targetAC, numSelected, monsters, {content}) {
		let html = content;
		return new Promise((resolve) => {
			const dialog = new this(weapons, availableAttacks, targetToken, targetAC, numSelected, monsters, {
				title: game.i18n.localize("MAT.name"),
				content: html,
				buttons: {
					one: {
						icon: `<i class="fas fa-fist-raised"></i>`,
						label: game.i18n.localize("MAT.mobAttack"),
						callback: html => {
							this.executeMobAttack(html, weapons, availableAttacks, targetToken, targetAC, numSelected, monsters);
							resolve([]);
						}
					}
				},
				default: "one",
				close: () => resolve([])
			},{width: 430, height: "auto"});
			dialog.render(true);
		});
	}
}


export function MobAttacks() {
	function quickRoll(data) {
		if (!checkTarget()) return; 
		
		// Collect necessary data for mob attack
		if (!checkTarget()) return;
		let targetToken = canvas.tokens.objects.children.filter(isTargeted)[0];
		let targetAC;
		if (targetToken) {
			targetAC = targetToken.actor.data.data.attributes.ac.value;
		}
		data["targetToken"] = targetToken;
		data["targetAC"] = targetAC;

		let weapons = {};
		let attacker, weapon;
		let attacks = {}, oldMacroCompatibility = false;
		data.weaponLocators.forEach(locator => {
			attacker = game.actors.get(locator["actorID"]);
			weapon = attacker.items.getName(locator["weaponName"])
			weapons[weapon.id] = weapon;

			// compatibility with macros from before v0.1.21:
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
			if (game.settings.get(moduleName, "mobRules") === 0) {
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