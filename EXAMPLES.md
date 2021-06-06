# Examples
Here follow some examples of how to use Mob Attack Tool, along with screenshots. 

<strong>Note: The screenshots in this article are rather outdated, since they were made using Mob Attack Tool v0.1.18.</strong>

##### Table of Contents
* [Basic use case](#basic-use-case)
* [Module Settings](#module-settings)
  * [Use mob rules or roll individually](#use-mob-rules-or-roll-individually)
  * [Show individual attack rolls](#show-individual-attack-rolls)
* [Without Better Rolls for 5e](#without-better-rolls-for-5e)
* [Without Better Rolls for 5e or Midi-QOL](#without-better-rolls-for-5e-or-midi-qol)
* [Skipping Mob Turns](#skipping-mob-turns)
* [Export to macro](#export-to-macro)

## Basic use case
In order to use Mob Attack Tool, you first need to target an enemy and then select the tokens that make up the mob, as shown below.

<details>
  <summary>Show image</summary>

  <img width="1185" alt="screenshot_mat_1_select_target" src="https://user-images.githubusercontent.com/17188192/113690475-bbe7f300-96cb-11eb-8182-5e3047712f1d.png">
</details>

Next, you click the "Mob Attack" button, indicated by the red arrow in the picture above, to display the Mob Attack dialog. This is where you can select which weapons to use in the mob attack. After clicking the checkboxes to the right of each weapon you want to use, it should look like this:

<details>
  <summary>Show image</summary>

  <img width="1185" alt="screenshot_mat_3_mob_attack_dialog" src="https://user-images.githubusercontent.com/17188192/113690951-3fa1df80-96cc-11eb-8491-0bcf76555866.png">
</details>

Now you can hit Enter or click the "Mob Attack" button at the bottom of the dialog window to execute the mob attack. The way mob attacks are executed depends on which module settings are used, and whether you use the Better Rolls for 5e and/or Midi-QOL modules. 

## Module settings
Mob Attack Tool's settings of version 0.1.18 should look like this:

<details>
  <summary>Show image</summary>

  <img width="597" alt="screenshot_mat_17_settings_1" src="https://user-images.githubusercontent.com/17188192/113692034-64e31d80-96cd-11eb-8299-0b654b2c8be9.png">
</details>

Most settings have descriptions that speak for themselves, but the two settings that have the largest impact on Mob Attack Tool's behavior are **Use mob rules or roll individually** and **Show individual attack rolls**. 

### Use mob rules or roll individually
If you set this to mob rules, then Mob Attack Tool will evaluate how many attacks hit the target based on the "Handling Mobs" rules on page 250 of the Dungeon Master's Guide. If it is set to "Individual Attack Rolls", then Mob Attack Tool will roll individual attack rolls for each mob attacker.

Below you can see what a mob attack looks like when using the "Mob Rules", with both Better Rolls for 5e and Midi-QOL active.

<details>
  <summary>Show image</summary>

  <img width="1185" alt="screenshot_mat_6_mob_rules_damage_cards_betterrolls_midi" src="https://user-images.githubusercontent.com/17188192/113693882-61509600-96cf-11eb-85ef-26dc2c6785c4.png">
</details>

Likewise in the image below you can see what it looks like when using "Individual Attack Rolls" with both Better Rolls for 5e and Midi-QOL active. You'll notice that one attack roll was a critical hit, nice!

<details>
  <summary>Show image</summary>

  <img width="1185" alt="screenshot_mat_7_individual_rolls_betterrolls_idi" src="https://user-images.githubusercontent.com/17188192/113694151-ad033f80-96cf-11eb-8b11-7f61bd594ae6.png">
</details>

### Show individual attack rolls
If the previous setting is set to "Individual Attack Rolls", then Mob Attack Tool will only show these attack rolls if this setting is enabled. To save some chat log space, only attack rolls that would hit the target are shown. And even if this setting is disabled, then at least a single attack roll matching the target's AC is shown when using Better Rolls for 5e. This is currently necessary in order to trigger Midi-QOL's damage automation.

When using Better Rolls for 5e, the attack rolls have strange dice formula such as "0d0 +  17". This is also part of a workaround. Natural 20s and natural 1s are detected as usual. Support for crit thresholds lower than 20 is an upcoming feature.

Below you can see how individual attack rolls are displayed when this setting is enabled with both Better Rolls for 5e and Midi-QOL active.

<details>
  <summary>Show image</summary>

  <img width="1185" alt="screenshot_mat_8_show_individual_rolls_betterrolls_midi" src="https://user-images.githubusercontent.com/17188192/113694373-f5baf880-96cf-11eb-98a1-e946776e0be3.png">
</details>

## Without Better Rolls for 5e
I'm aware that Better Rolls for 5e and Midi-QOL don't always work perfectly together, and thus there are people who only use one of either. If only Better Rolls for 5e is active, then the results look identical minus the "HP Updated" chat message.

If only Midi-QOL is active and you're using the "Individual Attack Rolls" setting, then a mob attack would look like what is shown below.

<details>
  <summary>Show image</summary>

  <img width="1185" alt="screenshot_mat_9_individual_rolls_midi" src="https://user-images.githubusercontent.com/17188192/113694687-5b0ee980-96d0-11eb-970b-b61585d023a2.png">
</details>

In the image above you can see that both attack rolls were critical hits, but all damage formulas were condensed into a single formula. This saves quite a lot of chat log space. Unfortunately, as of now Mob Attack Tool does not support showing individual attack rolls when only Midi-QOL is active. I'll try to include it in a later release.

## Without Better Rolls for 5e or Midi-QOL
Of course, you can also use Mob Attack Tool without either of these modules. If "Show individual attack rolls" is disabled, then a mob attack that uses "Individual Attack Rolls" would appear as shown in the image below.

<details>
  <summary>Show image</summary>

  <img width="1185" alt="screenshot_mat_10_individual_rolls_no_mods" src="https://user-images.githubusercontent.com/17188192/113696165-f0f74400-96d1-11eb-8b30-4b3ba31a7a4f.png">
</details>

In the image below you can see what a mob attack would look like if "Show individual attack rolls" was enabled instead.

<details>
  <summary>Show image</summary>

  <img width="1185" alt="screenshot_mat_11_show_individual_rolls_no_mods" src="https://user-images.githubusercontent.com/17188192/113696314-1f751f00-96d2-11eb-8f9b-d3a19e16f3a6.png">
</details>

# Skipping Mob Turns

To save DMs an abundance of clicking "Next Turn" in the combat tracker, the Mob Attack dialog shows a checkbox that, if checked, executes the mob attack and then skips the turns of the current mob combatant **and** the turns of subsequent mob attackers if they are grouped together.

As an example, let's look at this group of 3 skeletons and their necromantic master, the wizard Zanna. They happen to be grouped together in initiative, partly due to the Grouped Initiative module. See below.

<details>
  <summary>Show image</summary>

  <img width="1185" alt="screenshot_mat_12_skip_turn_1" src="https://user-images.githubusercontent.com/17188192/113696789-b93ccc00-96d2-11eb-9ecf-2501f681b10c.png">
</details>

Let's say the skeletons attack with their bows and Zanna with a Fire Bolt cantrip. To prevent having to click "Next Turn" four times after this mob attack, you check the "Skip turns of next mob combatants" option in the Mob Attack dialog as shown below.

<details>
  <summary>Show image</summary>

  <img width="1185" alt="screenshot_mat_13_skip_turn_2" src="https://user-images.githubusercontent.com/17188192/113697075-06b93900-96d3-11eb-94f2-789b72719350.png">
</details>

Next you hit "Mob Attack" and the attacks are rolled, first the skeleton's and then Zanna's, after which their turns are skipped automatically. In this case, that means that the next round has started, as shown below.

<details>
  <summary>Show image</summary>

  <img width="1185" alt="screenshot_mat_14_skip_turn_3" src="https://user-images.githubusercontent.com/17188192/113697216-310af680-96d3-11eb-8426-552edd36ce96.png">
</details>

Please note that Mob Attack Tool currently only looks at the actor id when skipping turns. If you have a complicated combat encounter where there are friendly and enemy mobs of archers, then make sure that friendly and enemy archer tokens are linked to different actors in order for this function not to accidentally skip their turns as well.

# Export to macro
Selecting tokens can be cumbersome, especially if you need to select many of them and they sometimes have moved individually. Furthermore, some mobs will always do the same attacks, so why go through the entire dialog every time? 

Well, Mob Attack Tool makes life easier by allowing you to export mob attacks to macros. To do so, you need to check the "Export to Macro" option in the Mob Attack Dialog, as shown below.

<details>
  <summary>Show image</summary>

  <img width="1185" alt="screenshot_mat_5_mob_attack_dialog_macro" src="https://user-images.githubusercontent.com/17188192/113697852-12592f80-96d4-11eb-93cc-8c6fbcfac0b1.png">
</details>

Next, you'll see a notification with the name of the newly created macro:

<details>
  <summary>Show image</summary>

  <img width="1185" alt="screenshot_mat_15_macro_notification" src="https://user-images.githubusercontent.com/17188192/113697908-2735c300-96d4-11eb-8f9f-d1708d5df447.png">
</details>

Head on over to your macro directory, and you'll find it at the very bottom. If you edit it, it'll look something like the example shown below.

<details>
  <summary>Show image</summary>

  <img width="1185" alt="screenshot_mat_16_macro_edit" src="https://user-images.githubusercontent.com/17188192/113698013-4cc2cc80-96d4-11eb-9b8e-281b9895c62c.png">
</details>

To use this macro, you only need to target a token and then you can run the macro. 
