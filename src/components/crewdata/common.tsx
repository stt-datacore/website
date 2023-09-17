import React from 'react';
import { Link } from 'gatsby';
import { Segment, Accordion, Table, Label, Rating, Icon, SemanticICONS } from 'semantic-ui-react';

import { BaseSkills, CrewMember, SkillData } from '../../model/crew';
import { GlobalContext } from '../../context/globalcontext';
import { ShipSkill } from '../item_presenters/shipskill';
import CrewStat from '../../components/crewstat';
import { applyCrewBuffs, prettyObtained } from '../../utils/crewutils';

import { RankHighlights, Ranks } from './ranks';

type ValidFields =
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
	'rarity_next' |
	'ship_ability' |
	'skills' |
	'skills_next' |
	'traits';

const defaultFields = [
	'flavor',
	'skills',
	'ship_ability',
	'rank_highlights',
	'ranks',
	'fuses',
	'traits',
	'collections',
	'nicknames',
	'cross_fuses',
	'date_added'
] as ValidFields[];

interface IOwnedCounts {
	total: number;
	fullyFused: number;
	highestNonFF: number;
};

type CommonProps = {
	crew: CrewMember;
	fields?: ValidFields[];
	compact?: boolean;
	markdownRemark?: any;
};

export const Common = (props: CommonProps) => {
	const globalContext = React.useContext(GlobalContext);
	const { playerData } = globalContext.player;
	const { crew, compact, markdownRemark } = props;
	const myCrew = playerData ? playerData.player.character.crew : undefined;

	const ownedCounts = {
		total: 0,
		fullyFused: 0,
		highestNonFF: 0,
	} as IOwnedCounts;

	if (myCrew) {
		const owned = myCrew.filter(mc => mc.symbol === crew.symbol);
		ownedCounts.total = owned.reduce((prev, curr) => prev + (curr.immortal > 0 ? curr.immortal : 1), 0);
		ownedCounts.fullyFused = owned.filter(mc => mc.rarity === crew.max_rarity).length;
		ownedCounts.highestNonFF = owned.filter(mc => mc.rarity !== crew.max_rarity)
			.reduce((prev, curr) => Math.max(curr.rarity, prev), 0);
	}
	const nextRarity = ownedCounts.total > 0 ? (ownedCounts.highestNonFF > 0 ? ownedCounts.highestNonFF + 1 : crew.max_rarity) : 1;

	const fields = props.fields ?? defaultFields;
	const elements = [] as JSX.Element[];
	fields.forEach(field => {
		if (field === 'collections')
			elements.push(<Collections key={field} crew={crew} />);

		if (field === 'crew_demands')
			elements.push(<CrewDemands key={field} crew={crew} />);

		if (field === 'cross_fuses')
			elements.push(<CrossFuses key={field} crew={crew} />);

		if (field === 'date_added')
			elements.push(<DateAdded key={field} crew={crew} />);

		if (field === 'flavor' && crew.flavor)
			elements.push(<p key={field} id='crew_flavor_text'>{crew.flavor}</p>);

		if (field === 'fuses')
			elements.push(<Fuses key={field} crew={crew} />);

		if (field === 'nicknames')
			elements.push(<Nicknames key={field} crew={crew} />);

		if (field === 'rank_highlights')
			elements.push(<RankHighlights key={field} crew={crew} markdownRemark={markdownRemark} compact={compact} />);

		if (field === 'ranks') {
			elements.push(<Ranks key='ranks' crew={crew} />);
			if (myCrew) elements.push(<Ranks key='ranks_mycrew' crew={crew} myCrew={myCrew} />);
		}

		if (field === 'rarity')
			elements.push(<Rarity key={field} crew={crew} />);

		if (field === 'rarity_next')
			elements.push(<RarityNext key={field} crew={crew} ownedCounts={ownedCounts} />);

		if (field === 'ship_ability')
			elements.push(<ShipAbility key={field} crew={crew} />);

		if (field === 'skills')
			elements.push(<Skills key={field} crew={crew} rarity={crew.max_rarity} compact={compact} />);

		if (field === 'skills_next')
			elements.push(<Skills key={field} crew={crew} rarity={nextRarity} compact={compact} />);

		if (field === 'traits')
			elements.push(<Traits key={field} crew={crew} />);
	});

	return (
		<React.Fragment>
			{elements.map(element => element)}
		</React.Fragment>
	);
};

const Collections = (props: { crew: CrewMember }) => {
	const { crew } = props;
	if (crew.collections.length === 0) return (<></>);
	return (
		<p>
			<b>Collections: </b>
			{crew.collections
				.map(col => (
					<Link key={col} to={`/collections?select=${encodeURIComponent(col)}`}>
						{col}
					</Link>
				))
				.reduce((prev, curr) => <>{prev}, {curr}</>)}
		</p>
	);
};

const CrewDemands = (props: { crew: CrewMember }) => {
	const { crew } = props;
	const crewDemands = {
		factionOnlyTotal: crew.factionOnlyTotal,
		totalChronCost: crew.totalChronCost,
		craftCost: crew.craftCost
	};
	return (
		<p>
			<b>{crewDemands.factionOnlyTotal}</b>
			{' faction items, '}
			<span style={{ display: 'inline-block' }}>
				<img src={`${process.env.GATSBY_ASSETS_URL}atlas/energy_icon.png`} height={14} />
			</span>{' '}
			<b>{crewDemands.totalChronCost}</b>
			{', '}
			<span style={{ display: 'inline-block' }}>
				<img src={`${process.env.GATSBY_ASSETS_URL}currency_sc_currency_0.png`} height={16} />
			</span>{' '}
			<b>{crewDemands.craftCost}</b>
		</p>
	);
};

const CrossFuses = (props: { crew: CrewMember }) => {
	const { crew } = props;
	if (crew.cross_fuse_targets && "symbol" in crew.cross_fuse_targets && crew.cross_fuse_targets.symbol) {
		return (
			<p>
				Can cross-fuse with{' '}
				<Link to={`/crew/${crew.cross_fuse_targets.symbol}/`}>{crew.cross_fuse_targets.name}</Link>.
			</p>
		);
	}
	return <></>;
};

const DateAdded = (props: { crew: CrewMember }) => {
	const { crew } = props;
	return (
		<p>
			<b>Release Date: </b>{new Date(crew.date_added).toLocaleDateString()} (<b>Obtained: </b>{prettyObtained(crew, true)})
		</p>
	);
};

const Fuses = (props: { crew: CrewMember }) => {
	const globalContext = React.useContext(GlobalContext);
	const { buffConfig } = globalContext.player;
	const { crew } = props;

	const [showPane, setShowPane] = React.useState(false);

	const debasedCrew = JSON.parse(JSON.stringify(crew));

	return (
		<Accordion style={{ marginBottom: '1em' }}>
			<Accordion.Title
				active={showPane}
				onClick={() => setShowPane(!showPane)}
			>
				<Icon name={showPane ? 'caret down' : 'caret right' as SemanticICONS} />
				Show all fuse levels
			</Accordion.Title>
			<Accordion.Content active={showPane}>
				<p style={{ textAlign: 'center' }}>
					{buffConfig && <Icon name='arrow alternate circle up' size='small' style={{ color: 'lightgreen' }} />}
					Skills shown are when crew is fully leveled and fully equipped
					{buffConfig && <>, with player boosts applied</>}
				</p>
				{showPane && (
					<Table definition striped celled>
						{renderTableHeader()}
						<Table.Body>
							{crew.skill_data.map(sk => renderSkillData(sk))}
							{renderTableRow(crew.max_rarity, crew.base_skills)}
						</Table.Body>
					</Table>
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
						<br /><small>+{skill[1].range_min}-{skill[1].range_max}</small>
					</Table.Cell>
				))}
			</Table.Row>
		);
	}
};

const Nicknames = (props: { crew: CrewMember }) => {
	const { crew } = props;
	if (!crew.nicknames || crew.nicknames.length === 0) return (<></>);
	return (
		<p>
			<b>Also known as: </b>
			{crew.nicknames
				.map((nick, idx) => (
				<span key={idx}>{nick.cleverThing}{nick.creator ? <> (coined by <i>{nick.creator}</i>)</> : ''}</span>
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

const RarityNext = (props: { crew: CrewMember, ownedCounts: IOwnedCounts }) => {
	const { crew, ownedCounts } = props;

	if (ownedCounts.fullyFused > 0 && ownedCounts.highestNonFF === 0) {
		return (
			<React.Fragment>
				{ownedCounts.fullyFused > 1 && <>{ownedCounts.fullyFused}{` `}</>}
				Owned <Rating defaultRating={crew.max_rarity} maxRating={crew.max_rarity} icon='star' size='small' disabled />
			</React.Fragment>
		);
	}

	if (ownedCounts.total === 0) {
		return (
			<React.Fragment>
				Unowned
				<span style={{ whiteSpace: 'nowrap' }}>
					<Icon name='arrow right' />
					<Rating defaultRating={1} maxRating={crew.max_rarity} icon='star' size='small' disabled />
				</span>
			</React.Fragment>
		);
	}

	return (
		<React.Fragment>
			<Rating defaultRating={ownedCounts.highestNonFF} maxRating={crew.max_rarity} icon='star' size='small' disabled />
			<span style={{ whiteSpace: 'nowrap' }}>
				<Icon name='arrow right' />
				<Rating defaultRating={ownedCounts.highestNonFF+1} maxRating={crew.max_rarity} icon='star' size='small' disabled />
			</span>
			{(ownedCounts.total > 1 || ownedCounts.fullyFused > 0) &&
				<React.Fragment>
					<br/>({ownedCounts.total} owned
					{ownedCounts.fullyFused > 0 &&
						<React.Fragment>
							, {ownedCounts.fullyFused} already <Rating defaultRating={crew.max_rarity} maxRating={crew.max_rarity} icon='star' size='small' disabled />
						</React.Fragment>
					})
				</React.Fragment>
			}
		</React.Fragment>
	);
};

const ShipAbility = (props: { crew: CrewMember }) => {
	const { crew } = props;
	return (
		<div style={{fontSize: "10pt", marginTop: "1em"}}>
			<h4 style={{ marginBottom: '.25em' }}>Ship Ability</h4>
			<hr></hr>
			<ShipSkill context={crew} />
		</div>
	);
};

type SkillsProps = {
	crew: CrewMember;
	rarity: number;
	compact?: boolean;
};

const Skills = (props: SkillsProps) => {
	const globalContext = React.useContext(GlobalContext);
	const { buffConfig } = globalContext.player;
	const { crew, rarity, compact } = props;

	let skills = crew.base_skills;
	if (rarity !== crew.max_rarity) {
		const skillData = crew.skill_data.find(sk => sk.rarity === rarity);
		if (skillData) skills = skillData.base_skills;
	}

	const debasedCrew = JSON.parse(JSON.stringify(crew));
	debasedCrew.base_skills = skills;
	Object.keys(debasedCrew.base_skills).map(skill => {
		if (!debasedCrew.base_skills[skill])
			delete debasedCrew.base_skills[skill];
	});
	const buffedSkills = buffConfig ? applyCrewBuffs(debasedCrew, buffConfig) : undefined;

	const baseSkills = Object.entries(buffedSkills ?? skills)
		.filter(base_skills => !!base_skills[1])
		.sort((a, b) => b[1].core - a[1].core);

	return (
		<React.Fragment>
			<Segment compact textAlign='center'>
				<div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: '.5em' }}>
					{baseSkills.map(baseSkill => (
						<div key={baseSkill[0]}>
							<CrewStat
								skill_name={baseSkill[0]}
								data={baseSkill[1]}
								scale={compact ? .85 : 1}
							/>
						</div>
					))}
					{buffConfig &&
						<div>
							<Icon name='arrow alternate circle up' size='small' style={{ color: 'lightgreen' }} />
						</div>
					}
				</div>
			</Segment>
		</React.Fragment>
	);
};

const Traits = (props: { crew: CrewMember }) => {
	const { crew } = props;
	return (
		<p>
			<b>Traits: </b>
			{crew.traits_named
				.map(trait => (
					<Link key={trait} to={`/?search=trait:${trait}`}>
						{trait}
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
