import React from 'react';
import { Header, Table, Icon, Rating, Form, Checkbox, Message, Popup } from 'semantic-ui-react';
import { Link } from 'gatsby';

import { InitialOptions, LockedProspect } from '../../model/game-elements';
import { CompletionState } from '../../model/player';

import { GlobalContext } from '../../context/globalcontext';

import { CrewHoverStat, CrewTarget } from '../../components/hovering/crewhoverstat';

import CONFIG from '../../components/CONFIG';
import { SearchableTable, ITableConfigRow } from '../../components/searchabletable';
import { crewMatchesSearchFilter } from '../../utils/crewsearch';
import { useStateWithStorage } from '../../utils/storage';
import { applySkillBuff, crewGender, isQuipped } from '../../utils/crewutils';

import { IEventData, IRosterCrew, IEventScoredCrew, IEventCombos, IEventSkill, IEventPair, IBestCombos, IBestCombo } from './model';
import { calculateGalaxyChance, computeEventBest } from '../../utils/events';
import { navToCrewPage } from '../../utils/nav';
import { GatherPlanner } from '../gather/gather_planner';

type EventCrewTableProps = {
	rosterType: string;
	rosterCrew: IRosterCrew[];
	eventData: IEventData;
	phaseIndex: number;
	lockable?: LockedProspect[];
};

export const EventCrewTable = (props: EventCrewTableProps) => {
	const globalContext = React.useContext(GlobalContext);
	const { t, tfmt } = globalContext.localized;

	const { playerData, buffConfig } = globalContext.player;
	const { rosterType, eventData, phaseIndex } = props;

	const [showBonus, setShowBonus] = useStateWithStorage('eventplanner/showBonus', true);
	const [applyBonus, setApplyBonus] = useStateWithStorage('eventplanner/applyBonus', true);
	const [showPotential, setShowPotential] = useStateWithStorage('eventplanner/showPotential', false);
	const [showFrozen, setShowFrozen] = useStateWithStorage('eventplanner/showFrozen', true);
	const [excludeQuipped, setExcludeQuipped] = useStateWithStorage('eventplanner/excludeQuipped', false);
	const [showShared, setShowShared] = useStateWithStorage('eventplanner/showShared', true);
	const [initOptions, setInitOptions] = React.useState<InitialOptions>({});
	const crewAnchor = React.useRef<HTMLDivElement>(null);

	React.useEffect(() => {
		setInitOptions({});
	}, [eventData, phaseIndex]);

	if (eventData.bonus.length === 0)
		return (
			<div style={{ marginTop: '1em' }}>
				{t('event_planner.table.featured_crew_not_identified')}
			</div>
		);

	const tableConfig: ITableConfigRow[] = [
		{ width: 3, column: 'name', title: t('event_planner.table.columns.crew'), pseudocolumns: ['name', 'max_rarity', 'level'] },
		{ width: 1, column: 'bonus', title: t('event_planner.table.columns.bonus'), reverse: true },
		{ width: 1, column: 'bestSkill.score', title: t('event_planner.table.columns.best'), reverse: true },
		{ width: 1, column: 'bestPair.score', title: t('event_planner.table.columns.pair'), reverse: true }
	];

	const priText = t('quipment_ranks.primary');
	const secText = t('quipment_ranks.secondary');

	CONFIG.SKILLS_SHORT.forEach((skill) => {
		const title = eventData.primary_skill === skill.name ? priText : (eventData.secondary_skill === skill.name ? secText : '')
		tableConfig.push({
			width: 1,
			column: `${skill.name}.core`,
			title:
				<div
					title={title}
					style={{
						display: 'flex',
						flexDirection: 'row',
						alignItems: 'center',
						justifyContent: 'center',
						gap: '0.5em'
					}}>
					{eventData.primary_skill === skill.name && <Icon color='yellow' name= 'star'/>}
					{eventData.secondary_skill === skill.name && <Icon color='grey' name= 'star'/>}
					<img alt={CONFIG.SKILLS[skill.name]} src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${skill.name}.png`} style={{ height: '1.1em' }} />
				</div>,
			reverse: true
		});
	});

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

	const phaseType = phaseIndex < eventData.content_types.length ? eventData.content_types[phaseIndex] : eventData.content_types[0];

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
		&& !!playerData?.player.character.crew_borrows?.length
		&& playerData?.player.squad.rank !== 'LEADER';

	// Always calculate new skill numbers from original, unaltered crew list
	let rosterCrew = JSON.parse(JSON.stringify(props.rosterCrew)) as IEventScoredCrew[];

	// Filter crew by bonus, frozen here instead of searchabletable callback so matrix can use filtered crew list
	if (showBonus) rosterCrew = rosterCrew.filter((c) => eventData.bonus.indexOf(c.symbol) >= 0);
	if (!showFrozen) rosterCrew = rosterCrew.filter((c) => c.immortal <= 0);
	if (excludeQuipped) rosterCrew = rosterCrew.filter((c) => !isQuipped(c));
	if (!canBorrow || !showShared) rosterCrew = rosterCrew.filter((c) => !c.shared);

	let bestCombos: IBestCombos = computeEventBest(
		rosterCrew,
		eventData,
		phaseType,
		buffConfig,
		applyBonus,
		showPotential
	);

	// const getPairScore = (crew: IRosterCrew, primary: string, secondary: string) => {
	// 	if (phaseType === 'shuttles') {
	// 		if (secondary) return crew[primary].core+(crew[secondary].core/4);
	// 		return crew[primary].core;
	// 	}
	// 	if (secondary) return (crew[primary].core+crew[secondary].core)/2;
	// 	return crew[primary].core/2;
	// };

	// rosterCrew.forEach(crew => {
	// 	// First adjust skill scores as necessary
	// 	if (applyBonus || showPotential) {
	// 		crew.bonus = 1;
	// 		if (applyBonus && eventData.featured.indexOf(crew.symbol) >= 0) {
	// 			if (phaseType === 'gather') crew.bonus = 10;
	// 			else if (phaseType === 'shuttles') crew.bonus = 3;
	// 		}
	// 		else if (applyBonus && eventData.bonus.indexOf(crew.symbol) >= 0) {
	// 			if (phaseType === 'gather') crew.bonus = 5;
	// 			else if (phaseType === 'shuttles') crew.bonus = 2;
	// 		}
	// 		if (crew.bonus > 1 || showPotential) {
	// 			CONFIG.SKILLS_SHORT.forEach(skill => {
	// 				if (crew[skill.name].core > 0) {
	// 					if (showPotential && crew.immortal === CompletionState.NotComplete && !crew.prospect) {
	// 						crew[skill.name].current = crew[skill.name].core*crew.bonus;
	// 						if (buffConfig) crew[skill.name] = applySkillBuff(buffConfig, skill.name, crew.skill_data[crew.rarity-1].base_skills[skill.name]);
	// 					}
	// 					crew[skill.name].core = crew[skill.name].core*crew.bonus;
	// 				}
	// 			});
	// 		}
	// 	}

	// 	// Then calculate skill combination scores
	// 	let combos: IEventCombos = {...zeroCombos};
	// 	let bestPair: IEventPair = { score: 0, skillA: '', skillB: '' };
	// 	let bestSkill: IEventSkill = { score: 0, skill: '' };
	// 	for (let first = 0; first < CONFIG.SKILLS_SHORT.length; first++) {
	// 		const firstSkill = CONFIG.SKILLS_SHORT[first];
	// 		const single = {
	// 			score: crew[firstSkill.name].core,
	// 			skillA: firstSkill.name
	// 		};
	// 		combos[firstSkill.name] = single.score;
	// 		if (!bestCombos[firstSkill.name] || single.score > bestCombos[firstSkill.name].score)
	// 			bestCombos[firstSkill.name] = { id: crew.id, score: single.score };
	// 		if (single.score > bestSkill.score) bestSkill = { score: single.score, skill: single.skillA };
	// 		for (let second = first+1; second < CONFIG.SKILLS_SHORT.length; second++) {
	// 			const secondSkill = CONFIG.SKILLS_SHORT[second];
	// 			let pair = {
	// 				score: getPairScore(crew, firstSkill.name, secondSkill.name),
	// 				skillA: firstSkill.name,
	// 				skillB: secondSkill.name
	// 			}
	// 			if (crew[secondSkill.name].core > crew[firstSkill.name].core) {
	// 				pair = {
	// 					score: getPairScore(crew, secondSkill.name, firstSkill.name),
	// 					skillA: secondSkill.name,
	// 					skillB: firstSkill.name
	// 				}
	// 			}
	// 			combos[firstSkill.name+','+secondSkill.name] = pair.score;
	// 			if (pair.score > bestPair.score) bestPair = pair;
	// 			const pairId = firstSkill.name+secondSkill.name;
	// 			if (!bestCombos[pairId] || pair.score > bestCombos[pairId].score)
	// 				bestCombos[pairId] = { id: crew.id, score: pair.score };
	// 		}
	// 	}
	// 	crew.combos = combos;
	// 	crew.bestPair = bestPair;
	// 	crew.bestSkill = bestSkill;
	// });

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
					<Form.Field
						control={Checkbox}
						label={t('event_planner.table.options.apply_event_bonus')}
						checked={applyBonus}
						onChange={(e, { checked }) => setApplyBonus(checked)}
					/>
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
			<CrewHoverStat openCrew={(crew) => navToCrewPage(crew, rosterCrew, buffConfig)} targetGroup='eventTarget' />
			{phaseType !== 'skirmish' && phaseType !== 'voyage' && (<EventCrewMatrix crew={rosterCrew} bestCombos={bestCombos} phaseType={phaseType} handleClick={sortByCombo} />)}
		</React.Fragment>
	);

	function renderTableRow(crew: IEventScoredCrew, idx: number, highlighted: boolean): JSX.Element {
		const attributes = {
			positive: highlighted
		};

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
						<div style={{ gridArea: 'description' }}>{descriptionLabel(crew)}</div>
					</div>
				</Table.Cell>
				<Table.Cell textAlign='center'>
					{phaseType !== 'voyage' && crew.bonus > 1 ? `x${crew.bonus}` : ''}
					{phaseType === 'voyage' && crew.bonus > 1 ? `${crew.bonus} AM` : ''}
				</Table.Cell>
				<Table.Cell textAlign='center'>
					<b>{scoreLabel(crew.bestSkill.score)}</b>
					<br /><img alt='Skill' src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${crew.bestSkill.skill}.png`} style={{ height: '1em' }} />
				</Table.Cell>
				<Table.Cell textAlign='center'>
					<b>{scoreLabel(crew.bestPair.score)}</b>
					<br /><img alt='Skill' src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${crew.bestPair.skillA}.png`} style={{ height: '1em' }} />
					{crew.bestPair.skillB !== '' && (<span>+<img alt='Skill' src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${crew.bestPair.skillB}.png`} style={{ height: '1em' }} /></span>)}
				</Table.Cell>
				{CONFIG.SKILLS_SHORT.map(skill =>
					crew.base_skills[skill.name] ? (
						<Table.Cell key={skill.name} textAlign='center'>
							<b>{scoreLabel(crew[skill.name].core)}</b>
							{phaseType !== 'gather' && (<span><br /><small>+({crew[skill.name].min}-{crew[skill.name].max})</small></span>)}
						</Table.Cell>
					) : (
						<Table.Cell key={skill.name} />
					)
				)}
				{customColumn !== '' && (
					<Table.Cell key='custom' textAlign='center'>
						<b>{renderCustomLabel(crew, customColumn)}</b>
					</Table.Cell>
				)}
			</Table.Row>
		);
	}

	function descriptionLabel(crew: IEventScoredCrew): JSX.Element {
		return (
			<div>
				<div><Rating icon='star' rating={rosterType === 'myCrew' ? crew.rarity : crew.max_rarity} maxRating={crew.max_rarity} size='large' disabled /></div>
				<div>
					{rosterType === 'myCrew' && (
						<React.Fragment>
							{crew.favorite && <Icon name='heart' />}
							{crew.immortal > 0 && <Icon name='snowflake' />}
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

	function showThisCrew(crew: IEventScoredCrew, filters: [], filterType: string): boolean {
		// Bonus, frozen crew filtering now handled before rendering entire table instead of each row
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
	handleClick: (skillA: string, skillB: string) => void;
};

const EventCrewMatrix = (props: EventCrewMatrixProps) => {
	const { t } = React.useContext(GlobalContext).localized;
	const { crew, bestCombos, phaseType, handleClick } = props;

	const [halfMatrix, setHalfMatrix] = useStateWithStorage<boolean>('eventHalfMatrix', false, { rememberForever: true });

	const matrixSkills = halfMatrix ? [ ... CONFIG.SKILLS_SHORT ].reverse() : CONFIG.SKILLS_SHORT;
	const comboSeen = {} as { [key: string]: boolean };

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
								comboSeen[cbkey] = true;
								return renderCell(skillA.name, skillB.name, halfMatrix && (cbs));
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

	function renderCell(skillA: string, skillB: string, invisible: boolean) : JSX.Element {
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
			if (bestCrew?.statusIcon) icon = (<Icon name={bestCrew.statusIcon} />);
			return (
				<Table.Cell key={key} textAlign='center' style={{ cursor: 'pointer', opacity: invisible ? "0" : undefined }} onClick={() => handleClick(skillA, skillB)}>
					<img width={48} src={`${process.env.GATSBY_ASSETS_URL}${bestCrew?.imageUrlPortrait}`} />
					<br/>{icon} {bestCrew?.name} <small>({phaseType === 'gather' ? `${calculateGalaxyChance(best.score)}%` : Math.floor(best.score)})</small>
				</Table.Cell>
			);
		}
		return (
			<Table.Cell key={key} textAlign='center'>-</Table.Cell>
		);
	}
};
