import { moduleName, coreVersion08x } from "./mobAttack.js";
import { checkTarget, prepareMonsters, prepareMobAttack, formatMonsterLabel, formatWeaponLabel, getDamageFormulaAndType, calcD20Needed, calcAttackersNeeded, isTargeted, sendChatMessage, getAttackBonus, getScalingFactor } from "./utils.js";
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

	let selectedTokens = canvas.tokens.controlled;
	let numSelected = selectedTokens.length;
	let pluralTokensOrNot = ((numSelected === 1) ? `` : `s`);

	if (canvas.tokens.controlled.length > 0 || Object.keys(mobList).length === 0) {
		await game.settings.set(moduleName,'hiddenMobName',`Mob of ${canvas.tokens.controlled[0].name}`);
	} else {
		await game.settings.set(moduleName,'hiddenMobName',`${Object.keys(mobList)[0]}`);
	}

	const mobDialog = new MobAttackDialog(targetToken, targetAC, selectedTokens, numSelected).render(true);

}



class MobAttackDialog extends FormApplication {
	constructor(targetToken, targetAC, selectedTokens, numSelected, dialogData={}, options={}) {
		super(dialogData, options);
		this.data = dialogData;
		this.options.classes = ["mat-monster-icon", "mat-weapon-icon"];
		this.selectedTokens = selectedTokens;
		this.numSelected = numSelected;
		this.targetToken = targetToken;
		this.targetAC = targetAC;
		this.actorList = [];
		this.mobListIndex = 0;
		this.armorClassMod = (game.user.getFlag(moduleName,"persistACmod") ?? game.settings.get(moduleName,"persistACmod")) ? game.settings.get(moduleName,"savedArmorClassMod") : 0;
		game.settings.set(moduleName, "hiddenChangedMob", false);

		this.collapsibleName = game.i18n.localize("Show options");
		this.collapsibleCSS = "mat-collapsible-content-closed";
		this.collapsiblePlusMinus = "plus";

		this.numTotalAttacks = 0;
		this.totalAverageDamage = 0;
		this.localUpdate = false;
	}


	static get defaultOptions() {
		return mergeObject(super.defaultOptions, {
			title: "Mob Attack Tool",
			id: "mob-attack-tool-dialog",
			template: "modules/mob-attack-tool/templates/mat-dialog.html",
			width: "430",
			height: "auto",
			closeOnSubmit: true,
			tabs: [{navSelector: ".tabs", contentSelector: "form", initial: "weapons"}]
		})
	}


	async getData(options={}) {
		// Show weapon options per selected token type
		let mobList = game.settings.get(moduleName,"hiddenMobList");
		let monsters = {};
		let weapons = {};
		let availableAttacks = {};
		let actorList = [];

		// determine relevant actor list
		if (game.settings.get(moduleName, "hiddenChangedMob")) {
			let mobName = game.settings.get(moduleName,'hiddenMobName');
			let mobData = mobList[mobName];
			for (let monster of mobData.monsters) {
				for (let i = 0; i < monster.amount; i++) {
					actorList.push(game.actors.get(monster.id));	
				}
			}
		} else {
			if (canvas.tokens.controlled.length > 0 || Object.keys(mobList).length === 0) {
				for (let token of canvas.tokens.controlled) {
					actorList.push(token.actor);
				}
			} else {
				for (let i = 0; i < Object.keys(mobList).length; i++) {
					if (mobList[Object.keys(mobList)[i]].userId === game.user.id) {
						this.mobListIndex = i;
						break;
					}

				}
				for (let monster of mobList[Object.keys(mobList)[this.mobListIndex]].monsters) {
					for (let i = 0; i < monster.amount; i++) {
						actorList.push(game.actors.get(monster.id));	
					}
				}
				// Select mob tokens
				canvas.tokens.releaseAll()
				for (let tokenId of mobList[Object.keys(mobList)[this.mobListIndex]].selectedTokenIds) {
					if (canvas.tokens.placeables.filter(t => t.id === tokenId).length > 0) {
						canvas.tokens.get(tokenId).control({releaseOthers: false})	
					}
				}
				this.numSelected = canvas.tokens.controlled.length;
			}
		}
		let newTargetAC = this.targetAC + this.armorClassMod;
		let endMobTurnValue = (game.user.getFlag(moduleName,"endMobTurnValue") ? "checked" : "") ?? "";
		
		[monsters, weapons, availableAttacks] = await prepareMonsters(actorList, monsters, weapons, availableAttacks);


		// determine if newly determined monsters (+ weapons) should be used, or the already stored (and posssibly modified) data
		if (!this.localUpdate) {
			this.monsters = monsters;
		} else {
			this.localUpdate = false;
		}

		// calculate total number of attacks and average damage
		this.numTotalAttacks = 0;
		this.totalAverageDamage = 0;
		for (let [monsterKey, monsterData] of Object.entries(this.monsters)) {
			for (let [weaponKey, weaponData] of Object.entries(monsterData.weapons)) {
				if (weaponData.useButtonValue === `checked`) {
					this.numTotalAttacks += weaponData.numAttack * this.monsters[monsterKey].amount;
					this.totalAverageDamage += weaponData.numAttack * weaponData.averageDamage * this.monsters[monsterKey].amount;
				}
			}
		}


		let data = {
			mobName: game.settings.get('mob-attack-tool','hiddenMobName'),
			numSelected: this.numSelected,
			pluralTokensOrNot: ((this.numSelected === 1) ? `` : `s`),
			targetImg: this.targetToken?.data?.img ?? "icons/svg/mystery-man.svg",
			targetImgName: this.targetToken?.name ?? "Unknown target",
			targetId: this.targetToken?.id,
			targetAC: newTargetAC,
			targetACtext: ((game.user.isGM && this.targetToken) ? ` ${game.i18n.localize("MAT.dialogTargetArmorClassMessage")} ${newTargetAC}.` : (!this.targetToken) ? ` ${game.i18n.localize("MAT.noTargetAllAttacksHitText")}` : ``),
			armorClassMod: (game.user.getFlag(moduleName,"persistACmod") ?? game.settings.get(moduleName,"persistACmod")) ? game.settings.get(moduleName,"savedArmorClassMod") : this.armorClassMod,
			monsters: this.monsters,
			selectRollType: game.settings.get(moduleName,"askRollType"),
			endMobTurn: game.settings.get(moduleName,"endMobTurn"),
			endMobTurnValue: endMobTurnValue,
			hiddenCollapsibleName: this.collapsibleName,
			hiddenCollapsibleCSS: this.collapsibleCSS,
			collapsiblePlusMinus: this.collapsiblePlusMinus,
			numTotalAttacks: this.numTotalAttacks,
			totalAverageDamage: this.totalAverageDamage
		};
		data.isGM = game.user.isGM;

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
		// this.monsters = monsters;
		this.availableAttacks = availableAttacks;
		
		return data
	}


	activateListeners(html) {
		super.activateListeners(html);

		// update application if weapon checbox is changed
		html.on("change", ".useWeapon", async (event) => {
			let weaponId = event.currentTarget.getAttribute("name").slice(3);
			for (let [monsterKey, monsterData] of Object.entries(this.monsters)) {
				for (let [weaponKey, weaponData] of Object.entries(monsterData.weapons)) {
					if (weaponKey.replace(" ","-") === weaponId) {
						if (this.monsters[monsterKey].weapons[weaponKey].useButtonValue === `checked`) {
							this.monsters[monsterKey].weapons[weaponKey].useButtonValue = ``;
						} else {
							this.monsters[monsterKey].weapons[weaponKey].useButtonValue = `checked`;
						}
						break;
					}
				}
			}
			this.localUpdate = true;
			this.render(true);
		})


		// update application if number of weapon attacks input is changed
		html.on("change", ".numAttack", async (event) => {
			let weaponId = event.currentTarget.getAttribute("name").slice(10);
			let updatedNumAttack = html.find(`input[name="numAttacks${weaponId}"]`)[0]?.value;
			for (let [monsterKey, monsterData] of Object.entries(this.monsters)) {
				for (let [weaponKey, weaponData] of Object.entries(monsterData.weapons)) {
					if (weaponKey.replace(" ","-") === weaponId) {
						if (this.monsters[monsterKey].weapons[weaponKey].numAttack !== updatedNumAttack) {
							this.monsters[monsterKey].weapons[weaponKey].numAttack = updatedNumAttack;
						}
						break;
					}
				}
			}
			this.localUpdate = true;
			this.render(true);
		})

		// render the item's sheet if its image is clicked
		html.on('click', '.mat-weapon', (event) => {
			const weapon = this.weaponArray.find((weapon) => weapon.id === event.currentTarget.dataset?.itemId);
			weapon?.sheet.render(true);
		})
		// render the mob attacker's sheet if its image is clicked
		html.on('click', '.mat-monster', (event) => {
			const monster = this.monsterArray.find((monster) => monster.id === event.currentTarget.dataset?.itemId);
			game.actors.get(monster?.id)?.sheet.render(true);
		})

		// save the current mob
		async function saveMobList(mobList, mobName, monsterArray, selectedTokenIds, numSelected) {
			mobList[mobName] = {mobName: mobName, monsters: monsterArray, selectedTokenIds: selectedTokenIds, numSelected: numSelected, userId: game.user.id};
			await game.settings.set(moduleName,"hiddenMobList",mobList);	
			ui.notifications.info(game.i18n.format("MAT.savedMobNotify",{mobName: mobName}));
		}

		html.on('click', '.saveMobButton', async (event) => {
			let mobList = game.settings.get(moduleName,"hiddenMobList");
			let mobName = html.find(`input[name="mobName"]`)[0].value;
			if (!Object.keys(mobList).includes(mobName)) {
				let selectedTokenIds = [];
				for (let token of canvas.tokens.controlled) {
					selectedTokenIds.push(token.id);
				}
				await saveMobList(mobList, mobName, this.monsterArray, selectedTokenIds, canvas.tokens.controlled.length);
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
			let dialogMobList = await renderTemplate('modules/mob-attack-tool/templates/mat-dialog-mob-list.html', {mobList: mobList, isGM: game.user.isGM});
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
								if (html.find(`input[name="resetUserMobs"]`)[0].checked) {
									let mobList = game.settings.get("mob-attack-tool","hiddenMobList");
									for (let [key, value] of Object.entries(mobList)) {
										if (mobList[key].userId === game.user.id) {
											delete mobList[key];
										}
									}
									await game.settings.set("mob-attack-tool","hiddenMobList",mobList);
									ui.notifications.info(game.i18n.localize("MAT.resetAllMobsNotify"));
									mobSelected = initialMobName;
									await game.settings.set(moduleName,'hiddenMobName',mobSelected);
								} else if (html.find(`input[name="resetAllMobs"]`)[0]?.checked) {
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
			[monsters, weapons, availableAttacks] = await prepareMonsters(actorList, monsters, weapons, availableAttacks);
			
			mobList[selectedMob]["weapons"] = weapons;
			this.actorList = actorList;
			await game.settings.set(moduleName,"hiddenMobList",mobList);

			// Select mob tokens
			canvas.tokens.releaseAll()
			for (let tokenId of mobList[selectedMob]["selectedTokenIds"]) {
				if (canvas.tokens.placeables.filter(t => t.id === tokenId).length > 0) {
					canvas.tokens.get(tokenId).control({releaseOthers: false})	
				}
			}
			this.numSelected = canvas.tokens.controlled.length;

			this.render(true);
		})


		// increase AC modifier
		html.on("click", ".increaseACmod", async (event) => {
			let acMod = parseInt(html.find(`input[name="armorClassMod"]`)[0].value) ?? 0;
			if (acMod == NaN || acMod == null || acMod == undefined) {
				acMod = 0;
				html.find(`input[name="armorClassMod"]`)[0].value = "0";
			}
			this.armorClassMod = acMod + 1;
			await game.settings.set(moduleName,"savedArmorClassMod",acMod + 1);
			this.localUpdate = true;
			this.render(true);
		})

		// decrease AC modifier
		html.on("click", ".decreaseACmod", async (event) => {
			let acMod = parseInt(html.find(`input[name="armorClassMod"]`)[0].value) ?? 0;
			if (acMod == NaN || acMod == null || acMod == undefined) {
				acMod = 0;
				html.find(`input[name="armorClassMod"]`)[0].value = "0";
			}
			this.armorClassMod = acMod - 1;
			await game.settings.set(moduleName,"savedArmorClassMod",acMod - 1);
			this.localUpdate = true;
			this.render(true);
		})

		// execute mob attack
		html.on("click", ".executeMobAttack", async (event) => {
			let mobAttackData = await prepareMobAttack(html, this.weapons, this.availableAttacks, this.targetToken, this.targetAC + game.settings.get(moduleName,"savedArmorClassMod"), this.numSelected, this.monsters);
			if (game.settings.get(moduleName,"mobRules") === 0) {
				rollMobAttack(mobAttackData);
			} else {
				rollMobAttackIndividually(mobAttackData);
			}
			this.close();
		})

		// export Mob Attack
		html.on('click', '.exportMobAttack', async (event) => {
			
			// prepare data
			let mobAttackData = await prepareMobAttack(html, this.weapons, this.availableAttacks, this.targetToken, this.targetAC + game.settings.get(moduleName,"savedArmorClassMod"), this.numSelected, this.monsters);
			let mobList = game.settings.get(moduleName,"hiddenMobList");

			// Create macro
			let key = Object.keys(mobAttackData.attacks)[0];
			if (key.endsWith(`(${game.i18n.localize("Versatile")})`)) key = key.slice(0,key.indexOf(` (${game.i18n.localize("Versatile")})`));
			let macroName;
			if (canvas.tokens.controlled.length > 0 || Object.keys(mobList).length === 0) {
				macroName = `${mobAttackData.weapons[key].name} ${game.i18n.localize("MAT.macroNamePrefix")} ${canvas.tokens.controlled.length} ${canvas.tokens.controlled[0].name}${game.i18n.localize("MAT.macroNamePostfix")}`;
			} else {
				macroName = `${mobAttackData.weapons[key].name} ${game.i18n.localize("MAT.macroNamePrefix")} ${mobList[Object.keys(mobList)[0]].numSelected} ${Object.keys(mobList)[0]}${game.i18n.localize("MAT.macroNamePostfix")}`;
			}
			let macroNameTemplate = await renderTemplate("modules/mob-attack-tool/templates/mat-macro-name-dialog.html", {macroName: macroName});
			let selectedName = await new Promise((resolve) => {
				new Dialog({
					title: game.i18n.localize("Macro Name"),
					content: macroNameTemplate,
					buttons: {
						select: {
							label: game.i18n.localize("Select"),
							icon: `<i class="fa fa-check"></i>`,
							callback: async (html) => {
								let userMacroName = html.find(`input[name="macroName"]`)[0].value;
								if (game.macros.filter(m => m.name === userMacroName).length > 0) {
									let confirmOverwrite = await Dialog.confirm({title: game.i18n.localize("Overwrite Macro"), content: `<p>A macro named "${userMacroName}" already exists. Are you sure you want to overwrite it?</p>`});
									if (!confirmOverwrite) {
										this.render(true);
										return;
									}
								} 
								resolve(userMacroName);
							}
						}
					},
					default: "select",

				}).render(true);
			});

			if (game.settings.get(moduleName, "hiddenChangedMob")) {
				mobAttackData.numSelected = mobList[Object.keys(mobList)[0]].numSelected;
			}

			let macroData = {
				type: "script",
				name: selectedName,
				command: `MobAttacks.quickRoll({numSelected: ${mobAttackData.numSelected}, weaponLocators: ${JSON.stringify(mobAttackData.weaponLocators)}, attacks: ${JSON.stringify(mobAttackData.attacks)}, withAdvantage: ${mobAttackData.withAdvantage}, withDisadvantage: ${mobAttackData.withDisadvantage}, rollTypeValue: ${mobAttackData.rollTypeValue}, rollTypeMessage: "${mobAttackData.rollTypeMessage}", endMobTurn: ${mobAttackData.endMobTurn}, monsters: ${JSON.stringify(mobAttackData.monsters)}})`,
				img: mobAttackData.weapons[key].img
			};

			if (game.macros.filter(m => m.name === selectedName).length > 0) {
				let existingMacro = game.macros.getName(selectedName);
				await existingMacro.update(macroData);
			} else {
				Macro.create(macroData);
			}
			ui.notifications.info(`Macro ${selectedName} ${game.i18n.localize("MAT.macroNotification")}`);
		})


		// collapsible options
		html.on("click", ".mat-collapsible", async (event) => {
			if (this.collapsibleName === game.i18n.localize("Show options")) {
				this.collapsibleName = game.i18n.localize("Hide options");
				this.collapsiblePlusMinus = "minus";
				this.collapsibleCSS = "mat-collapsible-content-open";
			} else {
				this.collapsibleName = game.i18n.localize("Show options");
				this.collapsiblePlusMinus = "plus";
				this.collapsibleCSS = "mat-collapsible-content-closed";
			}
			this.localUpdate = true;
		    this.render(true);
		})

	}

	async _updateObject(event, formData) {
		// console.log(event);
		// console.log(formData);
		console.log("Mob Attack Tool | Executed Mob Attack")
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