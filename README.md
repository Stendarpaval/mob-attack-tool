![Mob Attack Tool Version](https://img.shields.io/badge/dynamic/json.svg?url=https%3A%2F%2Fraw.githubusercontent.com%2FStendarpaval%2Fmob-attack-tool%2Fmaster%2Fmodule.json&label=Module%20Version&query=$.version&colorB=blue)
![Foundry Core Compatible Version](https://img.shields.io/badge/dynamic/json.svg?url=https%3A%2F%2Fraw.githubusercontent.com%2FStendarpaval%2Fmob-attack-tool%2Fmaster%2Fmodule.json&label=Foundry%20Version&query=$.compatibleCoreVersion&colorB=orange) [![Forge Installs](https://img.shields.io/badge/dynamic/json?label=Forge%20Installs&query=package.installs&suffix=%25&url=https%3A%2F%2Fforge-vtt.com%2Fapi%2Fbazaar%2Fpackage%2Fmob-attack-tool&colorB=4aa94a)](https://forge-vtt.com/bazaar#package=mob-attack-tool) ![Latest Release Download Count](https://img.shields.io/github/downloads/Stendarpaval/mob-attack-tool/latest/module.zip)

[![Foundry Hub Endorsements](https://img.shields.io/endpoint?logoColor=white&url=https%3A%2F%2Fwww.foundryvtt-hub.com%2Fwp-json%2Fhubapi%2Fv1%2Fpackage%2Fmob-attack-tool%2Fshield%2Fendorsements)](https://www.foundryvtt-hub.com/package/mob-attack-tool/) [![Foundry Hub Comments](https://img.shields.io/endpoint?logoColor=white&url=https%3A%2F%2Fwww.foundryvtt-hub.com%2Fwp-json%2Fhubapi%2Fv1%2Fpackage%2Fmob-attack-tool%2Fshield%2Fcomments)](https://www.foundryvtt-hub.com/package/mob-attack-tool/)

# Mob Attack Tool
A module for Foundry VTT that offers a tool for handling mob attacks in the dnd5e system. 

## How to install
You can install this module by searching Foundry's package browser or by pasting this url in the corresponding text field of Foundry's package installer: `https://raw.githubusercontent.com/Stendarpaval/mob-attack-tool/main/module.json`

## How to use
After activating this module, a new button appears in the token controls bar. By default this button is only visible to users with the GM role, but this can be changed in settings. To use the Mob Attack tool, make sure you have at least one token selected and exactly one token targeted. 

A dialog window will appear, populated with the weapon options of the selected tokens along with their respective attack bonuses and a checkbox. Tick the checkbox of the weapon(s) you want to use for the mob attack. 

Clicking on the Mob Attack button in the dialog window will then whisper a message to the GM with the mob attack results. Furthermore, the weapon item is rolled the number of times that an attack would hit.

## New

* You can choose to either use the official Mob Rules, or you can let each creature in the mob attack individually. Go to Mob Attack Tool's settings to set your preference.
* Also, you can now allow players to use Mob Attack Tool. Perfect for necromancers or druids!
* Don't want to click "Next Turn" all the time? Now Mob Attack Tool can skip the turns of mob attackers that participated in a mob attack!
* Added examples and screenshots in [EXAMPLES.md](EXAMPLES.md)!
* You can now specify how often each mob attacker can use a weapon as part of a multiattack action. 
* Mob Attack Tool can now automatically detect and select multiattack options! 
* There is now support for versatile weapon damage. No need to create duplicate weapons anymore!
* For ease of use, Mob Attack Tool now shows the multiattack description for creatures that have it. Can be turned off in settings if so desired.
* You can now click on icons to open actor or item sheets!
* Mob Attack Tool has been translated to Korean by KLO!
* Now you can name and save Mobs for later reuse. If you have saved mobs, then you don't need to select any tokens to begin using Mob Attack Tool. 

## Examples

This is what the Mob Attack dialog looks like (as of v0.2.12) with multiattack autodetect + autoselect enabled:

<img width="443" alt="MAT-v0 2 12-dialog" src="https://user-images.githubusercontent.com/17188192/121824595-98ce5680-ccad-11eb-8d10-4941e0a3d5d8.png">

Below are some (older) GIFs that give a brief idea of how you can use Mob Attack Tool.

<details>
  <summary>Click to show GIF of Mob Attack Tool</summary>

  ![MAT-video-v0 0 3](https://user-images.githubusercontent.com/17188192/110196581-c81b2f00-7e45-11eb-908a-f0fd73567e10.gif)
</details>

<details>
  <summary>Click to show GIF of Mob Attack Tool + Better Rolls for 5e + Midi-QOL</summary>

  ![MAT-video-midi-qol-v0 0 3](https://user-images.githubusercontent.com/17188192/110196624-0fa1bb00-7e46-11eb-9ec1-ade1ef8dff96.gif)
</details>

For more elaborate examples and screenshots, please head over to [EXAMPLES.md](EXAMPLES.md). 

## Planned improvements
* Further (optional) automation of the initial selection of tokens -> _In Progress_
* Some documentation and better structuring of the repo -> _In Progress_
* Multiple target selection

# Translations
Mob Attack Tool currently supports these languages:
* English
* Korean (translation provided by KLO (discord : KLO#1490). Thanks, KLO!)

## Inspirations
* This module was inspired by [Multiattack 5e](https://github.com/jessev14/Multiattack-5e).
* The map shown in the examples was made by ~~Printable RPG~~ Spellarena. You can check out more of their beautiful maps on the [Spellarena Patreon](https://www.patreon.com/m/spellarena). 

## Contributors
* Juanfrank has kindly given feedback and helped me out with condensing damage formulas.
* mike-marshall0164 has fixed various aspects of the individually rolled attacks. 
* Many thanks to members of the League of Extraordinary Foundry VTT Developers for module development advice, including how to set-up GitHub Actions.
