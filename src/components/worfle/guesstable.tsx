import React from 'react';
import {
	Icon,
	Image,
	Popup,
	Rating,
	SemanticCOLORS,
	SemanticICONS,
	Table
} from 'semantic-ui-react';

import { EvaluationState, IEvaluatedGuess, IRosterCrew, SolveState } from './model';
import { GameContext, WorfleContext } from './context';
import { DeductionList } from './deductionlist';

const STYLE_SOLVED: React.CSSProperties = { backgroundColor: 'green', color: 'white' };
const STYLE_ADJACENT: React.CSSProperties = { backgroundColor: 'yellow', color: 'black' };
const STYLE_LOSER: React.CSSProperties = { backgroundColor: 'maroon', color: 'white' };

export const GuessTable = () => {
	const { solveState, mysteryCrew, evaluatedGuesses } = React.useContext(GameContext);

	if (evaluatedGuesses.length === 0) return <></>;

	return (
		<div style={{ overflow: 'auto' }}>
			<Table striped celled unstackable>
				<Table.Header>
					<Table.Row>
						<Table.HeaderCell /* Your Guesses */>
							Your Guesses
						</Table.HeaderCell>
						<Table.HeaderCell textAlign='center' /* Series */>
							Series
						</Table.HeaderCell>
						<Table.HeaderCell /* Rarity */>
							Rarity
						</Table.HeaderCell>
						<Table.HeaderCell colSpan={3} textAlign='center' /* Skill Order */>
							Skill Order
						</Table.HeaderCell>
						<Table.HeaderCell textAlign='center' /* Traits in Common */>
							Traits in Common
						</Table.HeaderCell>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{evaluatedGuesses.map(evaluatedGuess => (
						<GuessRow key={evaluatedGuess.crew.symbol}
							evaluatedGuess={evaluatedGuess}
						/>
					))}
					{solveState === SolveState.Loser && renderLoserRow()}
				</Table.Body>
			</Table>
		</div>
	);

	function renderLoserRow(): React.JSX.Element {
		const evaluatedMysteryCrew: IEvaluatedGuess = {
			crew: mysteryCrew,
			crewEval: EvaluationState.Exact,
			variantEval: EvaluationState.Wrong,
			seriesEval: EvaluationState.Wrong,
			rarityEval: EvaluationState.Wrong,
			skillsEval: [
				EvaluationState.Wrong,
				EvaluationState.Wrong,
				EvaluationState.Wrong
			],
			matching_traits: mysteryCrew.gamified_traits
		};
		return (
			<GuessRow key={mysteryCrew.symbol}
				evaluatedGuess={evaluatedMysteryCrew}
			/>
		);
	}
};

type GuessRowProps = {
	evaluatedGuess: IEvaluatedGuess;
};

const GuessRow = (props: GuessRowProps) => {
	const { traitMap, userPrefs, setUserPrefs } = React.useContext(WorfleContext);
	const { evaluatedGuesses, hints, solveState } = React.useContext(GameContext);
	const { evaluatedGuess } = props;

	const isSolution: boolean = evaluatedGuess.crewEval === EvaluationState.Exact;

	const guessCount: number = evaluatedGuesses.length;

	return (
		<Table.Row style={styleRow()}>
			<Table.Cell style={styleCell(evaluatedGuess.variantEval)}>
				<div style={{ display: 'flex', flexDirection: 'column', rowGap: '.5em' }}>
					{isSolution && (
						<div>
							{solveState === SolveState.Winner && (
								<span style={{ whiteSpace: 'nowrap' }} /* You got it in N try (tries) */>
									You got it in <b>{guessCount} tr{guessCount !== 1 ? 'ies' : 'y'}</b>, using {renderHints()}!
								</span>
							)}
							{solveState === SolveState.Loser && (
								<span style={{ whiteSpace: 'nowrap' }} /* You lose! The correct answer is: */>
									You lose! The correct answer is:
								</span>
							)}
						</div>
					)}
					<div style={{ display: 'flex', alignItems: 'center', columnGap: '1em' }}>
						<div>
							<img src={`${process.env.GATSBY_ASSETS_URL}${evaluatedGuess.crew.imageUrlPortrait}`} style={{ maxHeight: '72px' }} />
						</div>
						<div style={{ fontSize: '1.25em' }}>
							{evaluatedGuess.crew.name}
						</div>
						<div>
							{renderFavoriteToggle(evaluatedGuess.crew)}
						</div>
					</div>
					{isSolution && evaluatedGuess.crew.flavor && (
						<div>
							{evaluatedGuess.crew.flavor}
						</div>
					)}
				</div>
			</Table.Cell>
			<Table.Cell textAlign='center' style={styleCell(evaluatedGuess.seriesEval)}>
				{evaluatedGuess.crew.gamified_series !== 'n/a' && (
					<Image src={`/media/series/${evaluatedGuess.crew.gamified_series}.png`} size='small' style={{ margin: '0 auto' }} />
				)}
			</Table.Cell>
			<Table.Cell style={styleCell(evaluatedGuess.rarityEval)}>
				<Rating
					icon='star' size='large' disabled
					defaultRating={evaluatedGuess.crew.max_rarity}
					maxRating={evaluatedGuess.crew.max_rarity}
				/>
			</Table.Cell>
			{[0, 1, 2].map(index => (
				<Table.Cell key={index} textAlign='center' style={styleCell(evaluatedGuess.skillsEval[index])}>
					{renderSkillCell(index)}
				</Table.Cell>
			))}
			<Table.Cell textAlign='center'>
				{evaluatedGuess.matching_traits.map((trait, idx) => (
					<span key={idx}>
						<span style={{ whiteSpace: 'nowrap' }}>
							{traitMap[trait].display_name}
						</span>
						{idx < evaluatedGuess.matching_traits.length - 1 ? ', ' : ''}
					</span>
				))}
			</Table.Cell>
		</Table.Row>
	);

	function renderSkillCell(index: number): React.JSX.Element {
		if (index >= evaluatedGuess.crew.skill_order.length) return <Icon name='minus' />;
		const skill: string = evaluatedGuess.crew.skill_order[index];
		return <img alt={skill} src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${skill}.png`} style={{ height: '2em' }} />;
	}

	function styleRow(): React.CSSProperties {
		if (!isSolution) return {};
		return solveState === SolveState.Winner ? STYLE_SOLVED : STYLE_LOSER;
	}

	function styleCell(evaluationState: EvaluationState): React.CSSProperties {
		if (evaluationState === EvaluationState.Exact)
			return STYLE_SOLVED;
		else if (evaluationState === EvaluationState.Adjacent)
			return STYLE_ADJACENT;
		return {};
	}

	function renderFavoriteToggle(crew: IRosterCrew): React.JSX.Element {
		const isFavorited: boolean = userPrefs.favorites.includes(crew.symbol);
		const iconName: SemanticICONS = isFavorited ? 'heart' : 'heart outline';
		const iconColor: SemanticCOLORS | undefined = isFavorited ? 'pink' : undefined;
		const popupContent: string = isFavorited
			? `Remove ${crew.name} from favorite guesses`
			: `Add ${crew.name} to favorite guesses`
		const toggleFavorite = () => {
			if (isFavorited) {
				const index: number = userPrefs.favorites.indexOf(crew.symbol);
				if (index >= 0) userPrefs.favorites.splice(index, 1);
			}
			else {
				userPrefs.favorites.push(crew.symbol);
			}
			setUserPrefs({...userPrefs});
		};
		return (
			<React.Fragment>
				<Popup	/* Add CREW to OR remove CREW from favorite guesses */
					trigger={(
						<Icon
							name={iconName}
							color={iconColor}
							style={{ cursor: 'pointer' }}
							onClick={toggleFavorite}
						/>
					)}
					content={popupContent}
				/>
			</React.Fragment>
		);
	}

	function renderHints(): React.JSX.Element {
		const hintCount: number = hints.length;
		if (hintCount === 0) return <>0 hints</>;
		return (
			<Popup
				on='click'
				position='top center'
				wide
				trigger={(
					<span style={{ borderBottom: '1px dotted white', cursor: 'pointer' }}>
						{hintCount} hint{hintCount !== 1 ? 's' : ''}
					</span>
				)}
				content={(
					<div style={{ maxHeight: '10em', overflowY: 'scroll' }}>
						<DeductionList deductions={hints} />
					</div>
				)}
			/>
		);
	}
};
