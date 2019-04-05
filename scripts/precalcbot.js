const fs = require('fs');
const showdown = require('showdown');

const converter = new showdown.Converter({ metadata: true });

const STATIC_PATH = `${__dirname}/../static/`;

let crewlist = JSON.parse(fs.readFileSync(STATIC_PATH + 'structured/crew.json', 'utf8'));

let botData = [];

for (let crew of crewlist) {
    if (crew.max_rarity < 4) {
        continue;
    }

	if (!fs.existsSync(`${STATIC_PATH}/crew/${crew.symbol}.md`)) {
        console.log(`Crew ${crew.name} not found!`);
    } else {
        converter.makeHtml(fs.readFileSync(`${STATIC_PATH}/crew/${crew.symbol}.md`, 'utf8'));
        let meta = converter.getMetadata();

        let botCrew = {
            name: crew.name,
            short_name: crew.short_name,
            traits_named: crew.traits_named,
            traits_hidden: crew.traits_hidden,
            imageUrlPortrait: crew.imageUrlPortrait,
            collections: crew.collections,
            symbol: crew.symbol,
            max_rarity: crew.max_rarity,
            bigbook_tier: meta.bigbook_tier,
            events: meta.events,
            ranks: crew.ranks,
            base_skills: crew.base_skills
        };

        botData.push(botCrew);
    }
}

if (fs.existsSync(`${__dirname}/../../datacore-behold/.env`)) {
    fs.writeFileSync(`${__dirname}/../../datacore-behold/botcrew.json`, JSON.stringify(botData));
}