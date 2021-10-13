import React from 'react';
import { Header, Table, Icon, Rating, Tab, Popup} from 'semantic-ui-react';
import Layout from '../components/layout';
import CONFIG from './CONFIG';

import { SearchableTable, ITableConfigRow } from '../components/searchabletable';
import { calculateBuffConfig } from '../utils/voyageutils';
import Optimizer from '../workers/optimizer';


type CiteOptimizerProps = {
	playerData: any;
	allCrew: any;
};

type CiteOptimizerState = {
	crewToTrain: any[];
	crewToCite: any[];
	paginationPage: number;
	paginationRows: number;
};

class CiteOptimizer extends React.Component<CiteOptimizerProps, CiteOptimizerState> {
	constructor(props) {
		super(props);

		this.state = {
			crewToCite: [],
			crewToTrain: []
		};
	}

	componentDidMount() {
		const { allCrew, playerData } = this.props;

		Optimizer.assessCrewRoster(this.props.playerData, allCrew);
    Optimizer.sortVoyageRankings();
    Optimizer.findCurrentBestCrew();
    Optimizer.findBestForRarity();
    Optimizer.findCrewToTrain();
    Optimizer.findEVContributionOfCrewToTrain();
    Optimizer.sortCrewToTrain();
    Optimizer.findBestCitedCrew();
    Optimizer.findCrewToCite();
    Optimizer.findEVContributionOfCrewToCite();
    Optimizer.sortCrewToCite();
		this.setState({
			crewToTrain: Optimizer.rankedCrewToTrain,
			crewToCite: Optimizer.rankedCrewToCite
		});
    console.log(Optimizer.rankedCrewToTrain);
    console.log(Optimizer.rankedCrewToCite);
	}

	renderTable(data, training = true) {
		const createStateAccessors = (name) => [
			() => this.state[name],
			(value) => this.setState((prevState) => {prevState[name] = value; return prevState; })
		];
		const [ paginationPage, setPaginationPage ] = createStateAccessors('paginationPage');
		const [ paginationRows, setPaginationRows ] = createStateAccessors('paginationRows');
		return (
			<Table sortable celled selectable striped collapsing unstackable compact="very">
				<Table.Header>
					<Table.Row>
						<Table.HeaderCell>Rank</Table.HeaderCell>
						<Table.HeaderCell>Crew</Table.HeaderCell>
						<Table.HeaderCell>Rarity</Table.HeaderCell>
						<Table.HeaderCell>Score <Popup
							trigger={<Icon name='help' />}
							content={training
								? 'This is the amount of weighted skill value added if the crew is fully trained.'
								: 'This is the amount of weighted skill value added if the crew is cited.'
							}/></Table.HeaderCell>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{data.map((row, idx) => {
						const crew = this.props.playerData.player.character.crew.find(c => c.name == row.name);
						return (
							<Table.Row>
								<Table.Cell>{idx+1}</Table.Cell>
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
									{ (training ? row.addedEV : row.evPerCitation).toFixed(1) }
								</Table.Cell>
							</Table.Row>
						);
					})}
				</Table.Body>
			</Table>
		);
	}

	render() {
		let { crewToCite, crewToTrain} = this.state;

		if (crewToCite.length == 0) {
			return (
				<Layout>
					<Icon loading name='spinner' /> Loading...
				</Layout>
			);
		}

		return (
			<Tab panes={[
				{menuItem: 'Crew to cite', render: () => this.renderTable(crewToCite, false)},
				{menuItem: 'Crew to train', render: () => this.renderTable(crewToTrain) }
			]} />
		);
	}
}

export default CiteOptimizer;
