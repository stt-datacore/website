export function getOptimalCombos(crewList: any[]): any[] {
	const viableCombos = [];
	crewList.forEach(crew => {
		Object.values(crew.node_matches).forEach(node => {
			const existing = viableCombos.find(combo =>
				combo.traits.length === node.traits.length && combo.traits.every(trait => node.traits.includes(trait))
			);
			if (existing) {
				if (!existing.nodes.includes(node.index))
					existing.nodes.push(node.index);
			}
			else if (!existing) {
				viableCombos.push({ traits: node.traits, nodes: [node.index] });
			}
		});
	});
	// Identify combo sets that are subsets of other possible combos
	const optimalCombos = [];
	viableCombos.sort((a, b) => b.traits.length - a.traits.length).forEach(combo => {
		const supersets = optimalCombos.filter(optimal =>
			optimal.traits.length > combo.traits.length && combo.traits.every(trait => optimal.traits.includes(trait))
		);
		const newNodes = combo.nodes.filter(node => supersets.filter(optimal => optimal.nodes.includes(node)).length === 0);
		if (newNodes.length > 0) combo.nodes = newNodes;
		if (supersets.length === 0 || newNodes.length > 0)
			optimalCombos.push(combo);
	});
	return optimalCombos;
}

export function isCrewOptimal(crew: any, optimalCombos: any[]): boolean {
	let isOptimal = false;
	Object.values(crew.node_matches).forEach(node => {
		if (optimalCombos.find(optimal =>
				optimal.nodes.includes(node.index) &&
				node.traits.length === optimal.traits.length &&
				optimal.traits.every(trait => node.traits.includes(trait))
			))
			isOptimal = true;
	});
	return isOptimal;
}

export function filterAlphaExceptions(crewList: any[]): any[] {
	return crewList.filter(crew => {
		if (crew.alpha_rule.compliant === 0) return false;
		crew.alpha_rule.exceptions.forEach(combo => {
			removeCrewNodeCombo(crew, combo.index, combo.combo);
		});
		return crew.nodes_rarity > 0;
	});
}

export function getComboIndex(combos: any[], combo: string[]): number {
	let comboIndex = -1;
	for (let i = 0; i < combos.length; i++) {
		if (combos[i].every(trait => combo.includes(trait))) {
			comboIndex = i;
			continue;
		}
	}
	return comboIndex;
}

export function removeCrewNodeCombo(crew: any, nodeIndex: number, combo: any): void {
	const crewMatches = crew.node_matches[`node-${nodeIndex}`];
	const comboIndex = getComboIndex(crewMatches.combos, combo);
	crewMatches.combos.splice(comboIndex, 1);
	if (crewMatches.combos.length > 0) {
		const validTraits = [];
		crewMatches.combos.forEach(crewCombo => {
			crewCombo.forEach(trait => {
				if (!validTraits.includes(trait)) validTraits.push(trait);
			});
		});
		crewMatches.traits = validTraits;
	}
	else {
		const crewNodesIndex = crew.nodes.indexOf(nodeIndex);
		crew.nodes.splice(crewNodesIndex, 1);
		delete crew.node_matches[`node-${nodeIndex}`];
		crew.nodes_rarity--;
	}
}