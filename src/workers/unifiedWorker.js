/* eslint-disable */

import voymod from './voymod.js';
import chewable from './chewable.js';

const SKILLS = [
	'command_skill',
	'science_skill',
	'security_skill',
	'engineering_skill',
	'diplomacy_skill',
	'medicine_skill'
];

self.addEventListener('message', message => {
	if (message.data.worker === 'chewable') {
		chewableEstimate(message.data.config, progressResult => self.postMessage(progressResult)).then(estimate => {
			self.postMessage(estimate);
			self.close();
		});
	} 
});

function finaliseIAPEstimate(data, result, numSims = 5000) {
	const { voyage_description } = data;
	let entries = [];
	let aggregates = Object.fromEntries(Array.from(SKILLS,
										s => [s, ({skill: s, core: 0, range_min: 0, range_max: 0})]));
	let config = {
		numSims: numSims,
		startAm: data.shipAM
	};

	for (let i = 0; i < 12; i++) {
		let crew = data.roster.find(c => c.id === result.getUint32(4 + i * 4, true));

		let entry = {
			slotId: i,
			choice: crew,
			hasTrait: crew
									.traits_named
									.map(trait => trait.toLowerCase())
									.includes(voyage_description.crew_slots[i].trait)
		};

		for (let skill of SKILLS) {
			aggregates[skill].core += crew[skill].core;
			aggregates[skill].range_min += crew[skill].min;
			aggregates[skill].range_max += crew[skill].max;
		}

		if (entry.hasTrait) config.startAm += 25;

		entries.push(entry);
	}


	const {primary_skill, secondary_skill } = voyage_description.skills;
	config.ps = aggregates[primary_skill];
	config.ss = aggregates[secondary_skill];

	config.others =
		Object.values(aggregates)
					.filter(value => value.skill != primary_skill && value.skill != secondary_skill);

	return {
		name: data.name,
		estimate: chewable.getEstimate(config),
		entries,
		aggregates,
		startAM: config.startAm
	};
}

function exportVoyageData(options) {
	let dataToExport = {
		// These values get filled in the following code
		crew: [],
		binaryConfig: undefined,
		worker: options.worker
	};

	let binaryConfigBuffer = new ArrayBuffer(34);
	let binaryConfig = new DataView(binaryConfigBuffer);
	binaryConfig.setUint8(0, options.searchDepth);
	binaryConfig.setUint8(1, options.extendsTarget);
	binaryConfig.setUint16(2, options.shipAM, true);
	binaryConfig.setFloat32(4, options.skillPrimaryMultiplier, true);
	binaryConfig.setFloat32(8, options.skillSecondaryMultiplier, true);
	binaryConfig.setFloat32(12, options.skillMatchingMultiplier, true);
	binaryConfig.setUint16(16, options.traitScoreBoost, true);

	// 18 is primary_skill
	// 19 is secondary_skill
	// 20 - 32 is voyage_crew_slots

	binaryConfig.setUint16(32, 0 /*crew.size*/, true);

	let voyage_description = options.voyage_description;
	const SLOT_COUNT = voyage_description.crew_slots.length;
	console.assert(SLOT_COUNT === 12, 'Ooops, voyages have more than 12 slots !? The algorithm needs changes.');

	// Find unique traits used in the voyage slots
	let setTraits = new Set();
	voyage_description.crew_slots.forEach(slot => {
		setTraits.add(slot.trait);
	});

	let arrTraits = Array.from(setTraits);

	// Replace traits and skills with their id
	let slotTraitIds = [];
	for (let i = 0; i < voyage_description.crew_slots.length; i++) {
		let slot = voyage_description.crew_slots[i];

		binaryConfig.setUint8(20 + i, SKILLS.indexOf(slot.skill));
		slotTraitIds[i] = arrTraits.indexOf(slot.trait);
	}

	binaryConfig.setUint8(18, SKILLS.indexOf(voyage_description.skills.primary_skill));
	binaryConfig.setUint8(19, SKILLS.indexOf(voyage_description.skills.secondary_skill));

	options.roster.forEach(crew => {
		let traitIds = [];
		crew.traits.forEach(trait => {
			if (arrTraits.indexOf(trait) >= 0) {
				traitIds.push(arrTraits.indexOf(trait));
			}
		});

		let traitBitMask = 0;
		for (let nFlag = 0; nFlag < SLOT_COUNT; traitBitMask |= (traitIds.indexOf(slotTraitIds[nFlag]) !== -1 ? 1 : 0) << nFlag++);

		// We store traits in the first 12 bits, using the next few for flags
		traitBitMask |= (crew.immortal > 0 ? 1 : 0) << SLOT_COUNT;
		traitBitMask |= (crew.active_id && crew.active_id > 0 ? 1 : 0) << (SLOT_COUNT + 1);
		traitBitMask |= (crew.level == 100 && crew.rarity == crew.max_rarity ? 1 : 0) << (SLOT_COUNT + 2); // ff100

		// Replace skill data with a binary blob
		let buffer = new ArrayBuffer(6 /*number of skills */ * 3 /*values per skill*/ * 2 /*we need 2 bytes per value*/);
		let skillData = new Uint16Array(buffer);
		for (let i = 0; i < SKILLS.length; i++) {
			if (!crew.skills[SKILLS[i]]) {
				skillData[i * 3] = 0;
				skillData[i * 3 + 1] = 0;
				skillData[i * 3 + 2] = 0;
			} else {
				let skill = crew.skills[SKILLS[i]];
				skillData[i * 3] = skill.core;
				skillData[i * 3 + 1] = skill.range_min;
				skillData[i * 3 + 2] = skill.range_max;
			}
		}

		// This won't be necessary once we switch away from Json to pure binary for native invocation
		let newCrew = {
			id: crew.crew_id ? crew.crew_id : crew.id,
			name: crew.name.replace(/[^\x00-\x7F]/g, ''),
			traitBitMask: traitBitMask,
			max_rarity: crew.max_rarity,
			skillData: Array.from(skillData)
		};

		dataToExport.crew.push(newCrew);
	});

	binaryConfig.setUint16(32, dataToExport.crew.length, true);

	dataToExport.binaryConfig = Array.from(new Uint8Array(binaryConfigBuffer));

	return dataToExport;
}

// This worker can estimate a single lineup from input config
const chewableEstimate = (config, progress = () => true) => {
	return new Promise((resolve, reject) => {
		let estimate = chewable.getEstimate(config, progress);
		resolve(estimate);
	});
};
