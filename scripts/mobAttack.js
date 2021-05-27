import { initMobAttackTool } from "./mobAttackTool.js";
import { MobAttacks } from "./mobAttackTool.js";

export const moduleName = "mob-attack-tool";

export function coreVersion08x() {
	// Check if Core is 0.8.x or even newer
	return parseInt(game.data.version.slice(2)) > 7;
}

Hooks.once("init", () => {
	console.log("Mob Attack Tool | Adding Mob Attack Tool.");

	game.settings.registerMenu(moduleName, "rollSettingsMenu", {
        name: "SETTINGS.MAT.advancedSettings",
        label: "SETTINGS.MAT.openSettings",
        hint: "SETTINGS.MAT.advancedSettingsHint",
        icon: "fas fa-dice-d20",
        type: RollSettingsMenu,
        restricted: false
    });

	game.settings.register(moduleName, "playerAccess", {
		name: "SETTINGS.MAT.playerAccess",
		hint: "SETTINGS.MAT.playerAccessHint",
		config: true,
		scope: "world",
		default: false,
		type: Boolean
	});

	game.settings.register(moduleName, "enableDiceSoNice", {
		name: "SETTINGS.MAT.enableDiceSoNice",
		hint: "SETTINGS.MAT.enableDiceSoNiceHint",
		config: false,
		scope: "world",
		default: true,
		type: Boolean
	});

	game.settings.register(moduleName, "enableMidi", {
		name: "SETTINGS.MAT.enableMidi",
		hint: "SETTINGS.MAT.enableMidiHint",
		config: false,
		scope: "world",
		default: true,
		type: Boolean
	});

	game.settings.register(moduleName, "mobRules", {
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
	})

	game.settings.register(moduleName, "showIndividualAttackRolls", {
		name: "SETTINGS.MAT.showIndividualAttackRolls",
		hint: "SETTINGS.MAT.showIndividualAttackRollsHint",
		config: false,
		scope: "client",
		default: false,
		type: Boolean
	})

	game.settings.register(moduleName, "showAllAttackRolls", {
		name: "SETTINGS.MAT.showAllAttackRolls",
		hint: "SETTINGS.MAT.showAllAttackRollsHint",
		config: false,
		scope: "client",
		default: false,
		type: Boolean
	})

	game.settings.register(moduleName, "showIndividualDamageRolls", {
		name: "SETTINGS.MAT.showIndividualDamageRolls",
		hint: "SETTINGS.MAT.showIndividualDamageRollsHint",
		config: false,
		scope: "client",
		default: false,
		type: Boolean
	})

	game.settings.register(moduleName, "showMultiattackDescription", {
		name: "SETTINGS.MAT.showMultiattackDescription",
		hint: "SETTINGS.MAT.showMultiattackDescriptionHint",
		config: false,
		scope: "client",
		default: true,
		type: Boolean
	})

	game.settings.register(moduleName, "autoDetectMultiattacks", {
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
	})

	game.settings.register(moduleName, "endMobTurn", {
		name: "SETTINGS.MAT.endMobTurn",
		hint: "SETTINGS.MAT.endMobTurnHint",
		config: true,
		scope: "world",
		default: true,
		type: Boolean
	});

	game.settings.register(moduleName, "askRollType", {
		name: "SETTINGS.MAT.askRollType",
		hint: "SETTINGS.MAT.askRollTypeHint",
		config: false,
		scope: "client",
		type: Boolean
	});

	game.settings.register(moduleName, "rollTypeValue", {
		name: "SETTINGS.MAT.rollTypeValue",
		hint: "SETTINGS.MAT.rollTypeValueHint",
		scope: "world",
		config: false,
		default: 5,
		type: Number
	});

	game.settings.register(moduleName, "hiddenMobList", {
		name: "hiddenMobList",
		hint: "hiddenMobList",
		scope: "client",
		config: false,
		default: {},
		type: Object
	});	

	game.settings.register(moduleName, "hiddenMobName", {
		name: "hiddenMobName",
		hint: "hiddenMobName",
		scope: "client",
		config: false,
		default: "",
		type: String
	});	

	game.settings.register(moduleName, "hiddenDialogContent", {
		name: "hiddenDialogContent",
		hint: "hiddenDialogContent",
		scope: "client",
		config: false,
		default: "",
		type: String
	});	

	game.settings.register(moduleName, "hiddenChangedMob", {
		name: "hiddenChangedMob",
		hint: "hiddenChangedMob",
		scope: "client",
		config: false,
		default: false,
		type: Boolean
	});

	initMobAttackTool();
})


Hooks.on("ready", async () => {
	window.MobAttacks = MobAttacks();
})


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
						name: game.i18n.localize("SETTINGS.MAT.showIndividualAttackRolls"),
						hint: game.i18n.localize("SETTINGS.MAT.showIndividualAttackRollsHint"),
						value: game.user.getFlag(moduleName,"showIndividualAttackRolls") ?? game.settings.get(moduleName,"showIndividualAttackRolls"),
						id: "showIndividualAttackRolls",
						isCheckbox: true,
						client: true
					},
					showAllAttackRolls: {
						name: game.i18n.localize("SETTINGS.MAT.showAllAttackRolls"),
						hint: game.i18n.localize("SETTINGS.MAT.showAllAttackRollsHint"),
						value: game.user.getFlag(moduleName,"showAllAttackRolls") ?? game.settings.get(moduleName,"showAllAttackRolls"),
						id: "showAllAttackRolls",
						isCheckbox: true,
						client: true
					},
					showIndividualDamageRolls: {
						name: game.i18n.localize("SETTINGS.MAT.showIndividualDamageRolls"),
						hint: game.i18n.localize("SETTINGS.MAT.showIndividualDamageRollsHint"),
						value: game.user.getFlag(moduleName,"showIndividualDamageRolls") ?? game.settings.get(moduleName,"showIndividualDamageRolls"),
						id: "showIndividualDamageRolls",
						isCheckbox: true,
						client: true,
					},
					askRollType: {
						name: game.i18n.localize("SETTINGS.MAT.askRollType"),
						hint: game.i18n.localize("SETTINGS.MAT.askRollTypeHint"),
						value: game.user.getFlag(moduleName,"askRollType") ?? game.settings.get(moduleName,"askRollType"),
						id: "askRollType",
						isCheckbox: true,
						client: true
					},
					rollTypeValue: {
						name: game.i18n.localize("SETTINGS.MAT.rollTypeValue"),
						hint: game.i18n.localize("SETTINGS.MAT.rollTypeValueHint"),
						value: game.settings.get(moduleName,"rollTypeValue"),
						id: "rollTypeValue",
						isNumber: true,
						client: game.user.isGM,
						type: Number
					}
				},
				multiattack: {
					showMultiattackDescription: {
						name: game.i18n.localize("SETTINGS.MAT.showMultiattackDescription"),
						hint: game.i18n.localize("SETTINGS.MAT.showMultiattackDescriptionHint"),
						value: game.user.getFlag(moduleName,"showMultiattackDescription") ?? game.settings.get(moduleName,"showMultiattackDescription"),
						id: "showMultiattackDescription",
						isCheckbox: true,
						client: true
					},
					autoDetectMultiattacks: {
						name: game.i18n.localize("SETTINGS.MAT.autoDetectMultiattacks"),
						hint: game.i18n.localize("SETTINGS.MAT.autoDetectMultiattacksHint"),
						value: game.user.getFlag(moduleName,"autoDetectMultiattacks") ?? game.settings.get(moduleName,"autoDetectMultiattacks"),
						id: "autoDetectMultiattacks",
						isSelect: true,
						choices: {
							0: game.i18n.localize("SETTINGS.MAT.noAutoDetect"),
							1: game.i18n.localize("SETTINGS.MAT.autoDetectOnly"),
							2: game.i18n.localize("SETTINGS.MAT.autoDetectAndSelect")
						},
						client: true
					}
				},
				module: {
					enableDiceSoNice: {
						name: game.i18n.localize("SETTINGS.MAT.enableDiceSoNice"),
						hint: game.i18n.localize("SETTINGS.MAT.enableDiceSoNiceHint"),
						value: game.settings.get(moduleName,"enableDiceSoNice"),
						id: "enableDiceSoNice",
						isCheckbox: true,
						client: game.user.isGM
					},
					enableMidi: {
						name: game.i18n.localize("SETTINGS.MAT.enableMidi"),
						hint: game.i18n.localize("SETTINGS.MAT.enableMidiHint"),
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
				};
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