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
		let ft = /^\((\d+)\)$/g.exec(line);
		if (ft) {
			tier = Number.parseInt(ft[1]);
			curcrew = undefined;
		}

		if (line.startsWith('*')) {
			if (curcrew) {
				crew.push(curcrew);
			}

			curcrew = { tier, name: line.substr(2, line.indexOf(' -') - 2).trim() };

			let evr = /(\d+) events/g.exec(line);
			if (evr) {
				curcrew.events = Number.parseInt(evr[1]);
				curcrew.descr = line.substr(evr.index + 10).trim();
				if (curcrew.descr.startsWith('-')) {
					curcrew.descr = curcrew.descr.substr(1).trim();
				}
			}
		} else {
			if (curcrew) {
				curcrew.descr += '\r\n' + line;
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
		.replace(/ 1 event /g, ' 1 events ')
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
	if (bbname === 'Duras Sisters') {
		return 'The Duras Sisters';
	} else if (bbname === 'Section 31 Phillipa Georgiou') {
		return 'Section 31 Philippa Georgiou';
	} else if (bbname === 'Armed Phillipa Georgiou') {
		return 'Armed Philippa Georgiou';
	} else if (bbname === "Ba'Ku Worf") {
		return "Ba'ku Worf";
	} else {
		return bbname.replace(/"/g, '\\');
	}
};

async function main() {
	let crewData = await getData();

	for (let crew of crewData) {
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
                let name = meta.name.replace(/&quot;/g, '');
                
                let crewjson = crewlist.find(c => c.name === name);
                if (!crewjson) {
                    console.log(`Not found in json: ${name}`);
                    return;
                }

				mapCrew.set(name, {
					rarity: meta.rarity.replace(/&quot;/g, '').replace(/'/g, ''),
                    series: crewjson.series,
                    memory_alpha: meta.series.replace(/&quot;/g, '').replace(/'/g, ''),
					file
				});
			}
		}
	});

	for (let crew of crewData) {
		if (mapCrew.has(crew.name)) {
            let meta = mapCrew.get(crew.name);

			fs.writeFileSync(
				`${STATIC_PATH}/crew/${meta.file}`,
				`---
name: ${crew.name.replace(/\\/g, '\\"')}
rarity: ${meta.rarity}
series: ${meta.series || "''"}
memory_alpha: ${meta.memory_alpha || "''"}
bigbook_tier: ${crew.tier}
events: ${crew.events || 0}
in_portal: false
published: true
---

${crew.descr}
`
			);
		} else {
			console.log(`!!!!!!!!!${crew.name} not found!`);
		}
	}
}

main();
