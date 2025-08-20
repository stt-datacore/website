import React from 'react';
import {
	SemanticICONS
} from 'semantic-ui-react';

import { TraitNames } from '../../model/traits';
import { GlobalContext } from '../../context/globalcontext';

import CONFIG from '../CONFIG';

import { EvaluationState, IDeduction, IEvaluatedGuess, IRosterCrew, ITraitOption, IVariantMap, SolveState, TAssertion, TEvaluationField, TTraitType } from './model';
import { SERIES_ERAS, USABLE_COLLECTIONS, USABLE_HIDDEN_TRAITS } from './config';
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
	deductionsUsed: IDeduction[];
	setDeductionsUsed: (deductionsUsed: IDeduction[]) => void;
	solveState: number;
	setSolveState: (solveState: number) => void;
	onGameEnd?: (solveState: number) => void;
	renderShare?: (evaluatedGuesses: IEvaluatedGuess[]) => JSX.Element;
};

export const Game = (props: GameProps) => {
	const { TRAIT_NAMES } = React.useContext(GlobalContext).localized;
	const { roster, traitMap, variantMap } = React.useContext(WorfleContext);
	const { rules, solution, guesses, setGuesses, deductionsUsed, setDeductionsUsed, solveState, setSolveState } = props;

	const [evaluatedGuesses, setEvaluatedGuesses] = React.useState<IEvaluatedGuess[]>([]);
	const [deductions, setDeductions] = React.useState<IDeduction[]>([]);

	const traitOptions = React.useMemo(() => {
		return getTraitOptions();
	}, [rules]);

	const mysteryCrew = React.useMemo<IRosterCrew | undefined>(() => {
		return roster.find(crew => crew.symbol === solution);
	}, [solution]);

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

	if (!mysteryCrew) return <></>;

	const gameData: IGameContext = {
		rules,
		traitOptions,
		mysteryCrew,
		evaluatedGuesses,
		deductions,
		deductionsUsed,
		solveState
	};

	return (
		<GameContext.Provider value={gameData}>
			<GuessTable />
			{solveState === SolveState.Unsolved && (
				<GuessPicker
					setSelectedCrew={handleCrewSelect}
					useDeductions={useDeductions}
				/>
			)}
			{solveState !== SolveState.Unsolved && props.renderShare && props.renderShare(evaluatedGuesses)}
		</GameContext.Provider>
	);

	function getTraitOptions(): ITraitOption[] {
		const options: ITraitOption[] = [];
		rules.series.forEach(series => {
			options.push({
				id: options.length + 1,
				name: `   ${SERIES_ERAS.find(seriesEra => seriesEra.series === series)!.title}`,
				icon: 'tv',
				field: 'series',
				value: series
			});
		});
		rules.rarities.forEach(rarity => {
			options.push({
				id: options.length + 1,
				name: `  ${rarity}*`,
				icon: 'star',
				field: 'rarity',
				value: rarity
			});
		});
		Object.keys(CONFIG.SKILLS).forEach(skill => {
			options.push({
				id: options.length + 1,
				name: ` ${CONFIG.SKILLS[skill]}`,
				iconUrl: `${process.env.GATSBY_ASSETS_URL}atlas/icon_${skill}.png`,
				field: 'skills',
				value: skill
			});
		});
		Object.keys(traitMap).forEach(trait => {
			if (traitMap[trait].count > 1) {
				const type: TTraitType = traitMap[trait].type;
				let icon: SemanticICONS | undefined;
				if (trait === 'female') icon = 'venus';
				if (trait === 'male') icon = 'mars';
				options.push({
					id: options.length + 1,
					name: getTraitName(trait, variantMap, TRAIT_NAMES, type),
					icon,
					iconUrl: !icon ? getTraitIconUrl(trait, type) : undefined,
					field: 'traits',
					value: trait
				});
			}
		});
		return options;
	}

	function getTraitIconUrl(trait: string, type: TTraitType): string {
		let iconUrl: string = '';
		switch (type) {
			case 'collection':
				iconUrl = '/media/vault.png';
				break;
			case 'trait':
				iconUrl = `${process.env.GATSBY_ASSETS_URL}items_keystones_${trait}.png`;
				break;
			case 'variant':
				iconUrl = '/media/crew_icon.png';
				break;
		}
		return iconUrl;
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

	function assert(deductions: IDeduction[], field: TEvaluationField, value: string | number, assertion: TAssertion): void {
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

	function getDeductions(evaluatedGuesses: IEvaluatedGuess[]): IDeduction[] {
		const deductions: IDeduction[] = [];
		evaluatedGuesses.forEach(evaluatedGuess => {
			if (evaluatedGuess.seriesEval === EvaluationState.Exact) {
				assert(deductions, 'series', evaluatedGuess.crew.gamified_series, 'required');
			}
			else if (evaluatedGuess.seriesEval === EvaluationState.Adjacent) {
				const adjacentSeries: string = evaluatedGuess.crew.gamified_series;
				const mysteryEra: number = getEraBySeries(adjacentSeries);
				SERIES_ERAS.filter(seriesEra => seriesEra.series === adjacentSeries || seriesEra.era !== mysteryEra).forEach(seriesEra => {
					assert(deductions, 'series', seriesEra.series, 'rejected');
				});
			}
			else if (evaluatedGuess.seriesEval === EvaluationState.Wrong) {
				const wrongSeries: string = evaluatedGuess.crew.gamified_series;
				const wrongEra: number = getEraBySeries(wrongSeries);
				SERIES_ERAS.filter(seriesEra => seriesEra.era === wrongEra).forEach(seriesEra => {
					assert(deductions, 'series', seriesEra.series, 'rejected');
				});
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

		return deductions;
	}

	function getEraBySeries(series: string): number {
		return SERIES_ERAS.find(seriesEra => seriesEra.series === series)?.era ?? -1;
	}

	function useDeductions(deductions: IDeduction[]): void {
		const usedDeductions: IDeduction[] = deductionsUsed.slice();
		deductions.forEach(deduction => {
			if (!usedDeductions.find(existing =>
				existing.field === deduction.field && existing.value === deduction.value
			))
				usedDeductions.push(deduction);
		});
		setDeductionsUsed(usedDeductions);
	}
};

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
