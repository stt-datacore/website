import React from 'react';
import {
	Icon,
	Image,
	Label,
	Rating,
	Table
} from 'semantic-ui-react';

import { GlobalContext } from '../../context/globalcontext';

import { EvaluationState, IEvaluatedGuess, IRosterCrew, SolveState } from './model';
import { WorfleContext } from './context';
import { GameRules, getTraitName } from './game';

const STYLE_SOLVED: React.CSSProperties = { backgroundColor: 'green', color: 'white' };
const STYLE_ADJACENT: React.CSSProperties = { backgroundColor: 'yellow', color: 'black' };
const STYLE_LOSER: React.CSSProperties = { backgroundColor: 'maroon', color: 'white' };

type GuessTableProps = {
	rules: GameRules;
	solveState: SolveState;
	mysteryCrew: IRosterCrew;
	evaluatedGuesses: IEvaluatedGuess[];
};

export const GuessTable = (props: GuessTableProps) => {
	const { rules, solveState, mysteryCrew } = props;

	const evaluatedGuesses: IEvaluatedGuess[] = props.evaluatedGuesses.slice();
	if (solveState === SolveState.Loser) {
		evaluatedGuesses.push({
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
		});
	}
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
					{evaluatedGuesses.map(guess => (
						<GuessRow key={guess.crew.symbol}
							rules={rules}
							evaluatedGuess={guess}
							solveState={solveState}
							guessCount={props.evaluatedGuesses.length}
						/>
					))}
				</Table.Body>
			</Table>
		</div>
	);
};

type GuessRowProps = {
	rules: GameRules;
	evaluatedGuess: IEvaluatedGuess;
	solveState: SolveState;
	guessCount: number;
};

const GuessRow = (props: GuessRowProps) => {
	const { TRAIT_NAMES } = React.useContext(GlobalContext).localized;
	const { variantMap } = React.useContext(WorfleContext);
	const { rules, evaluatedGuess, solveState, guessCount } = props;

	const isSolution: boolean = evaluatedGuess.crewEval === EvaluationState.Exact;

	return (
		<Table.Row style={styleRow()}>
			<Table.Cell style={styleCell(evaluatedGuess.variantEval)}>
				{isSolution && (
					<div>
						{solveState === SolveState.Winner && (
							<span style={{ whiteSpace: 'nowrap' }} /* You got it in N try (tries) */>
								You got it in {guessCount} tr{guessCount !== 1 ? 'ies' : 'y'}!
							</span>
						)}
						{solveState === SolveState.Loser && (
							<span style={{ whiteSpace: 'nowrap' }} /* You lose! The correct answer is: */>
								You lose! The correct answer is:
							</span>
						)}
					</div>
				)}
				<div style={{ margin: '.5em 0', whiteSpace: 'nowrap' }}>
					<img width={48} height={48} src={`${process.env.GATSBY_ASSETS_URL}${evaluatedGuess.crew.imageUrlPortrait}`} style={{ verticalAlign: 'middle' }} />
					<span style={{ padding: '0 .5em', fontSize: '1.25em' }}>{evaluatedGuess.crew.name}</span>
					{rules.portal_only && !evaluatedGuess.crew.in_portal && (
						<Label color='orange'	/* Not in portal */>
							Not in portal
						</Label>
					)}
				</div>
				{isSolution && evaluatedGuess.crew.flavor && (
					<div>{evaluatedGuess.crew.flavor}</div>
				)}
			</Table.Cell>
			<Table.Cell textAlign='center' style={styleCell(evaluatedGuess.seriesEval)}>
				{evaluatedGuess.crew.gamified_series !== 'n/a' && <Image src={`/media/series/${evaluatedGuess.crew.gamified_series}.png`} size='small' style={{ margin: '0 auto' }} />}
				{evaluatedGuess.crew.gamified_series === 'n/a' && (
					<Label color='orange'	/* Misleading series */>
						Misleading series
					</Label>
				)}
			</Table.Cell>
			<Table.Cell style={styleCell(evaluatedGuess.rarityEval)}>
				<Rating defaultRating={evaluatedGuess.crew.max_rarity} maxRating={evaluatedGuess.crew.max_rarity} icon='star' size='large' disabled />
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
							{getTraitName(trait, variantMap, TRAIT_NAMES)}
						</span>
						{idx < evaluatedGuess.matching_traits.length - 1 ? ', ' : ''}
					</span>
				))}
			</Table.Cell>
		</Table.Row>
	);

	function renderSkillCell(index: number): JSX.Element {
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
};
