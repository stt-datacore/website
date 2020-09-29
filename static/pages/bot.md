---
title: DataCore bot
---

## DataCore bot

As a companion to this website, I'm hosting a Discord bot which uses the same data. It can give you quick stats about crew, places to farm items as well as help with beholds - using the magic of AI / computer vision to extract the options out of behold screenshots. The bot is available on the (unofficial) [Star Trek Timelines Discord server](https://discord.gg/8Du7ZtJ).

Stats on crew:

<img src="/media/uploads/botscreen_1.png" style="max-width: 100%" />

Search for best crew for gauntlet, voyage or based on their stats, traits and names:

<img src="/media/uploads/botscreen_2.png" style="max-width: 100%" />

Analyze beholds and get stats and recommendations:

<img src="/media/uploads/botscreen_3.png" style="max-width: 100%" />

## Full list of current bot commands:

| <div style="width:300px">Command with Options</div> | Description |
| :-------------------- | :----------- |
| -d help | Show the available commands. |
| -d help \<cmd\> | Show the syntax help for a command. |
| -d search \<term\> \[-s #] | Searches crew by name, traits, or skills.  The -s argument allows you to specify the rarity of the crew in stars (default search is five). |
| -d \[stats \| estats \| c] \<crew\> | Displays stats for the given crew |
| -d best \<skilltype\> \<skill\> \[secondskill] \[-s #] | Searches for the best crew according to the skill type.  Available types are base, gauntlet (proficiency), or either avg or voyages (combined) skill rating.  Available skills are com (Command), dip (Diplomacy), eng (Engineering), sec (Security), med (Medicine), and sci (Science).  The -s argument allows you to specify the rarity of the crew in stars (default search is five). |
| -d behold \<url\> | Analyzes a behold screenshot and returns crew details.  When creating your screenshot, make sure the "Choose One" text is fully visible at the top of the behold, and "Tap and Hold the portrait for more information" is also visible at the bottom.  Make sure the left and right box borders are visible.  This helps the system recognize the portraits. |
| -d farm \<rarity\> \<item name\> | This searches the drop rate and recipes for an item and returns the best places to get the item.  Rarity is the number corresponding to the number of stars on the item in question. |
| -d voytime \<primary\> \<secondary\> \<skill 3\> \<skill 4\> \<skill 5\> \<skill 6\> \[antimatter] | This tool estimates the length of a voyage.  Entries are the total skill value for the primary skill for the voyage, secondary skill, and then each of the other skills on your voyage.  You can also optionally tell the estimator your starting antimatter. |
| -d dilemma \<dilemma title\> | Searches for voyage dilemmas with the given title. |
| -d gauntlet \[trait 1] \[trait 2] \[trait 3] | Enter the traits featured in the gauntlet, and retrieve the best crew to use with at least two of the three traits. |
| -d meme \<name\> \[text] | Generate a meme image and post it. |
| -d associate \<dbid\> \[text] | Associate your Discord user account with a previously uploaded profile DBID. |
| -d profile \[verb] \[text] | Display a summary of the profile associated with your DBID. |
| -d resetprofile | Remove any associations between your discord user and an uploaded profile DBID. |
| -d crewneed \<crewname\> | Shows a breakdown of items needed to craft a specific crew member. |

## How to be polite to your bot:

Your bot is like a small child; it hears everything.  Please do not send extraneous images to the bot, or chat on the bot line.  It forces the bot to check whether the images or conversations are actually commands.  This in turn causes the bot to pay attention to your conversation rather than someone else's behold, leading to longer wait times for you, and more money spent on data transfer and processing for the bot.

## Adding the bot to your fleet:     
If you want to add the bot to your own fleet server, please contact us for details (see below for instructions).

### Setup instructions

Before inviting the bot to your Discord server, make sure you have set up the following emojis the bot depends on. Also, if possible, restrict the bot to specific channels; it will attempt to download and analyze all images (in case they are beholds), which puts a big stress on the server.

Download the emoji images here:
[chrons](/media/emoji/chrons.png) [honor](/media/emoji/honor.png) [cmd](/media/emoji/cmd.png) [dip](/media/emoji/dip.png) [eng](/media/emoji/eng.png) [med](/media/emoji/med.png) [sci](/media/emoji/sci.png) [sec](/media/emoji/sec.png)

Make sure the emojis have the same name as the file name. The emoji tab of your server settings should look like this after you add them:

<img src="/media/uploads/botemojis.png" style="max-width: 100%" />