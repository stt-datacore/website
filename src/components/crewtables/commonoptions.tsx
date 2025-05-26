import React from 'react';
import { Form, Dropdown, Icon, Label, Rating, Popup, DropdownItemProps } from 'semantic-ui-react';

import { CompletionState, PlayerBuffMode, TranslateMethod } from '../../model/player';
import { IRosterCrew } from './model';
import { Skills } from '../item_presenters/classic_presenter';
import { GlobalContext } from '../../context/globalcontext';
import { printShortDistance } from '../../utils/misc';
import CONFIG from '../CONFIG';
import { crewGender } from '../../utils/crewutils';

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
	selection?: boolean;
	clearable?: boolean;
};

export const RarityFilter = (props: CrewRarityFilterProps) => {
	const { t } = React.useContext(GlobalContext).localized;
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
				placeholder={props.altTitle ?? t('hints.filter_by_rarity')}
				clearable={props.clearable ?? true}
				multiple={props.multiple ?? true}
				selection={props.selection ?? true}
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
	allowed?: string[];
	hideTwoPlus?: boolean;
};

export const CrewTraitFilter = (props: CrewTraitFilterProps) => {
	const { t } = React.useContext(GlobalContext).localized;
	const [traitOptions, setTraitOptions] = React.useState<TraitOptions[] | undefined>(undefined);
	const globalContext = React.useContext(GlobalContext);
	const { TRAIT_NAMES } = globalContext.localized;
	const { allowed } = props;

	React.useEffect(() => {
		const options = Object.keys(TRAIT_NAMES)
			.filter(trait => !allowed?.length || allowed.includes(trait))
			.map(trait => {
			return {
				key: trait,
				value: trait,
				text: TRAIT_NAMES[trait],
				//content: <div style={{display:'flex', alignItems: 'center'}}><img style={{height:'24px',margin: '0.25em'}} src={`${process.env.GATSBY_ASSETS_URL}items_keystones_${trait}.png`} />{TRAIT_NAMES[trait]}</div>
			} as TraitOptions;
		}).sort((a, b) => a.text.localeCompare(b.text));
		[ ...CONFIG.SERIES].reverse().forEach(series => {
			options.unshift({
				key: series,
				value: series,
				text: t(`series.${series}`)
			})
		});
		setTraitOptions([...options]);
	}, [allowed]);

	if (!traitOptions) return (<></>);

	const minMatchOptions = [
		{ key: '1+', value: 1, text: t('options.trait_match.any') },
		{ key: '2+', value: props.traitFilter.length > 2 && !props.hideTwoPlus ? 2 : 0, text: t('options.trait_match.match_two_plus') },
		{ key: 'all', value: props.traitFilter.length, text: t('options.trait_match.match_all') }
	];

	return (
		<React.Fragment>
			<Form.Field>
				<Dropdown
					placeholder={t('hints.filter_by_trait_or_series')}
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
						placeholder={t('options.trait_match.match')}
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


export function descriptionLabel(t: TranslateMethod, crew: IRosterCrew, showOwned?: boolean): JSX.Element {

	const counts = [
		{ name: crew.collections.length !== 1 ? t('base.collections_fmt', { count: crew.collections.length.toString() }) : t('base.collection_fmt'), count: crew.collections.length }
	];
	const formattedCounts = counts.map((count, idx) => (
		<span key={idx} style={{ whiteSpace: 'nowrap' }}>
			{count.name}
		</span>
	)).reduce((prev, curr) => <>{prev}&nbsp;{curr}</>);

	return (
		<div>
			<React.Fragment>
				{!!crew.is_new && <div title={t('global.new', { __gender: crewGender(crew) })} style={{fontWeight: 'bold'}}><Icon name='asterisk' style={{ color: CONFIG.RARITIES[crew.max_rarity].color}} />{t('global.new', { __gender: crewGender(crew) })}</div>}
				{!!crew.expires_in && <Icon name='warning sign' title={ t('crew_state.expires_in', { time: printShortDistance(undefined, crew.expires_in * 1000) })} />}
				{crew.favorite && <Icon name='heart' />}
				{crew.prospect && <Icon name='add user' />}
				{crew.active_status > 0 && <Icon name='space shuttle' />}
				{crew.active_status === 2 && <>&nbsp;{t('base.shuttle')}<br /></>}
				{crew.active_status === 3 && <>&nbsp;{t('base.voyage')}<br /></>}
			</React.Fragment>
			{crew.immortal >= CompletionState.Immortalized &&
				<React.Fragment>
					{crew.immortal >= CompletionState.Frozen &&
						<Label style={{ whiteSpace: 'nowrap' }}>
							<Icon name='snowflake' />{crew.immortal} {t('crew_state.frozen', { __gender: crewGender(crew) })}
						</Label>
					}
					{crew.immortal === CompletionState.Immortalized &&
						<Label style={{ whiteSpace: 'nowrap' }}>
							<Icon name='star' color='yellow' /> {t('crew_state.immortalized', { __gender: crewGender(crew) })}
						</Label>
					}
				</React.Fragment>
			}
			{crew.immortal === CompletionState.NotComplete &&
				<React.Fragment>
					<span>{t('base.level')} {crew.level}, </span>
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
	const { t } = React.useContext(GlobalContext).localized;
	const portalFilterOptions = [
		{ key: 'true', value: true, text: t('base.in_portal')},
		{ key: 'false', value: false, text: t('base.not_in_portal')},
	];

	return (
		<Form.Field>
			<Dropdown
				placeholder={props.altTitle ?? t('hints.filter_by_portal_status')}
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
	noneValue?: string;
}

export const CrewBuffModes = (props: CrewBuffModesProps) => {
	const { t } = React.useContext(GlobalContext).localized;
	const buffModes = [] as DropdownItemProps[];

	buffModes.push({ key: 'none', value: props.noneValue, text: t('buffs.no_buffs') })

	if (props.playerAvailable) {
		buffModes.push({ key: 'player', value: 'player', text: t('buffs.player_buffs') })
	}

	buffModes.push({ key: 'max', value: 'max', text: t('buffs.max_buffs') })

	return (
		<Form.Field>
			<Dropdown
				placeholder={props.altTitle ?? t('hints.apply_buffs')}
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
	const { t } = React.useContext(GlobalContext).localized;
	const { statsPopup, crew } = props;

	if (crew.any_immortal) {
		return (
			<Label style={{ whiteSpace: 'nowrap' }}>
				<Icon name='star' color='yellow' />
				{t('crew_state.immortalized', { __gender: crewGender(crew) })}
			</Label>
		);
	}

	return (
		<>{statsPopup &&
		<Popup trigger={
			<Label style={{ whiteSpace: 'nowrap' }}>
				{t('crew_state.owned')} <Rating icon='star' rating={crew.highest_owned_rarity} maxRating={crew.max_rarity} size='small' disabled />
				{/* <img title={"You own " + crew.name} style={{height:'12px', margin: "5px 4px 0px 4px" }} src='/media/vault.png'/>Yoyoyo */}
			</Label>
			}
			content={<Skills playerLevels={true} compact crew={crew} rarity={crew.rarity} />}
		/> ||
		<Label style={{ whiteSpace: 'nowrap' }}>
				{t('crew_state.owned')} <Rating icon='star' rating={crew.highest_owned_rarity} maxRating={crew.max_rarity} size='small' disabled />
				{/* <img title={"You own " + crew.name} style={{height:'12px', margin: "5px 4px 0px 4px" }} src='/media/vault.png'/>Yoyoyo */}
			</Label>
		}</>
	);
};
