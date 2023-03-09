export function filterAlphaExceptions(crewList: any[]): any[] {
	return crewList.filter(crew => {
		if (crew.alpha_rule.compliant === 0) return false;
		crew.alpha_rule.exceptions.forEach(combo => {
			removeCrewNodeCombo(crew, combo.index, combo.combo);
		});
		return crew.nodes_rarity > 0;
	});
}

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

export function getTraitCountsByNode(node: any, matchingCrew: any[]): any {
	const traitCounts = {};
	const possibleCombos = [];
	const crewByNode = matchingCrew.filter(crew => !!crew.node_matches[`node-${node.index}`]);
	crewByNode.forEach(crew => {
		const crewNodeTraits = crew.node_matches[`node-${node.index}`].traits;
		const exists = possibleCombos.find(combo =>
			combo.traits.length === crewNodeTraits.length && combo.traits.every(trait => crewNodeTraits.includes(trait))
		);
		if (exists)
			exists.count++;
		else
			possibleCombos.push({ count: 1, traits: crewNodeTraits });
	});

	possibleCombos.forEach(combo => {
		combo.traits.forEach(trait => {
			traitCounts[trait] = traitCounts[trait] ? traitCounts[trait] + combo.count : combo.count;
		});
	});
	return traitCounts;
}

export function filterCombosByNode(node: any, matchingCrew: any[], optimalCombos: any[], traitCounts: any, crewFilters: any): any {
	const possibleCombos = [];
	const crewByNode = matchingCrew.filter(crew => !!crew.node_matches[`node-${node.index}`]);
	crewByNode.forEach(crew => {
		const crewNodeTraits = crew.node_matches[`node-${node.index}`].traits;
		const exists = !!possibleCombos.find(combo =>
			combo.length === crewNodeTraits.length && combo.every(trait => crewNodeTraits.includes(trait))
		);
		if (!exists) possibleCombos.push(crewNodeTraits);
	});

	return possibleCombos.map(combo => {
		const score = combo.reduce((prev, curr) => prev + traitCounts[curr], 0);

		const crewList = crewByNode.filter(crew =>
			combo.length === crew.node_matches[`node-${node.index}`].traits.length
			&& combo.every(trait => crew.node_matches[`node-${node.index}`].traits.includes(trait))
			&& (crewFilters.usableFilter !== 'owned' || crew.highest_owned_rarity > 0)
			&& (crewFilters.usableFilter !== 'thawed' || !crew.only_frozen)
		);

		let exceptions = 0;
		combo.forEach(trait => { if (trait.localeCompare(node.alphaTest) < 0) exceptions++; });
		const alphaException = combo.length - exceptions < node.hiddenLeft;

		const nodeOptimalCombos = optimalCombos.filter(combos => combos.nodes.includes(node.index)).map(combos => combos.traits);
		const nonOptimal = getComboIndex(nodeOptimalCombos, combo) === -1;

		return {
			combo,
			score,
			crewList,
			alphaException,
			nonOptimal
		};
	}).filter(row => row.crewList.length > 0 && (!crewFilters.hideNonOptimals || !row.nonOptimal));
}