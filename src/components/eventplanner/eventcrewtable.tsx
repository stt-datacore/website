import React from 'react';
import { Header, Table, Icon, Rating, Form, Checkbox, Message, Popup } from 'semantic-ui-react';
import { Link } from 'gatsby';

import { InitialOptions, LockedProspect } from '../../model/game-elements';
import { GlobalContext } from '../../context/globalcontext';

import { CrewHoverStat, CrewTarget } from '../../components/hovering/crewhoverstat';

import CONFIG from '../../components/CONFIG';
import { SearchableTable, ITableConfigRow } from '../../components/searchabletable';
import { crewMatchesSearchFilter } from '../../utils/crewsearch';
import { useStateWithStorage } from '../../utils/storage';
import { crewGender, isQuipped, qbitsToSlots } from '../../utils/crewutils';

import { IEventData, IRosterCrew, IEventScoredCrew, IEventCombos, IBestCombos, IBestCombo } from './model';
import { calculateGalaxyChance, computeEventBest } from '../../utils/events';
import { navToCrewPage } from '../../utils/nav';
import { DEFAULT_MOBILE_WIDTH } from '../hovering/hoverstat';
import { SkillPicker } from '../base/skillpicker';
import { QPContext } from '../qpconfig/provider';
import { QuipmentProspectsOptions } from '../qpconfig/options';
import { OptionsPanelFlexRow } from '../stats/utils';
import { CrewShipCells, getShipTableConfig } from '../crewtables/views/shipabilities';

type EventCrewTableProps = {
	rosterType: string;
	rosterCrew: IRosterCrew[];
	eventData: IEventData;
	phaseIndex: number;
	lockable?: LockedProspect[];
};

export const EventCrewTable = (props: EventCrewTableProps) => {
	const globalContext = React.useContext(GlobalContext);
	const qpContext = React.useContext(QPContext);
	const { t } = globalContext.localized;
	const [qpConfig, setQpConfig] = qpContext.useQPConfig();

	const { playerData, buffConfig, ephemeral } = globalContext.player;
	const { rosterType, eventData, phaseIndex } = props;

	const [skillFilter, setSkillFilter] = useStateWithStorage('eventplanner/skillFilter', [] as string[] | undefined);

	const [showBonus, setShowBonus] = useStateWithStorage('eventplanner/showBonus', true);
	const [applyBonus, setApplyBonus] = useStateWithStorage('eventplanner/applyBonus', true);
	const [showPotential, setShowPotential] = useStateWithStorage('eventplanner/showPotential', false);
	const [showFrozen, setShowFrozen] = useStateWithStorage('eventplanner/showFrozen', true);
	const [excludeQuipped, setExcludeQuipped] = useStateWithStorage('eventplanner/excludeQuipped', false);
	const [onlyIdleCrew, setOnlyIdleCrew] = useStateWithStorage('eventplanner/onlyIdleCrew', false);
	const [showShared, setShowShared] = useStateWithStorage('eventplanner/showShared', true);
	const [initOptions, setInitOptions] = React.useState<InitialOptions>({});
	const crewAnchor = React.useRef<HTMLDivElement>(null);

	const priText = t('quipment_ranks.primary');
	const secText = t('quipment_ranks.secondary');

	React.useEffect(() => {
		setInitOptions({});
	}, [eventData, phaseIndex]);

	if (eventData.bonus.length === 0)
		return (
			<div style={{ marginTop: '1em' }}>
				{t('event_planner.table.featured_crew_not_identified')}
			</div>
		);

	const tableConfig: ITableConfigRow[] = React.useMemo(() => {
		const phaseType = phaseIndex < eventData.content_types.length ? eventData.content_types[phaseIndex] : eventData.content_types[0];
		if (phaseType === 'skirmish') {
			const results = getShipTableConfig(t, false);
			results.unshift(
				{ width: 3, column: 'name', title: t('event_planner.table.columns.crew'), pseudocolumns: ['name', 'max_rarity', 'level'] },
				{ width: 1, column: 'bonus', title: t('event_planner.table.columns.bonus'), reverse: true },
			);
			return results as ITableConfigRow[];
		}
		else {
			const results = [
				{ width: 3, column: 'name', title: t('event_planner.table.columns.crew'), pseudocolumns: ['name', 'max_rarity', 'level'] },
				{ width: 1, column: 'bonus', title: t('event_planner.table.columns.bonus'), reverse: true },
				{ width: 1, column: 'bestSkill.score', title: t('event_planner.table.columns.best'), reverse: true },
			] as ITableConfigRow[];

			if (eventData.activeContent?.content_type === 'voyage') {
				const bonusCol = results.find(f => f.column === 'bonus')!;
				bonusCol.customCompare = (a: IRosterCrew, b: IRosterCrew) => {
					let r = a.bonus - b.bonus;
					if (!r) r = b.ranks.gauntletRank - a.ranks.gauntletRank;
					return r;
				}
				results.push(
					{
						width: 1,
						column: 'q_bits',
						title: t('base.qp'),
						reverse: true,
						tiebreakers: ['crew.bonus'],
						customCompare(a: IRosterCrew, b: IRosterCrew, config) {
							let aslots = qbitsToSlots(a.q_bits);
							let bslots = qbitsToSlots(b.q_bits);
							let r = aslots - bslots;
							if (!r) r = a.q_bits! - b.q_bits!;
							if (!r) r = bonusCol.customCompare!(a, b, config);
							if (!r && a.score !== undefined && b.score !== undefined) r = a.score - b.score;
							if (!r) r = (a as any).bestSkill.score - (b as any).bestSkill.score;
							return r;
						}
					},
					{
						width: 1,
						column: 'traits',
						title: t('base.traits'),
						customCompare: (a: IEventScoredCrew, b: IEventScoredCrew, config) => {
							let al = a.encounter_traits?.length ?? 0;
							let bl = b.encounter_traits?.length ?? 0;
							let r = al - bl;
							if (!r) r = bonusCol.customCompare!(a, b, config);
							if (!r) {
								let astr = a.encounter_traits?.map(trait => globalContext.localized.TRAIT_NAMES[trait]).join(",") || "";
								let bstr = b.encounter_traits?.map(trait => globalContext.localized.TRAIT_NAMES[trait]).join(",") || "";
								r = astr.localeCompare(bstr);
							}
							return r;
						},
						reverse: true
					},
					{
						width: 1,
						column: 'ranks.gauntletRank',
						title: t('rank_names.gauntlet_rank')
					}
				)
			}
			else {
				results.push(
					{ width: 1, column: 'bestPair.score', title: t('event_planner.table.columns.pair'), reverse: true }
				)
			}
			CONFIG.SKILLS_SHORT.forEach((skill) => {
				const title: string = eventData.activeContent?.primary_skill === skill.name ? priText : (eventData.activeContent?.secondary_skill === skill.name ? secText : '')
				results.push({
					width: 1,
					column: `${skill.name}.core`,
					title:
						<span
							title={title}
						>
							{eventData.activeContent?.primary_skill === skill.name && <Icon color='yellow' name= 'star'/>}
							{eventData.activeContent?.secondary_skill === skill.name && <Icon color='grey' name= 'star'/>}
							<img alt={CONFIG.SKILLS[skill.name]} src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${skill.name}.png`} style={{ height: '1.1em', verticalAlign: 'middle' }} />
						</span>,
					reverse: true,
					customCompare:
						// Sort by skill voyage score for voyage events
						eventData.activeContent?.content_type === 'voyage' ?
							(a: IRosterCrew, b: IRosterCrew) => {
								const voyScore = (crew: IRosterCrew) => Math.floor(crew[skill.name].core + (crew[skill.name].min + crew[skill.name].max) / 2);
								return voyScore(a) - voyScore(b);
							}
						// Otherwise sort by skill base score (default behavior)
						: undefined
				});
			});
			return results;
		}
	}, [eventData, phaseIndex]);

	const phaseType = phaseIndex < eventData.content_types.length ? eventData.content_types[phaseIndex] : eventData.content_types[0];

	// Check for custom column (i.e. combo from crew matrix click)
	let customColumn = '';
	if (initOptions.column && tableConfig.findIndex(col => col.column === initOptions.column) === -1) {
		customColumn = initOptions.column;
		const customSkills = customColumn.replace('combos.', '').split(',');
		tableConfig.push({
			width: 1,
			column: customColumn,
			title:
				<span>
					<img alt='Skill' src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${customSkills[0]}.png`} style={{ height: '1.1em' }} />
					+<img alt='Skill' src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${customSkills[1]}.png`} style={{ height: '1.1em' }} />
				</span>,
			reverse: true
		});
	}

	const zeroCombos: IEventCombos = {};
	for (let first = 0; first < CONFIG.SKILLS_SHORT.length; first++) {
		let firstSkill = CONFIG.SKILLS_SHORT[first];
		zeroCombos[firstSkill.name] = 0;
		for (let second = first+1; second < CONFIG.SKILLS_SHORT.length; second++) {
			let secondSkill = CONFIG.SKILLS_SHORT[second];
			zeroCombos[firstSkill.name+','+secondSkill.name] = 0;
		}
	}

	const canBorrow = phaseType === 'shuttles'
		&& eventData.seconds_to_start === 0
		&& playerData?.player.squad.rank !== 'LEADER'
		&& !!ephemeral?.borrowedCrew.length;

	// Always calculate new skill numbers from original, unaltered crew list
	let rosterCrew = structuredClone(props.rosterCrew) as IEventScoredCrew[];

	// Filter crew by bonus, frozen here instead of searchabletable callback so matrix can use filtered crew list
	if (showBonus) rosterCrew = rosterCrew.filter((c) => eventData.bonus.indexOf(c.symbol) >= 0);
	if (!showFrozen) rosterCrew = rosterCrew.filter((c) => c.immortal <= 0);
	if (excludeQuipped) rosterCrew = rosterCrew.filter((c) => !isQuipped(c));
	if (!canBorrow || !showShared) rosterCrew = rosterCrew.filter((c) => !c.borrowed);
	if (onlyIdleCrew) rosterCrew = rosterCrew.filter((c) => !c.active_status);

	let bestCombos: IBestCombos = computeEventBest(
		rosterCrew,
		eventData,
		phaseType,
		buffConfig,
		applyBonus,
		showPotential
	);

	const flexRow = OptionsPanelFlexRow;

	return (
		<React.Fragment>
			<div ref={crewAnchor} />
			<Header as='h4'>{t('base.crew')}</Header>
			{eventData.bonusGuessed && <Message warning>{t('event_planner.table.crew_guessed')}</Message>}
			<Form style={{ margin: '.5em 0' }}>
				<Form.Group grouped>
					<Form.Field
						control={Checkbox}
						label={t('event_planner.table.options.event_crew', { list: eventData.bonus_text.replace('Crew Bonus: ', '') })}
						checked={showBonus}
						onChange={(e, { checked }) => setShowBonus(checked)}
					/>
					{phaseType !== 'skirmish' && <Form.Field
						control={Checkbox}
						label={t('event_planner.table.options.apply_event_bonus')}
						checked={applyBonus}
						onChange={(e, { checked }) => setApplyBonus(checked)}
					/>}
					{rosterType === 'myCrew' &&
						<React.Fragment>
							<Form.Field
								control={Checkbox}
								label={t('event_planner.table.options.potential_skills')}
								checked={showPotential}
								onChange={(e, { checked }) => setShowPotential(checked)}
							/>
							<Form.Field
								control={Checkbox}
								label={t('event_planner.table.options.show_frozen')}
								checked={showFrozen}
								onChange={(e, { checked }) => setShowFrozen(checked)}
							/>
							<Form.Field
								control={Checkbox}
								label={t('event_planner.table.options.exclude_quipped')}
								checked={excludeQuipped}
								onChange={(e, { checked }) => setExcludeQuipped(checked)}
							/>
							<Form.Field
								control={Checkbox}
								label={t('options.crew_status.idle')}
								checked={onlyIdleCrew}
								onChange={(e, { checked }) => setOnlyIdleCrew(checked)}
							/>
							{canBorrow && (
								<Form.Field
									control={Checkbox}
									label={
										<label>
											{t('event_planner.table.options.share_crew')}
											<Popup content={t('event_planner.table.options.share_crew_help')} trigger={<Icon name='info' />} />
										</label>
									}
									checked={showShared}
									onChange={(e, { checked }) => setShowShared(checked)}
								/>
							)}
						</React.Fragment>
					}
				</Form.Group>
			</Form>
			{phaseType !== 'skirmish' &&
			<div style={{...flexRow, justifyContent: 'flex-start', alignItems: 'center', gap: '1em'}}>
				<div style={{margin: '0.5em 0'}}>
					{t('hints.filter_by_skill')}:&nbsp;&nbsp;
					<SkillPicker multiple short value={skillFilter} setValue={setSkillFilter} />
				</div>
				<QuipmentProspectsOptions config={qpConfig} setConfig={setQpConfig} hideVoyageOptions={true} />
			</div>}
			<SearchableTable
				id='eventplanner'
				data={rosterCrew}
				config={tableConfig}
				renderTableRow={(crew, idx, highlighted) => renderTableRow(crew, idx ?? -1, highlighted ?? false)}
				filterRow={(crew, filters, filterType) => showThisCrew(crew, filters, filterType ?? '')}
				initOptions={initOptions}
				showFilterOptions={true}
				lockable={props.lockable}
			/>
			<CrewHoverStat openCrew={(crew) => navToCrewPage(crew)} targetGroup='eventTarget' />
			{phaseType !== 'skirmish' && (<EventCrewMatrix skillFilter={skillFilter} crew={rosterCrew} bestCombos={bestCombos} phaseType={phaseType} handleClick={sortByCombo} />)}
		</React.Fragment>
	);

	function renderTableRow(crew: IEventScoredCrew, idx: number, highlighted: boolean): JSX.Element {
		const attributes = {
			positive: highlighted
		};
		const slots = qbitsToSlots(crew.q_bits);
		return (
			<Table.Row key={idx} {...attributes}>
				<Table.Cell>
					<div
						style={{
							display: 'grid',
							gridTemplateColumns: '60px auto',
							gridTemplateAreas: `'icon stats' 'icon description'`,
							gridGap: '1px'
						}}
					>
						<div style={{ gridArea: 'icon', display: 'flex', flexDirection: 'row', alignItems: 'flex-end' }}>
							<CrewTarget targetGroup='eventTarget' inputItem={crew} >
								<img width={48} src={`${process.env.GATSBY_ASSETS_URL}${crew.imageUrlPortrait}`} />
							</CrewTarget>
							{crew.statusIcon && <Icon style={{ margin: '0 0 0.5em -0.5em' }} name={crew.statusIcon} />}
						</div>
						<div style={{ gridArea: 'stats' }}>
							<span style={{ fontWeight: 'bolder', fontSize: '1.25em' }}><Link to={`/crew/${crew.symbol}/`}>{crew.name}</Link></span>
						</div>
						<div style={{ gridArea: 'description' }}>
							{descriptionLabel(crew, true)}
						</div>
					</div>
				</Table.Cell>
				<Table.Cell textAlign='center'>
					{!['voyage', 'galaxy'].includes(phaseType) && crew.bonus > 1 ? `x${crew.bonus}` : ''}
					{phaseType === 'voyage' && crew.bonus > 1 ? `${crew.bonus} AM` : ''}
					{phaseType === 'galaxy' && crew.bonus > 1 ? t('global.n_%', { n: `${crew.bonus}` }) : ''}
				</Table.Cell>
				{phaseType !== 'skirmish' && (
					<React.Fragment>
						<Table.Cell textAlign='center'>
							<b>{scoreLabel(crew.bestSkill.score)}</b>
							<br /><img alt='Skill' src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${crew.bestSkill.skill}.png`} style={{ height: '1em' }} />
						</Table.Cell>
						{eventData.activeContent?.content_type !== 'voyage' && <Table.Cell textAlign='center'>
							{!!crew.bestPair.score && <>
							<b>{scoreLabel(crew.bestPair.score)}</b>
							<br /><img alt='Skill' src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${crew.bestPair.skillA}.png`} style={{ height: '1em' }} />
							{crew.bestPair.skillB !== '' && (<span>+<img alt='Skill' src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${crew.bestPair.skillB}.png`} style={{ height: '1em' }} /></span>)}
							</>}
						</Table.Cell>}
						{eventData.activeContent?.content_type === 'voyage' && (<>
							<Table.Cell textAlign='center'>
								<b>{(crew.q_bits)}</b>
								<br />
								{slots === 1 && t('base.one_slot')}
								{slots !== 1 && t('base.n_slots', { n: `${slots}`})}
							</Table.Cell>
							<Table.Cell>
								{printEncounterTraits(crew)}
							</Table.Cell>
							<Table.Cell textAlign='center'>
								<b>#{crew.ranks.gauntletRank}</b>
								<div style={{fontSize: '0.8em'}}>
									{printExtraGauntlet(crew)}
								</div>
							</Table.Cell>
						</>)}
						{CONFIG.SKILLS_SHORT.map(skill =>
							crew.base_skills[skill.name] ? (
								<Table.Cell key={skill.name} textAlign='center'>
									{renderSkillScore(crew, skill.name)}
								</Table.Cell>
							) : (
								<Table.Cell key={skill.name} />
							)
						)}
					</React.Fragment>
				)}
				{phaseType === 'skirmish' &&
				<CrewShipCells crew={crew} withranks={false} />}
				{customColumn !== '' && (
					<Table.Cell key='custom' textAlign='center'>
						<b>{renderCustomLabel(crew, customColumn)}</b>
					</Table.Cell>
				)}
			</Table.Row>
		);
	}

	function printEncounterTraits(crew: IEventScoredCrew) {
		if (!crew.encounter_traits?.length) return <></>
		let named = crew.encounter_traits?.map(ec => globalContext.localized.TRAIT_NAMES[ec]);
		named.sort();
		return (<>
			{named.map((txt) => {
				return (<div key={`${crew.id}_${txt}_trait`}>
					{txt}
				</div>)
			})}
		</>);
	}

	function printExtraGauntlet(crew: IEventScoredCrew) {
		let granks = Object.entries(crew.ranks).filter(([key, value]) => key.slice(0, 2) === 'G_');
		let strs = [] as React.JSX.Element[];
		granks.sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]));
		for (let rank of granks) {
			if (rank[1] <= 25) {
				let skills = rank[0].slice(2).split("_").map(short => CONFIG.SKILLS_SHORT_ENGLISH.find(f => f.short === short)!.name).map(skill => CONFIG.SKILLS_SHORT.find(f => f.name === skill)!.short).join("/");
				strs.push(<>{`#${rank[1]} ${skills}`}</>);
			}
		}
		if (!strs.length) return <></>;
		else return strs.reduce((p, n) => (p !== undefined ? <>{p}<br/>{n}</> : n) as React.JSX.Element, undefined as React.JSX.Element | undefined) || <></>;
	}

	function descriptionLabel(crew: IEventScoredCrew, withActiveStatus = false): JSX.Element {
		return (
			<div>
				<div><Rating icon='star' rating={rosterType === 'myCrew' ? crew.rarity : crew.max_rarity} maxRating={crew.max_rarity} size='large' disabled /></div>
				<div>
					{rosterType === 'myCrew' && (
						<React.Fragment>
							{crew.favorite && <Icon name='heart' />}
							{crew.immortal > 0 && <Icon name='snowflake' />}
							{withActiveStatus && crew.active_status > 0 && <Icon name='space shuttle' />}
							<span>{crew.immortal > 0 ? (`${crew.immortal} ${t('crew_state.frozen', { __gender: crewGender(crew) })}`) : crew.immortal < 0 ? crew.immortal <= -2 ? t('crew_state.unowned') : t('crew_state.immortalized', { __gender: crewGender(crew) }) : (`${(t('base.level'))} ${crew.level}`)}</span>
						</React.Fragment>
					)}
					{rosterType === 'allCrew' && <>{t('crew_state.immortalized', { __gender: crewGender(crew) })}</>}
				</div>
			</div>
		);
	}

	function renderCustomLabel(crew: IEventScoredCrew, customColumn: string): JSX.Element {
		const combo = customColumn.split('.')[1];
		return <>{scoreLabel(crew.combos[combo])}</>;
	}

	function scoreLabel(score: number): JSX.Element {
		if (!score || score === 0) return (<></>);
		if (phaseType === 'gather') return (<>{`${calculateGalaxyChance(score)}%`}</>);
		return (<>{Math.floor(score)}</>);
	}

	function renderSkillScore(crew: IEventScoredCrew, skill: string): JSX.Element {
		if (phaseType === 'voyage') {
			return (
				<React.Fragment>
					<b>{Math.floor(crew[skill].core + (crew[skill].min + crew[skill].max) / 2)}</b>
					<br />({crew[skill].min}-{crew[skill].max})
				</React.Fragment>
			);
		}
		return <b>{scoreLabel(crew[skill].core)}</b>;
	}

	function showThisCrew(crew: IEventScoredCrew, filters: [], filterType: string): boolean {
		// Bonus, frozen crew filtering now handled before rendering entire table instead of each row
		if (skillFilter?.length) {
			if (!skillFilter.some(skill => [crew.bestPair.skillA, crew.bestPair.skillB].includes(skill))) return false;
		}
		return crewMatchesSearchFilter(crew, filters, filterType);
	}

	function sortByCombo(skillA: string, skillB: string): void {
		if (skillA === skillB) {
			setInitOptions({
				column: `${skillA}.core`,
				direction: 'descending'
			});
		}
		else {
			// Order of combo match order of skills in CONFIG
			const customSkills = [] as string[];
			CONFIG.SKILLS_SHORT.forEach((skill) => {
				if (skillA === skill.name || skillB === skill.name)
					customSkills.push(skill.name);
			});
			setInitOptions({
				column: `combos.${customSkills[0]},${customSkills[1]}`,
				direction: 'descending'
			});
		}
		if (!crewAnchor.current) return;
		crewAnchor.current.scrollIntoView({
			behavior: 'smooth'
		});
	}
};

type EventCrewMatrixProps = {
	crew: IEventScoredCrew[];
	bestCombos: IBestCombos;
	phaseType: string;
	skillFilter?: string[];
	handleClick: (skillA: string, skillB: string) => void;
};

const EventCrewMatrix = (props: EventCrewMatrixProps) => {
	const { t } = React.useContext(GlobalContext).localized;
	const { crew, bestCombos, phaseType, handleClick, skillFilter } = props;

	const [halfMatrix, setHalfMatrix] = useStateWithStorage<boolean>('eventHalfMatrix', false, { rememberForever: true });

	const matrixSkills = halfMatrix ? [ ... CONFIG.SKILLS_SHORT ].reverse() : CONFIG.SKILLS_SHORT;
	const comboSeen = {} as { [key: string]: boolean };
	const isMobile = typeof window !== 'undefined' && window.innerWidth < DEFAULT_MOBILE_WIDTH;

	if (!isMobile) {
		return (
			<React.Fragment>
				<Header as='h4'>{t('event_planner.skill_matrix')}</Header>
				<p>{t('event_planner.skill_matrix_heading')}</p>
				<Table definition celled striped collapsing unstackable compact='very' style={{ width: '100%' }}>
					<Table.Header>
						<Table.Row>
							<Table.HeaderCell />
							{matrixSkills.map((skill, cellId) => (
								<Table.HeaderCell key={cellId} width={2} textAlign='center'>
									<img alt={`${skill.name}`} src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${skill.name}.png`} style={{ height: '1.1em' }} />
								</Table.HeaderCell>
							))}
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{CONFIG.SKILLS_SHORT.map((skillA, rowId) => (
							<Table.Row key={rowId}>
								<Table.Cell width={1} textAlign='center'><img alt={`${skillA.name}`} src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${skillA.name}.png`} style={{ height: '1.1em' }} /></Table.Cell>
								{matrixSkills.map((skillB, cellId) => {
									let cbkey = [skillA.name, skillB.name].sort().join("");
									let cbs = comboSeen[cbkey];
									let vis = !skillFilter?.length || skillFilter.some(skill => [skillA.name, skillB.name].includes(skill));
									comboSeen[cbkey] = true;
									return renderCell(skillA.name, skillB.name, (halfMatrix && cbs) || !vis, isMobile);
								})}
							</Table.Row>
						))}
					</Table.Body>
				</Table>
				<div title={"Show combinations only once"} style={{cursor: 'pointer', marginTop: "0.5em", display: 'flex', gap:"0.5em", flexDirection:'row', alignItems:'center'}}>
					<Checkbox id="eventHelperHalfMatrixCheck" checked={halfMatrix} onChange={(e, { checked }) => setHalfMatrix(checked as boolean)} />
					<label style={{cursor: 'pointer'}} htmlFor="eventHelperHalfMatrixCheck">{t('event_planner.hide_duplicate_pairs')}</label>
				</div>
			</React.Fragment>
		);

	}
	else {

		return (
			<React.Fragment>
				<Header as='h4'>{t('event_planner.skill_matrix')}</Header>
				<p>{t('event_planner.skill_matrix_heading')}</p>
				{CONFIG.SKILLS_SHORT.map((skillA, rowId) => (
					<div key={rowId}>
						{matrixSkills.map((skillB, cellId) => {
							let cbkey = [skillA.name, skillB.name].sort().join("");
							let cbs = comboSeen[cbkey];
							let vis = !skillFilter?.length || skillFilter.some(skill => [skillA.name, skillB.name].includes(skill));
							comboSeen[cbkey] = true;
							return !cbs && vis && <div className='ui segment' style={{
								marginTop: '1em',
								display: 'flex',
								flexDirection: 'column',
								alignItems: 'center',
								justifyContent: 'center',
								gap: '0.5em'}}>
								<div style={{
									display: 'flex',
									flexDirection: 'row',
									alignItems: 'center',
									justifyContent: 'center',
									gap: '0.5em'
								}}>
									<img alt={`${skillA.name}`} src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${skillA.name}.png`} style={{ height: '1.1em' }} />
									<span>&nbsp;/&nbsp;</span>
									<img alt={`${skillB.name}`} src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${skillB.name}.png`} style={{ height: '1.1em' }} />
								</div>
								{renderCell(skillA.name, skillB.name, cbs || !vis, isMobile)}
							</div>;
						})}
					</div>
				))}

			</React.Fragment>
		);

	}


	function renderCell(skillA: string, skillB: string, invisible: boolean, mobile: boolean) : JSX.Element {
		let key: string, best: IBestCombo;
		if (skillA === skillB) {
			key = skillA;
			best = bestCombos[skillA];
		}
		else {
			key = skillA+skillB;
			best = bestCombos[skillA+skillB] ?? bestCombos[skillB+skillA];
		}
		if (!best) best = { id: Number.NEGATIVE_INFINITY, score: 0 };
		if (best.score > 0) {
			const bestCrew = crew.find(c => c.id === best.id);
			let icon = (<></>);

			if (bestCrew && bestCrew.immortal > 0) icon = (<Icon name='snowflake' />);
			else if (bestCrew?.statusIcon) icon = (<Icon name={bestCrew.statusIcon} />);
			else if (bestCrew?.active_status) icon = <Icon name='space shuttle' />;

			if (!isMobile)
				return (
					<Table.Cell key={key} textAlign='center' style={{ cursor: 'pointer', opacity: invisible ? "0" : undefined }} onClick={() => handleClick(skillA, skillB)}>
						<img width={48} src={`${process.env.GATSBY_ASSETS_URL}${bestCrew?.imageUrlPortrait}`} />
						<br/>{icon} {bestCrew?.name} <small>({phaseType === 'gather' ? `${calculateGalaxyChance(best.score)}%` : Math.floor(best.score)})</small>
					</Table.Cell>
				);
			else
			return (
				<div key={key} style={{ display: 'inline', cursor: 'pointer', opacity: invisible ? "0" : undefined, textAlign: 'center' }} onClick={() => handleClick(skillA, skillB)}>
					<img width={48} src={`${process.env.GATSBY_ASSETS_URL}${bestCrew?.imageUrlPortrait}`} />
					<br/>{icon} {bestCrew?.name} <small>({phaseType === 'gather' ? `${calculateGalaxyChance(best.score)}%` : Math.floor(best.score)})</small>
				</div>
			);

		}
		return (
			<Table.Cell key={key} textAlign='center'>-</Table.Cell>
		);
	}
};
