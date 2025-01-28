import React from 'react';
import { Link } from 'gatsby';
import { Header, Form, Dropdown, Table, Rating, Modal, Icon, Button } from 'semantic-ui-react';

import { PlayerCrew } from '../../model/player';
import { ITrackedCrewMember, ITrackedAssignmentsBySkill, ITrackedVoyage } from '../../model/voyage';
import { GlobalContext } from '../../context/globalcontext';
import CONFIG from '../../components/CONFIG';
import { SearchableTable, ITableConfigRow } from '../../components/searchabletable';
import { CrewHoverStat, CrewTarget } from '../../components/hovering/crewhoverstat';
import { crewMatchesSearchFilter } from '../../utils/crewsearch';
import { formatTime } from '../../utils/voyageutils';

import { HistoryContext } from './context';
import { VoyageModal } from './voyagemodal';
import { CrewPreparer } from '../item_presenters/crew_preparer';

export const CrewTable = () => {
	const globalContext = React.useContext(GlobalContext);
	const { t } = globalContext.localized;
	const { history } = React.useContext(HistoryContext);

	const [data, setData] = React.useState<ITrackedCrewMember[]>([] as ITrackedCrewMember[]);
	const [primaryOnly, setPrimaryOnly] = React.useState(false);
	const [reportDays, setReportDays] = React.useState<number | undefined>(180);

	const [activeVoyage, setActiveVoyage] = React.useState<ITrackedVoyage | undefined>(undefined);
	const [activeCrew, setActiveCrew] = React.useState<ITrackedCrewMember | undefined>(undefined);

	React.useEffect(() => {
		const firstReportDate = Date.now() - ((reportDays ?? 0)*1000*60*60*24);
		const voyages = history.voyages.filter(voyage => !reportDays || voyage.created_at > firstReportDate);

		const skillCount = {};
		CONFIG.SKILLS_SHORT.forEach(skill => {
			skillCount[skill.name] = {
				primary: voyages.filter(voyage => voyage.skills.primary_skill === skill.name).length,
				secondary: voyages.filter(voyage => voyage.skills.secondary_skill === skill.name).length
			};
		});

		const crewData = [] as ITrackedCrewMember[];
		Object.keys(history.crew).forEach(crewSymbol => {
			
			let crewIn = globalContext.player.playerData?.player.character.crew.find(crew => crew.symbol === crewSymbol) ?? globalContext.core.crew.find(crew => crew.symbol === crewSymbol);
			const crew = CrewPreparer.prepareCrewMember(crewIn as PlayerCrew, 'quipment', 'owned', globalContext)[0] as PlayerCrew;
			
			if (crew) {
				const assignments = history.crew[crewSymbol].filter(assignment => {
					const trackedVoyage = voyages.find(voyage => voyage.tracker_id === assignment.tracker_id);
					return !!trackedVoyage;
				});
				const averageEstimate = assignments.reduce((prev, curr) => {
					const trackedVoyage = voyages.find(voyage => voyage.tracker_id === curr.tracker_id);
					return trackedVoyage ? prev + trackedVoyage.checkpoint.estimate.median : 0;
				}, 0)/assignments.length;
				const lastAssignment = (assignments.map(assignment => {
					const trackedVoyage = voyages.find(voyage => voyage.tracker_id === assignment.tracker_id);
					return {
						tracker_id: trackedVoyage?.tracker_id ?? 0,
						created_at: trackedVoyage?.created_at ?? 0
					};
				}).sort((a, b) => b.created_at - a.created_at))[0];
				const skillAssignments = {} as ITrackedAssignmentsBySkill;
				CONFIG.SKILLS_SHORT.forEach(skill => {
					const trackerIds = [] as number[];
					assignments.forEach(assignment => {
						const trackedVoyage = voyages.find(voyage => voyage.tracker_id === assignment.tracker_id);
						if (trackedVoyage) {
							if (trackedVoyage.skills.primary_skill === skill.name)
								trackerIds.push(assignment.tracker_id);
							if (trackedVoyage.skills.secondary_skill === skill.name && !primaryOnly)
								trackerIds.push(assignment.tracker_id);
						}
					});
					const totalVoyages = skillCount[skill.name].primary + (!primaryOnly ? skillCount[skill.name].secondary : 0);
					skillAssignments[skill.name] = {
						ids: trackerIds,
						usage: totalVoyages > 0 ? trackerIds.length / totalVoyages : 0
					};
				});
				crewData.push({
					...crew,
					assignments,
					average_estimate: averageEstimate,
					skill_assignments: skillAssignments,
					last_assignment: lastAssignment
				});
			}
		});
		setData([...crewData]);
	}, [history, reportDays, primaryOnly]);

	const reportDayOptions = [
		{ key: 'all', value: undefined, text: 'Show all voyages' },
		{ key: 'year', value: 365, text: 'Show voyages from last year' },
		{ key: 'half', value: 180, text: 'Show voyages from last 180 days' },
		{ key: 'quarter', value: 90, text: 'Show voyages from last 90 days' },
		{ key: 'months', value: 60, text: 'Show voyages from last 60 days' },
		{ key: 'month', value: 30, text: 'Show voyages from last month' },
		{ key: 'week', value: 7, text: 'Show voyages from last week' }
	];

	const tableConfig: ITableConfigRow[] = [
		{ width: 3, column: 'name', title: 'Crew', pseudocolumns: ['name', 'date_added'] },
		{ width: 1, column: 'max_rarity', title: 'Rarity', reverse: true },
		{ width: 1, column: 'assignments.length', title: 'Voyages', reverse: true },
		{ width: 1, column: 'average_estimate', title: 'Average', reverse: true },
		{ width: 1, column: 'last_assignment.created_at', title: 'Last Used', reverse: true }
	];
	CONFIG.SKILLS_SHORT.forEach((skill) => {
		tableConfig.push({
			width: 1,
			column: `skill_assignments.${skill.name}.usage`,
			title: <img alt={CONFIG.SKILLS[skill.name]} src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${skill.name}.png`} style={{ height: '1.1em' }} />,
			reverse: true
		});
	});

	return (
		<React.Fragment>
			<Header as='h3'>Crew History</Header>
			<Form>
				<Form.Group inline>
					<Form.Field
						placeholder='Filter by date'
						control={Dropdown}
						selection
						clearable
						options={reportDayOptions}
						value={reportDays}
						onChange={(e, { value }) => setReportDays(value)}
					/>
				</Form.Group>
			</Form>
			<SearchableTable
				id='voyageCrewHistory'
				data={data}
				config={tableConfig}
				renderTableRow={(crew) => renderTableRow(crew)}
				filterRow={(crew, filter, filterType) => crewMatchesSearchFilter(crew, filter, filterType)}
				showFilterOptions={true}
			/>
			<div>
				The skill cells indicate what percentage of time the respective crew is used when the column is the voyage primary{!primaryOnly && <>{` `}or secondary</>}.
			</div>
			{activeVoyage &&
				<VoyageModal voyage={activeVoyage}
					onClose={() => setActiveVoyage(undefined)}
				/>
			}
			{activeCrew &&
				<CrewSkillModal crew={activeCrew} reportDays={reportDays}
					onClose={() => setActiveCrew(undefined)}
				/>
			}
			<CrewHoverStat targetGroup='voyageCrewHistory' />
		</React.Fragment>
	);

	function renderTableRow(crew: ITrackedCrewMember): JSX.Element {
		const dtLastAssignment = crew.assignments.length > 0 ? new Date(crew.last_assignment.created_at) : undefined;
		return (
			<Table.Row key={crew.symbol}>
				<Table.Cell>
					<div
						style={{
							display: 'grid',
							gridTemplateColumns: '60px auto',
							gridTemplateAreas: `'icon stats' 'icon description'`,
							gridGap: '1px'
						}}>
						<div style={{ gridArea: 'icon' }}>
							<CrewTarget targetGroup='voyageCrewHistory' inputItem={crew}>
								<img width={48} src={`${process.env.GATSBY_ASSETS_URL}${crew.imageUrlPortrait}`} />
							</CrewTarget>
						</div>
						<div style={{ gridArea: 'stats' }}>
							<span style={{ fontWeight: 'bolder', fontSize: '1.25em' }}><Link to={`/crew/${crew.symbol}/`}>{crew.name}</Link></span>
						</div>
					</div>
				</Table.Cell>
				<Table.Cell>
					<Rating icon='star' rating={crew.max_rarity} maxRating={crew.max_rarity} size='large' disabled />
				</Table.Cell>
				<Table.Cell textAlign='center'>
					<b>{crew.assignments.length}</b>
				</Table.Cell>
				<Table.Cell textAlign='center'>
					{crew.assignments.length > 0 && formatTime(crew.average_estimate, t)}
				</Table.Cell>
				<Table.Cell textAlign='center' onClick={() => viewVoyage(crew.last_assignment.tracker_id)} style={{ cursor: 'pointer' }}>
					{dtLastAssignment?.toLocaleDateString()}
				</Table.Cell>
				{CONFIG.SKILLS_SHORT.map(skill => renderPercentCell(crew, skill.name))}
			</Table.Row>
		);
	}

	function renderPercentCell(crew: ITrackedCrewMember, skillName: string): JSX.Element {
		const usage = crew.skill_assignments[skillName].usage;
		if (usage === 0) return (<Table.Cell key={skillName} />);
		return (
			<Table.Cell key={skillName}
				textAlign='center' style={{ cursor: 'pointer' }}
				onClick={() => setActiveCrew(crew)}
			>
				{usage === 1 ? '100' : `${(usage*100).toFixed(1)}`}
			</Table.Cell>
		);
	}

	function viewVoyage(trackerId: number): void {
		const voyage = history.voyages.find(voyage => voyage.tracker_id === trackerId);
		if (voyage) setActiveVoyage(voyage);
	}
};

type CrewSkillModalProps = {
	crew: ITrackedCrewMember;
	reportDays: number | undefined;
	onClose: () => void;
};

const CrewSkillModal = (props: CrewSkillModalProps) => {
	const { history } = React.useContext(HistoryContext);
	const { crew, reportDays } = props;

	const firstReportDate = Date.now() - ((reportDays ?? 0)*1000*60*60*24);
	const voyages = history.voyages.filter(voyage => !reportDays || voyage.created_at > firstReportDate);

	const voyageCount = {}, usageCount = {};
	CONFIG.SKILLS_SHORT.map(primary => {
		CONFIG.SKILLS_SHORT.map(secondary => {
			const key = `${primary.name},${secondary.name}`;
			const matchingVoyages = voyages.filter(voyage => voyage.skills.primary_skill === primary.name && voyage.skills.secondary_skill === secondary.name);
			voyageCount[key] = matchingVoyages.length;
			usageCount[key] = 0;
		});
	});
	crew.assignments.forEach(assignment => {
		const voyage = voyages.find(voyage => voyage.tracker_id === assignment.tracker_id);
		if (voyage) {
			const key = `${voyage.skills.primary_skill},${voyage.skills.secondary_skill}`;
			usageCount[key]++;
		}
	});

	return (
		<Modal
			open={true}
			onClose={() => props.onClose()}
			closeIcon
		>
			<Modal.Header>
				{crew.name}<span style={{ marginLeft: '2em' }}>({!reportDays ? 'All Voyages' : `Last ${reportDays} Days`})</span>
			</Modal.Header>
			<Modal.Content scrolling>
				<Table definition celled striped>
					<Table.Header>
						<Table.Row>
							<Table.HeaderCell />
							{CONFIG.SKILLS_SHORT.map(secondary => (
								<Table.HeaderCell key={secondary.name} textAlign='center'>
									<img alt={CONFIG.SKILLS[secondary.name]} src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${secondary.name}.png`} style={{ height: '1.1em', verticalAlign: 'text-bottom' }} />
									<Icon name='star' color='grey' />
								</Table.HeaderCell>
							))}
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{CONFIG.SKILLS_SHORT.map(primary => (
							<Table.Row key={primary.name}>
								<Table.HeaderCell textAlign='center'>
									<img alt={CONFIG.SKILLS[primary.name]} src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${primary.name}.png`} style={{ height: '1.1em', verticalAlign: 'text-bottom' }} />
									<Icon name='star' color='yellow' />
								</Table.HeaderCell>
								{CONFIG.SKILLS_SHORT.map(secondary => (
									<Table.Cell key={secondary.name} textAlign='center'>
										{getUsage(primary.name, secondary.name)}
									</Table.Cell>
								))}
							</Table.Row>
						))}
					</Table.Body>
				</Table>
				<div>
					Each cell indicates what percentage of time {crew.name} is used when the row is the voyage primary and the column is the voyage secondary.
				</div>
			</Modal.Content>
			<Modal.Actions>
				<Button onClick={props.onClose}>
					Close
				</Button>
			</Modal.Actions>
		</Modal>
	);

	function getUsage(primary: string, secondary: string): string {
		if (primary === secondary) return '-';
		const key = `${primary},${secondary}`;
		if (voyageCount[key] === 0) return '-';
		if (usageCount[key] === 0) return '0';
		if (usageCount[key] === voyageCount[key]) return '100';
		return (usageCount[key]/voyageCount[key]*100).toFixed(1);
	}
};
