import React from 'react';
import { Form, Dropdown, Icon } from 'semantic-ui-react';

import CONFIG from '../../components/CONFIG';

import allTraits from '../../../static/structured/translation_en.json';
import { isImmortal } from '../../utils/crewutils';
import { CompletionState, PlayerCrew } from '../../model/player';

export interface TraitOptions {
	key: string;
	value: string;
	text: string;
}

type CrewRarityFilterProps = {
	rarityFilter: number[];
	setRarityFilter: (rarityFilter: number[]) => void;
	altTitle?: string;
	multiple?: boolean;
};

export const RarityFilter = (props: CrewRarityFilterProps) => {
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
				placeholder={props.altTitle ?? 'Filter by rarity'} 
				clearable
				multiple={props.multiple ?? true}
				selection
				options={rarityFilterOptions}
				value={ props.multiple === false ? (props.rarityFilter?.length ? props.rarityFilter[0] : '') : props.rarityFilter}
				onChange={(e, { value }) => props.setRarityFilter(props.multiple === false ? (value === '' ? [] : [ value as number ]) : value as number[])}
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
	const [traitOptions, setTraitOptions] = React.useState<TraitOptions[] | undefined>(undefined);

	React.useEffect(() => {
		const options = Object.keys(allTraits.trait_names).map(trait => {
			return {
				key: trait,
				value: trait,
				text: allTraits.trait_names[trait]
			} as TraitOptions;
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
					onChange={(e, { value }) => props.setTraitFilter(value as string[])}
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
						onChange={(e, { value }) => props.setMinTraitMatches(value as number)}
					/>
				</Form.Field>
			)}
		</React.Fragment>
	);
};


export function descriptionLabel(crew: PlayerCrew, showOwned?: boolean): JSX.Element {
	const immortal = isImmortal(crew);
	const counts = [
		{ name: 'collection', count: crew.collections.length }
	];
	const formattedCounts = counts.map((count, idx) => (
		<span key={idx} style={{ whiteSpace: 'nowrap' }}>
			{count.count} {count.name}{count.count !== 1 ? 's' : ''}{idx < counts.length-1 ? ',' : ''}
		</span>
	)).reduce((prev, curr) => <>{prev}&nbsp;{curr}</>);
	return (
		<div>
			<React.Fragment>
				{showOwned && <img title={"You own " + crew.name} style={{height:'12px', margin: "5px 4px 0px 4px" }} src='/media/vault.png'/>}
				{crew.favorite && <Icon name='heart' />}
			</React.Fragment>
			{immortal &&
				<React.Fragment>
					{crew.immortal > 0 && <span><Icon name='snowflake' />{crew.immortal} frozen</span>}
					{crew.immortal === CompletionState.Immortalized && <span>Immortalized, {formattedCounts}</span>}
				</React.Fragment>
			}
			{!immortal &&
				<React.Fragment>
					{crew.prospect && <Icon name='add user' />}
					{crew.active_status > 0 && <Icon name='space shuttle' />}
					<span>Level {crew.level}, </span>
					{formattedCounts}
				</React.Fragment>
			}
		</div>
	);
}

type CrewPortalFilterProps = {
	portalFilter?: boolean;
	setPortalFilter: (portalFilter: boolean | undefined) => void;
	altTitle?: string;
};

export const PortalFilter = (props: CrewPortalFilterProps) => {
	const portalFilterOptions = [
		{ key: 'true', value: true, text: 'In Portal' },
		{ key: 'false', value: false, text: 'Not In Portal' },
	];

	return (
		<Form.Field>
			<Dropdown
				placeholder={props.altTitle ?? 'Filter by portal status'} 
				clearable
				selection
				options={portalFilterOptions}
				value={props.portalFilter}
				onChange={(e, { value }) => props.setPortalFilter(value === '' ? undefined : value as boolean)}
				closeOnChange
			/>
		</Form.Field>
	);
};

