import React from 'react';
import {
	Icon,
	Image,
	Rating,
	Table
} from 'semantic-ui-react';

import { EvaluationState, SolveState } from './model';

const STYLE_SOLVED = { backgroundColor: 'green', color: 'white' };
const STYLE_ADJACENT = { backgroundColor: 'yellow', color: 'black' };
const STYLE_LOSER = { backgroundColor: 'maroon', color: 'white' };

type GuessTableProps = {
	solveState: number;
	solvedCrew: any;
	guessesEvaluated: any[];
};

export const GuessTable = (props: GuessTableProps) => {
	const { solveState, solvedCrew } = props;

	const guessesEvaluated = props.guessesEvaluated.slice();
	if (solveState === SolveState.Loser) guessesEvaluated.push({... solvedCrew, evaluation: { crew: EvaluationState.Exact }});
	if (guessesEvaluated.length === 0) return (<></>);

	return (
		<div style={{ overflow: 'auto' }}>
			<Table striped celled unstackable>
				<Table.Header>
					<Table.Row>
						<Table.HeaderCell>Your Guesses</Table.HeaderCell>
						<Table.HeaderCell textAlign='center'>Series</Table.HeaderCell>
						<Table.HeaderCell>Rarity</Table.HeaderCell>
						<Table.HeaderCell colSpan={3} textAlign='center'>Skill Order</Table.HeaderCell>
						<Table.HeaderCell textAlign='center'>Traits in Common</Table.HeaderCell>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{guessesEvaluated.map(guess => (
						<GuessRow key={guess.symbol} guess={guess} solveState={solveState} guessCount={props.guessesEvaluated.length} />
					))}
				</Table.Body>
			</Table>
		</div>
	);
};

type GuessRowProps = {
	guess: any;
	solveState: number;
	guessCount: number;
};

const GuessRow = (props: GuessRowProps) => {
	const { guess, solveState, guessCount } = props;

	const isSolution = guess.evaluation.crew === EvaluationState.Exact;
	const traits = guess.evaluation.traits ?? guess.traits;

	return (
		<Table.Row {...styleRow()}>
			<Table.Cell {...styleCell(guess.evaluation.variant)}>
				{isSolution && (
					<div>
						{solveState === SolveState.Winner && (<span style={{ whiteSpace: 'nowrap' }}>You got it in {guessCount} tr{guessCount !== 1 ? 'ies' : 'y'}!</span>)}
						{solveState === SolveState.Loser && (<span style={{ whiteSpace: 'nowrap' }}>You lose! The correct answer is:</span>)}
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
			<Table.Cell textAlign='center' {...styleCell(guess.evaluation.series)}>
				{guess.series && <Image src={`/media/series/${guess.series}.png`} size='small' style={{ margin: '0 auto' }} />}
			</Table.Cell>
			<Table.Cell {...styleCell(guess.evaluation.rarity)}>
				<Rating defaultRating={guess.rarity} maxRating={guess.rarity} icon='star' size='large' disabled />
			</Table.Cell>
			{guess.skills.map((skill, idx) => (
				<Table.Cell key={idx} textAlign='center' {...styleCell(guess.evaluation.skills ? guess.evaluation.skills[idx] : 0)}>
					{skill.skill !== '' && <img alt={idx} src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${skill.skill}.png`} style={{ height: '2em' }} />}
					{skill.skill === '' && <Icon name='minus' />}
				</Table.Cell>
			))}
			<Table.Cell textAlign='center'>
				{traits.map((trait, idx) => (
					<span key={idx} style={{ whiteSpace: 'nowrap' }}>
						{formatTrait(trait)}{idx < traits.length-1 ? ',' : ''}
					</span>
				)).reduce((prev, curr) => [prev, ' ', curr], [])}
			</Table.Cell>
		</Table.Row>
	);

	function styleRow(): any {
		if (!isSolution) return {};
		const attributes = {} as { style: { color: string, backgroundColor: string } };
		attributes.style = solveState === SolveState.Winner ? STYLE_SOLVED : STYLE_LOSER;
		return attributes;
	}

	function styleCell(evaluationState: number): any {
		const attributes = {} as { style: { color: string, backgroundColor: string } };
		if (evaluationState === EvaluationState.Exact)
			attributes.style = STYLE_SOLVED;
		else if (evaluationState === EvaluationState.Adjacent)
			attributes.style = STYLE_ADJACENT;
		return attributes;
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
