# Mob Attack Tool
A module for Foundry VTT that offers a tool for handling mob attacks in the dnd5e system.

## How to use
After activating this module, a new button appears in the token controls bar. This button is only visible to users with the GM role. To use the Mob Attack tool, make sure you have at least one token selected and exactly one token targeted. 

A dialog window will appear, populated with the weapon options of the selected tokens along with their respective attack bonuses and a checkbox. Tick the checkbox of the weapon(s) you want to use for the mob attack. 

Clicking on the Mob Attack button in the dialog window will then whisper a message to the GM with the mob attack results. Furthermore, the weapon item is rolled the number of times that an attack would hit.

## Dependencies
* [Better Rolls for 5e](https://github.com/RedReign/FoundryVTT-BetterRolls5e)

## Planned improvements
* Improved automatic rolling of damage.
* No dependency on Better Rolls for 5e (though still supporting it).
* Improved support for [midi-qol](https://gitlab.com/tposney/midi-qol).

## Inspirations
This module was inspired by [Multiattack 5e](https://github.com/jessev14/Multiattack-5e).
