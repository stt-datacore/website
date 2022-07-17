import React from 'react';
import { Form, Dropdown } from 'semantic-ui-react';

import CONFIG from '../../components/CONFIG';

import allTraits from '../../../static/structured/translation_en.json';

type CrewRarityFilterProps = {
	rarityFilter: number[];
	setFilterRarity: (rarityFilter: number[]) => void;
};

export const CrewRarityFilter = (props: CrewRarityFilterProps) => {
	const rarityFilterOptions = [
		{ key: '1*', value: 1, text: '1* Common' },
		{ key: '2*', value: 2, text: '2* Uncommon' },
		{ key: '3*', value: 3, text: '3* Rare' },
		{ key: '4*', value: 4, text: '4* Super Rare' },
		{ key: '5*', value: 5, text: '5* Legendary' }
	];

	return (
		<Form.Field>
			<Dropdown
				placeholder='Filter by rarity'
				clearable
				multiple
				selection
				options={rarityFilterOptions}
				value={props.rarityFilter}
				onChange={(e, { value }) => props.setRarityFilter(value)}
				closeOnChange
			/>
		</Form.Field>
	);
};

type CrewTraitFilterProps = {
	traitFilter: string[];
	setTraitFilter: (traitFilter: string[]) => void;
	minTraitMatches: number;
	setMinTraitMatches: (minTraitMatches: number) => void;
};

export const CrewTraitFilter = (props: CrewTraitFilterProps) => {
	const [traitOptions, setTraitOptions] = React.useState(undefined);

	React.useEffect(() => {
		const options = Object.keys(allTraits.trait_names).map(trait => {
			return {
				key: trait,
				value: trait,
				text: allTraits.trait_names[trait]
			};
		}).sort((a, b) => a.text.localeCompare(b.text));
		setTraitOptions([...options]);
	}, []);

	if (!traitOptions) return (<></>);

	const minMatchOptions = [
		{ key: '1+', value: 1, text: 'Match any trait' },
		{ key: '2+', value: props.traitFilter.length > 2 ? 2 : 0, text: 'Match 2+ traits' },
		{ key: 'all', value: props.traitFilter.length, text: 'Match all traits' }
	];

	return (
		<React.Fragment>
			<Form.Field>
				<Dropdown
					placeholder='Filter by trait'
					clearable
					multiple
					search
					selection
					options={traitOptions}
					value={props.traitFilter}
					onChange={(e, { value }) => props.setTraitFilter(value)}
					closeOnChange
				/>
			</Form.Field>
			{props.traitFilter.length > 1 && (
				<Form.Field>
					<Dropdown
						placeholder='Match'
						selection
						options={minMatchOptions.filter(option => option.value > 0)}
						value={props.minTraitMatches}
						onChange={(e, { value }) => props.setMinTraitMatches(value)}
					/>
				</Form.Field>
			)}
		</React.Fragment>
	);
};

