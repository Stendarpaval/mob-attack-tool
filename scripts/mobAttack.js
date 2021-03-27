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
		hint: "Choose whether or not to show the successful individual attack rolls. (Only relevant if rolling attacks individually instead of using mob rules, and if Better Rolls for 5e is installed) (Client specific setting)",
		config: true,
		scope: "client",
		default: false,
		type: Boolean
	})

	game.settings.register(MODULE, "shareWeapons", {
		name: "Share weapon options in mob",
		hint: "If enabled, then selected weapons in the Mob Attack dialog will be used by all mob attackers. Disable this to only allow attackers that own that weapon to use it in a mob attack.",
		config: true,
		scope: "world",
		default: false,
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