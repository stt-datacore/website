---
title: "About"
---

> **NOTE** This project is a work in progress, still in the early stages. All feedback is welcome!

DataCore is a companion resource to Disruptor Beam's [Star Trek Timelines](https://www.disruptorbeam.com/games/star-trek-timelines) game. It's designed as a compendium of data, statistics and assets, both extracted from the game as well as user generated.

This is a **static website**, it never connects to any external data source and in fact has no back-end. The website pages are assembled using the [Gatsby](https://www.gatsbyjs.org/) static site generator, from source material in the project's [GitHub repo](https://github.com/TemporalAgent7/datacore).

> The game already has a wiki! Why does this project exist?

The wiki is entirely user-generated, which means it is susceptible to human error. This website is a "structured CMS"; some of the data is fully structured and exported from the game (meaning it's trusted to be complete and accurate), while other data (such as help pages, BigBook entries, etc.) are edited and contributed by users. This structure allows easy, partially automated updates, and opens the door for more consumption scenarios (style the data into any format we want, such as spreadsheets, documents, Discord bot-consumable endpoints, etc.)

### Known issues

* The "in portal" field is not set yet and will say **NO** for every crew
* The big book text doesn't include formatting (links, bold, etc.)

A note about mission data for equipment sources: the source data was collected from a handful of volunteering accounts, but it's missing the details from certain end-of-episode missions (depending on the choices the respective user made). This currently only affects the "estimated chroniton cost" value for crew. These are the missions whose data we're missing:
* By Hook Or By Crook [E1-M14B]
* The Toss [E2-M19A]
* A New Recruit [E2-M19C]
* Smiles and Knives [E4-M14B]
* Thy Enemy's Secrets [E5-M18A]
* Garak's Gamble [E7-M13A]
* Proven Toxicity [E8-M14A]
* Bearing Up [E9-M4A]

### Contact

Once we grow the team of contributors and volunteers we may set up a Discord or some other means of communication. But for now, the easiest way to get in touch is by opening [issues on GitHub](https://github.com/TemporalAgent7/datacore/issues/new); you can also find me on the [STT Discord server](https://discord.gg/8Du7ZtJ) as TemporalAgent7#3792, and on reddit as [u/TemporalAgent7](https://www.reddit.com/user/TemporalAgent7).

### Licensing

This project is built with [Gatsby](https://www.gatsbyjs.org/), [Netlify CMS](https://www.netlifycms.org) and a lot of hard work.

It follows the [JAMstack architecture](https://jamstack.org) by using Git as a single source of truth, and [Netlify](https://www.netlify.com) for continuous deployment, and CDN distribution.

Assets and some textual elements like names and descriptions are owned by Disruptor Beam or their licensors. This project is not associated with nor endorsed by Disruptor Beam.

Some code used to build this site was originally authored by IAmPicard (c) 2017 - 2018 and released under GPL-V3.

Some crew notes are imported from [u/Automaton_2000](https://reddit.com/user/Automaton_2000)'s [Big Book](https://docs.google.com/document/d/1vvl3wS1cY29ScQwWcTA6tJgcXvbdadY6vgPpn0swzbs/edit#) and [u/idoliside](https://reddit.com/user/idoliside)'s [Little Book](https://docs.google.com/document/d/1RKdRtJcePeey-921OCVKcU41YZTmFpVThXE10Uff-aA/edit#). Content used with their permission.

This project is licensed under MIT, and if you choose to contribute code or other media you agree that your contributions will be licensed under its [MIT license](https://github.com/TemporalAgent7/datacore/blob/master/LICENSE).