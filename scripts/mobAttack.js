import { initMobAttackTool } from "./mobAttackTool.js";

Hooks.once("init", () => {
	console.log("Mob Attack Tool | Adding Mob Attack Tool.");
	initMobAttackTool();
})