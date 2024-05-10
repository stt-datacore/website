import React from 'react';
import { Form, Dropdown, Icon, Label, Rating, Popup, DropdownItemProps } from 'semantic-ui-react';

import { CompletionState, PlayerBuffMode } from '../../model/player';
import { IRosterCrew } from './model';
import { Skills } from '../item_presenters/classic_presenter';
import { GlobalContext } from '../../context/globalcontext';
import { printShortDistance } from '../../utils/misc';
import CONFIG from '../CONFIG';

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

	const rarityFilterOptions = [] as any[];

	CONFIG.RARITIES.forEach((r, i) => {
		if (i === 0) return;
		rarityFilterOptions.push(
			{ key: `${i}*`, value: i, text: `${i}* ${r.name}` }
		)
	});

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
	const globalContext = React.useContext(GlobalContext);
	const allTraits = globalContext.core.translation;
	
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


export function descriptionLabel(crew: IRosterCrew, showOwned?: boolean): JSX.Element {

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
				{!!crew.expires_in && <Icon name='warning sign' title={`Crew expires in ${printShortDistance(undefined, crew.expires_in * 1000)}`} />}
				{crew.favorite && <Icon name='heart' />}
				{crew.prospect && <Icon name='add user' />}
				{crew.active_status > 0 && <Icon name='space shuttle' />}
			</React.Fragment>
			{crew.immortal >= CompletionState.Immortalized &&
				<React.Fragment>
					{crew.immortal >= CompletionState.Frozen &&
						<Label style={{ whiteSpace: 'nowrap' }}>
							<Icon name='snowflake' />{crew.immortal} frozen
						</Label>
					}
					{crew.immortal === CompletionState.Immortalized &&
						<Label style={{ whiteSpace: 'nowrap' }}>
							<Icon name='star' color='yellow' /> Immortalized
						</Label>
					}
				</React.Fragment>
			}
			{crew.immortal === CompletionState.NotComplete &&
				<React.Fragment>
					<span>Level {crew.level}, </span>
				</React.Fragment>
			}
			{!crew.any_immortal && (crew.immortal === CompletionState.NotComplete || crew.immortal === CompletionState.DisplayAsImmortalStatic) &&
				<React.Fragment>
					{formattedCounts}
				</React.Fragment>
			}
			{showOwned && crew.have && <OwnedLabel crew={crew} />}
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
				multiple={false}
				options={portalFilterOptions}
				value={props.portalFilter}
				onChange={(e, { value }) => props.setPortalFilter(value === '' ? undefined : value as boolean)}
				closeOnChange
			/>
		</Form.Field>
	);
};

export type CrewBuffModesProps = {
	buffMode?: PlayerBuffMode;
	setBuffMode: (value?: PlayerBuffMode) => void;
	playerAvailable?: boolean;
	altTitle?: string;
}

export const CrewBuffModes = (props: CrewBuffModesProps) => {
	const buffModes = [] as DropdownItemProps[];

	buffModes.push({ key: 'none', value: undefined, text: 'No Buffs' })

	if (props.playerAvailable) {
		buffModes.push({ key: 'player', value: 'player', text: 'Player Buffs' })
	}

	buffModes.push({ key: 'max', value: 'max', text: 'Max Buffs' })

	return (
		<Form.Field>
			<Dropdown
				placeholder={props.altTitle ?? 'Apply stat buffs'}
				clearable
				selection
				multiple={false}
				options={buffModes}
				value={props.buffMode}
				onChange={(e, { value }) => props.setBuffMode(value === '' ? undefined : value as PlayerBuffMode | undefined)}
				closeOnChange
			/>
		</Form.Field>
	);
};

export const OwnedLabel = (props: { crew: IRosterCrew, statsPopup?: boolean }) => {
	const { statsPopup, crew } = props;

	if (crew.any_immortal) {
		return (
			<Label style={{ whiteSpace: 'nowrap' }}>
				<Icon name='star' color='yellow' />
				Immortalized
			</Label>
		);
	}

	return (
		<>{statsPopup && 
		<Popup trigger={
			<Label style={{ whiteSpace: 'nowrap' }}>
				Owned <Rating icon='star' rating={crew.highest_owned_rarity} maxRating={crew.max_rarity} size='small' disabled />
				{/* <img title={"You own " + crew.name} style={{height:'12px', margin: "5px 4px 0px 4px" }} src='/media/vault.png'/>Yoyoyo */}
			</Label>
			} 
			content={<Skills playerLevels={true} compact crew={crew} rarity={crew.rarity} />} 
		/> ||
		<Label style={{ whiteSpace: 'nowrap' }}>
				Owned <Rating icon='star' rating={crew.highest_owned_rarity} maxRating={crew.max_rarity} size='small' disabled />
				{/* <img title={"You own " + crew.name} style={{height:'12px', margin: "5px 4px 0px 4px" }} src='/media/vault.png'/>Yoyoyo */}
			</Label>
		}</>
	);
};
