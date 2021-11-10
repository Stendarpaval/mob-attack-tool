import { moduleName } from "./mobAttack.js";


const matSettings = {
	"playerAccess": {
		name: "SETTINGS.MAT.playerAccess",
		hint: "SETTINGS.MAT.playerAccessHint",
		config: true,
		scope: "world",
		default: false,
		type: Boolean
	},
	"enableDiceSoNice": {
		name: "SETTINGS.MAT.enableDiceSoNice",
		hint: "SETTINGS.MAT.enableDiceSoNiceHint",
		config: false,
		scope: "world",
		default: true,
		type: Boolean
	},
	"hideDSNAttackRoll": {
		name: "SETTINGS.MAT.hideDiceSoNiceAttackRoll",
		hint: "SETTINGS.MAT.hideDiceSoNiceAttackRollHint",
		config: false,
		scope: "world",
		default: true,
		type: Boolean
	},
	"enableMidi": {
		name: "SETTINGS.MAT.enableMidi",
		hint: "SETTINGS.MAT.enableMidiHint",
		config: false,
		scope: "world",
		default: true,
		type: Boolean
	},
	"enableBetterRolls": {
		name: "SETTINGS.MAT.enableBetterRolls",
		hint: "SETTINGS.MAT.enableBetterRollsHint",
		config: false,
		scope: "world",
		default: true,
		type: Boolean
	},
	"showIndividualAttackRolls": {
		name: "SETTINGS.MAT.showIndividualAttackRolls",
		hint: "SETTINGS.MAT.showIndividualAttackRollsHint",
		config: false,
		scope: "client",
		default: false,
		type: Boolean
	},
	"showAllAttackRolls": {
		name: "SETTINGS.MAT.showAllAttackRolls",
		hint: "SETTINGS.MAT.showAllAttackRollsHint",
		config: false,
		scope: "client",
		default: false,
		type: Boolean
	},
	"showIndividualDamageRolls": {
		name: "SETTINGS.MAT.showIndividualDamageRolls",
		hint: "SETTINGS.MAT.showIndividualDamageRollsHint",
		config: false,
		scope: "client",
		default: false,
		type: Boolean
	},
	"showMultiattackDescription": {
		name: "SETTINGS.MAT.showMultiattackDescription",
		hint: "SETTINGS.MAT.showMultiattackDescriptionHint",
		config: false,
		scope: "client",
		default: true,
		type: Boolean
	},
	"autoDetectMultiattacks": {
		name: "SETTINGS.MAT.autoDetectMultiattacks",
		hint: "SETTINGS.MAT.autoDetectMultiattacksHint",
		config: false,
		scope: "client",
		type: Number,
		default: 2,
		choices: {
			0: "SETTINGS.MAT.noAutoDetect",
			1: "SETTINGS.MAT.autoDetectOnly",
			2: "SETTINGS.MAT.autoDetectAndSelect"
		}
	},
	"endMobTurn": {
		name: "SETTINGS.MAT.endMobTurn",
		hint: "SETTINGS.MAT.endMobTurnHint",
		config: true,
		scope: "world",
		default: true,
		type: Boolean
	},
	"autoSelectMobCombatants": {
		name: "SETTINGS.MAT.autoSelectMobCombatants",
		hint: "SETTINGS.MAT.autoSelectMobCombatantsHint",
		scope: "world",
		config: true,
		default: true,
		type: Boolean
	},
	"askRollType": {
		name: "SETTINGS.MAT.askRollType",
		hint: "SETTINGS.MAT.askRollTypeHint",
		config: false,
		scope: "client",
		type: Boolean
	},
	"rollTypeValue": {
		name: "SETTINGS.MAT.rollTypeValue",
		hint: "SETTINGS.MAT.rollTypeValueHint",
		scope: "world",
		config: false,
		default: 5,
		type: Number
	},
	"hiddenMobList": {
		name: "hiddenMobList",
		scope: "client",
		config: false,
		default: {},
		type: Object
	},
	"hiddenMobName": {
		name: "hiddenMobName",
		scope: "client",
		config: false,
		default: "",
		type: String
	},
	"hiddenDialogContent": {
		name: "hiddenDialogContent",
		scope: "client",
		config: false,
		default: "",
		type: String
	},
	"hiddenChangedMob": {
		name: "hiddenChangedMob",
		scope: "client",
		config: false,
		default: false,
		type: Boolean
	},
	"hiddenTableCheckBox": {
		name: "SETTINGS.MAT.hiddenTableCheckBox",
		hint: "SETTINGS.MAT.hiddenTableCheckBoxHint",
		scope: "world",
		config: false,
		default: false,
		type: Boolean
	},
	"hiddenTable": {
		name: "hiddenTable",
		scope: "world",
		config: false,
		default: {},
		type: Object
	},
	"tempSetting": {
		name: "tempSetting",
		scope: "world",
		config: false,
		default: [1,5,1,6,12,2,13,14,3,15,16,4,17,18,5,19,19,10,20,20,20],
		type: Array
	},
	"savedArmorClassMod": {
		name: "savedArmorClassMod",
		scope: "client",
		config: false,
		default: 0,
		type: Number
	},
	"persistACmod": {
		name: "SETTINGS.MAT.persistACmod",
		hint: "SETTINGS.MAT.persistACmodHint",
		scope: "client",
		config: false,
		default: false,
		type: Boolean 
	},
	"showMobAttackResultsToPlayers": {
		name: "SETTINGS.MAT.showMobAttackResultsToPlayers",
		hint: "SETTINGS.MAT.showMobAttackResultsToPlayersHint",
		scope: "client",
		config: false,
		default: false,
		type: Boolean 
	},
	"currentDialogId": {
		name: "currentDialogId",
		scope: "client",
		config: false,
		default: 0,
		type: Number
	},
	"keepDialogOpen": {
		name: "SETTINGS.MAT.keepDialogOpen",
		hint: "SETTINGS.MAT.keepDialogOpenHint",
		scope: "client",
		config: true,
		default: false,
		type: Boolean
	},
	"defaultMobPrefix": {
		name: "SETTINGS.MAT.defaultMobPrefix",
		hint: "SETTINGS.MAT.defaultMobPrefixHint",
		scope: "client",
		config: true,
		default: "Mob of",
		type: String
	},
	"defaultMobSuffix": {
		name: "SETTINGS.MAT.defaultMobSuffix",
		hint: "SETTINGS.MAT.defaultMobSuffixHint",
		scope: "client",
		config: true,
		default: "(s)",
		type: String
	},
	"enableMidiOnUseMacro": {
		name: "SETTINGS.MAT.enableMidiOnUseMacro",
		hint: "SETTINGS.MAT.enableMidiOnUseMacroHint",
		scope: "world",
		config: false,
		default: true,
		type: Boolean
	},
	// "onUseMacroOnlyOnHits": {
	// 	name: "SETTINGS.MAT.onUseMacroOnlyOnHits",
	// 	hint: "SETTINGS.MAT.onUseMacroOnlyOnHitsHint",
	// 	scope: "world",
	// 	config: false,
	// 	default: true,
	// 	type: Boolean
	// },
	"dontSendItemCardId": {
		name: "SETTINGS.MAT.dontSendItemCardId",
		hint: "SETTINGS.MAT.dontSendItemCardIdHint",
		scope: "world",
		config: false,
		default: true,
		type: Boolean
	},
	"enableAutoAnimations": {
		name: "SETTINGS.MAT.enableAutoAnimations",
		hint: "SETTINGS.MAT.enableAutoAnimationsHint",
		scope: "world",
		config: false,
		default: true,
		type: Boolean
	},
	"enableMobInitiative": {
		name: "SETTINGS.MAT.enableMobInitiative",
		hint: "SETTINGS.MAT.enableMobInitiativeHint",
		scope: "world",
		config: false,
		default: false,
		type: Boolean
	},
	"groupMobInitiative": {
		name: "SETTINGS.MAT.groupMobInitiative",
		hint: "SETTINGS.MAT.groupMobInitiativeHint",
		scope: "world",
		config: false,
		default: false,
		type: Boolean
	},
	"hiddenDSNactiveFlag": {
		name: "hiddenDSNactiveFlag",
		scope: "world",
		config: false,
		default: true,
		type: Boolean
	},
	"disadvantageKeyBinding": {
		name: "SETTINGS.MAT.disadvantageKeyBinding",
		hint: "SETTINGS.MAT.disadvantageKeyBindingHint",
		scope: "client",
		config: true,
		type: Number,
		default: 0,
		choices: {
			0: "SETTINGS.MAT.metaKey",
			1: "SETTINGS.MAT.ctrlKey"
		}
	},
	"noResultsMessage": {
		name: "SETTINGS.MAT.noResultsMessage",
		hint: "SETTINGS.MAT.noResultsMessageHint",
		scope: "client",
		config: false,
		type: Boolean,
		default: false
	},
	"autoSaveCTGgroups": {
		name: "SETTINGS.MAT.autoSaveCTGgroups",
		hint: "SETTINGS.MAT.autoSaveCTGgroupsHint",
		scope: "world",
		config: false,
		type: Boolean,
		default: false
	}
};


export function initSettings() {
	game.settings.register(moduleName, "mobRules", {
		name: "SETTINGS.MAT.mobRulesOrIndividual",
		hint: "SETTINGS.MAT.mobRulesOrIndividualHint",
		config: true,
		scope: "client",
		type: Number,
		default: 1,
		choices: {
			0: "SETTINGS.MAT.mobRules",
			1: "SETTINGS.MAT.individualAttackRolls"
		}
	});

	game.settings.registerMenu(moduleName, "rollSettingsMenu", {
        name: "SETTINGS.MAT.advancedSettings",
        label: "SETTINGS.MAT.openSettings",
        hint: "SETTINGS.MAT.advancedSettingsHint",
        icon: "fas fa-dice-d20",
        type: RollSettingsMenu,
        restricted: false
    });

	for (let [settingKey, value] of Object.entries(matSettings)) {
		game.settings.register(moduleName, settingKey, value);
	}
}


class RollSettingsMenu extends FormApplication {
	static get defaultOptions() {
		return mergeObject(super.defaultOptions, {
			title: "Mob Attack Tool Settings",
			id: "mob-attack-tool-roll-settings",
			template: "modules/mob-attack-tool/templates/mat-roll-settings-menu.html",
			width: "530",
			height: "auto",
			closeOnSubmit: true,
			tabs: [{navSelector: ".tabs", contentSelector: "form", initial: "roll"}]
		})
	}

	getData() {
		const data = {
			settings: {
				roll: {
					showIndividualAttackRolls: {
						name: matSettings.showIndividualAttackRolls.name,
						hint: matSettings.showIndividualAttackRolls.hint,
						value: game.user.getFlag(moduleName,"showIndividualAttackRolls") ?? game.settings.get(moduleName,"showIndividualAttackRolls"),
						id: "showIndividualAttackRolls",
						isCheckbox: true,
						client: true
					},
					showAllAttackRolls: {
						name: matSettings.showAllAttackRolls.name,
						hint: matSettings.showAllAttackRolls.hint,
						value: game.user.getFlag(moduleName,"showAllAttackRolls") ?? game.settings.get(moduleName,"showAllAttackRolls"),
						id: "showAllAttackRolls",
						isCheckbox: true,
						client: true
					},
					showIndividualDamageRolls: {
						name: matSettings.showIndividualDamageRolls.name,
						hint: matSettings.showIndividualDamageRolls.hint,
						value: game.user.getFlag(moduleName,"showIndividualDamageRolls") ?? game.settings.get(moduleName,"showIndividualDamageRolls"),
						id: "showIndividualDamageRolls",
						isCheckbox: true,
						client: true,
					},
					showMobAttackResultsToPlayers: {
						name: matSettings.showMobAttackResultsToPlayers.name,
						hint: matSettings.showMobAttackResultsToPlayers.hint,
						value: game.user.getFlag(moduleName,"showMobAttackResultsToPlayers") ?? game.settings.get(moduleName,"showMobAttackResultsToPlayers"),
						id: "showMobAttackResultsToPlayers",
						isCheckbox: true,
						client: true
					},
					noResultsMessage: {
						name: matSettings.noResultsMessage.name,
						hint: matSettings.noResultsMessage.hint,
						value: game.user.getFlag(moduleName,"noResultsMessage") ?? game.settings.get(moduleName,"noResultsMessage"),
						id: "noResultsMessage",
						isCheckbox: true,
						client: true
					},
					askRollType: {
						name: matSettings.askRollType.name,
						hint: matSettings.askRollType.hint,
						value: game.user.getFlag(moduleName,"askRollType") ?? game.settings.get(moduleName,"askRollType"),
						id: "askRollType",
						isCheckbox: true,
						client: true
					},
					rollTypeValue: {
						name: matSettings.rollTypeValue.name,
						hint: matSettings.rollTypeValue.hint,
						value: game.settings.get(moduleName,"rollTypeValue"),
						id: "rollTypeValue",
						isNumber: true,
						client: game.user.isGM,
						type: Number
					}
				},
				multiattack: {
					showMultiattackDescription: {
						name: matSettings.showMultiattackDescription.name,
						hint: matSettings.showMultiattackDescription.hint,
						value: game.user.getFlag(moduleName,"showMultiattackDescription") ?? game.settings.get(moduleName,"showMultiattackDescription"),
						id: "showMultiattackDescription",
						isCheckbox: true,
						client: true
					},
					autoDetectMultiattacks: {
						name: matSettings.autoDetectMultiattacks.name,
						hint: matSettings.autoDetectMultiattacks.hint,
						value: game.user.getFlag(moduleName,"autoDetectMultiattacks") ?? game.settings.get(moduleName,"autoDetectMultiattacks"),
						id: "autoDetectMultiattacks",
						isSelect: true,
						choices: matSettings.autoDetectMultiattacks.choices,
						client: true
					}
				},
				targets: {
					persistACmod: {
						name: matSettings.persistACmod.name,
						hint: matSettings.persistACmod.hint,
						value: game.user.getFlag(moduleName,"persistACmod") ?? game.settings.get(moduleName,"persistACmod"),
						id: "persistACmod",
						isCheckbox: true,
						client: true
					}
				},
				module: {
					enableAutoAnimations: {
						name: matSettings.enableAutoAnimations.name,
						hint: matSettings.enableAutoAnimations.hint,
						value: game.settings.get(moduleName,"enableAutoAnimations"),
						id: "enableAutoAnimations",
						isCheckbox: true,
						client: game.user.isGM
					},
					enableBetterRolls: {
						name: matSettings.enableBetterRolls.name,
						hint: matSettings.enableBetterRolls.hint,
						value: game.settings.get(moduleName,"enableBetterRolls"),
						id: "enableBetterRolls",
						isCheckbox: true,
						client: game.user.isGM
					},
					enableDiceSoNice: {
						name: matSettings.enableDiceSoNice.name,
						hint: matSettings.enableDiceSoNice.hint,
						value: game.settings.get(moduleName,"enableDiceSoNice"),
						id: "enableDiceSoNice",
						isCheckbox: true,
						client: game.user.isGM
					},
					hideDSNAttackRoll: {
						name: matSettings.hideDSNAttackRoll.name,
						hint: matSettings.hideDSNAttackRoll.hint,
						value: game.settings.get(moduleName,"hideDSNAttackRoll"),
						id: "hideDSNAttackRoll",
						isCheckbox: true,
						client: game.user.isGM
					},
					autoSaveCTGgroups: {
						name: matSettings.autoSaveCTGgroups.name,
						hint: matSettings.autoSaveCTGgroups.hint,
						value: game.settings.get(moduleName,"autoSaveCTGgroups"),
						id: "autoSaveCTGgroups",
						isCheckbox: true,
						client: game.user.isGM
					},
					enableMobInitiative: {
						name: matSettings.enableMobInitiative.name,
						hint: matSettings.enableMobInitiative.hint,
						value: game.settings.get(moduleName,"enableMobInitiative"),
						id: "enableMobInitiative",
						isCheckbox: true,
						client: game.user.isGM
					},
					groupMobInitiative: {
						name: matSettings.groupMobInitiative.name,
						hint: matSettings.groupMobInitiative.hint,
						value: game.settings.get(moduleName,"groupMobInitiative"),
						id: "groupMobInitiative",
						isCheckbox: true,
						client: game.user.isGM
					},
					enableMidi: {
						name: matSettings.enableMidi.name,
						hint: matSettings.enableMidi.hint,
						value: game.settings.get(moduleName,"enableMidi"),
						id: "enableMidi",
						isCheckbox: true,
						client: game.user.isGM
					},
					enableMidiOnUseMacro: {
						name: matSettings.enableMidiOnUseMacro.name,
						hint: matSettings.enableMidiOnUseMacro.hint,
						value: game.settings.get(moduleName,"enableMidiOnUseMacro"),
						id: "enableMidiOnUseMacro",
						isCheckbox: true,
						client: game.user.isGM
					},
					// onUseMacroOnlyOnHits: {
					// 	name: matSettings.onUseMacroOnlyOnHits.name,
					// 	hint: matSettings.onUseMacroOnlyOnHits.hint,
					// 	value: game.settings.get(moduleName,"onUseMacroOnlyOnHits"),
					// 	id: "onUseMacroOnlyOnHits",
					// 	isCheckbox: true,
					// 	client: game.user.isGM
					// },
					dontSendItemCardId: {
						name: matSettings.dontSendItemCardId.name,
						hint: matSettings.dontSendItemCardId.hint,
						value: game.settings.get(moduleName,"dontSendItemCardId"),
						id: "dontSendItemCardId",
						isCheckbox: true,
						client: game.user.isGM
					}
				},
				mobTable: {
					hiddenTableCheckBox: {
						name: matSettings.hiddenTableCheckBox.name,
						hint: matSettings.hiddenTableCheckBox.hint,
						id: "hiddenTableCheckBox",
						value: game.settings.get(moduleName,"hiddenTableCheckBox"),
					},
					hiddenTable: {
						rows: {}
					}
				}
			}
		};
		let customTable = game.settings.get(moduleName,"tempSetting");
		for (let i = 0; i < Math.floor(customTable.length/3); i++) {
			data.settings.mobTable.hiddenTable.rows[i] = {
				d20RollMinId: "tempSetting",
				d20RollMinValue: customTable[3 * i],
				d20RollMaxId: "tempSetting",
				d20RollMaxValue: customTable[3 * i + 1],
				attackersNeededId: "tempSetting",
				attackersNeededValue: customTable[3 * i + 2]
			}
		}
		data.isGM = game.user.isGM;
		data.removeRowDisabled = (customTable.length < 6);
		return data
	}

	async _updateObject(event, formData) {
		for (let [settingKey, value] of Object.entries(formData)) {
			if (settingKey === "tempSetting") {
				let customTable = game.settings.get(moduleName,"tempSetting");
				let tableArray = {};
				let correctionLoops = 2;
				for (let j = 0; j < correctionLoops; j++) {
					for (let i = 0; i < Math.floor(customTable.length/3); i++) {
						tableArray[i] = value.slice(3 * i, 3 * i + 3);
						if (parseInt(tableArray[i][1]) < parseInt(tableArray[i][0])) {
							ui.notifications.warn(game.i18n.format("MAT.warnCustomTableUpperLimit",{upperLimit: tableArray[i][1], lowerLimit: tableArray[i][0]}));
							value[3 * i + 1] = value[3 * i];
						}
						if (i > 0) {
							if (parseInt(tableArray[i][0]) <= parseInt(tableArray[i-1][1])) {
								value[3 * i] = parseInt(value[3 * (i - 1) + 1]) + 1;
								if (value[3 * i] > 20) {
									value[3 * i] = 20;
								}
							}
							if (parseInt(tableArray[i][0]) - 1 >= parseInt(tableArray[i-1][1])) {
								value[3 * i] = parseInt(value[3 * (i - 1) + 1]) + 1;
								if (value[3 * i] > 20) {
									value[3 * i] = 20;
								}
								if (parseInt(tableArray[i][1]) < value[3 * i]) {
									value[3 * i + 1] = value[3 * i];
								}
							}
						}
						if (i === Math.floor(customTable.length/3) - 1) {
							if (parseInt(tableArray[i][1]) < 20) {
								value[3 * i + 1] = 20;
							}
						}
					}
				}
			}
			await game.user.setFlag(moduleName, settingKey, value);
			await game.settings.set(moduleName, settingKey, value);
		}
	}

	activateListeners(html) {
		super.activateListeners(html);

		html.on('click', '.MATaddRow', async () => {
			let tableData = [];
			let tableDataHtml = html.find(`input[name="tempSetting"]`);
			for (let input of tableDataHtml) {
				tableData.push(parseInt(input.value));
			}
			let customTable = tableData;
			if (customTable[customTable.length - 2] >= 20) {
				customTable[customTable.length - 2] = parseInt(customTable[customTable.length - 2]) - 1;
			}
			customTable = customTable.concat([parseInt(customTable[customTable.length - 2]) + 1, parseInt(customTable[customTable.length - 2]) + 1, parseInt(customTable[customTable.length - 1])]);
			await game.settings.set(moduleName, "tempSetting", customTable);
			this.render();
		})

		html.on('click', '.MATremoveRow', async () => {
			let tableData = [];
			let tableDataHtml = html.find(`input[name="tempSetting"]`);
			for (let input of tableDataHtml) {
				tableData.push(parseInt(input.value));
			}
			let customTable = tableData;
			if (customTable.length >= 6) {
				customTable = customTable.slice(0, customTable.length-3);
				await game.settings.set(moduleName, "tempSetting", customTable);
			}
			this.render();
		})

		html.on('click', '.MATresetTable', async () => {
			await game.settings.set(moduleName, "tempSetting",matSettings.tempSetting.default);
			this.render();
		})
	}
}