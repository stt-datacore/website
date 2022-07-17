import CONFIG from '../components/CONFIG';

export function crewMatchesSearchFilter(crew: any, filters: [], filterType: string): boolean {
	if (filters.length == 0) return true;

    const filterTypes = {
        'Exact': (input: string, searchString: string) => input.toLowerCase() == searchString.toLowerCase(),
        'Whole word': (input: string, searchString: string) => new RegExp('\\b' + searchString + '\\b', 'i').test(input),
        'Any match': (input: string, searchString: string) => input.toLowerCase().indexOf(searchString.toLowerCase()) >= 0
    };
	const matchesFilter = filterTypes[filterType];
	let meetsAnyCondition = false;

	for (let filter of filters) {
		let meetsAllConditions = true;
		if (filter.conditionArray.length === 0) {
			// text search only
			for (let segment of filter.textSegments) {
				let segmentResult =
					matchesFilter(crew.name, segment.text) ||
					matchesFilter(crew.short_name, segment.text) ||
					crew.nicknames.some(n => matchesFilter(n.cleverThing, segment.text)) ||
					crew.traits_named.some(t => matchesFilter(t, segment.text)) ||
					crew.traits_hidden.some(t => matchesFilter(t, segment.text));
				meetsAllConditions = meetsAllConditions && (segment.negated ? !segmentResult : segmentResult);
			}
		} else {
			let rarities = [];
			for (let condition of filter.conditionArray) {
				let conditionResult = true;
				if (condition.keyword === 'name') {
					conditionResult = matchesFilter(crew.name, condition.value);
				} else if (condition.keyword === 'trait') {
					conditionResult =
						crew.traits_named.some(t => matchesFilter(t, condition.value)) ||
						crew.traits_hidden.some(t => matchesFilter(t, condition.value));
				} else if (condition.keyword === 'rarity') {
					if (!condition.negated) {
						rarities.push(Number.parseInt(condition.value));
						continue;
					}

					conditionResult = crew.max_rarity === Number.parseInt(condition.value);
				} else if (condition.keyword === 'skill') {
					// Only full skill names or short names are valid here e.g. command or cmd
					let skillShort = CONFIG.SKILLS_SHORT.find(skill => skill.short === condition.value.toUpperCase());
					let skillName = skillShort ? skillShort.name : condition.value.toLowerCase()+"_skill";
					conditionResult = skillName in crew.base_skills;
				} else if (condition.keyword === 'in_portal') {
					conditionResult = condition.value.toLowerCase() === 'true' ? crew.in_portal : !crew.in_portal;
				} else if (condition.keyword === 'ship') {
					conditionResult = matchesFilter(CONFIG.CREW_SHIP_BATTLE_BONUS_TYPE[crew.action.bonus_type], condition.value) ||
						(crew.action.ability && crew.action.ability.type !== '' &&
							(matchesFilter(CONFIG.CREW_SHIP_BATTLE_ABILITY_TYPE[crew.action.ability.type], condition.value) ||
								matchesFilter(CONFIG.CREW_SHIP_BATTLE_TRIGGER[crew.action.ability.condition], condition.value)));
				}
				meetsAllConditions = meetsAllConditions && (condition.negated ? !conditionResult : conditionResult);
			}

			if (rarities.length > 0) {
				meetsAllConditions = meetsAllConditions && rarities.includes(crew.max_rarity);
			}

			for (let segment of filter.textSegments) {
				let segmentResult =
					matchesFilter(crew.name, segment.text) ||
					crew.traits_named.some(t => matchesFilter(t, segment.text)) ||
					crew.traits_hidden.some(t => matchesFilter(t, segment.text));
				meetsAllConditions = meetsAllConditions && (segment.negated ? !segmentResult : segmentResult);
			}
		}
		if (meetsAllConditions) {
			meetsAnyCondition = true;
			break;
		}
	}

	return meetsAnyCondition;
}
