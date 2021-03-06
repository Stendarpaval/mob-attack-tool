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

export async function rollGroupInitiative(creatures) {

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

	// get first combatant id for each group
	const ids = Object.keys(groups).map(key => groups[key][0]);

	const messageOptions = {
		flavor: "Rolling for initiative! (grouped)"
	};

	// roll initiative for group leaders only
	await this.rollInitiative(ids, {messageOptions});

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
		initiative = this.combatants.get(group[0]).initiative;	
		
		updates.push({_id: id, initiative});
		return updates;
	}, []);

	// batch update all other combatants
	this.updateEmbeddedDocuments('Combatant', groupUpdates);	
}

