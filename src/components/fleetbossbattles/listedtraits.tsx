import React from 'react';

import { SolverTrait } from '../../model/boss';
import { GlobalContext } from '../../context/globalcontext';

type ListedTraitsProps = {
	traits: string[];
	traitData: SolverTrait[];
};

export const ListedTraits = (props: ListedTraitsProps) => {
	const globalContext = React.useContext(GlobalContext);
	const { TRAIT_NAMES } = globalContext.localized;
	const traitSort = (a: string, b: string) => {
		if (a === '?') return 1;
		if (b === '?') return -1;
		return TRAIT_NAMES[a].localeCompare(TRAIT_NAMES[b]);
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
	const globalContext = React.useContext(GlobalContext);
	const { TRAIT_NAMES } = globalContext.localized;
	const { trait, traitData } = props;

	if (trait === '+' || trait === '?')
		return <span>{trait}</span>;

	const instances = traitData.filter(t => t.trait === trait);
	const needed = instances.length - instances.filter(t => t.consumed).length;

	return (
		<div style={{
			display: 'flex',
			gap: '.3em',
			flexDirection: 'row',
			flexWrap: 'nowrap',
			alignItems: 'center'
		}}>
			<span>{TRAIT_NAMES[trait]}</span>
			{instances.length > 1 && renderNeeded()}
		</div>
	);

	function renderNeeded(): React.JSX.Element {
		return (
			<div style={{
				background: 'white',
				color: 'black',
				margin: '-.4em 0',
				padding: '.25em',
				border: '2px solid black',
				borderRadius: '4px'
			}}>
				{needed}
			</div>
		);
	}
};
