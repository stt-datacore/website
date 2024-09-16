import React from 'react';
import { Link, navigate } from 'gatsby';
import { Grid, Card, Label, Image, Button, Icon, Rating, SemanticWIDTHS } from 'semantic-ui-react';

import { CrewMember } from '../../model/crew';
import { GlobalContext } from '../../context/globalcontext';
import { ClassicPresenter, Skills, IFieldOverride } from '../../components/item_presenters/classic_presenter';
import { marked } from 'marked';

interface IOwnedCounts {
	total: number;
	fullyFused: number;
	highestNonFF: number;
};

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
	const { t, tfmt } = globalContext.localized;
	const { playerData } = globalContext.player;
	const { crew, index } = props;

	const fieldOverrides = [] as IFieldOverride[];
	if (playerData) {
		const ownedCounts = {
			total: 0,
			fullyFused: 0,
			highestNonFF: 0,
		} as IOwnedCounts;

		const owned = playerData.player.character.crew.filter(mc => mc.symbol === crew.symbol);
		ownedCounts.total = owned.reduce((prev, curr) => prev + (curr.immortal > 0 ? curr.immortal : 1), 0);
		ownedCounts.fullyFused = owned.filter(mc => mc.rarity === crew.max_rarity).length;
		ownedCounts.highestNonFF = owned.filter(mc => mc.rarity !== crew.max_rarity)
			.reduce((prev, curr) => Math.max(curr.rarity, prev), 0);

		const nextRarity = ownedCounts.total > 0 ? (ownedCounts.highestNonFF > 0 ? ownedCounts.highestNonFF + 1 : crew.max_rarity) : 1;

		fieldOverrides.push(
			{
				field: 'rarity',
				override: (crew: CrewMember, compact?: boolean) => <RarityNext key='rarity' crew={crew} ownedCounts={ownedCounts} />
			},
			{
				field: 'skills',
				override: (crew: CrewMember, compact?: boolean) => <Skills key='skills' crew={crew} rarity={nextRarity} compact={compact} />
			}
		)
	}

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
					<ClassicPresenter
						crew={crew}
						fields={['rarity', 'skills', 'rank_highlights', 'ranks', 'fuses', 'crew_demands', 'traits', 'collections', 'cross_fuses', 'date_added']}
						fieldOverrides={fieldOverrides}
						compact={true}
					/>
					<div style={{ marginTop: '1em' }}>
						{!!crew.markdownContent && <div dangerouslySetInnerHTML={{ __html: marked.parse(crew.markdownContent) }} />}
						<div style={{ marginTop: '1em', textAlign: 'right' }}>
							<a href={`https://www.bigbook.app/crew/${crew.symbol}`} target='_blank'>
								{t('crew_views.view_big_book', { crew: crew.name })}
							</a>
						</div>
					</div>
					<div style={{ marginTop: '2em', display: 'flex', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
						{false && <Button onClick={() => addProspects([crew.symbol])}>
							<Icon name='add user' color='green' />
							{t('crew_views.preview', { crew: crew.short_name })}
						</Button>}
						<Button onClick={() => { props.handleDismiss(index); }}>
							<Icon name='x' color='red' />
							{t('crew_views.dismiss', { crew: crew.short_name })}
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

type RarityNextProps = {
	crew: CrewMember;
	ownedCounts: IOwnedCounts;
};

const RarityNext = (props: RarityNextProps) => {
	const { crew, ownedCounts } = props;

	if (ownedCounts.fullyFused > 0 && ownedCounts.highestNonFF === 0) {
		return (
			<React.Fragment>
				{ownedCounts.fullyFused > 1 && <>{ownedCounts.fullyFused}{` `}</>}
				Owned <Rating defaultRating={crew.max_rarity} maxRating={crew.max_rarity} icon='star' size='small' disabled />
			</React.Fragment>
		);
	}

	if (ownedCounts.total === 0) {
		return (
			<React.Fragment>
				Unowned
				<span style={{ whiteSpace: 'nowrap' }}>
					<Icon name='arrow right' />
					<Rating defaultRating={1} maxRating={crew.max_rarity} icon='star' size='small' disabled />
				</span>
			</React.Fragment>
		);
	}

	return (
		<React.Fragment>
			<Rating defaultRating={ownedCounts.highestNonFF} maxRating={crew.max_rarity} icon='star' size='small' disabled />
			<span style={{ whiteSpace: 'nowrap' }}>
				<Icon name='arrow right' />
				<Rating defaultRating={ownedCounts.highestNonFF+1} maxRating={crew.max_rarity} icon='star' size='small' disabled />
			</span>
			{(ownedCounts.total > 1 || ownedCounts.fullyFused > 0) &&
				<React.Fragment>
					<br/>({ownedCounts.total} owned
					{ownedCounts.fullyFused > 0 &&
						<React.Fragment>
							, {ownedCounts.fullyFused} already <Rating defaultRating={crew.max_rarity} maxRating={crew.max_rarity} icon='star' size='small' disabled />
						</React.Fragment>
					})
				</React.Fragment>
			}
		</React.Fragment>
	);
};
