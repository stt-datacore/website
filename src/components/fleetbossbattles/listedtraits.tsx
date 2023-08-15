import React from 'react';

import allTraits from '../../../static/structured/translation_en.json';
import { SolverTrait } from '../../model/boss';

type ListedTraitsProps = {
	traits: string[];
	traitData: SolverTrait[];
};

export const ListedTraits = (props: ListedTraitsProps) => {
	const traitSort = (a: string, b: string) => {
		if (a === '?') return 1;
		if (b === '?') return -1;
		return allTraits.trait_names[a].localeCompare(allTraits.trait_names[b]);
	};
	const traits = props.traits.slice().sort((a: string, b: string) => traitSort(a, b)) as string[];
	if (traits.length > 1) traits.splice(1, 0, '+');

	return (
		<React.Fragment>
			{traits.map((trait, idx: number) => (
				<NamedTrait key={idx} trait={trait} traitData={props.traitData} />
			))}
		</React.Fragment>
	);
};

type NamedTraitProps = {
	trait: string;
	traitData: SolverTrait[];
};

const NamedTrait = (props: NamedTraitProps) => {
	const { trait, traitData } = props;

	if (trait === '+' || trait === '?')
		return <span>{trait}</span>;

	const instances = traitData.filter(t => t.trait === trait);
	const needed = instances.length - instances.filter(t => t.consumed).length;

	return (
		<div style={{
			display: 'flex',
			gap: '.2em',
			flexDirection: 'row',
			flexWrap: 'nowrap',
			alignItems: 'center'
		}}>
			<span>{allTraits.trait_names[trait]}</span>
			{instances.length > 1 && renderNeeded()}
		</div>
	);

	function renderNeeded(): JSX.Element {
		const unicodes = ['\u{24FF}', '\u{2776}', '\u{2777}', '\u{2778}', '\u{2779}', '\u{277A}'];
		return (
			<span>{needed < unicodes.length ? unicodes[needed]: needed}</span>
		);
	}
};
