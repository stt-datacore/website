import { BossCrew } from "../../model/boss";
import { CrewMember } from "../../model/crew";
import { PlayerCrew } from "../../model/player";

export function getAllCombos(traits: string[], count: number): string[][] {
	if (count === 1) return traits.map(trait => [trait]);
	const combos = [] as string[][];
	for (let i = 0; i < traits.length; i++) {
		for (let j = i+1; j < traits.length; j++) {
			combos.push([traits[i], traits[j]]);
		}
	}
	return combos;
}

export function getComboIndexOf(combos: any[], combo: string[]): number {
	let combosIndex = -1;
	for (let i = 0; i < combos.length; i++) {
		if (combos[i].every(trait => combo.includes(trait))) {
			combosIndex = i;
			continue;
		}
	}
	return combosIndex;
}

export function removeCrewNodeCombo(crew: BossCrew, nodeIndex: number, combo: string[]): void {
	crew.node_matches ??= {};
	const crewMatches = crew.node_matches[`node-${nodeIndex}`];
	const combosIndex = getComboIndexOf(crewMatches.combos, combo);
	if (combosIndex === -1) return;
	crewMatches.combos.splice(combosIndex, 1);
	if (crewMatches.combos.length > 0) {
		const validTraits = [] as string[];
		crewMatches.combos.forEach(crewCombo => {
			crewCombo.forEach(trait => {
				if (!validTraits.includes(trait)) validTraits.push(trait);
			});
		});
		crewMatches.traits = validTraits;
	}
	else {
		const crewNodesIndex = crew.nodes?.indexOf(nodeIndex) ?? -1;
		if (crewNodesIndex >= 0) {
			crew.nodes?.splice(crewNodesIndex, 1);
			delete crew.node_matches[`node-${nodeIndex}`];
			crew.nodes_rarity ??= 0;
			crew.nodes_rarity--;
		}
	}
}

export function getStyleByRarity(rarity: number): any {
	let background = 'grey', color = 'white';
	if (rarity === 0) {
		background = '#000000';
		color = '#fdd26a';
	}
	else if (rarity === 1) {
		background = '#fdd26a';
		color = 'black';
	}
	else if (rarity === 2) {
		background = '#aa2deb';
	}
	else if (rarity === 3) {
		background = '#5aaaff';
	}
	else if (rarity === 4) {
		background = '#50aa3c';
	}
	else if (rarity === 5) {
		background = '#9b9b9b';
	}
	return { background, color };
}
