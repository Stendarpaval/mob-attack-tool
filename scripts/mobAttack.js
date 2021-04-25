import { initMobAttackTool } from "./mobAttackTool.js";
import { MobAttacks } from "./mobAttackTool.js";

Hooks.once("init", () => {
	console.log("Mob Attack Tool | Adding Mob Attack Tool.");

	const MODULE = "mob-attack-tool";

	game.settings.register(MODULE, "playerAccess", {
		name: "Allow players to use Mob Attack Tool",
		hint: "If enabled, players will be able to see and use the Mob Attack Tool button. However, they will not see target AC. If disabled, only the GM will be able to use Mob Attack Tool.",
		config: true,
		scope: "world",
		default: false,
		type: Boolean
	});

	game.settings.register(MODULE, "mobRules", {
		name: "Use mob rules or roll individually",
		hint: `Choose whether to use the "Handling Mobs" rules (DMG, p. 250) or to roll attack rolls individually for each creature of the mob. (Client specific setting)`,
		config: true,
		scope: "client",
		type: Number,
		default: 0,
		choices: {
			0: "Mob Rules",
			1: "Individual Attack Rolls"
		}
	})

	game.settings.register(MODULE, "showIndividualAttackRolls", {
		name: "Show individual attack rolls",
		hint: "Choose whether or not to show the successful individual attack rolls. Only relevant if rolling attacks individually instead of using mob rules. Midi-QOL support only in combination with Better Rolls for 5e for now. (Client specific setting)",
		config: true,
		scope: "client",
		default: false,
		type: Boolean
	})

	game.settings.register(MODULE, "showMultiattackDescription", {
		name: "Show multiattack description",
		hint: "If enabled, then a multiattack description will be shown for any mob attacker that has a multiattack feature on their actor sheet. (Client specific setting)",
		config: true,
		scope: "client",
		default: true,
		type: Boolean
	})

	game.settings.register(MODULE, "autoDetectMultiattacks", {
		name: "Autodetect multiattack",
		hint: `Attempt to automatically detect the multiattack weapon options of mob attackers. If set to "Autodetect + autoselect", then the multiattack weapon options should already be selected when you open the Mob Attack dialog. (Client specific setting)`,
		config: true,
		scope: "client",
		type: Number,
		default: 0,
		choices: {
			0: "No autodetect",
			1: "Autodetect only",
			2: "Autodetect + autoselect"
		}

	})

	game.settings.register(MODULE, "shareWeapons", {
		name: "Share weapon options in mob",
		hint: "If enabled, then selected weapons in the Mob Attack dialog will be used by all mob attackers. Disable this to only allow attackers that own that weapon to use it in a mob attack.",
		config: true,
		scope: "world",
		default: false,
		type: Boolean
	});

	game.settings.register(MODULE, "endMobTurn", {
		name: "Include option to end grouped mob turns",
		hint: "If enabled, an option is added to the Mob Attack dialog to skip the turns of mob attackers that are grouped together in the combat tracker. Works well with the Grouped Initiative module.",
		config: true,
		scope: "world",
		default: true,
		type: Boolean
	});

	game.settings.register(MODULE, "askRollType", {
		name: "Include Advantage / Disadvantage selection",
		hint: "If enabled, then a drop-down list is added to the Mob Attack dialog where you can select to roll with advantage / disadvantage. (Client specific setting)",
		config: true,
		scope: "client",
		type: Boolean
	});

	game.settings.register(MODULE, "rollTypeValue", {
		name: "Advantage / Disadvantage value",
		hint: "Choose what bonus / penalty Mob Attacks have when they are rolled with advantage or disadvantage. (5 by default, floating numbers will be rounded down)",
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