import { initSettings } from "./settings.js";
import { initMobAttackTool, MobAttackDialog } from "./mobAttackTool.js";
import { MobAttacks } from "./mobAttackTool.js";
import { rollNPC, rollAll, matRollInitiative } from "./group-initiative/groupInitiative.js";
import { libWrapper } from "./lib/shim.js";

export const moduleName = "mob-attack-tool";


Hooks.once("init", () => {
	console.log("Mob Attack Tool | Adding Mob Attack Tool.");

	initSettings();
	initMobAttackTool();

	// The lines below are commented out to restore combat tracker functionality in V9
	// console.log("Mob Attack Tool | Wrapping rollInitiative...");
	// libWrapper.register(moduleName, "Combat.prototype.rollInitiative", matRollInitiative, "OVERRIDE");

	const dialogs = new Map();
	const storedHooks = {};
	game.mobAttackTool = {
		applications: {
			MobAttackDialog
		},
		dialogs,
		storedHooks
	}
})


Hooks.on("ready", async () => {
	window.MobAttacks = MobAttacks();

	// check if CTG's groups have changed
	Hooks.on("ctgGroupUpdate", async (args) => {
		let groups;
		if (Array.isArray(args)) {
			groups = args;
		} else {
			groups = args.groups;
		}
		if (!game.settings.get(moduleName, "autoSaveCTGgroups")) return;
		if (groups[0]) {
			if (groups[0].filter(c => c.initiative).length > 0) {
				await MobAttacks().createSavedMobsFromCTGgroups(groups);
				const dialogId = game.settings.get(moduleName, "currentDialogId");
				let mobDialog = game.mobAttackTool.dialogs.get(dialogId);
				if (mobDialog) mobDialog.render();
			}
		}
	});

	Hooks.on("deleteCombat", async () => {
		if (!game.settings.get(moduleName, "autoSaveCTGgroups")) return;
		if (game.modules.get("ctg")?.active) {
			let mobList = game.settings.get(moduleName, "hiddenMobList");

			// delete existing CTG groups
			for (let ctgMobName of Object.keys(mobList)) {
				if (mobList[ctgMobName]?.type === "ctg") {
					await MobAttacks().deleteSavedMob(ctgMobName);
				}
			}
		}
	});
})

// update dialog windows if new tokens are selected
Hooks.on("controlToken", async () => {
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
	const nextTokenId = nextTurn.data.tokenId;
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

	// wait a moment to let CUB's Pan / Select feature do its thing
	if (game.modules.get("combat-utility-belt")?.active) {
		await new Promise(resolve => setTimeout(resolve, 50));
	}

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
		mobDialog.render();
	}
})

//  Hide DSN 3d dice
Hooks.on('diceSoNiceRollStart', (messageId, context) => {
	if (game.settings.get(moduleName, "hiddenDSNactiveFlag")) return;
    
    //Hide this roll
    context.blind=true;
});

// group initiative: override roll methods from combat tracker
Hooks.on("renderCombatTracker", async ( app, html, options ) => {
	let combat = options.combat;
	if (!combat) return;

	if (!combat.matRollInitiative) {
		combat.matRollInitiative = matRollInitiative.bind(combat);
	}

	if (!combat.MAToriginalRollNPC) {
		combat.MAToriginalRollNPC = combat.rollNPC;	
	}
	if (!combat.MAToriginalRollAll) {
		combat.MAToriginalRollAll = combat.rollAll;	
	}

	if (game.settings.get(moduleName, "enableMobInitiative")) {	
		combat.rollNPC = rollNPC.bind(combat);
		combat.rollAll = rollAll.bind(combat);	
	} else {
		// reset the methods
		if (combat.MAToriginalRollNPC) {
			combat.rollNPC = combat.MAToriginalRollNPC;
		}
		if (combat.MAToriginalRollAll) {
			combat.rollAll = combat.MAToriginalRollAll;
		}
	}
});