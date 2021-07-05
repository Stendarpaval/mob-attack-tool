import { initSettings } from "./settings.js";
import { initMobAttackTool, MobAttackDialog } from "./mobAttackTool.js";
import { MobAttacks } from "./mobAttackTool.js";
import { checkTarget, isTargeted } from "./utils.js";
import { rollNPC, rollAll, rollGroupInitiative } from "./group-initiative/groupInitiative.js";

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


// group initiative: override roll methods from combat tracker
Hooks.on("renderCombatTracker", ( app, html, options ) => {
	let combat = options.combat;
	if (!combat) return;
	
	if (!combat.originalRollNPC) {
		combat.originalRollNPC = combat.rollNPC;	
	}
	if (!combat.originalRollAll) {
		combat.originalRollAll = combat.rollAll;	
	}

	if (game.settings.get(moduleName, "enableMobInitiative")) {	
		combat.rollNPC = rollNPC.bind(combat);
		combat.rollAll = rollAll.bind(combat);	
	} 
	else {
		// reset the methods
		if (combat.originalRollNPC) {
			combat.rollNPC = combat.originalRollNPC;
		}
		if (combat.originalRollAll) {
			combat.rollAll = combat.originalRollAll;
		}
	}
});

