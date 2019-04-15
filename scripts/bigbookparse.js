const fs = require('fs');
const rp = require('request-promise');
const showdown = require('showdown');

const converter = new showdown.Converter({ metadata: true });

const BIGBOOK_URL = 'https://docs.google.com/document/export?format=txt&id=1vvl3wS1cY29ScQwWcTA6tJgcXvbdadY6vgPpn0swzbs';

function parseCrew(lines) {
	let tier = 0;
	let crew = [];
	let curcrew = undefined;
	for (let line of lines) {
		let ft = /^\t\(([\d ]+)\)/g.exec(line);
		if (ft) {
			tier = Number.parseInt(ft[1]);
			if (curcrew) {
				crew.push(curcrew);
			}

			let nameStart = line.indexOf(')') + 1;
			curcrew = { tier, descr: [], name: line.substr(nameStart, line.indexOf(' -') - nameStart).trim() };

			let evr = /(\d+) event/g.exec(line);
			if (evr) {
				curcrew.events = Number.parseInt(evr[1]);
			}
		} else {
			if (curcrew) {
				line = line.trim();
				if ((line.length > 1) && (!/^Tier (\d+)/g.exec(line)) && !line.startsWith("______"))
				{
					curcrew.descr.push(line);
				}
			}
		}
	}

	if (curcrew) {
		crew.push(curcrew);
	}

	return crew;
}

async function getData() {
	let data = await rp(BIGBOOK_URL);
	//fs.writeFileSync(__dirname + '/bigbook.txt', data);
	//let data = fs.readFileSync(__dirname + '/bigbook.txt', 'utf8');

	// Make parsing easier, and replace unicode chars with normal ascii ones
	data = data
		.replace(/’/g, "'")
		.replace(/‘/g, "'")
		.replace(/“/g, '"')
		.replace(/”/g, '"');

	let lines = data.split('\r\n');

	let section5 = 0;
	let section5end = 0;
	let section4end = 0;
	for (let i = 0; i < lines.length; i++) {
		if (lines[i] === '5* crew tiers and notes') {
			// Start of section
			section5 = i;
		}

		if (lines[i] === '4* crew tiers and notes') {
			// Start of section
			section5end = i - 1;
		}

		if (lines[i] === 'One-star wonders') {
			// Start of section
			section4end = i - 1;
		}
	}

	let crew5 = parseCrew(lines.slice(section5, section5end));
	let crew4 = parseCrew(lines.slice(section5end + 2, section4end));

	return crew4.concat(crew5);
}

// TODO: talk with Automaton_2000 about fixing these in the doc
const fixMisspell = bbname => {
	if (bbname.endsWith(')'))
	{
		bbname = bbname.substr(0, bbname.indexOf('(')).trim();
	}

	return bbname;
};

async function main() {
	let crewData = await getData();

	for (let crew of crewData) {
		crew.descr = crew.descr.join('\r\n\r\n');
		crew.name = fixMisspell(crew.name);
	}

    const STATIC_PATH = `${__dirname}/../static/`;
    
    let crewlist = JSON.parse(fs.readFileSync(STATIC_PATH + 'structured/crew.json'));

	let mapCrew = new Map();
	fs.readdirSync(`${STATIC_PATH}/crew/`).forEach(file => {
		if (file.endsWith('.md')) {
			converter.makeHtml(fs.readFileSync(`${STATIC_PATH}/crew/${file}`, 'utf8'));
			let meta = converter.getMetadata();
			if (meta && meta.name) {
				let name = meta.name;

				if (name.startsWith('\'') && name.endsWith('\''))
				{
					name = name.substr(1, name.length - 2);
				}

				if (name.startsWith('&quot;') && name.endsWith('&quot;'))
				{
					name = name.substr(6, name.length - 12);
				}

				name = name.replace(/&quot;/g, '"');

                let crewjson = crewlist.find(c => c.symbol === file.replace(".md", ""));
                if (!crewjson) {
                    console.log(`Not found in json: ${name}`);
                    return;
				}

				mapCrew.set(name.replace(/\"/g, ''), {
					rarity: meta.rarity.replace(/&quot;/g, '').replace(/'/g, ''),
                    series: crewjson.series,
					memory_alpha: meta.memory_alpha ? meta.memory_alpha.replace(/&quot;/g, '').replace(/'/g, '') : undefined,
					in_portal: (meta.in_portal === "true") || (meta.in_portal === true),
					file
				});
			}
		}
	});

	for (let crew of crewData) {
		if (mapCrew.has(crew.name.replace(/\"/g, ''))) {
            let meta = mapCrew.get(crew.name.replace(/\"/g, ''));

			fs.writeFileSync(
				`${STATIC_PATH}/crew/${meta.file}`,
				`---
name: ${(crew.name.indexOf('"') >= 0) ? `'${crew.name}'` : crew.name}
rarity: ${meta.rarity}
series:${meta.series ? ` ${meta.series}` : ""}
memory_alpha:${meta.memory_alpha ? (" " + meta.memory_alpha) : ""}
bigbook_tier: ${crew.tier}
events: ${crew.events || 0}
in_portal:${meta.in_portal ? " true" : ""}
published: true
---

${crew.descr}
`
			);
		} else {
			console.log(`'${crew.name}' not found!`);
		}
	}
}

main();
