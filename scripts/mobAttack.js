import { initMobAttackTool } from "./mobAttackTool.js";
import { MobAttacks } from "./mobAttackTool.js";

Hooks.once("init", () => {
	console.log("Mob Attack Tool | Adding Mob Attack Tool.");

	const MODULE = "mob-attack-tool";

	game.settings.register(MODULE,"askRollType", {
		name: "Include Advantage / Disadvantage selection",
		hint: "If true, then a drop-down list is added to the Mob Attack dialog where you can select to roll with advantage / disadvantage.",
		config: true,
		scope: "world",
		type: Boolean
	});

	game.settings.register(MODULE,"rollTypeValue", {
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