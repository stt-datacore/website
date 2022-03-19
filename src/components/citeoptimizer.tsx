import React from 'react';
import { Dropdown, Grid, Header, Table, Icon, Rail, Rating, Popup, Pagination, Segment, Tab } from 'semantic-ui-react';
import Layout from '../components/layout';
import CONFIG from './CONFIG';

import { SearchableTable, ITableConfigRow } from '../components/searchabletable';
import { calculateBuffConfig } from '../utils/voyageutils';
import { useStateWithStorage } from '../utils/storage';
import UnifiedWorker from 'worker-loader!../workers/unifiedWorker';

import CommandIcon from '../images/CommandIcon';
import DiplomacyIcon from '../images/DiplomacyIcon';
import EngineeringIcon from '../images/EngineeringIcon';
import MedicineIcon from '../images/MedicineIcon';
import ScienceIcon from '../images/ScienceIcon';
import SecurityIcon from '../images/SecurityIcon';

const pagingOptions = [
	{ key: '0', value: '10', text: '10' },
	{ key: '1', value: '25', text: '25' },
	{ key: '2', value: '50', text: '50' },
	{ key: '3', value: '100', text: '100' }
];

type CiteOptimizerProps = {
	playerData: any;
	allCrew: any;
};

type CiteOptimizerState = {
	citePage: number;
	trainingPage: number;
	paginationRows: number;
	citeData: any;
};

class CiteOptimizer extends React.Component<CiteOptimizerProps, CiteOptimizerState> {
	constructor(props) {
		super(props);

		this.state = {
			citePage: 1,
			trainingPage: 1,
			paginationRows: 20,
			citeData: undefined
		};
	}

	componentDidMount() {
		const worker = new UnifiedWorker();
		const { playerData, allCrew } = this.props;
		worker.addEventListener('message', message => this.setState({ citeData: message.data.result }));
		worker.postMessage({
			worker: 'citeOptimizer',
			playerData,
			allCrew
		})
	}

	renderTable(data, training = true) {
		const createStateAccessors = (name) => [
			this.state[name],
			(value) => this.setState((prevState) => { prevState[name] = value; return prevState; })
		];
		const [paginationPage, setPaginationPage] = createStateAccessors(training ? 'trainingPage' : 'citePage');
		const [otherPaginationPage, setOtherPaginationPage] = createStateAccessors(training ? 'citePage' : 'trainingPage');
		const [paginationRows, setPaginationRows] = createStateAccessors('paginationRows');

		const baseRow = (paginationPage - 1) * paginationRows;
		const totalPages = Math.ceil(data.length / paginationRows);

		const icons = {
			command: {
				primary: <CommandIcon color='gold' position={0} dimLimit={25}/>,
				secondary: <CommandIcon color='silver' position={6} dimLimit={25}/>,
				tertiary: <CommandIcon color='#b08d57' position={6} dimLimit={25}/>,
				voyageSecondary: <CommandIcon color='silver' position={0} dimLimit={25}/>
			},
			diplomacy: {
				primary: <DiplomacyIcon color='gold' position={-6} dimLimit={25}/>,
				secondary: <DiplomacyIcon color='silver' position={0} dimLimit={25}/>,
				tertiary: <DiplomacyIcon color='#b08d57' position={-6} dimLimit={25}/>,
				voyageSecondary: <DiplomacyIcon color='silver' position={0} dimLimit={25}/>
			},
			engineering: {
				primary: <EngineeringIcon color='gold' position={0} dimLimit={25}/>,
				secondary: <EngineeringIcon color='silver' position={0} dimLimit={25}/>,
				tertiary: <EngineeringIcon color='#b08d57' position={0} dimLimit={25}/>,
				voyageSecondary: <EngineeringIcon color='silver' position={0} dimLimit={25}/>
			},
			medicine: {
				primary: <MedicineIcon color='gold' position={0} dimLimit={25}/>,
				secondary: <MedicineIcon color='silver' position={0} dimLimit={25}/>,
				tertiary: <MedicineIcon color='#b08d57' position={0} dimLimit={25}/>,
				voyageSecondary: <MedicineIcon color='silver' position={0} dimLimit={25}/>
			},
			science: {
				primary: <ScienceIcon color='gold' position={0} dimLimit={25}/>,
				secondary: <ScienceIcon color='silver' position={0} dimLimit={25}/>,
				tertiary: <ScienceIcon color='#b08d57' position={8} dimLimit={25}/>,
				voyageSecondary: <ScienceIcon color='silver' position={0} dimLimit={25}/>
			},
			security: {
				primary: <SecurityIcon color='gold' position={0} dimLimit={25}/>,
				secondary: <SecurityIcon color='silver' position={0} dimLimit={25}/>,
				tertiary: <SecurityIcon color='#b08d57' position={0} dimLimit={25}/>,
				voyageSecondary: <SecurityIcon color='silver' position={500} dimLimit={25}/>
			},
		}

		return (
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
					{data.slice(baseRow, baseRow + paginationRows).map((row, idx) => {
						const crew = this.props.playerData.player.character.crew.find(c => c.name == row.name);

						return (
							<Table.Row>
								<Table.Cell>{baseRow + idx + 1}</Table.Cell>
								<Table.Cell>
									<div
										style={{
											display: 'grid',
											gridTemplateColumns: '60px auto',
											gridTemplateAreas: `'icon stats' 'icon description'`,
											gridGap: '1px'
										}}>
										<div style={{ gridArea: 'icon' }}>
											<img width={48} src={`${process.env.GATSBY_ASSETS_URL}${crew.imageUrlPortrait}`} />
										</div>
										<div style={{ gridArea: 'stats' }}>
											<span style={{ fontWeight: 'bolder', fontSize: '1.25em' }}>{crew.name}</span>
										</div>
									</div>
								</Table.Cell>
								<Table.Cell>
									<Rating icon='star' rating={crew.rarity} maxRating={crew.max_rarity} size='large' disabled />
								</Table.Cell>
								<Table.Cell>
									{Math.ceil(training ? row.addedEV : row.totalEVContribution)}
								</Table.Cell>
								{
									!training &&
									<React.Fragment>
										<Table.Cell>
											{Math.ceil(row.totalEVRemaining)}
										</Table.Cell>
										<Table.Cell>
											{Math.ceil(row.evPerCitation)}
										</Table.Cell>
									</React.Fragment>
								}
								<Table.Cell>
									{
										row.voyagesImproved.map((pairing, i) => (
											<svg key={i} width="50" height="25" viewBox="0 0 50 25">
												<g transform={`translate(12.5 0)`}>{icons[pairing.split('/')[1]].voyageSecondary}</g>
												<g>{icons[pairing.split('/')[0]].primary}</g>
											</svg>
										))
									}
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
		);
	}

	render() {
		let { citeData } = this.state;

		return (
			<>
				<Segment>
					{!citeData &&
						<>
							<Icon loading name='spinner' /> Loading citation optimizer ...
						</>
					}
					{citeData &&
						<Tab panes={[
							{ menuItem: 'Crew To Cite', render: () => this.renderTable(citeData.crewToCite, false) },
							{ menuItem: 'Crew To Train', render: () => this.renderTable(citeData.crewToTrain, true) }
						]} />
					}
					<Rail position='right'>
						<h3>Explanation</h3>
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
					</Rail>
				</Segment>
			</>
		);
	}
}

export default CiteOptimizer;