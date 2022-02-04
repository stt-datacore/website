import React from 'react';
import { Dropdown, Grid, Header, Table, Icon, Rail, Rating, Popup, Pagination, Segment, Tab} from 'semantic-ui-react';
import Layout from '../components/layout';
import CONFIG from './CONFIG';

import { SearchableTable, ITableConfigRow } from '../components/searchabletable';
import { calculateBuffConfig } from '../utils/voyageutils';
import { useStateWithStorage } from '../utils/storage';
import UnifiedWorker from 'worker-loader!../workers/unifiedWorker';

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
		worker.addEventListener('message', message => this.setState({citeData: message.data.result}));
		worker.postMessage({
			worker: 'citeOptimizer',
			playerData,
			allCrew
		})
	}

	renderTable(data, training = true) {
		const createStateAccessors = (name) => [
			this.state[name],
			(value) => this.setState((prevState) => {prevState[name] = value; return prevState; })
		];
		const [ paginationPage, setPaginationPage ] = createStateAccessors(training ? 'trainingPage' : 'citePage');
		const [ otherPaginationPage, setOtherPaginationPage ] = createStateAccessors(training ? 'citePage' : 'trainingPage');
		const [ paginationRows, setPaginationRows ] = createStateAccessors('paginationRows');

		const baseRow = (paginationPage-1)*paginationRows;
		const totalPages = Math.ceil(data.length/paginationRows);

		return (
			<Table sortable celled selectable striped collapsing unstackable compact="very">
				<Table.Header>
					<Table.Row>
						<Table.HeaderCell>Rank</Table.HeaderCell>
						<Table.HeaderCell>Crew</Table.HeaderCell>
						<Table.HeaderCell>Rarity</Table.HeaderCell>
						<Table.HeaderCell>Final EV</Table.HeaderCell>
						<Table.HeaderCell>Remaining EV</Table.HeaderCell>
						<Table.HeaderCell>Voyages Improved</Table.HeaderCell>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{data.slice(baseRow, baseRow+paginationRows).map((row, idx) => {
						const crew = this.props.playerData.player.character.crew.find(c => c.name == row.name);

						return (
							<Table.Row>
								<Table.Cell>{baseRow+idx+1}</Table.Cell>
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
									{ Math.ceil(training ? row.addedEV : row.totalEVContribution) }
								</Table.Cell>
								{
									!training &&
									<Table.Cell>
										{Math.ceil(training ? row.addedEV : row.totalEVRemaining)}
									</Table.Cell>
								}
								<Table.Cell>
									<Popup trigger={<b>{row.voyagesImproved.length}</b>} content={row.voyagesImproved.join(', ')} />
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
							<span style={{ paddingLeft: '2em'}}>
								Rows per page:{' '}
								<Dropdown
									inline
									options={pagingOptions}
									value={paginationRows}
									onChange={(event, {value}) => {
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
							{menuItem: 'Crew to cite', render: () => this.renderTable(citeData.crewToCite, false)},
							{menuItem: 'Crew to train', render: () => this.renderTable(citeData.crewToTrain, true) }
						]} />
					}
					<Rail position='right'>
							<h3>Explanation</h3>
							Voyages are calculated for every combination and have an Expected Value (EV) which is based on each crews base+(min + max)/2 for each skill, then for the voyage main proficiency times 0.35, secondary proficiency times 0.25 and all other times 0.1. This is the total score for the voyage. We use this to rank all of your crew for each proficiency combo of voyage from best to worst. We then do this again assuming you had leveled all your crew to 100, and compare the difference in EV for each voyage to work out how much you would gain by leveling that crew. This produces the "Ranked Crew to Train" section in the console output, you will get a list of what voyages they improve, and how much they will improve the best proficiency combo by. Then finally we do this all over again assuming that you have fully cited your crew, and then tell you the EV benefit per citation. Note that for citations the assumption is that you will cite a crew to 5/5, so this tool does not answer "where should I spend the next citation for most improvement", it answers "who should I cite to 5/5 for most improvement", as one citation on a killer 1/5 may have no effect on your voyages, but at 5/5 they might be your best crew.
					</Rail>
				</Segment>
			</>
		);
	}
}

export default CiteOptimizer;
