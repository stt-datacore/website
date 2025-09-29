import React from 'react';
import { Link } from 'gatsby';
import { Segment, Accordion, Table, Rating, Icon, SemanticICONS, Modal, Label, Button } from 'semantic-ui-react';

import { BaseSkills, CrewMember, SkillData } from '../../model/crew';
import { GlobalContext } from '../../context/globalcontext';
import CrewStat from './crewstat';
import { applyCrewBuffs, crewGender, formatMissingTrait, getShortNameFromTrait, getVariantTraits, prettyObtained } from '../../utils/crewutils';

import { ShipSkill } from './shipskill';
import { CrewRankHighlights, CrewRanks } from './crew_ranks';
import { OwnedLabel } from '../crewtables/commonoptions';
import { CrewItemsView } from './crew_items';
import { PlayerCrew } from '../../model/player';
import { CollectionDisplay } from './presenter_utils';
import { EventInfoModal, EventModalHeader } from '../event_info_modal';
import { EventInstance } from '../../model/events';
import { OptionsPanelFlexRow } from '../stats/utils';

type ValidField =
	'collections' |
	'crew_demands' |
	'cross_fuses' |
	'date_added' |
	'flavor' |
	'fuses' |
	'nicknames' |
	'rank_highlights' |
	'ranks' |
	'rarity' |
	'ship_ability' |
	'short_name' |
	'skills' |
	'traits' |
	'cap_achiever';

const defaultFields = [
	'flavor',
	'skills',
	'fuses',
	'ship_ability',
	'rank_highlights',
	'ranks',
	'short_name',
	'traits',
	'collections',
	'nicknames',
	'cross_fuses',
	'date_added',
	'cap_achiever'
] as ValidField[];

export interface IFieldOverride {
	field: ValidField;
	override: (crew: CrewMember, compact?: boolean) => JSX.Element;
};

export interface IFieldScale {
	field: ValidField,
	scale?: number
	fontSize?: string
}

type ClassicPresenterProps = {
	crew: CrewMember;
	markdownRemark?: any;
	fields?: ValidField[];
	fieldOverrides?: IFieldOverride[];
	compact?: boolean;
	fieldScale?: IFieldScale[]
};

export const ClassicPresenter = (props: ClassicPresenterProps) => {
	const globalContext = React.useContext(GlobalContext);
	const { t } = globalContext.localized;
	const { playerData } = globalContext.player;
	const { crew, compact, markdownRemark, fieldScale } = props;
	const myCrew = playerData ? playerData.player.character.crew : undefined;

	const fields = props.fields ?? defaultFields;
	const elements = [] as JSX.Element[];
	if (!crew.cap_achiever && myCrew) {
		let fc = myCrew.find(f => f.symbol === crew.symbol);
		if (fc?.cap_achiever) {
			crew.cap_achiever = fc.cap_achiever;
		}
	}
	fields.forEach(field => {
		const fieldOverride = props.fieldOverrides?.find(fo => fo.field === field);
		if (fieldOverride) {
			elements.push(fieldOverride.override(crew, compact));
		}
		else {
			if (field === 'collections')
				elements.push(<p><b>{t('base.collections')}: </b><CollectionDisplay style={{display: 'inline'}} key={field} crew={crew} /></p>);

			if (field === 'crew_demands')
				elements.push(<CrewDemands key={field} crew={crew} />);

			if (field === 'cross_fuses')
				elements.push(<CrossFuses key={field} crew={crew} />);

			if (field === 'date_added')
				elements.push(<DateAdded key={field} crew={crew} />);

			if (field === 'cap_achiever')
				elements.push(<CapAchiever key={field} crew={crew} />);

			// crew_flavor_text id required for cypress test!
			if (field === 'flavor' && crew.flavor)
				elements.push(<p key={field} id='crew_flavor_text'>{crew.flavor}</p>);

			if (field === 'fuses')
				elements.push(<Fuses key={field} crew={crew} compact={compact} />);

			if (field === 'nicknames')
				elements.push(<Nicknames key={field} crew={crew} />);

			if (field === 'rank_highlights')
				elements.push(<CrewRankHighlights key={field} crew={crew} markdownRemark={markdownRemark} compact={compact} />);

			if (field === 'ranks') {
				elements.push(<CrewRanks key='ranks' crew={crew} />);
				if (myCrew) elements.push(<CrewRanks key='ranks_mycrew' crew={crew} myCrew={myCrew} />);
			}

			if (field === 'rarity')
				elements.push(<Rarity key={field} crew={crew} />);

			if (field === 'ship_ability')
				elements.push(<ShipAbility key={field} crew={crew} />);

			if (field === 'skills')
				elements.push(<Skills key={field} crew={crew} rarity={crew.max_rarity} compact={compact} />);

			if (field === 'short_name')
				elements.push(<ShortName key={field} crew={crew} />);

			if (field === 'traits')
				elements.push(<Traits key={field} crew={crew} />);
		}
		let fscale = fieldScale?.find(f => f.field === field);
		if (fscale) {
			elements[elements.length - 1] = <div key={field} style={{scale: `${fscale.scale || ''}`, fontSize: fscale.fontSize }}>{elements[elements.length - 1]}</div>
		}
	});

	return (
		<React.Fragment>
			{elements.map(element => element)}
		</React.Fragment>
	);
};

// const Collections = (props: { crew: CrewMember }) => {
// 	const { crew } = props;
// 	const { t } = React.useContext(GlobalContext).localized;
// 	if (crew.collections.length === 0) return (<></>);
// 	return (
// 		<p>
// 			<b>{t('base.collections')}: </b>
// 			{crew.collections
// 				.map(col => (
// 					<Link key={col} to={`/collections?select=${encodeURIComponent(col)}`}>
// 						{col}
// 					</Link>
// 				))
// 				.reduce((prev, curr) => <>{prev}, {curr}</>)}
// 		</p>
// 	);
// };

const CrewDemands = (props: { crew: CrewMember }) => {
	const { t, tfmt } = React.useContext(GlobalContext).localized;
	const { crew } = props;

	const crewDemands = {
		factionOnlyTotal: crew.factionOnlyTotal,
		totalChronCost: crew.totalChronCost,
		craftCost: crew.craftCost
	};
	return (
		<div style={{ margin: '1em 0' }}>
			{tfmt("crew_views.faction_items", {
				n: <b>{crewDemands.factionOnlyTotal}</b>
			})}
			<span style={{ display: 'inline-block' }}>
				<img src={`${process.env.GATSBY_ASSETS_URL}atlas/energy_icon.png`} height={14} />
			</span>{' '}
			<b>{crewDemands.totalChronCost}</b>
			{', '}
			<span style={{ display: 'inline-block' }}>
				<img src={`${process.env.GATSBY_ASSETS_URL}currency_sc_currency_0.png`} height={16} />
			</span>{' '}
			<b>{crewDemands.craftCost}</b>
		</div>
	);
};

const CrossFuses = (props: { crew: CrewMember }) => {
	const globalContext = React.useContext(GlobalContext);
	const { crew } = props;
	const { tfmt } = globalContext.localized;
	if (crew.cross_fuse_targets && "symbol" in crew.cross_fuse_targets && crew.cross_fuse_targets.symbol) {
		return (
			<p>
				{tfmt('crew_page.can_cross_fuse_with', {
					crew: <Link to={`/crew/${crew.cross_fuse_targets.symbol}/`}>{crew.cross_fuse_targets.name}</Link>
				})}
			</p>
		);
	}
	else if (crew.cross_fuse_sources?.length) {
		const [crew1, crew2] = crew.cross_fuse_sources.map(s => globalContext.core.crew.find(fc => fc.symbol === s)!);
		return (
			<p>
				{tfmt('crew_page.fusion_sources', {
					crew1: <Link to={`/crew/${crew1.symbol}/`}>{crew1.name}</Link>,
					crew2: <Link to={`/crew/${crew2.symbol}/`}>{crew2.name}</Link>
				})}
			</p>
		);
	}
	return <></>;
};

const DateAdded = (props: { crew: CrewMember, disable_event_modal?: boolean }) => {
	const { crew, disable_event_modal } = props;
	const globalContext = React.useContext(GlobalContext);
	const instances = globalContext.core.event_instances;
	const { t } = globalContext.localized;
	const [modalOpen, setModalOpen] = React.useState(false);
	const [crewEvent, setCrewEvent] = React.useState<EventInstance | undefined>(undefined);
	const [modalEvent, setModalEvent] = React.useState<EventInstance | undefined>(undefined);
	const [addEvent, setAddEvent] = React.useState<EventInstance | undefined>(undefined);
	const [accOpen, setAccOpen] = React.useState(false);
	const disconts = React.useMemo(() => {
		let z = instances[0].fixed_instance_id - 1;
		let dc = [] as number[];
		for (let i of instances.map(m => m.fixed_instance_id)) {
			if (z !== i - 1) {
				dc.push(i);
			}
			z = i;
		}
		return dc;
	}, [instances]);
	React.useEffect(() => {
		resetCrewEvent();
	}, [crew]);

	return (
		<p>
			<b>{t('base.release_date')}: </b>{crew.preview ? t('global.pending_release') : new Date(crew.date_added).toLocaleDateString()} (<b>{t('global.obtained')}: </b>{prettyObtained(crew, t, true)})
			{!!crewEvent && !disable_event_modal && (
				<div>
					{t('obtained.long.Event{{:}}')}&nbsp;
					<span style={{
							cursor: 'pointer'
						}}
						onClick={() => {
							resetCrewEvent();
							setModalOpen(true);
						}}
					>
						<u><b>{crewEvent.event_name}</b></u>
						&nbsp;({printWhere(crew)})
					</span>
				</div>
			)}
			{!!modalEvent && modalOpen && !disable_event_modal && <>
				<Modal
					open
					size="large"
					onClose={() => {
						setModalOpen(false);
						setModalEvent(crewEvent);
					}}
					closeIcon
				>
					<Modal.Header>
						<EventModalHeader
							instance={modalEvent}
							setInstance={setModalEvent}
							/>
					</Modal.Header>
					<Modal.Content scrolling>
						<EventInfoModal
							instanceId={modalEvent.instance_id}
							image={modalEvent.image}
							hasDetails={modalEvent.event_details}
							leaderboard={[]}
						/>
					</Modal.Content>
				</Modal>
			</>}
			{!!crew.obtained_metadata?.additional_events?.length && (
				<Accordion activeIndex={accOpen ? 0 : -1}>
					<Accordion.Title onClick={() => setAccOpen(!accOpen)}>
						<div style={{display: 'inline'}}>
							<Icon name={accOpen ? 'triangle down' : 'triangle right'} />
							<span>
								{t('base.additional_event_appearances')}
							</span>
						</div>
					</Accordion.Title>
					<Accordion.Content active={accOpen}>
						{crew.obtained_metadata.additional_events.map(add => {
							let evtData = instances.find(f => f.instance_id === add.instance_id);
							if (!evtData) return <></>;
							return (
								<React.Fragment key={`crew_additional_${add.instance_id}`}>
									<div style={{
											cursor: 'pointer',
											margin: '0.25em 1em'
										}}
										onClick={() => {
											setAddEvent(evtData);
										}}
									>
										~&nbsp;{eventToDate(evtData.fixed_instance_id).toLocaleDateString()}
										&nbsp;&mdash;&nbsp;<u><b>{evtData.event_name}</b></u>
										&nbsp;({t(`event_info.${add.where}_rewards`)})
										{evtData.rerun ? <>&nbsp;&mdash;&nbsp;{t('global.rerun')}</> : ''}
									</div>
								<Modal
									open={addEvent === evtData}
									size="large"
									onClose={() => setAddEvent(undefined)}
									closeIcon
								>
									<Modal.Header>
										<EventModalHeader
											instance={evtData}
											/>
									</Modal.Header>
									<Modal.Content scrolling>
										<EventInfoModal
											instanceId={evtData.instance_id}
											image={evtData.image}
											hasDetails={evtData.event_details}
											leaderboard={[]}
										/>
									</Modal.Content>
								</Modal>
							</React.Fragment>)
						})}
					</Accordion.Content>
				</Accordion>
			)}
		</p>
	);

	function printWhere(crew: CrewMember) {
		let txt = t(`event_info.${crew.obtained_metadata.where}_rewards`)
		if (!txt && crew.obtained === 'Mega') txt = t(`event_info.threshold_rewards`);
		return txt;
	}

	function resetCrewEvent() {
		let event: EventInstance | undefined = undefined;
		if (['Event', 'Mega'].includes(crew.obtained) && crew.obtained_metadata?.event_instance_id) {
			event = instances.find(f => f.instance_id === crew.obtained_metadata?.event_instance_id);
		}
		setCrewEvent(event);
		setModalEvent(event);
	}

	function eventToDate(instanceId: number) {
		let num = instanceId;
		let anchor_id = 458;
		let anchor_date = new Date('2025-01-23T12:00:00');
		let fi = disconts.findLastIndex(x => x < instanceId);
		num += fi - 1;
		anchor_date.setDate(anchor_date.getDate() - (7 * (anchor_id - num)));
		return anchor_date;
	}
};


const CapAchiever = (props: { crew: CrewMember }) => {
	const { crew } = props;
	const globalContext = React.useContext(GlobalContext);
	const { t } = globalContext.localized;
	if (!crew.cap_achiever || crew.preview) return <></>
	return (
		<p>
			<b>{t('base.cap_achiever')}: </b>{crew.cap_achiever.name} ({new Date(crew.cap_achiever.date * 1000).toLocaleDateString()})
		</p>
	);
};

const ShortName = (props: { crew: CrewMember }) => {
	const { crew } = props;
	const globalContext = React.useContext(GlobalContext);
	const { t } = globalContext.localized;
	const shortNames = getVariantTraits(crew).map((t) => getShortNameFromTrait(t, crew)).join(", ");
	return (
		<p>
			<b>{t('base.short_name')}: </b>{shortNames}
		</p>
	);
};

export const Fuses = (props: { crew: CrewMember, compact?: boolean }) => {
	const globalContext = React.useContext(GlobalContext);
	const { t } = globalContext.localized;
	const { buffConfig } = globalContext.player;
	const { crew, compact } = props;

	const [showPane, setShowPane] = React.useState(false);

	const debasedCrew = structuredClone(crew);

	return (
		<Accordion>
			<Accordion.Title
				active={showPane}
				onClick={() => setShowPane(!showPane)}
			>
				<Icon name={showPane ? 'caret down' : 'caret right' as SemanticICONS} />
				{!showPane && <>{t('crew_page.all_fuses_ellipses')}</>}
				{showPane && <>{t('crew_page.all_fuse_skill_fffe_colon')}</>}
			</Accordion.Title>
			<Accordion.Content active={showPane}>
				{showPane && (
					<div style={{ marginBottom: '1em' }}>
						<div style={{ overflowX: 'scroll' }}>
							<Table definition striped celled unstackable compact={compact}>
								{renderTableHeader()}
								<Table.Body>
									{crew.skill_data.map(sk => renderSkillData(sk))}
									{renderTableRow(crew.max_rarity, crew.base_skills)}
								</Table.Body>
								{buffConfig && (
									<Table.Footer>
										<Table.Row>
											<Table.HeaderCell />
											<Table.HeaderCell colSpan={3} textAlign='center'>
												<Icon name='arrow alternate circle up' size='small' style={{ color: 'lightgreen' }} /> Player boosts applied
											</Table.HeaderCell>
										</Table.Row>
									</Table.Footer>
								)}
							</Table>
						</div>
					</div>
				)}
			</Accordion.Content>
		</Accordion>
	);

	function renderTableHeader(): JSX.Element {
		const baseSkills = Object.entries(crew.base_skills)
			.filter(skill => !!skill[1])
			.sort((a, b) => b[1].core - a[1].core);
		return (
			<Table.Header>
				<Table.Row>
					<Table.HeaderCell />
					{baseSkills.map(skill =>
						<Table.HeaderCell key={skill[0]} textAlign='center'>
							<img src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${skill[0]}.png`} style={{ height: '1.1em' }} />
						</Table.HeaderCell>
					)}
				</Table.Row>
			</Table.Header>
		)
	}

	function renderSkillData(sk: SkillData): JSX.Element {
		return renderTableRow(sk.rarity, sk.base_skills);
	}

	function renderTableRow(rarity: number, skills: BaseSkills): JSX.Element {
		debasedCrew.base_skills = skills;
		Object.keys(debasedCrew.base_skills).map(skill => {
			if (!debasedCrew.base_skills[skill])
				delete debasedCrew.base_skills[skill];
		});
		const buffedSkills = buffConfig ? applyCrewBuffs(debasedCrew, buffConfig) : undefined;
		const baseSkills = Object.entries(buffedSkills ?? skills)
			.filter(skill => !!skill[1])
			.sort((a, b) => b[1].core - a[1].core);
		return (
			<Table.Row key={rarity}>
				<Table.Cell textAlign='center'>
					<Rating defaultRating={rarity} maxRating={crew.max_rarity} icon='star' size='small' disabled />
				</Table.Cell>
				{baseSkills.map(skill => (
					<Table.Cell key={skill[0]} textAlign='center'>
						<b>{skill[1].core}</b>
						<br /><small>+({skill[1].range_min}-{skill[1].range_max})</small>
					</Table.Cell>
				))}
			</Table.Row>
		);
	}
};

const Nicknames = (props: { crew: CrewMember }) => {
	const { t, tfmt } = React.useContext(GlobalContext).localized;
	const { crew } = props;

	if (!crew.nicknames || crew.nicknames.length === 0 || !crew.nicknames[0].cleverThing) return (<></>);
	return (
		<p>
			<b>{t("crew_page.aka_colon")} </b>
			{crew.nicknames
				.map((nick, idx) => (
				<span key={idx}>{nick.cleverThing}{nick.creator ? <> ({tfmt('crew_page.coined_by', { name: <i>{nick.creator}</i>})})</> : ''}</span>
			))
			.reduce((prev, curr) => <>{prev}, {curr}</>)}
		</p>
	);
};

const Rarity = (props: { crew: CrewMember }) => {
	const { crew } = props;
	return (
		<Rating defaultRating={crew.max_rarity} maxRating={crew.max_rarity} icon='star' size='small' disabled />
	);
};

const ShipAbility = (props: { crew: CrewMember }) => {
	const { crew } = props;
	return (
		<div style={{ margin: '1em 0' }}>
			<ShipSkill context={crew} />
		</div>
	);
};

type SkillsProps = {
	crew: CrewMember;
	rarity: number;
	compact?: boolean;
	playerLevels?: boolean;
};

export const Skills = (props: SkillsProps) => {
	const globalContext = React.useContext(GlobalContext);
	const { t, tfmt } = globalContext.localized;
	const { buffConfig } = globalContext.player;
	const { crew, rarity, compact } = props;
	const owned = globalContext.player.playerData?.player.character.crew.find(f => f.symbol === crew.symbol);

	const playerLevels = !!props.playerLevels && !!owned;

	let skills = playerLevels ? owned?.skills ?? crew.base_skills : crew.base_skills;
	if (rarity !== crew.max_rarity && !playerLevels) {
		const skillData = crew.skill_data.find(sk => sk.rarity === rarity);
		if (skillData) skills = skillData.base_skills;
	}

	const debasedCrew = structuredClone(crew);
	debasedCrew.base_skills = skills;
	Object.keys(debasedCrew.base_skills).map(skill => {
		if (!debasedCrew.base_skills[skill])
			delete debasedCrew.base_skills[skill];
	});
	const buffedSkills = (!!buffConfig && (!playerLevels || !owned?.skills)) ? applyCrewBuffs(debasedCrew, buffConfig) : undefined;

	const baseSkills = Object.entries(buffedSkills ?? skills)
		.filter(base_skills => !!base_skills[1])
		.sort((a, b) => b[1].core - a[1].core);

	return (
		<React.Fragment>
		<Segment compact textAlign='center'>
			<div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-evenly', alignItems: 'center' }}>
				{baseSkills.map(baseSkill => (
					<div key={baseSkill[0]} style={{margin: "0.25em 0"}}>
						<CrewStat
							skill_name={baseSkill[0]}
							data={baseSkill[1]}
							scale={compact ? .85 : 1}
						/>
					</div>
				))}
			</div>
			<div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', marginTop: "0.5em" }}>
				{buffConfig &&
					<div style={{display:'flex', flexDirection: 'row', alignItems: 'center'}}>
						<Icon name='arrow alternate circle up' size='small' style={{ color: 'lightgreen' }} />
						{!compact && <>{t('crew_page.player_buffs_applied')}</>}
					</div>
				}
			</div>
			{(!playerLevels || !owned) && <div style={{marginTop:"0.5em"}}>
				{owned && <OwnedLabel statsPopup={true} crew={owned} />}
			</div> ||
			<div className='ui segment'>
				{!!owned?.immortal && <>
					{owned.immortal > 0 ? <><Icon name='snowflake' /> {owned.immortal} {t('crew_states.frozen', { __gender: crewGender(crew) })}</> : <><Icon name='check' color='green' /> {t('crew_states.immortalized', { __gender: crewGender(crew) })}</>}</> ||  <>{t('base.level')} {owned?.level}				</>}
				<CrewItemsView crew={owned as PlayerCrew} />
			</div>}
		</Segment>
		</React.Fragment>
	);
};

const Traits = (props: { crew: CrewMember }) => {
	const { t } = React.useContext(GlobalContext).localized;
	const { crew } = props;
	return (
		<p>
			<b>{t('hints.traits')}: </b>
			{crew.traits_named
				.map((trait, idx) => (
					<Link key={trait} to={`/?search=trait:${trait}`}>
						{trait || formatMissingTrait(crew.traits[idx])}
					</Link>
				))
				.reduce((prev, curr) => <>{prev}, {curr}</>)}
			{', '}
			{crew.traits_hidden
				.map(trait => (
					<Link style={{ color: 'lightgray' }} key={trait} to={`/?search=trait:${trait}`}>
						{trait}
					</Link>
				))
				.reduce((prev, curr) => <>{prev}, {curr}</>)}
		</p>
	);
};
