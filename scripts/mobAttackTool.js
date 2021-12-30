import { moduleName } from "./mobAttack.js";
import { checkTarget, getTargetData, prepareMonsters, prepareMobAttack, loadMob, isTargeted } from "./utils.js";
import { rollMobAttackIndividually } from "./individualRolls.js";
import { rollMobAttack } from "./mobRules.js";


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
		this.targetUpdate = false;

		this.currentlySelectingTokens = false;
		this.targets = [];

		let mobList = game.settings.get(moduleName,"hiddenMobList");
		if (canvas.tokens.controlled.length === 0 && Object.keys(mobList).length === 0) {
			this.close();
		}
	}


	static get defaultOptions() {
		return mergeObject(super.defaultOptions, {
			title: "Mob Attack Tool",
			id: "mob-attack-tool-dialog",
			template: "modules/mob-attack-tool/templates/mat-dialog.html",
			width: "505",
			height: "auto",
			closeOnSubmit: false,
			tabs: [{navSelector: ".tabs", contentSelector: "form", initial: "weapons"}],
			dragDrop: [{dragSelector: ".target-attack-box", dropSelector: ".mat-attacks-on-target-box"}]
		})
	}


	async getData() {

		// Show weapon options per selected token type
		let mobList = game.settings.get(moduleName,"hiddenMobList");

		this.targetTokens = canvas.tokens.objects.children.filter(isTargeted); 
		for (let i = 0; i < this.targetTokens.length; i++) {
			if (this.targetTokens[i].actor === null && game.modules.get("multilevel-tokens").active) {
				let mltFlags = this.targetTokens[i].data.flags["multilevel-tokens"];
				if (this.targetTokens.filter(t => t.id === mltFlags.stoken).length > 0) {
					this.targetTokens.splice(i,1);
					i--;
				}
			}
		}
		this.targetToken = canvas.tokens.objects.children.filter(isTargeted)[0];
		this.numTargets = 0;
		if (this.targetToken) {
			if (this.targetToken.actor === null && game.modules.get("multilevel-tokens").active) {
				let mltFlags = this.targetToken.data.flags["multilevel-tokens"];
				if (mltFlags?.sscene) {
					this.targetAC = game.scenes.get(mltFlags.sscene).data.tokens.get(mltFlags.stoken).actor.data.data.attributes.ac.value;
				} else {
					this.targetAC = canvas.tokens.get(mltFlags.stoken).actor.data.data.attributes.ac.value;
				}
			} else {
				this.targetAC = this.targetToken.actor.data.data.attributes.ac.value;
			}
			this.numTargets = this.targetTokens.length;
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
				mobName = `${game.settings.get(moduleName, "defaultMobPrefix")} ${canvas.tokens.controlled[0]?.name}${game.settings.get(moduleName, "defaultMobSuffix")}`;
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

		// create (and/or update) target data
		let targets = await getTargetData(this.monsters);

		if (!this.targetUpdate) {
			this.targets = targets;
		} else {
			this.targetUpdate = false;
			for (let i = 0; i< this.targets.length; i++) {
				let targetTotalNumAttacks = this.targets[i].weapons.length;
				let targetTotalAverageDamage = 0;
				for (let weapon of this.targets[i].weapons) {
					targetTotalAverageDamage += weapon.averageDamage;
				}
				this.targets[i].targetTotalNumAttacks = targetTotalNumAttacks;
				this.targets[i].targetTotalAverageDamage = targetTotalAverageDamage;
			}
		}

		if (this.localUpdate) this.localUpdate = false;

		let noTargetACtext = ((!this.targetToken) ? ` ${game.i18n.localize("MAT.noTargetAllAttacksHitText")}` : ``);

		let data = {
			mobName: mobName,
			numSelected: this.numSelected,
			numTargets: this.numTargets,
			multipleTargets: this.numTargets > 1,
			pluralTokensOrNot: ((this.numSelected === 1) ? `` : `s`),
			targets: this.targets,
			noTargetACtext: noTargetACtext,
			armorClassMod: (game.user.getFlag(moduleName,"persistACmod") ?? game.settings.get(moduleName,"persistACmod")) ? game.settings.get(moduleName,"savedArmorClassMod") : this.armorClassMod,
			monsters: this.monsters,
			selectRollType: game.settings.get(moduleName,"askRollType"),
			endMobTurn: game.settings.get(moduleName,"endMobTurn"),
			endMobTurnValue: (game.user.getFlag(moduleName,"endMobTurnValue") ? "checked" : "") ?? "",
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

	_canDragStart() {
		return true;
	}

	_canDragDrop() {
		return true;
	}

	_onDragStart(event) {
		const li = event.currentTarget;

		const targetImg = li.firstElementChild.getAttribute("src");
		const targetId = li.parentNode.parentNode.parentNode.firstElementChild.firstElementChild.getAttribute("data-item-id");
		const targetIndex = li.parentNode.parentNode.parentNode.firstElementChild.firstElementChild.getAttribute("data-target-index");
		const weaponId = li.firstElementChild.getAttribute("data-item-id");
		
		const dragData = {
			type: "Weapon on Target",
			targets: this.targets,
			targetId: targetId,
			weaponId: weaponId,
			targetIndex: targetIndex,
			img: targetImg
		}
		event.dataTransfer.setData("text/plain", JSON.stringify(dragData));
	}

	_onDragDrop() {
		return;
	}

	_onDrop(event) {
		let data;
		try {
			data = JSON.parse(event.dataTransfer.getData('text/plain'));
		} catch (err) {
			return false;
		}

		// Copy attack over from source to target
		const li = event.currentTarget;
		const currentTargetId = li.parentNode.parentNode.firstElementChild.firstElementChild.getAttribute("data-item-id");
		const currentTargetIndex = li.parentNode.parentNode.firstElementChild.firstElementChild.getAttribute("data-target-index");
		if (!currentTargetId) return;

		this.targets.filter(t => (t.targetId === currentTargetId && t.targetIndex === parseInt(currentTargetIndex)))[0].weapons.push(data.targets.filter(t => t.targetId === data.targetId)[0].weapons.filter(w => w.weaponId === data.weaponId)[0]);
	
		// After copying, delete attack from source
		let targetWeapons = this.targets.filter(t => (t.targetId === data.targetId && t.targetIndex === parseInt(data.targetIndex)))[0].weapons;
		let weaponIndex = targetWeapons.indexOf(targetWeapons.filter(w => w.weaponId === data.weaponId)[0]);
		this.targets.filter(t => (t.targetId === data.targetId && t.targetIndex === parseInt(data.targetIndex)))[0].weapons.splice(weaponIndex,1);

		this.targetUpdate = true;
		this.localUpdate = true;
		this.render(true);
	}

	activateListeners(html) {
		super.activateListeners(html);

		// update application if weapon checbox is changed
		html.on("change", ".useWeapon", async (event) => {
			let weaponId = event.currentTarget.getAttribute("name").slice(3);
			for (let [monsterKey, monsterData] of Object.entries(this.monsters)) {
				for (let weaponKey of Object.keys(monsterData.weapons)) {
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
				for (let weaponKey of Object.keys(monsterData.weapons)) {
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
			if (Number.isNaN(numAttack) || numAttack == null || numAttack == undefined) {
				numAttack = 1;
			}
			let updatedNumAttack = numAttack + 1;
			let weaponId = event.currentTarget.parentNode.previousElementSibling.getAttribute("name").slice(10);
			for (let [monsterKey, monsterData] of Object.entries(this.monsters)) {
				for (let weaponKey of Object.keys(monsterData.weapons)) {
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
			if (Number.isNaN(numAttack) || numAttack == null || numAttack == undefined) {
				numAttack = 1;
			}
			let updatedNumAttack = (numAttack - 1 > 1) ? numAttack - 1 : 1;
			let weaponId = event.currentTarget.parentNode.previousElementSibling.getAttribute("name").slice(10);
			for (let [monsterKey, monsterData] of Object.entries(this.monsters)) {
				for (let weaponKey of Object.keys(monsterData.weapons)) {
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
			if (Number.isNaN(numMonster) || numMonster == null || numMonster == undefined) {
				numMonster = 1;
			}
			let monsterId = event.currentTarget.parentNode.previousElementSibling.getAttribute("name");
			for (let monsterKey of Object.keys(this.monsters)) {
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
			if (Number.isNaN(numMonster) || numMonster == null || numMonster == undefined) {
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
			const weapon = this.weaponArray.find((w) => w.id === event.currentTarget.dataset?.itemId);
			weapon?.sheet.render(true);
		})

		// render the mob attacker's sheet if its image is clicked
		html.on('click', '.mat-monster', (event) => {
			const monster = this.monsterArray.find((m) => m.id === event.currentTarget.dataset?.itemId);
			game.actors.get(monster?.id)?.sheet.render(true);
		})


		// save the current mob
		async function saveMobList(mobList, mobName, monsterArray, selectedTokenIds, numSelected) {
			mobList[mobName] = {mobName: mobName, monsters: monsterArray, selectedTokenIds: selectedTokenIds, numSelected: numSelected, userId: game.user.id};
			await game.settings.set(moduleName,"hiddenMobList",mobList);
			Hooks.call("matMobUpdate", {mobList, mobName, type: "save"});
			if (game.combat) await game.combat.update();
			ui.notifications.info(game.i18n.format("MAT.savedMobNotify",{mobName: mobName}));
		}

		html.on('click', '.saveMobButton', async () => {
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
			ui.combat?.render(true);
		})

		// select a previously saved mob and optionally delete one or reset all mobs
		html.on('click', '.selectMobButton', async (event) => {
			let initialMobName = html.find(`input[name="mobName"]`)[0].value;

			let mobList = game.settings.get(moduleName,"hiddenMobList");
			let noSelectMob = true;
			for (let mobName of Object.keys(mobList)) {
				mobList[mobName]["visible"] = (mobList[mobName].userId === game.user.id);
				mobList[mobName]["selected"] = (mobList[mobName].mobName === initialMobName);
				if (mobList[mobName]["selected"] && noSelectMob) {
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

								if (html.find(`input[name="deleteSavedMob"]`)[0].checked && mobSelected !== "") {
									for (let mobName of Object.keys(mobList)) {
										if (mobList[mobName].userId === game.user.id && mobList[mobName].mobName === mobSelected) {
											delete mobList[mobName];
											break;
										}
									}
									await game.settings.set(moduleName,"hiddenMobList",mobList);
									Hooks.call("matMobUpdate", {mobList, mobName: mobSelected, type: "delete"});
									ui.notifications.info(game.i18n.format("MAT.deleteMobNotify",{mobName: mobSelected}));
									mobSelected = Object.keys(mobList)[0];
									await game.settings.set(moduleName,'hiddenMobName',mobSelected);
								} else if (html.find(`input[name="resetUserMobs"]`)[0].checked) {
									for (let mobName of Object.keys(mobList)) {
										if (mobList[mobName].userId === game.user.id) {
											delete mobList[mobName];
										}
									}
									await game.settings.set(moduleName,"hiddenMobList",mobList);
									Hooks.call("matMobUpdate", {mobList, mobName: mobSelected, type: "reset"});
									ui.notifications.info(game.i18n.localize("MAT.resetAllMobsNotify"));
									mobSelected = initialMobName;
									await game.settings.set(moduleName,'hiddenMobName',mobSelected);
								} else if (html.find(`input[name="resetAllMobs"]`)[0]?.checked) {
									await game.settings.set(moduleName,"hiddenMobList",{});
									Hooks.call("matMobUpdate", {mobList, mobName: mobSelected, type: "resetAll"});
									ui.notifications.info(game.i18n.localize("MAT.resetMobsNotify"));
									mobSelected = initialMobName;
									await game.settings.set(moduleName,'hiddenMobName',mobSelected);
								}
								if (game.combat) await game.combat.update();
								ui.combat?.render(true);
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
			for (let mobName of Object.keys(mobList)) {
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
			for (let mobName of Object.keys(mobList)) {
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
		html.on("click", ".increaseACmod", async () => {
			let acMod = parseInt(html.find(`input[name="armorClassMod"]`)[0].value) ?? 0;
			if (Number.isNaN(acMod) || acMod == null || acMod == undefined) {
				acMod = 0;
				html.find(`input[name="armorClassMod"]`)[0].value = "0";
			}
			this.armorClassMod = acMod + 1;
			await game.settings.set(moduleName,"savedArmorClassMod",acMod + 1);
			// this.targetUpdate = true;
			this.localUpdate = true;
			this.render(true);
		})

		// decrease AC modifier
		html.on("click", ".decreaseACmod", async () => {
			let acMod = parseInt(html.find(`input[name="armorClassMod"]`)[0].value) ?? 0;
			if (Number.isNaN(acMod) || acMod == null || acMod == undefined) {
				acMod = 0;
				html.find(`input[name="armorClassMod"]`)[0].value = "0";
			}
			this.armorClassMod = acMod - 1;
			await game.settings.set(moduleName,"savedArmorClassMod",acMod - 1);
			// this.targetUpdate = true;
			this.localUpdate = true;
			this.render(true);
		})

		// execute mob attack
		html.on("click", ".executeMobAttack", async (event) => {
			if (checkTarget()) {
				let selectedTokenIds = [];
				for (let token of canvas.tokens.controlled) {
					selectedTokenIds.push({tokenId: token.id, tokenUuid: token.document.uuid, actorId: token.actor.id});
				}
				let mobAttackData = await prepareMobAttack(html, selectedTokenIds, this.weapons, this.availableAttacks, this.targets, this.targetAC + game.settings.get(moduleName,"savedArmorClassMod"), this.numSelected, this.monsters);
				mobAttackData.event = event;
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
		html.on('click', '.exportMobAttack', async () => {
			
			// prepare data
			let selectedTokenIds = [];
			for (let token of canvas.tokens.controlled) {
				selectedTokenIds.push({tokenId: token.id, tokenUuid: token.document.uuid, actorId: token.actor.id});
			}
			let mobAttackData = await prepareMobAttack(html, selectedTokenIds, this.weapons, this.availableAttacks, this.targets, this.targetAC + game.settings.get(moduleName,"savedArmorClassMod"), this.numSelected, this.monsters);
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
									let confirmOverwrite = await Dialog.confirm({title: game.i18n.localize("Overwrite Macro"), content: `<p>${game.i18n.format("MAT.macroOverwriteDialog",{userMacroName})}</p>`});
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

			// if macro not exported explicitly with advantage/disadvantage, 
			// make the macro respond to alt (option on MacOS) and ctrl (Command on MacOS) for advantage/disadvantage.
			let advKeyEvent = mobAttackData.withAdvantage;
			let disadvKeyEvent = mobAttackData.withDisadvantage;
			if (!mobAttackData.withAdvantage && !mobAttackData.withDisadvantage) {
				advKeyEvent = `event.altKey`;
				disadvKeyEvent = (game.settings.get(moduleName, "disadvantageKeyBinding") === 0 ? `event.metaKey` : `event.ctrlKey`);
			}

			let macroData = {
				type: "script",
				name: selectedName,
				command: `MobAttacks.quickRoll({numSelected: ${mobAttackData.numSelected}, weaponLocators: ${JSON.stringify(mobAttackData.weaponLocators)}, attacks: ${JSON.stringify(mobAttackData.attacks)}, withAdvantage: ${advKeyEvent}, withDisadvantage: ${disadvKeyEvent}, rollTypeValue: ${mobAttackData.rollTypeValue}, rollTypeMessage: "${mobAttackData.rollTypeMessage}", endMobTurn: ${mobAttackData.endMobTurn}, monsters: ${JSON.stringify(mobAttackData.monsters)}})`,
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
		html.on("click", ".mat-collapsible", async () => {
			if (this.collapsibleName === game.i18n.localize("Show options")) {
				this.collapsibleName = game.i18n.localize("Hide options");
				this.collapsiblePlusMinus = "minus";
				this.collapsibleCSS = "mat-collapsible-content-open";
			} else {
				this.collapsibleName = game.i18n.localize("Show options");
				this.collapsiblePlusMinus = "plus";
				this.collapsibleCSS = "mat-collapsible-content-closed";
			}
			await game.user.setFlag(moduleName,"endMobTurnValue", html.find(`input[name="endMobTurn"]`)[0]?.checked ?? false);
			let rollTypeOptions = {advantage: "", normal: "", disadvantage: ""};
			rollTypeOptions[html.find("[name=rollType]")[0]?.value ?? "normal"] = "selected";
			this.rollTypeSelection = rollTypeOptions;
			this.localUpdate = true;
			this.render(true);
		})

	}

	async _updateObject() {
		// console.log(event);
		// console.log(formData);
		console.log("Mob Attack Tool | Executed Mob Attack")
	}

}


export function MobAttacks() {
	function quickRoll(data) {
		
		// Collect necessary data for mob attack
		if (!checkTarget()) return;
		let selectedTokenIds = [];
		for (let token of canvas.tokens.controlled) {
			selectedTokenIds.push({tokenId: token.id, tokenUuid: token.document.uuid, actorId: token.actor.id});
		}
		data["selectedTokenIds"] = selectedTokenIds;

		(async () => {
			let targets = await getTargetData(data.monsters);
			data["targets"] = targets;

			let weapons = {};
			let attacker, weapon;
			let attacks = {}
			data.weaponLocators.forEach(locator => {
				attacker = game.actors.get(locator["actorID"]);
				weapon = attacker.items.getName(locator["weaponName"])
				weapons[weapon.id] = weapon;
				attacks[locator.weaponID] = [];
				for (let target of targets) {
					attacks[locator.weaponID].push({targetId: target.targetId, targetNumAttacks: target.weapons.filter(w => w.weaponId === weapon.id).length});
				}
			})

			data["weapons"] = weapons;
			if (targets.length) data["attacks"] = attacks;
		
			if (game.settings.get(moduleName, "mobRules") === 0) {
				return rollMobAttack(data);
			} else {
				return rollMobAttackIndividually(data);
			}
		})();
	}

	async function createDialog() {
		await mobAttackTool();
	}

	/*
	This asynchronous function saves a mob. 

	input:
	- mobName [String]    			The name of the mob
	- actorList [Array]   			An array of the each actor linked to tokens that are part the mob to be saved. If multiple tokens are linked to the same actor, duplicate that actor in the array to match.
	- selectedTokenIds [Array]  	An array of the ids of the tokens of the mob. 
	- numSelected [Integer]			The integer number or amount of tokens that make up the mob. 

	output:
	- mobList [Object (Promise)]    The complete data object of all saved mobs, including the one that was just saved to it. 

	 */
	async function saveMob(mobName, actorList, selectedTokenIds, numSelected, type = "") {
		let mobList = game.settings.get(moduleName, "hiddenMobList");
		let monsters, weapons, availableAttacks;
		[monsters, weapons, availableAttacks] = await prepareMonsters(actorList);
		let monsterArray = [];
		for (let [monsterID, monsterData] of Object.entries(monsters)) {
			monsterArray.push(monsterData);
		}
		mobList[mobName] = {mobName: mobName, monsters: monsterArray, selectedTokenIds: selectedTokenIds, numSelected: numSelected, userId: game.user.id, type: type};
		await game.settings.set(moduleName,"hiddenMobList",mobList);
		
		Hooks.call("matMobUpdate", {mobList, mobName, type: "save"});
		if (game.combat) await game.combat.update();
		
		const dialogId = game.settings.get(moduleName, "currentDialogId");
		let mobDialog = game.mobAttackTool.dialogs.get(dialogId);
		if (mobDialog) {
			mobDialog.localUpdate = true;
			mobDialog.render();
		}
		
		return mobList;
	}

	/*
	This asynchronous function deletes a saved mob.

	input:
	- mobName [String]				The name of the mob

	output:
	- mobList [Object (Promise)]	The complete data object of all saved mobs, now without the just deleted mob.

	 */

	async function deleteSavedMob(mobName) {
		let mobList = game.settings.get(moduleName, "hiddenMobList");
		for (let nameOfMob of Object.keys(mobList)) {
			if ((mobList[nameOfMob].userId === game.user.id || game.user.isGM) && mobList[nameOfMob].mobName === mobName) {
				delete mobList[nameOfMob];
				break;
			}
		}
		await game.settings.set("mob-attack-tool","hiddenMobList",mobList);
		Hooks.call("matMobUpdate", {mobList, mobName, type: "delete"});
		const dialogId = game.settings.get(moduleName, "currentDialogId");
		let mobDialog = game.mobAttackTool.dialogs.get(dialogId);
		if (mobDialog) {
			mobDialog.localUpdate = true;
			await game.settings.set(moduleName, "hiddenChangedMob", false);
			mobDialog.render();
		}
		if (game.combat) await game.combat.update();
		return mobList;
	}

	async function createSavedMobsFromCTGgroups(groups, mobNames = []) {
		let mobList = game.settings.get(moduleName, "hiddenMobList");

		// delete existing CTG groups first
		for (let ctgMobName of Object.keys(mobList)) {
			if (mobList[ctgMobName]?.type === "ctg") {
				await deleteSavedMob(ctgMobName);
			}
		}
		let dupNameNum = 2;
		if (!groups.length || !groups[0].length) return;

		for (let i = 0; i < groups.length; i++) {
			let numSelected = groups[i].length;
			let actorList = [], selectedTokenIds = [];
			if (!mobNames[i]) {
				mobNames[i] = `${game.settings.get(moduleName, "defaultMobPrefix")} ${groups[i][0]?.name}${game.settings.get(moduleName, "defaultMobSuffix")}`;
				if (i > 0) {
					if (mobNames[i - 1] === mobNames[i]) {
						mobNames[i] += ` ${dupNameNum.toString()}`;
					} else if (mobNames[i - 1].endsWith(dupNameNum.toString())) {
						dupNameNum++;
						mobNames[i] += ` ${dupNameNum.toString()}`;
					}
				}
			}
			for (let combatant of groups[i]) {
				actorList.push(combatant?.actor);
				selectedTokenIds.push(combatant.data?.tokenId);
			}
			mobList = await saveMob(mobNames[i], actorList, selectedTokenIds, numSelected, "ctg");
		}
		return mobList;
	}


	return {
		quickRoll:quickRoll,
		createDialog:createDialog,
		saveMob:saveMob,
		deleteSavedMob:deleteSavedMob,
		createSavedMobsFromCTGgroups:createSavedMobsFromCTGgroups
	};
}