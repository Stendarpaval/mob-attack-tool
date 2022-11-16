![Mob Attack Tool Version](https://img.shields.io/badge/dynamic/json.svg?url=https%3A%2F%2Fraw.githubusercontent.com%2FStendarpaval%2Fmob-attack-tool%2Fmaster%2Fmodule.json&label=Module%20Version&query=$.version&colorB=blue)
![Foundry Core Compatible Version](https://img.shields.io/badge/dynamic/json.svg?url=https%3A%2F%2Fraw.githubusercontent.com%2FStendarpaval%2Fmob-attack-tool%2Fmaster%2Fmodule.json&label=Foundry%20Version&query=$.compatibleCoreVersion&colorB=orange) [![Forge Installs](https://img.shields.io/badge/dynamic/json?label=Forge%20Installs&query=package.installs&suffix=%25&url=https%3A%2F%2Fforge-vtt.com%2Fapi%2Fbazaar%2Fpackage%2Fmob-attack-tool&colorB=4aa94a)](https://forge-vtt.com/bazaar#package=mob-attack-tool) ![Latest Release Download Count](https://img.shields.io/github/downloads/Stendarpaval/mob-attack-tool/latest/module.zip)

[![Foundry Hub Endorsements](https://img.shields.io/endpoint?logoColor=white&url=https%3A%2F%2Fwww.foundryvtt-hub.com%2Fwp-json%2Fhubapi%2Fv1%2Fpackage%2Fmob-attack-tool%2Fshield%2Fendorsements)](https://www.foundryvtt-hub.com/package/mob-attack-tool/) [![Foundry Hub Comments](https://img.shields.io/endpoint?logoColor=white&url=https%3A%2F%2Fwww.foundryvtt-hub.com%2Fwp-json%2Fhubapi%2Fv1%2Fpackage%2Fmob-attack-tool%2Fshield%2Fcomments)](https://www.foundryvtt-hub.com/package/mob-attack-tool/)

# Mob Attack Tool
This is a module for Foundry VTT that offers a tool for handling mob attacks in the dnd5e system. The focus lies on offering GMs and players accessible and flexible tools to speed up large combat encounters. This module supports use of the [Dice so Nice!](https://gitlab.com/riccisi/foundryvtt-dice-so-nice/-/tree/master), [Midi-QOL](https://gitlab.com/tposney/midi-qol/-/tree/master), [Grouped Initiative](https://github.com/vtt-lair/foundry-group-initiative), and [Automated Animations](https://github.com/otigon/automated-jb2a-animations) modules. 

## How to install
You can install this module by searching Foundry's package browser or by pasting this url in the corresponding text field of Foundry's package installer: `https://github.com/4cer/mob-attack-tool/releases/download/Test/module.zip`

## How to use
After activating this module, a new button appears in the token controls bar. By default this button is only visible to users with the GM role, but this can be changed in settings. To begin using Mob Attack Tool, make sure you have at least one token selected and exactly one token targeted before you click the button.

A dialog window will appear, populated with the weapon options of the selected tokens and a checkbox. Tick the checkbox of the weapon(s) you want to use for the mob attack. Mob Attack Tool can also automatically select weapons what are part of a multiattack ability, or just the weapon option that deals most damage.

Clicking on the Mob Attack button in the dialog window will then whisper a message (by default to the GM) with the mob attack results. Furthermore, the weapon item is rolled the number of times that an attack would hit.

## New

Make sure to read through the [latest release notes](https://github.com/Stendarpaval/mob-attack-tool/releases) to see what the newest features are.

## Examples

This is what the Mob Attack dialog looks like (as of v0.2.18) with multiattack autodetect + autoselect enabled. (Also shown are [JB2A Animated Assets](https://foundryvtt.com/packages/JB2A_DnD5e) triggered by a macro that makes use of Midi-QOL's On Use Macro field). 

<img width="979" alt="MAT-v0 2 18-on-use-macro-JB2a" src="https://user-images.githubusercontent.com/17188192/122660094-a3da2880-d17e-11eb-8332-44f684868bff.png">

Below are some (older) GIFs that give a brief idea of how you can use Mob Attack Tool.

<details>
  <summary>Click to show GIF of Mob Attack Tool</summary>

  ![MAT-video-v0 0 3](https://user-images.githubusercontent.com/17188192/110196581-c81b2f00-7e45-11eb-908a-f0fd73567e10.gif)
</details>

<details>
  <summary>Click to show GIF of Mob Attack Tool + Better Rolls for 5e + Midi-QOL</summary>

  ![MAT-video-midi-qol-v0 0 3](https://user-images.githubusercontent.com/17188192/110196624-0fa1bb00-7e46-11eb-9ec1-ade1ef8dff96.gif)
</details>

For more elaborate examples and screenshots, please head over to [EXAMPLES.md](EXAMPLES.md). (Note: the examples are currently quite outdated, but they should still give a general overview. Mob Attack Tool can do much nowadays than what is shown in the examples. Browse the [latest release notes](https://github.com/Stendarpaval/mob-attack-tool/releases) to find out what exactly.

## Planned improvements
* Further (optional) automation of the initial selection of tokens -> _In Progress_
* Some documentation and better structuring of the repo -> _In Progress_
* Multiple target selection enhancements

## Translations
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
