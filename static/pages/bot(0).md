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

If you want to add the bot to your own fleet server, please contact me for details (see below for instructions).

## Setup instructions

Before inviting the bot to your Discord server, make sure you have set up these emojis which the bot depends on. Also, if possible, restrict the bot to specific channels; it will attempt to download and analyze all images (in case they are beholds), which puts a big stress on the server.

Download the emoji images here:
[chrons](/media/emoji/chrons.png) [honor](/media/emoji/honor.png) [cmd](/media/emoji/cmd.png) [dip](/media/emoji/dip.png) [eng](/media/emoji/eng.png) [med](/media/emoji/med.png) [sci](/media/emoji/sci.png) [sec](/media/emoji/sec.png)

Make sure the emojis have the same name as the file name. The emoji tab of your server settings should look like this after you add them:

<img src="/media/uploads/botemojis.png" style="max-width: 100%" />

## Full List of Current Bot Commands:

<table>
  <tr>
    <td>-d search &lt;term...&gt;</td>
    <td>Searches crew by name and/or traits</td>
  <tr>

  <tr>
    <td>-d [stats | estats | c] &lt;crew...&gt;</td>
    <td>Displays stats for the given crew</td>
  <tr>

  <tr>
    <td>-d search '<term...'></td>
    <td>Searches crew by name and/or traits</td>
  <tr>

  <tr>
    <td>-d search '<term...'></td>
    <td>Searches crew by name and/or traits</td>
  <tr>

  <tr>
    <td>-d search '<term...'></td>
    <td>Searches crew by name and/or traits</td>
  <tr>

  <tr>
    <td>-d search '<term...'></td>
    <td>Searches crew by name and/or traits</td>
  <tr>

  <tr>
    <td>-d search '<term...'></td>
    <td>Searches crew by name and/or traits</td>
  <tr>


                                                                         [aliases: estats | c]

  -d best <type> <skill> [secondskill]      Searches top crew according to base, gauntlet or average (voyages) skill rating

  -d behold <url>                           Analyzes a behold screenshot and returns crew details if identified
  -d farm <rarity> <name..>                 Searches drop rates and/or recipes
                                            for items            [aliases: item]
  -d voytime <primary> <secondary>          Estimates the length of a voyage
  <skill3> <skill4> <skill5> <skill6>
  [antimmatter]
  -d dilemma <title...>                     Searches dilemmas with the given
                                            title               [aliases: dd, d]
  -d gauntlet [trait1] [trait2] [trait3]    Searches crew to use in gauntlet
                                            that have at least 2 of the 3 given
                                            traits
  -d meme <name> [text..]                   Generate a meme image and post it
  -d associate <dbid> [test]                Associate your discord user with a
                                            previously uploaded profile DBID
  -d profile [verb] [text...]               Display a summary of your associated
                                            profile
  -d resetprofile                           Remove any associations between your
                                            discord user and any profiles
                                            (DBIDs)
  -d crewneed <crew...>                     Shows a breakdown of items needed to
                                            craf...