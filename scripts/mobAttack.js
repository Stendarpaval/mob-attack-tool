import { initSettings } from "./settings.js";
import { initMobAttackTool } from "./mobAttackTool.js";
import { MobAttacks } from "./mobAttackTool.js";

export const moduleName = "mob-attack-tool";

export function coreVersion08x() {
	// Check if Core is 0.8.x or even newer
	return parseInt(game.data.version.slice(2)) > 7;
}


Hooks.once("init", () => {
	console.log("Mob Attack Tool | Adding Mob Attack Tool.");

	initSettings();
	initMobAttackTool();
})


Hooks.on("ready", async () => {
	window.MobAttacks = MobAttacks();
})