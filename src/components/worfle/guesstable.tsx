import React from 'react';
import {
	Icon,
	Image,
	Rating,
	Table
} from 'semantic-ui-react';

import { EvaluationState, IEvaluatedCrew, IGuessableCrew, SolveState } from './model';

const STYLE_SOLVED: React.CSSProperties = { backgroundColor: 'green', color: 'white' };
const STYLE_ADJACENT: React.CSSProperties = { backgroundColor: 'yellow', color: 'black' };
const STYLE_LOSER: React.CSSProperties = { backgroundColor: 'maroon', color: 'white' };

type GuessTableProps = {
	solveState: SolveState;
	solvedCrew: IGuessableCrew;
	evaluatedCrew: IEvaluatedCrew[];
};

export const GuessTable = (props: GuessTableProps) => {
	const { solveState, solvedCrew } = props;

	const guessedCrew: IEvaluatedCrew[] = props.evaluatedCrew.slice();
	if (solveState === SolveState.Loser) {
		guessedCrew.push({
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
	if (guessedCrew.length === 0) return <></>;

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
					{guessedCrew.map(guess => (
						<GuessRow key={guess.symbol}
							guessedCrew={guess}
							solveState={solveState}
							guessCount={props.evaluatedCrew.length}
						/>
					))}
				</Table.Body>
			</Table>
		</div>
	);
};

type GuessRowProps = {
	guessedCrew: IEvaluatedCrew;
	solveState: SolveState;
	guessCount: number;
};

const GuessRow = (props: GuessRowProps) => {
	const { guessedCrew, solveState, guessCount } = props;

	const isSolution: boolean = guessedCrew.evaluation.crew === EvaluationState.Exact;
	const traits: string[] = guessedCrew.evaluation.matching_traits ?? guessedCrew.traits;

	return (
		<Table.Row style={styleRow()}>
			<Table.Cell style={styleCell(guessedCrew.evaluation.variant)}>
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
					<img width={48} height={48} src={`${process.env.GATSBY_ASSETS_URL}${guessedCrew.imageUrlPortrait}`} style={{ verticalAlign: 'middle' }} />
					<span style={{ padding: '0 .5em', fontSize: '1.25em' }}>{guessedCrew.name}</span>
				</div>
				{isSolution && guessedCrew.flavor && (
					<div>{guessedCrew.flavor}</div>
				)}
			</Table.Cell>
			<Table.Cell textAlign='center' style={styleCell(guessedCrew.evaluation.series)}>
				{guessedCrew.series && <Image src={`/media/series/${guessedCrew.series}.png`} size='small' style={{ margin: '0 auto' }} />}
			</Table.Cell>
			<Table.Cell style={styleCell(guessedCrew.evaluation.rarity)}>
				<Rating defaultRating={guessedCrew.rarity} maxRating={guessedCrew.rarity} icon='star' size='large' disabled />
			</Table.Cell>
			{[0, 1, 2].map(index => (
				<Table.Cell key={index} textAlign='center' style={styleCell(guessedCrew.evaluation.skills[index])}>
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
		if (index >= guessedCrew.skill_order.length) return <Icon name='minus' />;
		const skill: string = guessedCrew.skill_order[index];
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
		if (guessedCrew.variants.includes(trait)) {
			if (simpleName(trait).indexOf(simpleName(guessedCrew.short_name)) >= 0
					|| simpleName(guessedCrew.short_name).indexOf(simpleName(trait)) >= 0)
				return guessedCrew.short_name;
		}
		return properName(trait);
	}
};
