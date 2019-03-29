export interface IDemand {
	count: number;
	symbol: string;
	equipment: any;
	factionOnly: boolean;
}

export interface ICrewDemands {
	demands: IDemand[];
	factionOnlyTotal: number;
    totalChronCost: number;
    craftCost: number;
}

export function calculateCrewDemands(crew: any, items: any[]): ICrewDemands {
	let craftCost = 0;
	let demands = [];
	let dupeChecker = new Set();
	crew.equipment_slots.forEach(es => {
		let equipment = items.find(item => item.symbol === es.symbol);
		if (!equipment.recipe) {
			return;
		}

		for (let iter of equipment.recipe.list) {
			let recipeEquipment = items.find(item => item.symbol === iter.symbol);
			if (dupeChecker.has(iter.symbol)) {
				demands.find(d => d.symbol === iter.symbol).count += iter.count;
				continue;
			}

			if (recipeEquipment.item_sources.length === 0) {
				console.error(`Oops: equipment with no recipe and no sources: `, recipeEquipment);
			}

			dupeChecker.add(iter.symbol);

			demands.push({
				count: iter.count,
				symbol: iter.symbol,
				equipment: recipeEquipment,
				factionOnly: iter.factionOnly
			});
		}

		craftCost += equipment.recipe.craftCost;
	});

    const reducer = (accumulator, currentValue) => accumulator + currentValue.count;
    
    return {
        craftCost,
        demands,
        factionOnlyTotal: demands.filter(d => d.factionOnly).reduce(reducer, 0),
        totalChronCost: Math.floor(demands.reduce((a, c) => a + estimateChronitonCost(c.equipment), 0)),
    };
}

function estimateChronitonCost(equipment) {
	let sources = equipment.item_sources.filter(e => e.type === 0 || e.type === 2);

	// If faction only
	if (sources.length === 0) {
		return 0;
	}

	// TODO: figure out a better way to calculate these
	const RNGESUS = 1.8;

	let costCalc = [];
	for (let source of sources) {
		if (!source.cost) {
			//console.log("Mission information not available!", source);
			continue;
		}

		costCalc.push((6 - source.chance_grade) * RNGESUS * source.cost);
	}

	if (costCalc.length === 0) {
		console.warn('Couldnt calculate cost for equipment', equipment);
		return 0;
	}

	return costCalc.sort()[0];
}
