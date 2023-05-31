import React, { useRef, useState } from 'react';
import { Dropdown, Grid, Header, Table, Icon, Rail, Rating, Popup, Pagination, Segment, Tab, Label, Accordion } from 'semantic-ui-react';
import Layout from '../components/layout';
import CONFIG from './CONFIG';
import { SearchableTable, ITableConfigRow } from '../components/searchabletable';
import { calculateBuffConfig } from '../utils/voyageutils';
import { useStateWithStorage } from '../utils/storage';
import UnifiedWorker from 'worker-loader!../workers/unifiedWorker';
import CommonCrewData, { StatLabelProps } from './commoncrewdata';
import marked from 'marked';
import CrewStat from './crewstat';
import { formatTierLabel } from '../utils/crewutils';
import { CrewMember } from '../model/crew';
import { PlayerCrew, PlayerData } from '../model/player';
import { gradeToColor } from '../utils/crewutils';
import { CrewHoverStat, CrewTarget } from './hovering/crewhoverstat';

const pagingOptions = [
	{ key: '0', value: '10', text: '10' },
	{ key: '1', value: '25', text: '25' },
	{ key: '2', value: '50', text: '50' },
	{ key: '3', value: '100', text: '100' }
];

type CiteOptimizerProps = {
	playerData: PlayerData;
	allCrew: CrewMember[];
};

type CiteOptimizerState = {
	citePage: number;
	trainingPage: number;
	paginationRows: number;
	citeData: any;
	currentCrew: CrewMember | null | undefined;
	touchCrew: CrewMember | null | undefined;
	touchToggled: boolean;
};
export class StatLabel extends React.Component<StatLabelProps> {
	render() {
		const { title, value } = this.props;

		return (
			<Label size="small" style={{ marginBottom: '0.5em', width: "12em" }}>
				{title}
				<Label.Detail>{value}</Label.Detail>
			</Label>
		);
	}
}
class CiteOptimizer extends React.Component<CiteOptimizerProps, CiteOptimizerState> {
	constructor(props: CiteOptimizerProps | Readonly<CiteOptimizerProps>) {
		super(props);
		
		this.state = {
			citePage: 1,
			trainingPage: 1,
			paginationRows: 20,
			citeData: undefined,
			currentCrew: undefined,
			touchCrew: undefined,
			touchToggled: false
		};
	}

	componentDidMount() {
		const worker = new UnifiedWorker();
		const { playerData, allCrew } = this.props;
		worker.addEventListener('message', (message: { data: { result: any; }; }) => this.setState({ citeData: message.data.result }));
		worker.postMessage({
			worker: 'citeOptimizer',
			playerData,
			allCrew
		})
	}
	cc = false;
	
	renderTable(data: PlayerCrew[], training = true) {
		const createStateAccessors = (name) => [
			this.state[name],
			(value: any) => this.setState((prevState) => { prevState[name] = value; return prevState; })
		];
		const [paginationPage, setPaginationPage] = createStateAccessors(training ? 'trainingPage' : 'citePage');
		const [otherPaginationPage, setOtherPaginationPage] = createStateAccessors(training ? 'citePage' : 'trainingPage');
		const [paginationRows, setPaginationRows] = createStateAccessors('paginationRows');
		const [currentCrew, setCurrentCrew] = createStateAccessors('currentCrew');

		const baseRow = (paginationPage - 1) * paginationRows;
		const totalPages = Math.ceil(data.length / paginationRows);

		const imageClick = (e: React.MouseEvent<HTMLImageElement, MouseEvent>, data: any) => {
			console.log("imageClick");
			// if (matchMedia('(hover: hover)').matches) {
			// 	window.location.href = "/crew/" + data.symbol;
			// }
		}

		return (<div style={{overflowX: "auto"}}>			
			<Table sortable celled selectable striped collapsing unstackable compact="very">
				<Table.Header>
					<Table.Row>
						<Table.HeaderCell>Rank</Table.HeaderCell>
						<Table.HeaderCell>Crew</Table.HeaderCell>
						<Table.HeaderCell>Rarity</Table.HeaderCell>
						<Table.HeaderCell>Final EV</Table.HeaderCell>
						{!training &&
						<React.Fragment>
							<Table.HeaderCell>Remaining EV</Table.HeaderCell>
							<Table.HeaderCell>EV Per Citation</Table.HeaderCell>
						</React.Fragment>
						}
						<Table.HeaderCell>Voyages Improved</Table.HeaderCell>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{data.slice(baseRow, baseRow + paginationRows).map((row, idx: number) => {
						const crew = this.props.playerData.player.character.crew.find(c => c.name == row.name);

						return (crew &&
							<Table.Row key={idx}
							>
								<Table.Cell>{baseRow + idx + 1}</Table.Cell>
								<Table.Cell>
									<div										
										style={{
											display: 'grid',
											gridTemplateColumns: '60px auto',
											gridTemplateAreas: `'icon stats' 'icon description'`,
											gridGap: '1px'
										}}>
										<div style={{ gridArea: 'icon' }}
											
										>
											<CrewTarget allCrew={this.props.allCrew} targetGroup='citationTarget' inputItem={crew} setDisplayItem={setCurrentCrew}>
												<img 
													onClick={(e) => imageClick(e, crew)}
													width={48} 
													src={`${process.env.GATSBY_ASSETS_URL}${crew.imageUrlPortrait}`} 
													/>
											</CrewTarget>
										</div>
										<div style={{ gridArea: 'stats' }}>
											<a href={"/crew/" + crew.symbol}>
												<span style={{ fontWeight: 'bolder', fontSize: '1.25em' }}>{crew.name}</span>
											</a>											
										</div>
										
									</div>
								</Table.Cell>
								<Table.Cell>
									<Rating icon='star' rating={crew.rarity} maxRating={crew.max_rarity} size='large' disabled />
								</Table.Cell>
								<Table.Cell>
									{Math.ceil(training ? (row.addedEV ?? 0) : (row.totalEVContribution ?? 0))}
								</Table.Cell>
								{
									!training &&
									<React.Fragment>
										<Table.Cell>
											{Math.ceil(row.totalEVRemaining ?? 0)}
										</Table.Cell>
										<Table.Cell>
											{Math.ceil(row.evPerCitation ?? 0)}
										</Table.Cell>
									</React.Fragment>
								}
								<Table.Cell>
									<Popup trigger={<b>{row.voyagesImproved?.length}</b>} content={row.voyagesImproved?.join(', ')} />
								</Table.Cell>
							</Table.Row>
						);
					})}
				</Table.Body>
				<Table.Footer>
					<Table.Row>
						<Table.HeaderCell colSpan={9}>
							<Pagination
								totalPages={totalPages}
								activePage={paginationPage}
								onPageChange={(event, { activePage }) => setPaginationPage(activePage as number)}
							/>
							<span style={{ paddingLeft: '2em' }}>
								Rows per page:{' '}
								<Dropdown
									inline
									options={pagingOptions}
									value={paginationRows}
									onChange={(event, { value }) => {
										setPaginationPage(1);
										setOtherPaginationPage(1);
										setPaginationRows(value as number);
									}}
								/>
							</span>
						</Table.HeaderCell>
					</Table.Row>
				</Table.Footer>
			</Table>
			<CrewHoverStat targetGroup='citationTarget' crew={this.state.currentCrew ?? undefined} />
			</div>);
	}

	get crew(): CrewMember | undefined {
		return this.state.currentCrew ?? undefined;
	}
	
	render() {
		let { citeData } = this.state;
		let compact = true;
		return (
			<>
				<Accordion
					defaultActiveIndex={-1}
					panels={[
						{
							index: 0,
							key: 0,
							title: 'Explanation',
							content: {
								content: (
									<div>
										{/* <h3>Explanation</h3> */}
										<p>
											A crew's Expected Value (EV) is the average you can expect a crew to contribute to all voyages. EV Final accounts for the crew fully fused. EV Left, while less important, calculates the difference in contribution between fully fused and their current rank. Voyages Improved is how many of the voyage combinations the crew contributes to. Primary and secondary are taken into account, because CMD/DIP voyage will yield different results than DIP/CMD.
										</p>
										<p>
											A crew's EV for a voyage is found by finding the crew's average for the skill "Base + (Min + Max) / 2", multiplying that by 0.35 if the skill is the primary for the voyage, 0.25 if it is secondary, and 0.1 otherwise. To find how much the crew contributes to the total voyage, we find the best crew for the voyage that are fully leveled and equipped.
										</p>
										<p>
											"Training" is considered simply leveling and equipping the considered crew <u>at their current rarity</u>. This is done by comparing the current total EV of all voyages with those as if the considered crew were fully leveled and equiped <u>at current rarity</u>.
										</p>
										<p>
											"Citing" considered <u>fully fusing</u>, leveling and equipping the considered crew. This is done by comparing the current total EV of all voyages with those as if the considered crew were fully leveled and equiped <u>and fused</u>.
										</p>
									</div>
								)
							}
						}
					]}
				/>					
				
				<Segment>
					{!citeData &&
						<>
							<Icon loading name='spinner' /> Loading citation optimizer ...
						</>
					}

					{citeData &&
						<Tab						
						 	panes={[
							{ menuItem: 'Crew To Cite', render: () => this.renderTable(citeData.crewToCite, false) },
							{ menuItem: 'Crew To Train', render: () => this.renderTable(citeData.crewToTrain, true) }
						]} />
					}						
				</Segment>
			</>
		);
	}
}

export default CiteOptimizer;