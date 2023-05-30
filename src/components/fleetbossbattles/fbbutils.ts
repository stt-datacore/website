import { Combo } from "../../model/boss";
import { NodeMatch, PlayerCrew } from "../../model/player";

export function getOptimalCombos(crewList: PlayerCrew[]): NodeMatch[] {
	const viableCombos = [] as NodeMatch[];
	crewList.forEach(crew => {
		if (!crew.node_matches) return;
		Object.values(crew.node_matches).forEach(node => {
			const existing = viableCombos.find(combo =>
				combo.traits.length === node.traits.length && combo.traits.every(trait => node.traits.includes(trait))
			);
			
			if (existing) {
				if (!existing.nodes) {
					existing.nodes = [ node.index ];
				}
				else if (!existing.nodes.includes(node.index)) {
					existing.nodes.push(node.index);
				}
			}
			else {
				viableCombos.push({ ...node, nodes: [ node.index ] });
			}
		});
	});
	// Identify combo sets that are subsets of other possible combos
	const optimalCombos = [] as NodeMatch[];
	viableCombos.sort((a, b) => b.traits.length - a.traits.length).forEach(combo => {
		const supersets = optimalCombos.filter(optimal =>
			optimal.traits.length > combo.traits.length && combo.traits.every(trait => optimal.traits.includes(trait))
		);
		if (combo.nodes) {
			const newNodes = combo.nodes.filter(node => supersets.filter(optimal => optimal.nodes?.includes(node)).length === 0);
			if (newNodes.length > 0) combo.nodes = newNodes;
			if (supersets.length === 0 || newNodes.length > 0)
				optimalCombos.push(combo);
		}
	});
	return optimalCombos;
}

export function isCrewOptimal(crew: PlayerCrew, optimalCombos: NodeMatch[]): boolean {
	let isOptimal = false;
	if (!crew.node_matches) return false;

	Object.values(crew.node_matches).forEach(node => {
		if (optimalCombos.find(optimal =>
				optimal.nodes?.includes(node.index) &&
				node.traits.length === optimal.traits.length &&
				optimal.traits.every(trait => node.traits.includes(trait))
			))
			isOptimal = true;
	});

	return isOptimal;
}