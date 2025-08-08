import React from 'react';
import {
	Icon,
	Image,
	Rating,
	Table
} from 'semantic-ui-react';

import { EvaluationState, IGuessedCrew, SolveState } from './model';

const STYLE_SOLVED: React.CSSProperties = { backgroundColor: 'green', color: 'white' };
const STYLE_ADJACENT: React.CSSProperties = { backgroundColor: 'yellow', color: 'black' };
const STYLE_LOSER: React.CSSProperties = { backgroundColor: 'maroon', color: 'white' };

type GuessTableProps = {
	solveState: SolveState;
	solvedCrew: IGuessedCrew;
	guessesEvaluated: IGuessedCrew[];
};

export const GuessTable = (props: GuessTableProps) => {
	const { solveState, solvedCrew } = props;

	const guessesEvaluated: IGuessedCrew[] = props.guessesEvaluated.slice();
	if (solveState === SolveState.Loser) {
		guessesEvaluated.push({
			...solvedCrew,
			evaluation: {
				crew: EvaluationState.Exact,
				variant: EvaluationState.Wrong,
				series: EvaluationState.Wrong,
				rarity: EvaluationState.Wrong,
				skills: [
					EvaluationState.Wrong,
					EvaluationState.Wrong,
					EvaluationState.Wrong
				],
				matching_traits: solvedCrew.traits
			}
		});
	}
	if (guessesEvaluated.length === 0) return <></>;

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
					{guessesEvaluated.map(guess => (
						<GuessRow key={guess.symbol}
							guess={guess}
							solveState={solveState}
							guessCount={props.guessesEvaluated.length}
						/>
					))}
				</Table.Body>
			</Table>
		</div>
	);
};

type GuessRowProps = {
	guess: IGuessedCrew;
	solveState: SolveState;
	guessCount: number;
};

const GuessRow = (props: GuessRowProps) => {
	const { guess, solveState, guessCount } = props;

	const isSolution: boolean = guess.evaluation.crew === EvaluationState.Exact;
	const traits: string[] = guess.evaluation.matching_traits ?? guess.traits;

	return (
		<Table.Row style={styleRow()}>
			<Table.Cell style={styleCell(guess.evaluation.variant)}>
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
					<img width={48} height={48} src={`${process.env.GATSBY_ASSETS_URL}${guess.imageUrlPortrait}`} style={{ verticalAlign: 'middle' }} />
					<span style={{ padding: '0 .5em', fontSize: '1.25em' }}>{guess.name}</span>
				</div>
				{isSolution && guess.flavor && (
					<div>{guess.flavor}</div>
				)}
			</Table.Cell>
			<Table.Cell textAlign='center' style={styleCell(guess.evaluation.series)}>
				{guess.series && <Image src={`/media/series/${guess.series}.png`} size='small' style={{ margin: '0 auto' }} />}
			</Table.Cell>
			<Table.Cell style={styleCell(guess.evaluation.rarity)}>
				<Rating defaultRating={guess.rarity} maxRating={guess.rarity} icon='star' size='large' disabled />
			</Table.Cell>
			{[0, 1, 2].map(index => (
				<Table.Cell key={index} textAlign='center' style={styleCell(guess.evaluation.skills[index])}>
					{renderSkillCell(index)}
				</Table.Cell>
			))}
			<Table.Cell textAlign='center'>
				{traits.map((trait, idx) => (
					<React.Fragment>
						<span key={idx} style={{ whiteSpace: 'nowrap' }}>
							{formatTrait(trait)}
						</span>
						{idx < traits.length - 1 ? ', ' : ''}
					</React.Fragment>
				))}
			</Table.Cell>
		</Table.Row>
	);

	function renderSkillCell(index: number): JSX.Element {
		if (index >= guess.skill_order.length) return <Icon name='minus' />;
		const skill: string = guess.skill_order[index];
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

	function formatTrait(trait: string): string {
		const simpleName = (trait: string) => {
			return trait.replace(/[^A-Z]/gi, '').toLowerCase();
		};
		const properName = (trait: string) => {
			return trait.replace(/_/g, ' ').split(' ').map(word => word.slice(0, 1).toUpperCase()+word.slice(1)).join(' ');
		};
		// Display short_name instead of variant trait when appropriate
		if (guess.variants.includes(trait)) {
			if (simpleName(trait).indexOf(simpleName(guess.short_name)) >= 0
					|| simpleName(guess.short_name).indexOf(simpleName(trait)) >= 0)
				return guess.short_name;
		}
		return properName(trait);
	}
};
