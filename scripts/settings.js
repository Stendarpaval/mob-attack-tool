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
	"mobRules": {
		name: "SETTINGS.MAT.mobRulesOrIndividual",
		hint: "SETTINGS.MAT.mobRulesOrIndividualHint",
		config: true,
		scope: "client",
		type: Number,
		default: 0,
		choices: {
			0: "SETTINGS.MAT.mobRules",
			1: "SETTINGS.MAT.individualAttackRolls"
		}
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
	}
};


export function initSettings() {
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

	getData(options={}) {
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
				module: {
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
					enableMidi: {
						name: matSettings.enableMidi.name,
						hint: matSettings.enableMidi.hint,
						value: game.settings.get(moduleName,"enableMidi"),
						id: "enableMidi",
						isCheckbox: true,
						client: game.user.isGM
					},
				}
			}
		};
		data.isGM = game.user.isGM;
		return data
	}

	async _updateObject(event, formData) {
		for (let [settingKey, value] of Object.entries(formData)) {
			if (settingKey === "enableDiceSoNice" && game.modules.get("dice-so-nice")?.active) {
				if (game.user.isGM) {
					await game.user.setFlag(moduleName, settingKey, value);
					await game.settings.set(moduleName, settingKey, value);
					await game.settings.set("dice-so-nice", "enabled", value);
				}
			} else {
				await game.user.setFlag(moduleName, settingKey, value);
				await game.settings.set(moduleName, settingKey, value);
			}
		}
	}

	activateListeners(html) {
		super.activateListeners(html);
	}
}