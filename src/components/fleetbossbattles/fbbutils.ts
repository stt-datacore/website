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

export function getRaritiesByNode(node: any, crewList: any[]): any {
	const possibleCombos = [];
	const traitRarity = {};
	const crewByNode = crewList.filter(crew => !!crew.node_matches[`node-${node.index}`]);
	crewByNode.forEach(crew => {
		crew.node_matches[`node-${node.index}`].combos.forEach(combo => {
			const existing = possibleCombos.find(possible => possible.combo.every(trait => combo.includes(trait)));
			if (existing) {
				if (crew.in_portal) existing.crew.push(crew.symbol);
			}
			else {
				possibleCombos.push({ combo, crew: crew.in_portal ? [crew.symbol] : []});
			}
		});
		const portalValue = crew.in_portal ? 1 : 0;
		crew.node_matches[`node-${node.index}`].traits.forEach(trait => {
			traitRarity[trait] = traitRarity[trait] ? traitRarity[trait] + portalValue : portalValue;
		});
	});

	return { combos: possibleCombos, traits: traitRarity };
}

export function filterGroupsByNode(node: any, crewList: any[], rarities: any, optimalCombos: any[], filters: any): any {
	const comboRarity = rarities.combos;
	const traitRarity = rarities.traits;
	const traitGroups = [];
	const crewByNode = crewList.filter(crew => !!crew.node_matches[`node-${node.index}`]);
	crewByNode.forEach(crew => {
		const crewNodeTraits = crew.node_matches[`node-${node.index}`].traits;
		const exists = !!traitGroups.find(traits =>
			traits.length === crewNodeTraits.length && traits.every(trait => crewNodeTraits.includes(trait))
		);
		if (!exists) traitGroups.push(crewNodeTraits);
	});

	return traitGroups.map(traits => {
		const score = traits.reduce((prev, curr) => prev + traitRarity[curr], 0);

		const crewList = crewByNode.filter(crew =>
			traits.length === crew.node_matches[`node-${node.index}`].traits.length
				&& traits.every(trait => crew.node_matches[`node-${node.index}`].traits.includes(trait))
				&& (filters.usable !== 'owned' || crew.highest_owned_rarity > 0)
				&& (filters.usable !== 'thawed' || (crew.highest_owned_rarity > 0 && !crew.only_frozen))
		);

		let alphaExceptions = 0;
		traits.forEach(trait => { if (trait.localeCompare(node.alphaTest) < 0) alphaExceptions++; });
		const alphaException = traits.length - alphaExceptions < node.hiddenLeft;

		const crewSet = [];
		getAllCombos(traits, node.hiddenLeft).forEach(combo => {
			const combos = comboRarity.find(rarity => rarity.combo.every(trait => combo.includes(trait)));
			if (combos) {
				combos.crew.forEach(crew => {
					if (!crewSet.includes(crew)) crewSet.push(crew);
				});
			}
		});
		const uniqueCrew = crewSet.length === 1;
		const nonPortal = crewSet.length === 0;	// Should never see this, if everything working as expected

		const nodeOptimalCombos = optimalCombos.filter(combos => combos.nodes.includes(node.index)).map(combos => combos.traits);
		const nonOptimal = getComboIndex(nodeOptimalCombos, traits) === -1;

		const notes = { alphaException, uniqueCrew, nonPortal, nonOptimal };

		return {
			traits,
			score,
			crewList,
			notes
		};
	}).filter(row =>
		row.crewList.length > 0
			&& (filters.nonoptimal === 'flag' || !row.notes.nonOptimal)
	);
}

export function getAllCombos(traits: string[], count: number): any[] {
	if (count === 1) return traits.map(trait => [trait]);
	const combos = [];
	for (let i = 0; i < traits.length; i++) {
		for (let j = i+1; j < traits.length; j++) {
			combos.push([traits[i], traits[j]]);
		}
	}
	return combos;
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
