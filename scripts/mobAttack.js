import { initSettings } from "./settings.js";
import { initMobAttackTool, MobAttackDialog } from "./mobAttackTool.js";
import { MobAttacks } from "./mobAttackTool.js";
import { checkTarget, isTargeted } from "./utils.js";

export const moduleName = "mob-attack-tool";

export function coreVersion08x() {
	// Check if Core is 0.8.x or even newer
	return parseInt(game.data.version.slice(2)) > 7;
}


Hooks.once("init", () => {
	console.log("Mob Attack Tool | Adding Mob Attack Tool.");

	initSettings();
	initMobAttackTool();

	const dialogs = new Map();
	game.mobAttackTool = {
		applications: {
			MobAttackDialog
		},
		dialogs
	}
})


Hooks.on("ready", async () => {
	window.MobAttacks = MobAttacks();
})

// update dialog windows if new tokens are selected
Hooks.on("controlToken", async (token, controlState) => {
	// if (!controlState) return;
	let dialogId = game.settings.get(moduleName, "currentDialogId");
	let mobDialog = game.mobAttackTool.dialogs.get(dialogId);
	if (mobDialog) {
		if (mobDialog.rendered && !mobDialog.currentlySelectingTokens) {
			await game.settings.set(moduleName, "hiddenChangedMob", false);
			let mobList = game.settings.get(moduleName,"hiddenMobList");
			if (canvas.tokens.controlled.length !== 0 || Object.keys(mobList).length !== 0) {
				mobDialog.render();
			}
		}
	}
});

// update dialog if targeted token changes
Hooks.on("targetToken", async (token, targetState) => {
	let dialogId = game.settings.get(moduleName, "currentDialogId");
	let mobDialog = game.mobAttackTool.dialogs.get(dialogId);
	if (mobDialog) {
		if (mobDialog.rendered) {
			// await game.settings.set(moduleName, "hiddenChangedMob", false);
			let mobList = game.settings.get(moduleName,"hiddenMobList");
			if (canvas.tokens.controlled.length !== 0 || Object.keys(mobList).length !== 0) {
				mobDialog.render();
			}
		}
	}
});