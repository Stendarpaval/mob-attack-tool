export function  initMobAttackTool() {
	Hooks.on("getSceneControlButtons", (controls) => {
		const bar = controls.find(c => c.name === "token");
		bar.tools.push({
			name: "Mob Attack Tool",
			title: "Mob Attack",
			icon: "fas fa-dice",
			visible: game.user.isGM,
			onClick: () => mobAttackTool(),
			button: true
		});
	});
}

function mobAttackTool() {

if (canvas.tokens.controlled.length == 0) {
	ui.notifications.warn('You need to select a token!');
} else {


if (canvas.tokens.objects.children.filter(isTargeted).length > 1) {
	ui.notifications.warn("Make sure only a single token is targeted!");
	return;
}
let targetToken = canvas.tokens.objects.children.filter(isTargeted)[0];
let targetAC = 10;
if (targetToken) {
	targetAC = targetToken.actor.data.data.attributes.ac.value;
} else {
	ui.notifications.warn("Select a target with a valid AC value!");
	return;
}

let numSelected = canvas.tokens.controlled.length;
const dialogContentStart = `<form id="multiattack-lm" class="dialog-content" onsubmit="event.preventDefault()";>`;
const dialogContentLabel = [
	`<p>Choose weapon option:</p><p class="hint">You have selected `, numSelected, 
	` tokens. Your target has an AC of `, targetAC, `.</p>`
].join(``);
const dialogContentEnd = `</form>`;
let content = dialogContentStart + dialogContentLabel + `<div class="flexcol">`;


let weapons = {};
for (let token of canvas.tokens.controlled) {

	let items = token.actor.items.entries;
	items.forEach((item) => {
		if (item.data.type == "weapon") {
			if (weapons[item.data.name]) {
				if (weapons[item.data.name]._id == item._id) {
					console.log("Mob Attack Tool | Weapon already known.");
				}
			} else {
				weapons[item.data.name] = item;
				content += formatWeaponLabel(weapons,item.data);	
			}
			
		}
	});	
}

content += `</div>` + dialogContentEnd + `<br>`;


const d = new Dialog({
	title: "Mob Attack Tool",
	content: content,
	buttons: {
		one: {
			label: "Mob Attack",
			icon: `<i class="fas fa-fist-raised"></i>`,
			callback: (html) => {
				let attacks = {};

				for (let [weapon, weaponData] of Object.entries(weapons)) {
					if (html.find(`input[name="use` + weapon.replace(" ","-") + `"]`)[0].checked) {
						attacks[weapon] = numSelected;
					}
				}
				
				let betterrollsActive = false;
				if (game.modules.get("betterrolls5e")?.active) {
					betterrollsActive = true;
				}
				
				for ( let [key, value] of Object.entries(attacks) ) { 
					const actorName = weapons[key].actor.name;
					const finalAttackBonus = getAttackBonus(weapons[key]);
					const d20Needed = calcD20Needed(finalAttackBonus, targetAC);
					const attackersNeeded = calcAttackersNeeded(d20Needed);

					if (numSelected / attackersNeeded >= 1) {
						const numHitAttacks = Math.floor(numSelected/attackersNeeded);
						const pluralOrNot = ((numHitAttacks == 1) ? " attack hits!" : " attacks hit!");
						sendChatMessage([
							"<strong>Mob Attack Results</strong><br>Target: ", targetToken.name,
							 "<br>Attack Bonus: ", finalAttackBonus,
							 "<br>d20 Needed: ", d20Needed,
							 "<br>Attackers Needed: ", attackersNeeded,
							 "<br>Number of Attackers: ", numSelected,
							 "<br><hr><strong>Conclusion:</strong> ", numHitAttacks, pluralOrNot
						].join(``));
						
						(async () => {
							for (let i = 0; i < numHitAttacks; i++) {
								if (!betterrollsActive) {
									await weapons[key].rollDamage();
								} else {
									await BetterRolls.quickRollByName(actorName,key);
								}
								await new Promise(resolve => setTimeout(resolve, 500));
							}
						})();
					} else {
						ui.notifications.warn("Attack bonus too low or not enough mob attackers to hit the target!");
					}
				}
			}
		},
		two: {
			label: "Cancel",
			icon: `<i class="fas fa-times"></i>`
		}
	}
});

d.render(true);

} // end of actor selection check


function formatWeaponLabel(weapons,itemData) {
	let image = `<label><img src="` + itemData.img + `" title="` + itemData.name.replace(" ","-") + `" width="30" height="30" style="border:none; margin:0px 5px 0px 0px; grid-column-start:1 grid-column-end:2; align-self:center;"></label>`;
	let weaponAttackBonus = `<label class="hint" style="grid-column-start:3; grid-column-end:4; align-self:center;">+` + getAttackBonus(weapons[itemData.name]) + ` to hit</label>`;
	let weaponName = `<label style="grid-column-start:2; grid-column-end:3; align-self:center; text-overflow:ellipsis; white-space:nowrap; overflow:hidden;">` + itemData.name + `</label>`;
	let useButton = `<input type="checkbox" name="use` + itemData.name.replace(" ","-") + `" style="grid-column-start:4; grid-column-end:5; align-self: center;"/>`;

	let label =  `<div style="display:grid; grid-template-columns:30px 260px 50px 20px; column-gap:5px;">` + image + weaponName + weaponAttackBonus + useButton + `</div>`;
	return label;
}


function calcD20Needed(attackBonus, targetAC) {
	let d20Needed = targetAC - attackBonus;
	if (d20Needed < 1) {
		return 1;
	} else if (d20Needed > 20) {
		return 20;
	} else {
		return d20Needed;
	}
}


function calcAttackersNeeded(d20Needed) {
	let attackersNeeded = 0;
	if (1 <= d20Needed && d20Needed <= 5) {
		attackersNeeded = 1;
	} else if (6 <= d20Needed && d20Needed <= 12) {
		attackersNeeded = 2;
	} else if (13 <= d20Needed && d20Needed <= 14) {
		attackersNeeded = 3;
	} else if (15 <= d20Needed && d20Needed <= 16) {
		attackersNeeded = 4;
	} else if (17 <= d20Needed && d20Needed <= 18) {
		attackersNeeded = 5;
	} else if (d20Needed == 19) {
		attackersNeeded = 10;
	} else if (d20Needed >= 20) {
		attackersNeeded = 20;
	}
	return attackersNeeded;
}


function isTargeted(token) {
	if (token.isTargeted) {
		let targetUsers = token.targeted.entries().next().value;
		for (let i = 0; i < targetUsers.length; i++) {
			if (targetUsers[i]._id === game.user.id) {
				return true;
			}
		}
	};
}


function sendChatMessage(text) {
	let chatData = {
		user: game.user.id,
		speaker: game.user,
		content: text,
		whisper: game.users.entities.filter(u => u.isGM).map(u => u._id),
	};
	ChatMessage.create(chatData,{});
}


function getAttackBonus(weaponData) {
	const actorName = weaponData.actor.name;
	let weaponAbility = weaponData._data.data.ability;
	if (weaponAbility == "" || weaponAbility == "undefined" || weaponAbility == null) {
		weaponAbility = "str";
	}
	const actorAbilityMod = parseInt(weaponData.actor._data.data.abilities[weaponAbility].mod);
	const attackBonus = parseInt(weaponData._data.data.attackBonus);
	const profBonus = parseInt(((weaponData._data.data.proficient) ? weaponData.actor._data.data.attributes.prof : 0));
	const finalAttackBonus = actorAbilityMod + attackBonus + profBonus;
	if (isNaN(finalAttackBonus)) {
		ui.notifications.warn("Warning: attack bonus is NaN! Replacing with +5 in the interrim.");
		finalAttackBonus = 5;
	}
	return finalAttackBonus;
}
}
