import React, { useRef, useState } from 'react';
import { Dropdown, Grid, Header, Table, Icon, Rail, Rating, Popup, Pagination, Segment, Tab, Label, Accordion, Checkbox } from 'semantic-ui-react';
import { Link } from 'gatsby';
import Layout from '../components/layout';
import CONFIG from './CONFIG';
import { SearchableTable, ITableConfigRow } from '../components/searchabletable';
import { BuffStatTable, calculateBuffConfig } from '../utils/voyageutils';
import { useStateWithStorage } from '../utils/storage';
import UnifiedWorker from 'worker-loader!../workers/unifiedWorker';
import CommonCrewData, { StatLabelProps } from './commoncrewdata';
import marked from 'marked';
import CrewStat from './crewstat';
import { formatTierLabel, navToCrewPage } from '../utils/crewutils';
import { CrewMember } from '../model/crew';
import { CiteMode, PlayerCrew, PlayerData } from '../model/player';
import { gradeToColor } from '../utils/crewutils';
import { CrewHoverStat, CrewTarget } from './hovering/crewhoverstat';
import { MergedData, MergedContext } from '../context/mergedcontext';
import { PortalFilter, RarityFilter } from './crewtables/commonoptions';

const pagingOptions = [
	{ key: '0', value: '10', text: '10' },
	{ key: '1', value: '25', text: '25' },
	{ key: '2', value: '50', text: '50' },
	{ key: '3', value: '100', text: '100' }
];


type CiteOptimizerProps = {
};

export interface CiteData {
	crewToCite: PlayerCrew[],
	crewToTrain: PlayerCrew[]
}

type CiteOptimizerState = {
	citePage: number;
	trainingPage: number;
	paginationRows: number;
	citeData: CiteData | undefined;
	currentCrew: CrewMember | null | undefined;
	touchCrew: CrewMember | null | undefined;
	touchToggled: boolean;
	citeMode?: CiteMode;
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
	static contextType = MergedContext;
	context!: React.ContextType<typeof MergedContext>;
	private lastCiteMode: CiteMode | undefined = undefined;

	constructor(props: CiteOptimizerProps) {
		super(props);

		this.state = {
			citePage: 1,
			trainingPage: 1,
			paginationRows: 20,
			citeData: undefined,
			currentCrew: undefined,
			touchCrew: undefined,
			touchToggled: false,
			citeMode: {
				rarities: []
			}
		};
	}

	componentDidMount() {
		const { citeMode } = this.state;
		this.runWorker(citeMode);
	}

	componentDidUpdate(prevProps: Readonly<CiteOptimizerProps>, prevState: Readonly<CiteOptimizerState>, snapshot?: any): void {
		if (JSON.stringify(this.state.citeMode ?? {}) !== JSON.stringify(this.lastCiteMode ?? {})) {
			this.lastCiteMode = this.state.citeMode;
			this.runWorker(this.lastCiteMode);
		}
	}

	private runWorker(citeMode?: CiteMode) {
		const worker = new UnifiedWorker();
		const { playerData, allCrew } = this.context;

		playerData.citeMode = citeMode;

		worker.addEventListener('message', (message: { data: { result: any; }; }) => this.setState({ citeData: message.data.result }));
		worker.postMessage({
			worker: 'citeOptimizer',
			playerData,
			allCrew
		});
	}

	cc = false;

	private createStateAccessors<T>(name): [T, (value: T) => void] { return [
		this.state[name],
		(value: T) => this.setState((prevState) => { prevState[name] = value; return prevState; })
	] };

	renderTable(data?: PlayerCrew[], training = true) {
		if (!data) return <></>;
		const [paginationPage, setPaginationPage] = this.createStateAccessors<number>(training ? 'trainingPage' : 'citePage');
		const [otherPaginationPage, setOtherPaginationPage] = this.createStateAccessors<number>(training ? 'citePage' : 'trainingPage');
		const [paginationRows, setPaginationRows] = this.createStateAccessors<number>('paginationRows');
		const [currentCrew, setCurrentCrew] = this.createStateAccessors<(PlayerCrew | CrewMember | null | undefined)>('currentCrew');
		const [citeMode, setCiteMode] = this.createStateAccessors<CiteMode>('citeMode');

		const baseRow = (paginationPage - 1) * paginationRows;
		const totalPages = Math.ceil(data.length / paginationRows);
		const buffConfig = calculateBuffConfig(this.context.playerData.player);

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
						<Table.HeaderCell>In Portal</Table.HeaderCell>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{data.slice(baseRow, baseRow + paginationRows).map((row, idx: number) => {
						const crew = this.context.playerData.player.character.crew.find(c => c.name == row.name);

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
											<CrewTarget targetGroup='citationTarget'
												inputItem={crew}>
												<img
													onClick={(e) => imageClick(e, crew)}
													width={48}
													src={`${process.env.GATSBY_ASSETS_URL}${crew.imageUrlPortrait}`}
													/>
											</CrewTarget>
										</div>
										<div style={{ gridArea: 'stats' }}>
											<span style={{ fontWeight: 'bolder', fontSize: '1.25em' }}><Link to={`/crew/${crew.symbol}/`}>{crew.name}</Link></span>
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
								<Table.Cell>
									{crew.in_portal ? "Yes" : "No"}
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
			</div>);
	}

	get crew(): CrewMember | undefined {
		return this.state.currentCrew ?? undefined;
	}

	render() {

		const buffConfig = calculateBuffConfig(this.context.playerData.player);
		const [citeMode, setCiteMode] = this.createStateAccessors<CiteMode>('citeMode');
		const [citeData, setCiteData] = this.createStateAccessors<CiteData | undefined>('citeData');

		let compact = true;

		return (
			<>
				<Accordion
					defaultActiveIndex={-1}
					panels={[
						{
							index: 0,
							key: 0,
							title: 'Explainer (Click To Expand)',
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
					<h3>Filters</h3>
					<div style={{
						display: "flex",
						flexDirection: "row"
					}}>
						<div style={{ display: "flex", flexDirection: "column", alignItems: "left", margin: 0, marginRight: "1em"}}>
							<RarityFilter
								rarityFilter={citeMode?.rarities ?? []}
								setRarityFilter={(data) => {
									setCiteData(undefined);
									setCiteMode({ ... citeMode ?? {}, rarities: data });
								}}
								/>
						</div>
						{/* <div style={{ display: "flex", flexDirection: "column", alignItems: "left"}}>
							<PortalFilter
								portalFilter={citeMode?.portal}
								setPortalFilter={(data) => {
									setCiteData(undefined);
									setCiteMode({ ... citeMode ?? {}, portal: data });
								}}
								/>
						</div> */}

					</div>
				</Segment>

				<Segment>
					{!citeData &&
						<>
							<Icon loading name='spinner' /> Loading citation optimizer ...
						</>
					}

					{citeData &&
						<>
						<Tab
						 	panes={[
							{ menuItem: 'Crew To Cite', render: () => this.renderTable(citeData?.crewToCite, false) },
							{ menuItem: 'Crew To Train', render: () => this.renderTable(citeData?.crewToTrain, true) }
						]} />
						</>
					}
				</Segment>
				<CrewHoverStat openCrew={(crew) => navToCrewPage(crew, this.context.playerData.player.character.crew, buffConfig)}  targetGroup='citationTarget' />

			</>
		);
	}
}

export default CiteOptimizer;