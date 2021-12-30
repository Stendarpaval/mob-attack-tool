/* 
This script contains code based on the Grouped Initiative module of tonifisler.
Their github: https://github.com/tonifisler/foundry-group-initiativ
*/


import { moduleName } from "../mobAttack.js";


export async function rollNPC() {
	const npcs = this.turns.filter(
		t => t.actor && !t.players.length && !t.initiative
		);
	if (!npcs.length) return;

	await rollGroupInitiative.call(this, npcs);
}


export async function rollAll() {
	const unrolled = this.turns.filter(t => !t.initiative);
	if (!unrolled.length) return;

	await rollGroupInitiative.call(this, unrolled);
}


// override Combat.prototype.rollInitiative (using libWrapper)
export async function matRollInitiative(ids, {formula=null, updateTurn=true, messageOptions={}}={}) {
	// Structure input data
	ids = typeof ids === "string" ? [ids] : ids;
	const currentId = this.combatant.id;
	const rollMode = messageOptions.rollMode || game.settings.get("core", "rollMode");

	// Iterate over Combatants, performing an initiative roll for each
	const updates = [];
	let messages = [];
	let creatures = [];
	for ( let [i, id] of ids.entries() ) {

		// Get Combatant data (non-strictly)
		const combatant = this.combatants.get(id);
		creatures.push(combatant);

		// Produce an initiative roll for the Combatant
		const roll = combatant.getInitiativeRoll(formula);
		// Check for V9+
		if (String(game.version).startsWith("9.")) await roll.evaluate({async: true});
		updates.push({_id: id, initiative: roll.total});

		// Construct chat message data
		let messageData = foundry.utils.mergeObject({
			speaker: {
				scene: this.scene.id,
				actor: combatant.actor?.id,
				token: combatant.token?.id,
				alias: combatant.name
			},
			flavor: game.i18n.format("COMBAT.RollsInitiative", {name: combatant.name}),
			flags: {"core.initiativeRoll": true}
		}, messageOptions);
		const chatData = await roll.toMessage(messageData, {
			create: false,
			rollMode: combatant.hidden && (["roll", "publicroll"].includes(rollMode)) ? "gmroll" : rollMode
		});
		// Play 1 sound for the whole rolled set
		if ( i > 0 ) chatData.sound = null;
		messages.push(chatData);
	}
	if ( !updates.length ) return this;


	if (game.settings.get(moduleName, "enableMobInitiative") && updates.length > 1) {	
		const mobList = game.settings.get(moduleName,"hiddenMobList");
		const groups = formInitiativeGroups(creatures);
		
		// get first combatant id for each group
		const leaderIds = Object.keys(groups).map(key => groups[key][0]);
		
		// prepare others in the group
		const leaderUpdates = updates.filter(u => leaderIds.includes(u._id));

		// remove messages about unused initiative rolls
		messages = messages.reduce((msg, m) => {
			for (let update of leaderUpdates) {
				if (update.initiative === parseInt(m.content) && m.speaker.actor === this.combatants.get(update._id).data?.actorId) {
					msg.push(m);
				}
			}
			return msg;
		}, []);
		
		let groupUpdates = creatures.reduce((gUpdates, {id, initiative, actor, data}) => {
			let group;
			if (game.settings.get(moduleName,"groupMobInitiative")) {
				let savedMob;
				for (let mobName of Object.keys(mobList)) {
					if (mobList[mobName].selectedTokenIds.includes(data.tokenId)) {
						savedMob = mobList[mobName];
						group = groups[savedMob.mobName];
						break;
					}
				}
				if (!savedMob?.mobName) group = groups[actor.data._id];
			} else {
				group = groups[actor.data._id];
			}

			// get initiative from leader of group
			initiative = leaderUpdates.filter(u => u._id === group[0])[0].initiative;
			
			gUpdates.push({_id: id, initiative});
			return gUpdates;
		}, []);

		await this.updateEmbeddedDocuments("Combatant", groupUpdates);
	} else {
		// Update multiple combatants
		await this.updateEmbeddedDocuments("Combatant", updates);	
	}

	// Ensure the turn order remains with the same combatant
	if ( updateTurn && currentId ) {
		await this.update({turn: this.turns.findIndex(t => t.id === currentId)});
	}

	// Create multiple chat messages
	await ChatMessage.implementation.create(messages);
	return this;
}


function formInitiativeGroups(creatures) {
	let groups;
	let mobList = game.settings.get(moduleName,"hiddenMobList");
	if (game.settings.get(moduleName,"groupMobInitiative")) {
		// split combatants into mobs and non-mobs based on savedMob flag
		let mobCreatures = {};
		let otherCreatures = [];
		for (let combatant of creatures) {
			let savedMob;
			for (let mobName of Object.keys(mobList)) {
				if (mobList[mobName].selectedTokenIds.includes(combatant.data.tokenId)) {
					savedMob = mobList[mobName];
					break;
				}
			}
			if (savedMob) {
				if (Object.keys(mobList).includes(savedMob.mobName)) {
					if (!mobCreatures[savedMob.mobName]?.length) {
						mobCreatures[savedMob.mobName] = [combatant.data._id];	
					} else {
						mobCreatures[savedMob.mobName].push(combatant.data._id);
					}
				} else {
					console.log("Mob Attack Tool | Token saved to deleted mob detected");
				}
			} else {
				otherCreatures.push(combatant);
			}
		}
	
		// split combatants further up into groups based on actor id
		const otherGroups = otherCreatures.reduce(
			(g, combatant) => ({
				...g,
				[combatant.actor.id]: (g[combatant.actor.id] || []).concat(combatant.data._id),
			}),
			{}
		);
		for (let [groupKey, combatantIds] of Object.entries(otherGroups)) {
			mobCreatures[groupKey] = combatantIds;
		}
		groups = mobCreatures;

	} else {
		// split combatants in groups based on actor id
		groups = creatures.reduce(
			(g, combatant) => ({
				...g,
				[combatant.actor.id]: (g[combatant.actor.id] || []).concat(combatant.data._id),
			}),
			{}
		);	
	}
	return groups;
}


export async function rollGroupInitiative(creatures) {

	let mobList = game.settings.get(moduleName,"hiddenMobList");
	let groups = formInitiativeGroups(creatures);

	// get first combatant id for each group
	const leaderIDs = Object.keys(groups).map(key => groups[key][0]);

	const messageOptions = {
		flavor: "Rolling for initiative! (grouped)"
	};

	// roll initiative for group leaders only
	await this.matRollInitiative(leaderIDs, {messageOptions});

	// prepare others in the group
	let groupUpdates;
	
	groupUpdates = creatures.reduce((updates, {id, initiative, actor, data}) => {
		let group;
		if (game.settings.get(moduleName,"groupMobInitiative")) {
			let savedMob;
			for (let mobName of Object.keys(mobList)) {
				if (mobList[mobName].selectedTokenIds.includes(data.tokenId)) {
					savedMob = mobList[mobName];
					group = groups[savedMob.mobName];
					break;
				}
			}
			if (!savedMob?.mobName) group = groups[actor.data._id];
		} else {
			group = groups[actor.data._id];
		}
		if (group.length <= 1 || initiative) return updates;

		// get initiative from leader of group
		if (leaderIDs.includes(group[0]) && this.combatants.get(group[0])?.initiative) {
			initiative = this.combatants.get(group[0]).initiative;		
		} else {
			for (let leaderID of leaderIDs) {
				if (this.combatants.get(leaderID).actor.data._id === actor.data._id && this.combatants.get(leaderID)?.initiative) {
					initiative = this.combatants.get(leaderID).initiative;
					break;
				}
			}
		}
		if (!initiative) console.error(`Mob Attack Tool | There was a problem obtaining the initiative score of the group leader of ${actor.name}.`);
		
		updates.push({_id: id, initiative});
		return updates;
	}, []);

	// batch update all other combatants
	await this.updateEmbeddedDocuments('Combatant', groupUpdates);	
}

