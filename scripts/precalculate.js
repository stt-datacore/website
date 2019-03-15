const fs = require('fs');

const STATIC_PATH = `${__dirname}/../static/structured/`;

let allcrew = JSON.parse(fs.readFileSync(STATIC_PATH + 'crew.json'));

const SKILLS = {
	command_skill: 'CMD',
	science_skill: 'SCI',
	security_skill: 'SEC',
	engineering_skill: 'ENG',
	diplomacy_skill: 'DIP',
	medicine_skill: 'MED'
};

const STARBASE_BONUS_CORE = 1.15;
const STARBASE_BONUS_RANGE = 1.13;
const THIRD_SKILL_MULTIPLIER = 0.25;

for (let crew of allcrew) {
	crew.ranks = {};
}

function calcRank(scoring, field) {
	allcrew
		.map(crew => ({ crew, score: scoring(crew) }))
		.sort((a, b) => b.score - a.score)
		.forEach((entry, idx) => {
            if (entry.score && entry.score > 0) {
                entry.crew.ranks[field] = idx + 1;
            }
        });
}

calcRank(crew => {
	let voyTotal = 0;
	for (let skill in SKILLS) {
		if (crew.base_skills[skill]) {
			let voyScore =
				crew.base_skills[skill].core * STARBASE_BONUS_CORE +
				((crew.base_skills[skill].range_max + crew.base_skills[skill].range_min) / 2) * STARBASE_BONUS_RANGE;
			voyTotal += voyScore;
		}
	}

	return Math.ceil(voyTotal);
}, 'voyRank');

calcRank(crew => {
	let gauntletTotal = 0;
	for (let skill in SKILLS) {
		if (crew.base_skills[skill]) {
			let gauntletScore = ((crew.base_skills[skill].range_max + crew.base_skills[skill].range_min) * STARBASE_BONUS_RANGE) / 2;
			gauntletTotal += gauntletScore;
		}
	}

	return Math.ceil(gauntletTotal);
}, 'gauntletRank');

let skillNames = [];
for (let skill in SKILLS) {
	skillNames.push(skill);

	calcRank(crew => {
		if (crew.base_skills[skill]) {
			return Math.ceil(crew.base_skills[skill].core * STARBASE_BONUS_CORE);
		}

		return 0;
	}, `B_${SKILLS[skill]}`);
}

for (let i = 0; i < skillNames.length - 1; i++) {
	for (let j = i + 1; j < skillNames.length; j++) {
		calcRank(crew => {
			let vTotal = 0;
			let vTertiary = 0;
			for (let skill in SKILLS) {
				if (crew.base_skills[skill]) {
					let vScore =
						crew.base_skills[skill].core * STARBASE_BONUS_CORE +
						((crew.base_skills[skill].range_max + crew.base_skills[skill].range_min) / 2) * STARBASE_BONUS_RANGE;

					if (skill === skillNames[i] || skill === skillNames[j]) {
						vTotal += vScore;
					} else {
						vTertiary += vScore;
					}
				}
			}

			return Math.ceil(vTotal + vTertiary * THIRD_SKILL_MULTIPLIER);
        }, `V_${SKILLS[skillNames[i]]}_${SKILLS[skillNames[j]]}`);
        
        calcRank(crew => {
			let vTotal = 0;
			let vTertiary = 0;
			for (let skill in SKILLS) {
				if (crew.base_skills[skill]) {
					let vScore =
						((crew.base_skills[skill].range_max + crew.base_skills[skill].range_min) / 2) * STARBASE_BONUS_RANGE;

					if (skill === skillNames[i] || skill === skillNames[j]) {
						vTotal += vScore;
					} else {
						vTertiary += vScore;
					}
				}
			}

			return Math.ceil(vTotal + vTertiary * THIRD_SKILL_MULTIPLIER);
		}, `G_${SKILLS[skillNames[i]]}_${SKILLS[skillNames[j]]}`);
	}
}

fs.writeFileSync(STATIC_PATH + 'crew.json', JSON.stringify(allcrew));
