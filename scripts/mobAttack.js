import { initSettings } from "./settings.js";
import { initMobAttackTool, MobAttackDialog } from "./mobAttackTool.js";
import { MobAttacks } from "./mobAttackTool.js";
import { rollNPC, rollAll } from "./group-initiative/groupInitiative.js";

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
Hooks.on("controlToken", async () => {
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
Hooks.on("targetToken", async () => {
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


// select mob tokens if next combatant is part of a saved mob
Hooks.on("updateCombat", async (combat, changed) => {
	if (!("turn" in changed)) return;
	if (!game.settings.get(moduleName, "autoSelectMobCombatants")) return;
	let thisCombat = game.combats.get(combat.id);
	if (thisCombat.data.combatants.length === 0) return;
	if (!game.user.isGM && game.combat.combatant.players.filter(p => p.id === game.user.id).length === 0) return;

	const mobList = game.settings.get("mob-attack-tool","hiddenMobList");
	const nextTurn = combat.turns[changed.turn];
	const nextTokenId = (coreVersion08x()) ? nextTurn.data.tokenId : nextTurn.tokenId;
	let nextMobName = "";
	for (let mobName of Object.keys(mobList)) {
		if (mobList[mobName].selectedTokenIds.includes(nextTokenId) && mobList[mobName].userId === game.user.id) {
			nextMobName = mobName;
			break;
		}
	}
	if (nextMobName === "") return;
	const dialogId = game.settings.get(moduleName, "currentDialogId");
	let mobDialog = game.mobAttackTool.dialogs.get(dialogId);
	if (mobDialog) mobDialog.currentlySelectingTokens = true;
	canvas.tokens.releaseAll();
	for (let tokenId of mobList[nextMobName].selectedTokenIds) {
		if (canvas.tokens.placeables.filter(t => t.id === tokenId).length > 0) {
			canvas.tokens.get(tokenId).control({releaseOthers: false})	
		}
	}
	if (mobDialog) {
		mobDialog.numSelected = canvas.tokens.controlled.length;
		mobDialog.currentlySelectingTokens = false;
	}
})


//  Hide DSN 3d dice
Hooks.on('diceSoNiceRollStart', (messageId, context) => {
	if (game.settings.get(moduleName, "hiddenDSNactiveFlag")) return;
    
    //Hide this roll
    context.blind=true;
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

