import React from 'react';
import { Table, Icon, Rating, Form, Checkbox, Header } from 'semantic-ui-react';
import { Link, navigate } from 'gatsby';

import { SearchableTable, ITableConfigRow, initSearchableOptions } from '../components/searchabletable';

import CONFIG from '../components/CONFIG';
import CABExplanation from '../components/cabexplanation';
import ProspectPicker from '../components/prospectpicker';

import { crewMatchesSearchFilter } from '../utils/crewsearch';
import { formatTierLabel } from '../utils/crewutils';
import { useStateWithStorage } from '../utils/storage';
import { calculateBuffConfig } from '../utils/voyageutils';

const rarityLabels = ['Common', 'Uncommon', 'Rare', 'Super Rare', 'Legendary'];

type ProfileCrewProps = {
	playerData: any;
	isTools?: boolean;
	allCrew?: any[];
	location: any;
};

const ProfileCrew = (props: ProfileCrewProps) => {
	const myCrew = [...props.playerData.player.character.crew];

	// Check for custom initial table options from URL or <Link state>
	//	Custom options are only available in player tool right now
	let initOptions = initSearchableOptions(window.location);
	// Check for custom initial profile_crew options from URL or <Link state>
	const initHighlight = initOption(props.location, 'highlight', '');
	const initProspects = initOption(props.location, 'prospect', []);
	// Clear history state now so that new stored values aren't overriden by outdated parameters
	if (window.location.state && (initOptions || initHighlight || initProspects))
		window.history.replaceState(null, '');

	if (props.isTools) {
		const allCrew = [...props.allCrew].sort((a, b)=>a.name.localeCompare(b.name));
		const buffConfig = calculateBuffConfig(props.playerData.player);
		return (
			<ProfileCrewTools myCrew={myCrew} allCrew={allCrew} buffConfig={buffConfig}
				initOptions={initOptions} initHighlight={initHighlight} initProspects={initProspects} />
		);
	}

	const lockable = [];
	if (initHighlight != '') {
		const highlighted = myCrew.find(c => c.symbol === initHighlight);
		if (highlighted) {
			lockable.push({
				symbol: highlighted.symbol,
				name: highlighted.name
			});
		}
	}
	return (<ProfileCrewTable crew={myCrew} initOptions={initOptions} lockable={lockable} />);

	function initOption(location: any, option: string, defaultValue: any): any {
		let value = undefined;
		// Always use URL parameters if found
		if (location?.search) {
			const urlParams = new URLSearchParams(location.search);
			if (urlParams.has(option)) value = Array.isArray(defaultValue) ? urlParams.getAll(option) : urlParams.get(option);
		}
		// Otherwise check <Link state>
		if (!value && location?.state) {
			const linkState = location.state;
			if (linkState[option]) value = JSON.parse(JSON.stringify(linkState[option]));
		}
		return value ?? defaultValue;
	}
};

type ProfileCrewTools = {
	myCrew: any[];
	allCrew: any[];
	buffConfig: any;
	initOptions: any;
	initHighlight: string;
	initProspects: string[];
};

const ProfileCrewTools = (props: ProfileCrewTools) => {
	const { allCrew, buffConfig, initOptions } = props;
	const [prospects, setProspects] = useStateWithStorage('crewTool/prospects', []);

	const myCrew = [...props.myCrew];
	const lockable = [];

	React.useEffect(() => {
		if (props.initProspects?.length > 0) {
			const newProspects = [];
			props.initProspects.forEach(p => {
				const newProspect = allCrew.find(c => c.symbol === p);
				if (newProspect) {
					newProspects.push({
						symbol: newProspect.symbol,
						name: newProspect.name,
						imageUrlPortrait: newProspect.imageUrlPortrait,
						rarity: newProspect.max_rarity,
						max_rarity: newProspect.max_rarity
					});
				}
			});
			setProspects([...newProspects]);
		}
	}, [props.initProspects]);

	prospects.forEach((p) => {
		let prospect = allCrew.find((c) => c.symbol == p.symbol);
		if (prospect) {
			prospect = JSON.parse(JSON.stringify(prospect));
			prospect.id = myCrew.length+1;
			prospect.prospect = true;
			prospect.have = false;
			prospect.rarity = p.rarity;
			prospect.level = 100;
			prospect.immortal = 0;
			CONFIG.SKILLS_SHORT.forEach(skill => {
				let score = { "core": 0, "min": 0, "max" : 0 };
				if (prospect.base_skills[skill.name]) {
					if (prospect.rarity == prospect.max_rarity)
						score = applySkillBuff(buffConfig, skill.name, prospect.base_skills[skill.name]);
					else
						score = applySkillBuff(buffConfig, skill.name, prospect.skill_data[prospect.rarity-1].base_skills[skill.name]);
				}
				prospect[skill.name] = score;
			});
			myCrew.push(prospect);
			lockable.push({
				symbol: prospect.symbol,
				name: prospect.name,
				rarity: prospect.rarity,
				level: prospect.level,
				prospect: prospect.prospect
			});
		}
	});

	if (props.initHighlight != '') {
		const highlighted = myCrew.find(c => c.symbol === props.initHighlight);
		if (highlighted) {
			lockable.push({
				symbol: highlighted.symbol,
				name: highlighted.name
			});
		}
	}

	return (
		<React.Fragment>
			<ProfileCrewTable pageId='crewTool' crew={myCrew} initOptions={initOptions} lockable={lockable} />
			<Prospects pool={props.allCrew} prospects={prospects} setProspects={setProspects} />
		</React.Fragment>
	);

	function applySkillBuff(buffConfig: any, skill: string, base_skill: any): { core: number, min: number, max: number } {
		const getMultiplier = (skill: string, stat: string) => {
			return buffConfig[`${skill}_${stat}`].multiplier + buffConfig[`${skill}_${stat}`].percent_increase;
		};
		return {
			core: Math.round(base_skill.core*getMultiplier(skill, 'core')),
			min: Math.round(base_skill.range_min*getMultiplier(skill, 'range_min')),
			max: Math.round(base_skill.range_max*getMultiplier(skill, 'range_max'))
		};
	}
};

type ProfileCrewTableProps = {
	pageId?: string;
	crew: any[];
	initOptions: any;
	lockable?: any[];
};

const ProfileCrewTable = (props: ProfileCrewTableProps) => {
	const pageId = props.pageId ?? 'crew';
	const [showFrozen, setShowFrozen] = useStateWithStorage(pageId+'/showFrozen', true);
	const [findDupes, setFindDupes] = useStateWithStorage(pageId+'/findDupes', false);

	const myCrew = JSON.parse(JSON.stringify(props.crew));

	const tableConfig: ITableConfigRow[] = [
		{ width: 3, column: 'name', title: 'Crew', pseudocolumns: ['name', 'bigbook_tier', 'events'] },
		{ width: 1, column: 'max_rarity', title: 'Rarity', reverse: true, tiebreakers: ['rarity'] },
		{ width: 1, column: 'cab_ov', title: <span>CAB <CABExplanation /></span>, reverse: true, tiebreakers: ['cab_ov_rank'] },
		{ width: 1, column: 'ranks.voyRank', title: 'Voyage' }
	];
	CONFIG.SKILLS_SHORT.forEach((skill) => {
		tableConfig.push({
			width: 1,
			column: `${skill.name}.core`,
			title: <img alt={CONFIG.SKILLS[skill.name]} src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${skill.name}.png`} style={{ height: '1.1em' }} />,
			reverse: true
		});
	});

	function showThisCrew(crew: any, filters: [], filterType: string): boolean {
		if (!showFrozen && crew.immortal > 0) {
			return false;
		}

		if (findDupes) {
			if (myCrew.filter((c) => c.symbol === crew.symbol).length === 1)
				return false;
		}

		return crewMatchesSearchFilter(crew, filters, filterType);
	}

	function renderTableRow(crew: any, idx: number, highlighted: boolean): JSX.Element {
		const attributes = {
			positive: highlighted
		};

		return (
			<Table.Row key={idx} style={{ cursor: 'zoom-in' }} onClick={() => navigate(`/crew/${crew.symbol}/`)} {...attributes}>
				<Table.Cell>
					<div
						style={{
							display: 'grid',
							gridTemplateColumns: '60px auto',
							gridTemplateAreas: `'icon stats' 'icon description'`,
							gridGap: '1px'
						}}
					>
						<div style={{ gridArea: 'icon' }}>
							<img width={48} src={`${process.env.GATSBY_ASSETS_URL}${crew.imageUrlPortrait}`} />
						</div>
						<div style={{ gridArea: 'stats' }}>
							<span style={{ fontWeight: 'bolder', fontSize: '1.25em' }}><Link to={`/crew/${crew.symbol}/`}>{crew.name}</Link></span>
						</div>
						<div style={{ gridArea: 'description' }}>{descriptionLabel(crew)}</div>
					</div>
				</Table.Cell>
				<Table.Cell>
					<Rating icon='star' rating={crew.rarity} maxRating={crew.max_rarity} size="large" disabled />
				</Table.Cell>
				<Table.Cell style={{ textAlign: 'center' }}>
					<b>{crew.cab_ov}</b><br />
					<small>{rarityLabels[parseInt(crew.max_rarity)-1]} #{crew.cab_ov_rank}</small>
				</Table.Cell>
				<Table.Cell style={{ textAlign: 'center' }}>
					<b>#{crew.ranks.voyRank}</b><br />
					{crew.ranks.voyTriplet && <small>Triplet #{crew.ranks.voyTriplet.rank}</small>}
				</Table.Cell>
				{CONFIG.SKILLS_SHORT.map(skill =>
					crew[skill.name].core > 0 ? (
						<Table.Cell key={skill.name} textAlign='center'>
							<b>{crew[skill.name].core}</b>
							<br />
							+({crew[skill.name].min}-{crew[skill.name].max})
						</Table.Cell>
					) : (
						<Table.Cell key={skill.name} />
					)
				)}
			</Table.Row>
		);
	}

	function descriptionLabel(crew: any): JSX.Element {
		if (crew.immortal) {
			return (
				<div>
					<Icon name="snowflake" /> <span>{crew.immortal} frozen</span>
				</div>
			);
		} else {
			const counts = [
				{ name: 'event', count: crew.events },
				{ name: 'collection', count: crew.collections.length }
			];
			const formattedCounts = counts.map((count, idx) => (
				<span key={idx} style={{ whiteSpace: 'nowrap' }}>
					{count.count} {count.name}{count.count != 1 ? 's' : ''}{idx < counts.length-1 ? ',' : ''}
				</span>
			)).reduce((prev, curr) => [prev, ' ', curr]);

			return (
				<div>
					{crew.favorite && <Icon name="heart" />}
					{crew.prospect && <Icon name="add user" />}
					<span>Level {crew.level}, </span>
					{crew.bigbook_tier > 0 && <>Tier {formatTierLabel(crew.bigbook_tier)}, </>}{formattedCounts}
				</div>
			);
		}
	}

	return (
		<React.Fragment>
			<div style={{ margin: '.5em 0' }}>
				<Form.Group grouped>
					<Form.Field
						control={Checkbox}
						label='Show frozen (vaulted) crew'
						checked={showFrozen}
						onChange={(e, { checked }) => setShowFrozen(checked)}
					/>
					<Form.Field
						control={Checkbox}
						label='Only show duplicate crew'
						checked={findDupes}
						onChange={(e, { checked }) => setFindDupes(checked)}
					/>
				</Form.Group>
			</div>
			<SearchableTable
				id={`${pageId}/table_`}
				data={myCrew}
				config={tableConfig}
				renderTableRow={(crew, idx, highlighted) => renderTableRow(crew, idx, highlighted)}
				filterRow={(crew, filters, filterType) => showThisCrew(crew, filters, filterType)}
				showFilterOptions="true"
				initOptions={props.initOptions}
				lockable={props.lockable}
			/>
		</React.Fragment>
	);
}

type ProspectsProps = {
	pool: any[];
};

const Prospects = (props: ProspectsProps) => {
	const { pool, prospects, setProspects } = props;

	return (
		<React.Fragment>
			<Header as='h4'>Prospective Crew</Header>
			<p>Add prospective crew to see how they fit into your existing roster.</p>
			<ProspectPicker pool={pool} prospects={prospects} setProspects={setProspects} />
		</React.Fragment>
	);
};

export default ProfileCrew;
