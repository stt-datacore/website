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
	const traits: string[] = props.traits.slice().sort((a: string, b: string) => traitSort(a, b));
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
	const { t, TRAIT_NAMES } = globalContext.localized;
	const { trait, traitData } = props;

	if (trait === '+' || trait === '?')
		return <span>{trait}</span>;

	const instances: SolverTrait[] = traitData.filter(t => t.trait === trait);

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

	function renderNeeded(): JSX.Element {
		let needed: string = t('global.x_or_y', { x: 0, y: instances.length });
		const consumed: number = instances.filter(t => t.consumed).length;
		if (consumed > 0) needed = `${instances.length - consumed}`;
		return (
			<div style={{
				background: 'white',
				color: 'black',
				margin: '-.4em 0',
				padding: '.25em',
				border: '2px solid black',
				borderRadius: '4px',
				whiteSpace: 'nowrap'
			}}>
				{needed}
			</div>
		);
	}
};
