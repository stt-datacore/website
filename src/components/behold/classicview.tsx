import React from 'react';
import { Link, navigate } from 'gatsby';
import { Grid, Card, Label, Image, Button, Icon, SemanticWIDTHS } from 'semantic-ui-react';
import marked from 'marked';

import { CrewMember } from '../../model/crew';
import { GlobalContext } from '../../context/globalcontext';
import { Common } from '../../components/crewdata/common';

type ClassicViewProps = {
	selectedCrew: string[];
	crewList: CrewMember[];
	handleDismiss: (selectedIndex: number) => void;
};

export const ClassicView = (props: ClassicViewProps) => {
	const selectedCrew = [] as CrewMember[];
	props.selectedCrew.forEach(crewSymbol => {
		const crew = props.crewList.find(crew => crew.symbol === crewSymbol);
		if (crew) selectedCrew.push(crew);
	});

	return (
		<div style={{ marginTop: '2em' }}>
			<Grid columns={selectedCrew.length >= 3 ? 3 : 2 as SemanticWIDTHS} centered stackable>
				{selectedCrew.map((crew, idx) => <CardCrew key={crew.symbol} index={idx} crew={crew} handleDismiss={props.handleDismiss} />)}
			</Grid>
		</div>
	);
};

type CardCrewProps = {
	crew: CrewMember;
	index: number;
	handleDismiss: (selectedIndex: number) => void;
};

const CardCrew = (props: CardCrewProps) => {
	const globalContext = React.useContext(GlobalContext);
	const { playerData } = globalContext.player;

	const { crew, index } = props;
	const rarity = playerData ? 'rarity_next' : 'rarity';
	const skills = playerData ? 'skills_next' : 'skills';
	return (
		<Grid.Column>
			<Card fluid>
				<Label as='a' corner='right' onClick={() => props.handleDismiss(index)}>
					<Icon name='x' color='red' style={{ cursor: 'pointer' }} />
				</Label>
				<Card.Content>
					<Image src={`${process.env.GATSBY_ASSETS_URL}${crew.imageUrlFullBody}`} floated='right' size='small' />
					<Card.Header>
						<Link to={`/crew/${crew.symbol}`}>{crew.name}</Link>
					</Card.Header>
					<Common
						crew={crew}
						fields={[rarity, skills, 'rank_highlights', 'ranks', 'fuses', 'crew_demands', 'traits', 'collections', 'cross_fuses', 'date_added']}
						compact={true}
					/>
					<div style={{ marginTop: '1em' }}>
						{crew.markdownContent && <div dangerouslySetInnerHTML={{ __html: marked.parse(crew.markdownContent) }} />}
						<div style={{ marginTop: '1em', textAlign: 'right' }}>
							<a href={`https://www.bigbook.app/crew/${crew.symbol}`} target='_blank'>
								View {crew.name} on Big Book
							</a>
						</div>
					</div>
					<div style={{ marginTop: '2em', display: 'flex', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
						{false && <Button onClick={() => addProspects([crew.symbol])}>
							<Icon name='add user' color='green' />
							Preview {crew.short_name} in your roster
						</Button>}
						<Button onClick={() => { props.handleDismiss(index); }}>
							<Icon name='x' color='red' />
							Dismiss {crew.short_name}
						</Button>
					</div>
				</Card.Content>
			</Card>
		</Grid.Column>
	)

	function addProspects(crewSymbols: string[]): void {
		const linkUrl = '/playertools?tool=crew';
		const linkState = {
			prospect: crewSymbols
		};
		navigate(linkUrl, { state: linkState });
	}
};
