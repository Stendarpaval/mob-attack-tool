import { moduleName, coreVersion08x } from "./mobAttack.js";
import { checkTarget, prepareMonsters, prepareMobAttack, loadMob, getDamageFormulaAndType, calcD20Needed, calcAttackersNeeded, isTargeted, sendChatMessage, getAttackBonus, getScalingFactor } from "./utils.js";
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
	let mobLength = 0;
	for (let i = 0; i < Object.keys(mobList).length; i++) {
		if (mobList[Object.keys(mobList)[i]].userId === game.user.id) {
			mobLength++;
		}
	}
	if (canvas.tokens.controlled.length === 0 && mobLength === 0) {
		ui.notifications.warn(game.i18n.localize("MAT.selectTokenWarning"));
		return;
	}

	// First time opening the dialog, so no changes yet
	await game.settings.set(moduleName, "hiddenChangedMob", false);

	// create dialog
	const mobDialog = new MobAttackDialog();
	mobDialog.render(true);
	game.mobAttackTool.dialogs.set(mobDialog.appId,mobDialog);
	await game.settings.set(moduleName, "currentDialogId", mobDialog.appId);
}



export class MobAttackDialog extends FormApplication {
	constructor(dialogData={}, options={}) {
		super(dialogData, options);
		this.data = dialogData;
		this.options.classes = ["mat-monster-icon", "mat-weapon-icon"];
		this.actorList = [];
		this.mobListIndex = 0;
		this.armorClassMod = (game.user.getFlag(moduleName,"persistACmod") ?? game.settings.get(moduleName,"persistACmod")) ? game.settings.get(moduleName,"savedArmorClassMod") : 0;

		this.collapsibleName = game.i18n.localize("Show options");
		this.collapsibleCSS = "mat-collapsible-content-closed";
		this.collapsiblePlusMinus = "plus";

		this.rollTypeSelection = {advantage: "", normal: "selected", disadvantage: ""};

		this.numTotalAttacks = 0;
		this.totalAverageDamage = 0;
		this.localUpdate = false;

		this.currentlySelectingTokens = false;
	}


	static get defaultOptions() {
		return mergeObject(super.defaultOptions, {
			title: "Mob Attack Tool",
			id: "mob-attack-tool-dialog",
			template: "modules/mob-attack-tool/templates/mat-dialog.html",
			width: "505",
			height: "auto",
			closeOnSubmit: false,
			tabs: [{navSelector: ".tabs", contentSelector: "form", initial: "weapons"}]
		})
	}


	async getData(options={}) {

		// Show weapon options per selected token type
		let mobList = game.settings.get(moduleName,"hiddenMobList");
		this.targetToken = canvas.tokens.objects.children.filter(isTargeted)[0];
		this.numTargets = 0;
		if (this.targetToken) {
			this.targetAC = this.targetToken.actor.data.data.attributes.ac.value;
			this.numTargets = canvas.tokens.objects.children.filter(isTargeted).length;
		}

		this.numSelected = canvas.tokens.controlled.length;
		this.pluralTokensOrNot = ((this.numSelected === 1) ? `` : `s`);
		
		
		// determine relevant actor list and mob name
		let actorList = [];
		let mobName = game.settings.get(moduleName,'hiddenMobName');
		if (game.settings.get(moduleName, "hiddenChangedMob")) {
			mobName = Object.keys(mobList)[this.mobListIndex];
			let mobData = mobList[mobName];
			for (let monster of mobData.monsters) {
				for (let i = 0; i < monster.amount; i++) {
					actorList.push(game.actors.get(monster.id));	
				}
			}
			// Select mob tokens
			if (!this.localUpdate) {
				this.currentlySelectingTokens = true;
				canvas.tokens.releaseAll();
				for (let tokenId of mobList[Object.keys(mobList)[this.mobListIndex]].selectedTokenIds) {
					if (canvas.tokens.placeables.filter(t => t.id === tokenId).length > 0) {
						canvas.tokens.get(tokenId).control({releaseOthers: false})	
					}
				}
				this.numSelected = canvas.tokens.controlled.length;
				this.currentlySelectingTokens = false;
			}
		} else {
			// set correct index for saved mobs
			for (let i = 0; i < Object.keys(mobList).length; i++) {
				if (mobList[Object.keys(mobList)[i]].userId === game.user.id) {
					this.mobListIndex = i;
					break;
				}
			}

			// generate default mob name
			if ((this.numSelected > 0 || Object.keys(mobList).length === 0)) {
				mobName = `${game.settings.get(moduleName, "defaultMobPrefix")} ${canvas.tokens.controlled[0].name}${game.settings.get(moduleName, "defaultMobSuffix")}`;
			} else {
				mobName = `${Object.keys(mobList)[this.mobListIndex]}`;
			}
			await game.settings.set(moduleName,'hiddenMobName', mobName);

			// determine actor list
			if (this.numSelected > 0 || Object.keys(mobList).length === 0) {
				for (let token of canvas.tokens.controlled) {
					actorList.push(token.actor);
				}
			} else {
				for (let monster of mobList[Object.keys(mobList)[this.mobListIndex]].monsters) {
					for (let i = 0; i < monster.amount; i++) {
						actorList.push(game.actors.get(monster.id));	
					}
				}
				// Select mob tokens
				this.currentlySelectingTokens = true;
				canvas.tokens.releaseAll();
				for (let tokenId of mobList[Object.keys(mobList)[this.mobListIndex]].selectedTokenIds) {
					if (canvas.tokens.placeables.filter(t => t.id === tokenId).length > 0) {
						canvas.tokens.get(tokenId).control({releaseOthers: false})	
					}
				}
				this.numSelected = canvas.tokens.controlled.length;
				this.currentlySelectingTokens = false;
			}
		}
		
		let newTargetAC = this.targetAC + this.armorClassMod;
		let endMobTurnValue = (game.user.getFlag(moduleName,"endMobTurnValue") ? "checked" : "") ?? "";
		
		let monsters = {};
		let weapons = {};
		let availableAttacks = {};
		[monsters, weapons, availableAttacks] = await prepareMonsters(actorList);

		// determine if newly determined monsters (+ weapons) should be used, or the already stored (and posssibly modified) data
		if (!this.localUpdate) {
			this.actorList = actorList;
			this.monsters = monsters;
			this.weapons = {...weapons};
			this.availableAttacks = availableAttacks;
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

		let targetACtext = ((game.user.isGM && this.targetToken) ? ` ${game.i18n.localize("MAT.dialogTargetArmorClassMessage")} ${newTargetAC}.` : (!this.targetToken) ? ` ${game.i18n.localize("MAT.noTargetAllAttacksHitText")}` : ``);
		if (this.numTargets > 1) {
			targetACtext = `Note: support for handling multiple targets will arrive later. Please make sure only one token is targeted when executing a Mob Attack.`
		}

		let data = {
			mobName: mobName,
			numSelected: this.numSelected,
			numTargets: this.numTargets,
			pluralTokensOrNot: ((this.numSelected === 1) ? `` : `s`),
			targetImg: this.targetToken?.data?.img ?? "icons/svg/mystery-man.svg",
			targetImgName: this.targetToken?.name ?? "Unknown target",
			targetId: this.targetToken?.id,
			targetAC: newTargetAC,
			targetACtext: targetACtext,
			armorClassMod: (game.user.getFlag(moduleName,"persistACmod") ?? game.settings.get(moduleName,"persistACmod")) ? game.settings.get(moduleName,"savedArmorClassMod") : this.armorClassMod,
			monsters: this.monsters,
			selectRollType: game.settings.get(moduleName,"askRollType"),
			endMobTurn: game.settings.get(moduleName,"endMobTurn"),
			endMobTurnValue: endMobTurnValue,
			hiddenCollapsibleName: this.collapsibleName,
			hiddenCollapsibleCSS: this.collapsibleCSS,
			collapsiblePlusMinus: this.collapsiblePlusMinus,
			numTotalAttacks: this.numTotalAttacks,
			totalAverageDamage: this.totalAverageDamage,
			rollTypeSelection: this.rollTypeSelection
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
		this.monsterArray = monsterArray;
		this.weaponArray = weaponArray;

		this.data = data;

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

		// increase numAttack of a weapon
		html.on("click", ".increaseNumAttack", async (event) => {
			let numAttack = parseInt(event.currentTarget.parentNode.previousElementSibling.value);
			if (numAttack == NaN || numAttack == null || numAttack == undefined) {
				numAttack = 1;
			}
			let updatedNumAttack = numAttack + 1;
			let weaponId = event.currentTarget.parentNode.previousElementSibling.getAttribute("name").slice(10);
			for (let [monsterKey, monsterData] of Object.entries(this.monsters)) {
				for (let [weaponKey, weaponData] of Object.entries(monsterData.weapons)) {
					if (weaponKey.replace(" ","-") === weaponId) {
						this.monsters[monsterKey].weapons[weaponKey].numAttack = updatedNumAttack;
						break;
					}
				}
			}
			this.localUpdate = true;
			this.render(true);
		})

		// decrease numAttack of a weapon
		html.on("click", ".decreaseNumAttack", async (event) => {
			let numAttack = parseInt(event.currentTarget.parentNode.previousElementSibling.value);
			if (numAttack == NaN || numAttack == null || numAttack == undefined) {
				numAttack = 1;
			}
			let updatedNumAttack = (numAttack - 1 > 1) ? numAttack - 1 : 1;
			let weaponId = event.currentTarget.parentNode.previousElementSibling.getAttribute("name").slice(10);
			for (let [monsterKey, monsterData] of Object.entries(this.monsters)) {
				for (let [weaponKey, weaponData] of Object.entries(monsterData.weapons)) {
					if (weaponKey.replace(" ","-") === weaponId) {
						this.monsters[monsterKey].weapons[weaponKey].numAttack = updatedNumAttack;
						break;
					}
				}
			}
			this.localUpdate = true;
			this.render(true);
		})


		// increase number of monsters
		html.on("click", ".increaseNumMonster", async (event) => {
			let numMonster = parseInt(event.currentTarget.parentNode.previousElementSibling.value);
			if (numMonster == NaN || numMonster == null || numMonster == undefined) {
				numMonster = 1;
			}
			let updatedNumMonster = numMonster + 1;
			let monsterId = event.currentTarget.parentNode.previousElementSibling.getAttribute("name");
			for (let [monsterKey, monsterData] of Object.entries(this.monsters)) {
				if (monsterKey === monsterId) {
					this.actorList.push(game.actors.get(monsterKey));
					let [monsters, weapons, availableAttacks] = await prepareMonsters(this.actorList, true, this.monsters);
					this.monsters = monsters;
					this.weapons = weapons;
					this.availableAttacks = availableAttacks;
					break;
				}
			}
			this.localUpdate = true;
			this.render(true);
		})

		// decrease number of monsters
		html.on("click", ".decreaseNumMonster", async (event) => {
			let numMonster = parseInt(event.currentTarget.parentNode.previousElementSibling.value);
			if (numMonster == NaN || numMonster == null || numMonster == undefined) {
				numMonster = 1;
			}
			let updatedNumMonster = numMonster - 1;
			let monsterId = event.currentTarget.parentNode.previousElementSibling.getAttribute("name");
			// for (let [monsterKey, monsterData] of Object.entries(this.monsters)) {
			if (Object.keys(this.monsters).includes(monsterId)) {
				// deselect one monster token
				let monsterTokens = canvas.tokens.controlled.filter(t => t.actor.id === monsterId);
				if (monsterTokens.length >= updatedNumMonster) {
					this.currentlySelectingTokens = true;
					monsterTokens[0]?.release();
					this.currentlySelectingTokens = false;
				}

				// remove monster from mob list
				let removalIndex = 0;
				for (let i = 0; i < this.actorList.length; i++) {
					if (this.actorList[i].id === monsterId) {
						removalIndex = i;
						break;
					}
				}
				this.actorList.splice(removalIndex, 1);

				// deselect all tokens and close dialog if no other monsters are left
				if (this.actorList.length === 0) {
					this.currentlySelectingTokens = true;
					canvas.tokens.releaseAll();
					this.currentlySelectingTokens = false;
					if (!game.settings.get(moduleName,"keepDialogOpen")) this.close();
					let mobList = game.settings.get(moduleName,"hiddenMobList");
					let mobLength = 0;
					for (let i = 0; i < Object.keys(mobList).length; i++) {
						if (mobList[Object.keys(mobList)[i]].userId === game.user.id) {
							mobLength++;
						}
					}
					if (canvas.tokens.controlled.length === 0 && mobLength === 0) {
						ui.notifications.warn(game.i18n.localize("MAT.selectTokenWarning"));
						this.close();
					}
				}

				let [monsters, weapons, availableAttacks] = await prepareMonsters(this.actorList, true, this.monsters);
				this.monsters = monsters;
				this.weapons = weapons;
				this.availableAttacks = availableAttacks;	
			}
			// }
			this.localUpdate = (this.actorList.length > 0);
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
			let selectedTokenIds = [];
			for (let token of canvas.tokens.controlled) {
				selectedTokenIds.push(token.id);
			}
			if (!Object.keys(mobList).includes(mobName)) {
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
								await saveMobList(mobList, mobName, this.monsterArray, selectedTokenIds, canvas.tokens.controlled.length);
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

		// select a previously saved mob and optionally delete one or reset all mobs
		html.on('click', '.selectMobButton', async (event) => {
			let initialMobName = html.find(`input[name="mobName"]`)[0].value;

			let mobList = game.settings.get(moduleName,"hiddenMobList");
			let noSelectMob = true;
			for (let [key,value] of Object.entries(mobList)) {
				mobList[key]["visible"] = (mobList[key].userId === game.user.id);
				mobList[key]["selected"] = (mobList[key].mobName === initialMobName);
				if (mobList[key]["selected"] && noSelectMob) {
					noSelectMob = false;
				}
			}
			
			let dialogMobList = await renderTemplate('modules/mob-attack-tool/templates/mat-dialog-mob-list.html', {mobList: mobList, isGM: game.user.isGM, noSelectMob: noSelectMob});

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
								// let radioButtons = html.find(`input[name="savedMobOptions"]`);
								// let selectedOption = ``;
								// for (let option of radioButtons) {
								// 	if (option.checked) {

								// 	}
								// }
								if (html.find(`input[name="deleteSavedMob"]`)[0].checked && mobSelected !== "") {
									let mobList = game.settings.get("mob-attack-tool","hiddenMobList");
									for (let [key, value] of Object.entries(mobList)) {
										if (mobList[key].userId === game.user.id && mobList[key].mobName === mobSelected) {
											delete mobList[key];
											break;
										}
									}
									await game.settings.set("mob-attack-tool","hiddenMobList",mobList);
									ui.notifications.info(game.i18n.format("MAT.deleteMobNotify",{mobName: mobSelected}));
									mobSelected = Object.keys(mobList)[0];
									await game.settings.set(moduleName,'hiddenMobName',mobSelected);
								} else if (html.find(`input[name="resetUserMobs"]`)[0].checked) {
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
			
			html.find(`input[name="mobName"]`)[0].value = selectedMob;
			await loadMob(event, selectedMob);
		})

		// switch to previous saved mob
		html.on("click", ".previousMob", async (event) => {
			let mobList = game.settings.get(moduleName,"hiddenMobList");
			let mobListNameArray = [];
			for (let [mobName, mobData] of Object.entries(mobList)) {
				if (mobList[mobName].userId === game.user.id) {
					mobListNameArray.push(mobName);
				}
			}
			let currentMobName = html.find(`input[name="mobName"]`)[0].value;
			let mobIndex = this.mobListIndex;
			for (let i = 0; i < mobListNameArray.length; i++) {
				if (mobListNameArray[i] === currentMobName) {
					mobIndex = i;
					break;
				}
			}
			let newIndex;
			if (mobIndex - 1 >= 0) {
				newIndex = mobIndex - 1;
			} else {
				newIndex = mobListNameArray.length - 1;
			}
			await loadMob(event, mobListNameArray[newIndex]);
		})

		// switch to next saved mob
		html.on("click", ".nextMob", async (event) => {
			let mobList = game.settings.get(moduleName,"hiddenMobList");
			let mobListNameArray = [];
			for (let [mobName, mobData] of Object.entries(mobList)) {
				if (mobList[mobName].userId === game.user.id) {
					mobListNameArray.push(mobName);
				}
			}
			let currentMobName = html.find(`input[name="mobName"]`)[0].value;
			let mobIndex = this.mobListIndex;
			for (let i = 0; i < mobListNameArray.length; i++) {
				if (mobListNameArray[i] === currentMobName) {
					mobIndex = i;
					break;
				}
			}
			let newIndex;
			if (mobIndex + 1 <= mobListNameArray.length - 1) {
				newIndex = mobIndex + 1;
			} else {
				newIndex = 0;
			}
			
			await loadMob(event, mobListNameArray[newIndex]);
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
			if (checkTarget()) {
				let mobAttackData = await prepareMobAttack(html, this.weapons, this.availableAttacks, this.targetToken, this.targetAC + game.settings.get(moduleName,"savedArmorClassMod"), this.numSelected, this.monsters);
				if (game.settings.get(moduleName,"mobRules") === 0) {
					rollMobAttack(mobAttackData);
				} else {
					rollMobAttackIndividually(mobAttackData);
				}
				if (!game.settings.get(moduleName,"keepDialogOpen")) {
					this.close();	
				}
			}
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
			await game.user.setFlag(moduleName,"endMobTurnValue", html.find(`input[name="endMobTurn"]`)[0].checked)
			let rollTypeOptions = {advantage: "", normal: "", disadvantage: ""};
			rollTypeOptions[html.find("[name=rollType]")[0].value] = "selected";
			this.rollTypeSelection = rollTypeOptions;
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