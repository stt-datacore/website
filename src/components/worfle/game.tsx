import React from 'react';
import {
	SemanticICONS
} from 'semantic-ui-react';

import CONFIG from '../CONFIG';

import { EvaluationState, IDeduction, IDeductionOption, IEvaluatedGuess, IRosterCrew, SolveState, TAssertion, TDeductionField, THintGroup } from './model';
import { ERA_NAMES, SERIES_ERAS } from './config';
import { GameContext, IGameContext, WorfleContext } from './context';
import { GuessPicker } from './guesspicker';
import { GuessTable } from './guesstable';

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
	hints: IDeduction[];
	setHints: (hints: IDeduction[]) => void;
	hintGroups: THintGroup[];
	setHintGroups: (hintGroups: THintGroup[]) => void;
	solveState: number;
	setSolveState: (solveState: number) => void;
	onGameEnd?: (solveState: number) => void;
	renderShare?: (evaluatedGuesses: IEvaluatedGuess[]) => React.JSX.Element;
};

export const Game = (props: GameProps) => {
	const { roster, traitMap } = React.useContext(WorfleContext);
	const { rules, solution, guesses, setGuesses, hints, setHints, hintGroups, setHintGroups, solveState, setSolveState } = props;

	const [evaluatedGuesses, setEvaluatedGuesses] = React.useState<IEvaluatedGuess[]>([]);
	const [deductions, setDeductions] = React.useState<IDeduction[]>([]);

	// Initialize options for ALL possible deductions for game rules
	const deductionOptions = React.useMemo(() => {
		return getDeductionOptions();
	}, [rules]);

	const mysteryCrew = React.useMemo<IRosterCrew | undefined>(() => {
		return roster.find(crew => crew.symbol === solution);
	}, [solution]);

	// Evaluate guesses
	React.useEffect(() => {
		const evaluatedGuesses: IEvaluatedGuess[] = [];
		if (mysteryCrew) {
			guesses.forEach(guess => {
				const guessedCrew: IRosterCrew | undefined = roster.find(crew => crew.symbol === guess);
				if (guessedCrew) evaluatedGuesses.push(evaluateGuess(guessedCrew, mysteryCrew));
			});
		}
		const deductions: IDeduction[] = getDeductions(evaluatedGuesses);
		setEvaluatedGuesses(evaluatedGuesses);
		setDeductions(deductions);
	}, [mysteryCrew, guesses]);

	// Automatically add relevant hints
	React.useEffect(() => {
		if (solveState === SolveState.Unsolved) deduceHints();
	}, [deductions, hintGroups]);

	if (!mysteryCrew)
		return <></>;

	const gameData: IGameContext = {
		rules,
		deductionOptions,
		mysteryCrew,
		evaluatedGuesses,
		deductions,
		hints,
		hintGroups,
		solveState
	};

	return (
		<GameContext.Provider value={gameData}>
			<GuessTable />
			{solveState === SolveState.Unsolved && (
				<GuessPicker
					readyToGuess={evaluatedGuesses.length === guesses.length}
					setSelectedCrew={handleCrewSelect}
					setSelectedHints={handleHintsSelect}
				/>
			)}
			{solveState !== SolveState.Unsolved && props.renderShare && props.renderShare(evaluatedGuesses)}
		</GameContext.Provider>
	);

	function getDeductionOptions(): IDeductionOption[] {
		const options: IDeductionOption[] = [];
		Object.keys(ERA_NAMES).forEach(era => {
			options.push({
				id: options.length + 1,
				name: ERA_NAMES[era],
				icon: 'globe',
				field: 'era',
				value: era
			});
		});
		rules.series.forEach(series => {
			options.push({
				id: options.length + 1,
				name: `${SERIES_ERAS.find(seriesEra => seriesEra.series === series)!.title}`,
				icon: 'tv',
				field: 'series',
				value: series
			});
		});
		rules.rarities.forEach(rarity => {
			options.push({
				id: options.length + 1,
				name: `${rarity}*`,
				icon: 'star',
				field: 'rarity',
				value: rarity
			});
		});
		Object.keys(CONFIG.SKILLS).forEach(skill => {
			options.push({
				id: options.length + 1,
				name: `${CONFIG.SKILLS[skill]}`,
				iconUrl: `${process.env.GATSBY_ASSETS_URL}atlas/icon_${skill}.png`,
				field: 'skills',
				value: skill
			});
		});
		Object.keys(traitMap).forEach(trait => {
			if (traitMap[trait].crew.length > 1) {
				let icon: SemanticICONS | undefined;
				if (trait === 'female') icon = 'venus';
				if (trait === 'male') icon = 'mars';
				options.push({
					id: options.length + 1,
					name: traitMap[trait].display_name,
					icon,
					iconUrl: !icon ? traitMap[trait].iconUrl : undefined,
					field: 'traits',
					value: trait
				});
			}
		});
		return options;
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

	function assert(deductions: IDeduction[], field: TDeductionField, value: string | number, assertion: TAssertion): void {
		const existing: IDeduction | undefined = deductions.find(deduction =>
			deduction.field === field && deduction.value === value
		);
		if (existing) {
			existing.assertion = assertion;
		}
		else {
			deductions.push({ field, value, assertion });
		}
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

	function getDeductions(evaluatedGuesses: IEvaluatedGuess[]): IDeduction[] {
		let deductions: IDeduction[] = [];
		evaluatedGuesses.forEach(evaluatedGuess => {
			if (evaluatedGuess.seriesEval === EvaluationState.Exact) {
				assert(deductions, 'series', evaluatedGuess.crew.gamified_series, 'required');
			}
			else if (evaluatedGuess.seriesEval === EvaluationState.Adjacent) {
				const adjacentSeries: string = evaluatedGuess.crew.gamified_series;
				const mysteryEra: string = getEraBySeries(adjacentSeries);
				assert(deductions, 'era', mysteryEra, 'required');
				SERIES_ERAS.filter(seriesEra => seriesEra.series === adjacentSeries || seriesEra.era !== mysteryEra).forEach(seriesEra => {
					if (seriesEra.era !== mysteryEra) assert(deductions, 'era', seriesEra.era, 'rejected');
					assert(deductions, 'series', seriesEra.series, 'rejected');
				});
			}
			else if (evaluatedGuess.seriesEval === EvaluationState.Wrong) {
				const wrongSeries: string = evaluatedGuess.crew.gamified_series;
				const wrongEra: string = getEraBySeries(wrongSeries);
				assert(deductions, 'era', wrongEra, 'rejected');
				// SERIES_ERAS.filter(seriesEra => seriesEra.era === wrongEra).forEach(seriesEra => {
				// 	assert(deductions, 'series', seriesEra.series, 'rejected');
				// });
			}

			if (evaluatedGuess.rarityEval === EvaluationState.Exact) {
				assert(deductions, 'rarity', evaluatedGuess.crew.max_rarity, 'required');
			}
			else if (evaluatedGuess.rarityEval === EvaluationState.Adjacent) {
				const adjacentRarity: number = evaluatedGuess.crew.max_rarity;
				rules.rarities.forEach(rarity => {
					if (![adjacentRarity - 1, adjacentRarity + 1].includes(rarity))
						assert(deductions, 'rarity', rarity, 'rejected');
				});
			}
			else if (evaluatedGuess.rarityEval === EvaluationState.Wrong) {
				const wrongRarity: number = evaluatedGuess.crew.max_rarity;
				rules.rarities.forEach(rarity => {
					if ([wrongRarity - 1, wrongRarity, wrongRarity + 1].includes(rarity))
						assert(deductions, 'rarity', rarity, 'rejected');
				});
			}

			[0, 1, 2].forEach(index => {
				if (evaluatedGuess.crew.skill_order.length > index) {
					const skill: string = evaluatedGuess.crew.skill_order[index];
					if (evaluatedGuess.skillsEval[index] === EvaluationState.Wrong) {
						assert(deductions, 'skills', skill, 'rejected');
					}
					else {
						assert(deductions, 'skills', skill, 'required');
					}
				}
			});

			evaluatedGuess.crew.gamified_traits.forEach(trait => {
				if (evaluatedGuess.matching_traits.includes(trait)) {
					assert(deductions, 'traits', trait, 'required');
				}
				else {
					assert(deductions, 'traits', trait, 'rejected');
				}
			});
		});

		// If all but 1 era/series/rarity are rejected, then the remaining option must be the solution
		processEliminations(deductions, 'era', Object.keys(ERA_NAMES));
		processEliminations(deductions, 'series', rules.series);
		processEliminations(deductions, 'rarity', rules.rarities);

		// If we know required era/series/rarity, we can remove rejected deductions of the same field
		deductions = simplifyAssertions(deductions, 'era');
		deductions = simplifyAssertions(deductions, 'series');
		deductions = simplifyAssertions(deductions, 'rarity');

		// If we know required series, we can remove all era deductions
		if (deductions.find(deduction => deduction.field === 'series' && deduction.assertion === 'required')) {
			deductions = deductions.filter(deduction => deduction.field !== 'era');
		}
		// Otherwise if we know required era, we can remove all series deductions that don't match required era
		else if (deductions.find(deduction => deduction.field === 'era' && deduction.assertion === 'required')) {
			const requiredEra: IDeduction | undefined = deductions.find(deduction =>
				deduction.field === 'era' && deduction.assertion === 'required'
			);
			if (requiredEra) {
				deductions = deductions.filter(deduction =>
					deduction.field !== 'series' || getEraBySeries(deduction.value as string) === requiredEra.value as string
				);
			}
		}

		return deductions;
	}

	function processEliminations(deductions: IDeduction[], field: TDeductionField, options: (string | number)[]): void {
		if (!deductions.find(deduction => deduction.field === field && deduction.assertion === 'required')) {
			const wrong: (string | number)[] = deductions.filter(deduction =>
				deduction.field === field
			).map(deduction => deduction.value);
			if (options.length - wrong.length === 1) {
				let correct: string | number | undefined;
				options.forEach(value => {
					if (!wrong.includes(value))
						correct = value;
				});
				if (correct) assert(deductions, field, correct, 'required');
			}
		}
	}

	function simplifyAssertions(deductions: IDeduction[], field: TDeductionField): IDeduction[] {
		if (deductions.find(deduction => deduction.field === field && deduction.assertion === 'required')) {
			deductions = deductions.filter(deduction =>
				deduction.field !== field || deduction.assertion === 'required'
			);
		}
		return deductions;
	}

	function handleHintsSelect(newHints: IDeduction[], hintGroups: THintGroup[]): void {
		const updatedHints: IDeduction[] = hints.slice();
		newHints.forEach(hint => {
			if (!updatedHints.find(existing =>
				existing.field === hint.field && existing.value === hint.value
			))
				updatedHints.push(hint);
		});
		setHints(updatedHints);
		setHintGroups(hintGroups);
	}

	function deduceHints(): void {
		let updatedHints: IDeduction[] = hints.slice();
		if (hintGroups.includes('required')) {
			deductions.filter(deduction => deduction.assertion === 'required').forEach(deduction => {
				assert(updatedHints, deduction.field, deduction.value, deduction.assertion);
			});
		}
		if (hintGroups.includes('series')) {
			deductions.filter(deduction => ['era', 'series'].includes(deduction.field)).forEach(deduction => {
				assert(updatedHints, deduction.field, deduction.value, deduction.assertion);
			});
		}
		(['rarity', 'skills', 'traits'] as THintGroup[]).forEach(field => {
			if (hintGroups.includes(field)) {
				deductions.filter(deduction => deduction.field === field).forEach(deduction => {
					assert(updatedHints, deduction.field, deduction.value, deduction.assertion);
				});
			}
		});
		setHints(updatedHints);
	}
};

export function getEraBySeries(series: string): string {
	return SERIES_ERAS.find(seriesEra => seriesEra.series === series)!.era;
}
