import { initMobAttackTool } from "./mobAttackTool.js";
import { MobAttacks } from "./mobAttackTool.js";

Hooks.once("init", () => {
	console.log("Mob Attack Tool | Adding Mob Attack Tool.");

	const MODULE = "mob-attack-tool";

	game.settings.register(MODULE, "playerAccess", {
		name: "SETTINGS.MAT.playerAccess",
		hint: "SETTINGS.MAT.playerAccessHint",
		config: true,
		scope: "world",
		default: false,
		type: Boolean
	});

	game.settings.register(MODULE, "mobRules", {
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

	game.settings.register(MODULE, "showIndividualAttackRolls", {
		name: "SETTINGS.MAT.showIndividualAttackRolls",
		hint: "SETTINGS.MAT.showIndividualAttackRollsHint",
		config: true,
		scope: "client",
		default: false,
		type: Boolean
	})

	game.settings.register(MODULE, "showMultiattackDescription", {
		name: "SETTINGS.MAT.showMultiattackDescription",
		hint: "SETTINGS.MAT.showMultiattackDescriptionHint",
		config: true,
		scope: "client",
		default: true,
		type: Boolean
	})

	game.settings.register(MODULE, "autoDetectMultiattacks", {
		name: "SETTINGS.MAT.autoDetectMultiattacks",
		hint: "SETTINGS.MAT.autoDetectMultiattacksHint",
		config: true,
		scope: "client",
		type: Number,
		default: 0,
		choices: {
			0: "SETTINGS.MAT.noAutoDetect",
			1: "SETTINGS.MAT.autoDetectOnly",
			2: "SETTINGS.MAT.autoDetectAndSelect"
		}

	})

	game.settings.register(MODULE, "endMobTurn", {
		name: "SETTINGS.MAT.endMobTurn",
		hint: "SETTINGS.MAT.endMobTurnHint",
		config: true,
		scope: "world",
		default: true,
		type: Boolean
	});

	game.settings.register(MODULE, "askRollType", {
		name: "SETTINGS.MAT.askRollType",
		hint: "SETTINGS.MAT.askRollTypeHint",
		config: true,
		scope: "client",
		type: Boolean
	});

	game.settings.register(MODULE, "rollTypeValue", {
		name: "SETTINGS.MAT.rollTypeValue",
		hint: "SETTINGS.MAT.rollTypeValueHint",
		scope: "world",
		config: true,
		default: 5,
		type: Number
	});

	initMobAttackTool();
})

Hooks.on("ready", async () => {
	window.MobAttacks = MobAttacks();
})