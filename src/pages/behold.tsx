import React from 'react';
import { Header, Grid, Rating, Divider, Message, Button } from 'semantic-ui-react';
import { Link, navigate } from 'gatsby';
import marked from 'marked';

import Layout from '../components/layout';
import CrewPicker from '../components/crewpicker';
import CommonCrewData from '../components/commoncrewdata';

import { getStoredItem } from '../utils/storage';
import { CrewMember } from '../model/crew';
import { PlayerCrew } from '../model/player';
import { ICrewDemands, ICrewDemandsMeta } from '../utils/equipment';
import { MarkdownRemark } from '../model/game-elements';

type BeholdsPageProps = {
	location: any;
};

const BeholdsPage = (props: BeholdsPageProps) => {
	const [allCrew, setAllCrew] = React.useState(undefined);

	React.useEffect(() => {
		fetchAllCrew();
	}, []);

	return (
		<Layout title='Behold helper'>
			{!allCrew &&
				<div className='ui medium centered text active inline loader'>Loading data...</div>
			}
			{allCrew &&
				<React.Fragment>
					<Header as='h2'>Behold helper</Header>
					<CrewSelector crewList={allCrew} />
				</React.Fragment>
			}
		</Layout>
	);

	async function fetchAllCrew(): Promise<void> {
		const response = await fetch('/structured/crew.json');
		const allcrew = await response.json();
		setAllCrew(allcrew);
	}
};

const CrewSelector = (props) => {
	const [selectedCrew, setSelectedCrew] = React.useState<string[]>([]);

	const crewList = JSON.parse(JSON.stringify(props.crewList))
		.sort((a, b) => a.name.localeCompare(b.name));

	return (
		<React.Fragment>
			<CrewPicker crewList={crewList} handleSelect={onCrewPick} options={{ rarities: [4, 5] }} />
			<Divider horizontal hidden />
			<CrewComparison crewList={crewList} selectedCrew={selectedCrew} handleDismiss={onCrewDismiss} />
			{selectedCrew.length > 0 &&
				<Message>
					<Message.Header>
						Preview in your roster
					</Message.Header>
					<Button compact icon='add user' color='green' content='Preview all in your roster' onClick={addProspects} />
				</Message>
			}
		</React.Fragment>
	);

	function onCrewPick(crew: any): void {
		if (!selectedCrew.includes(crew.symbol)) {
			selectedCrew.push(crew.symbol);
			setSelectedCrew([...selectedCrew]);
		}
	}

	function onCrewDismiss(selectedIndex: number): void {
		selectedCrew.splice(selectedIndex, 1);
		setSelectedCrew([...selectedCrew]);
	}

	function addProspects(): void {
		const linkUrl = '/playertools?tool=crew';
		const linkState = {
			prospect: selectedCrew
		};
		navigate(linkUrl, { state: linkState });
	}
};

type CrewComparisonProps = {
	selectedCrew: string[];
	handleDismiss: (selectedIndex: number) => void;	
	crewList: (PlayerCrew | CrewMember)[];
};

export interface CrewComparisonEntry {
	markdown: string;
	crew: (PlayerCrew | CrewMember);
	crewDemands: ICrewDemandsMeta;
	markdownRemark: MarkdownRemark;
}

const CrewComparison = (props: CrewComparisonProps) => {
	const { selectedCrew } = props;

	const entries = [] as CrewComparisonEntry[];
	selectedCrew.forEach(symbol => {
		const crew = props.crewList.find(crew => crew.symbol === symbol);
		if (!crew) {
			console.error(`Crew ${symbol} not found in crew.json!`);
			return;
		}
		// This emulates the Gatsby markdown output until the transition to dynamic loading entirely
		entries.push({
			markdown: marked(crew.markdownContent),
			crew,
			crewDemands: {
				factionOnlyTotal: crew.factionOnlyTotal,
				totalChronCost: crew.totalChronCost,
				craftCost: crew.craftCost
			},
			markdownRemark: {
				frontmatter: {
					bigbook_tier: crew.bigbook_tier,
					events: crew.events,
					in_portal: crew.in_portal
				}
			}
		});
	});

	return (
		<Grid columns={3} stackable centered padded divided>
			{entries.map((entry, idx) => (
				<Grid.Column key={idx}>
					<Message onDismiss={() => { props.handleDismiss(idx); }}>
						<Message.Header>
							<Link to={`/crew/${entry.crew.symbol}/`}>
								{entry.crew.name}
							</Link>
						</Message.Header>
						<Rating defaultRating={entry.crew.max_rarity} maxRating={entry.crew.max_rarity} icon='star' size='small' disabled />
					</Message>
					<CommonCrewData compact={true} crewDemands={entry.crewDemands} crew={entry.crew} markdownRemark={entry.markdownRemark} roster={undefined} />
					{entry.markdown && (
						<React.Fragment>
							<div dangerouslySetInnerHTML={{ __html: entry.markdown }} />
							<div style={{ marginTop: '1em' }}>
								<a href={`https://www.bigbook.app/crew/${entry.crew.symbol}`}>View {entry.crew.name} on Big Book</a>
							</div>
						</React.Fragment>
					)}
				</Grid.Column>
			))}
		</Grid>
	);
};

export default BeholdsPage;
