import React from 'react';
import {
	Button,
	Popup
} from 'semantic-ui-react';

import { TraitNames } from '../../model/traits';

import { EvaluationState, IEvaluatedGuess, IRosterCrew, IVariantMap, SolveState, TTraitType } from './model';
import { SERIES_ERAS, USABLE_COLLECTIONS, USABLE_HIDDEN_TRAITS } from './config';
import { WorfleContext } from './context';
import { GuessPicker } from './guesspicker';
import { GuessTable } from './guesstable';

const GAME_NAME = 'Worfle';
const GAME_URL = 'https://datacore.app/crewchallenge';

export const DEFAULT_GUESSES = 8;
export const DEFAULT_SERIES = SERIES_ERAS.map(seriesEra => seriesEra.series);
export const DEFAULT_RARITIES = [1, 2, 3, 4, 5];
export const DEFAULT_PORTAL_ONLY = true;

export class GameRules {
	max_guesses: number;
	series: string[];
	rarities: number[];
	portal_only: boolean;
	constructor() {
		this.max_guesses = DEFAULT_GUESSES;
		this.series = DEFAULT_SERIES;
		this.rarities = DEFAULT_RARITIES;
		this.portal_only = DEFAULT_PORTAL_ONLY;
	}
}

type GameProps = {
	rules: GameRules;
	solution: string;
	guesses: string[];
	setGuesses: (guesses: string[]) => void;
	solveState: number;
	setSolveState: (solveState: number) => void;
	gameTime?: Date;
	onGameEnd?: (solveState: number) => void;
};

export const Game = (props: GameProps) => {
	const { roster } = React.useContext(WorfleContext);
	const { rules, solution, guesses, setGuesses, solveState, setSolveState } = props;

	const mysteryCrew = React.useMemo<IRosterCrew | undefined>(() => {
		return roster.find(crew => crew.symbol === solution);
	}, [solution]);

	const evaluatedGuesses = React.useMemo<IEvaluatedGuess[]>(() => {
		const evaluatedGuesses: IEvaluatedGuess[] = [];
		if (mysteryCrew) {
			guesses.forEach(guess => {
				const guessedCrew: IRosterCrew | undefined = roster.find(crew => crew.symbol === guess);
				if (guessedCrew) evaluatedGuesses.push(evaluateGuess(guessedCrew, mysteryCrew));
			});
		}
		return evaluatedGuesses;
	}, [mysteryCrew, guesses]);

	if (!mysteryCrew) return <></>;

	return (
		<React.Fragment>
			<GuessTable
				rules={rules}
				solveState={solveState}
				mysteryCrew={mysteryCrew}
				evaluatedGuesses={evaluatedGuesses}
			/>
			{solveState === SolveState.Unsolved && (
				<GuessPicker
					rules={rules}
					evaluatedGuesses={evaluatedGuesses}
					setSelectedCrew={handleCrewSelect}
				/>
			)}
			{renderShare()}
		</React.Fragment>
	);

	function renderShare(): JSX.Element {
		if (solveState === SolveState.Unsolved) return <></>;
		if (!props.gameTime) return <></>;

		const formatEvaluation = (evaluation: number) => {
			if (evaluation === EvaluationState.Exact)
				return '🟩';
			else if (evaluation === EvaluationState.Adjacent)
				return '🟨';
			return '⬜';
		};

		const formatGrid = () => {
			const shortId = `${(props.gameTime?.getUTCMonth() ?? 0)+1}/${(props.gameTime?.getUTCDate() ?? 1)}`;
			let output = solveState === SolveState.Winner ? `I solved ${GAME_NAME} ${shortId} in ${guesses.length}!` : `${GAME_NAME} ${shortId} stumped me!`;
			output += `\n${GAME_URL}`;
			evaluatedGuesses.forEach(evaluatedGuess => {
				output += '\n';
				['variantEval', 'seriesEval', 'rarityEval'].forEach(evaluation => {
					output += formatEvaluation(evaluatedGuess[evaluation]);
				});
				[0, 1, 2].forEach(idx => {
					output += formatEvaluation(evaluatedGuess.skillsEval[idx]);
				});
			});
			navigator.clipboard.writeText(output);
		};

		return (
			<div style={{ marginTop: '2em' }}>
				<Popup
					content='Copied!'
					on='click'
					position='right center'
					size='tiny'
					trigger={
						<Button icon='clipboard check' content='Copy results to clipboard' onClick={() => formatGrid()} />
					}
				/>
			</div>
		);
	}

	function handleCrewSelect(symbol: string): void {
		if (symbol === '' || guesses.includes(symbol)) return;
		guesses.push(symbol);
		setGuesses([...guesses]);
		if (guesses.includes(solution))
			endGame(SolveState.Winner);
		else if (guesses.length >= rules.max_guesses)
			endGame(SolveState.Loser);
	}

	function endGame(solveState: number): void {
		setSolveState(solveState);
		if (props.onGameEnd) props.onGameEnd(solveState);
	}

	function evaluateGuess(guessedCrew: IRosterCrew, mysteryCrew: IRosterCrew): IEvaluatedGuess {
		const evaluateVariant = (symbol: string, variants: string[]) => {
			if (mysteryCrew.symbol === symbol)
				return EvaluationState.Exact;
			else {
				let hasVariant: boolean = false;
				mysteryCrew.gamified_variants.forEach(variant => {
					if (variants.includes(variant)) hasVariant = true;
				});
				if (hasVariant) return EvaluationState.Adjacent;
			}
			return EvaluationState.Wrong;
		};

		const evaluateSeries = (series: string) => {
			if (mysteryCrew.gamified_series === series)
				return EvaluationState.Exact;
			else if (getEraBySeries(mysteryCrew.gamified_series) === getEraBySeries(series))
				return EvaluationState.Adjacent;
			return EvaluationState.Wrong;
		};

		const evaluateRarity = (rarity: number) => {
			if (mysteryCrew.max_rarity === rarity)
				return EvaluationState.Exact;
			else if (mysteryCrew.max_rarity === rarity - 1 || mysteryCrew.max_rarity === rarity + 1)
				return EvaluationState.Adjacent;
			return EvaluationState.Wrong;
		};

		const evaluateSkill = (skill_order: string[], index: number) => {
			if (index > skill_order.length) {
				if (index > mysteryCrew.skill_order.length)
					return EvaluationState.Exact;
			}
			else {
				if (skill_order[index] === mysteryCrew.skill_order[index])
					return EvaluationState.Exact;
				else if (mysteryCrew && mysteryCrew.skill_order.includes(skill_order[index]))
					return EvaluationState.Adjacent;
			}
			return EvaluationState.Wrong;
		};

		const evaluateTraits = (traits: string[]) => {
			const matches: string[] = [];
			traits.forEach(trait => {
				if (mysteryCrew.gamified_traits.includes(trait) && !matches.includes(trait))
					matches.push(trait);
			});
			return matches;
		};

		return {
			crew: guessedCrew,
			crewEval: guessedCrew.symbol === solution ? EvaluationState.Exact : EvaluationState.Wrong,
			variantEval: evaluateVariant(guessedCrew.symbol, guessedCrew.gamified_variants),
			seriesEval: evaluateSeries(guessedCrew.gamified_series),
			rarityEval: evaluateRarity(guessedCrew.max_rarity),
			skillsEval: [0, 1, 2].map(index => evaluateSkill(guessedCrew.skill_order, index)),
			matching_traits: evaluateTraits(guessedCrew.gamified_traits)
		};
	}
};

export function getEraBySeries(series: string): number {
	return SERIES_ERAS.find(seriesEra => seriesEra.series === series)?.era ?? -1;
}

export function getTraitType(trait: string, variantMap: IVariantMap): TTraitType {
	let type: TTraitType = 'trait';
	if (USABLE_HIDDEN_TRAITS.includes(trait)) type = 'hidden_trait';
	if (USABLE_COLLECTIONS.includes(trait)) type = 'collection';
	if (!!variantMap[trait]) type = 'variant';
	return type;
}

export function getTraitName(trait: string, variantMap: IVariantMap, traitNames: TraitNames, type?: TTraitType): string {
	type ??= getTraitType(trait, variantMap);
	let name: string = trait;
	switch (type) {
		case 'trait':
			name = traitNames[trait];
			break;
		case 'variant':
			name = variantMap[trait].display_name;
			break;
	}
	return name;
}
