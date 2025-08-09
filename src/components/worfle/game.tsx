import React from 'react';
import { InView } from 'react-intersection-observer';
import {
	Button,
	Grid,
	Icon,
	Input,
	Message,
	Modal,
	Popup,
	SemanticCOLORS
} from 'semantic-ui-react';

import CONFIG from '../CONFIG';

import { EvaluationState, IEvaluatedGuess, IRosterCrew, SolveState } from './model';
import { WorfleContext } from './context';
import { GuessTable } from './guesstable';

const GAME_NAME = 'Worfle';
const GAME_URL = 'https://datacore.app/crewchallenge';

export const DEFAULT_GUESSES = 8;
export const DEFAULT_SERIES = CONFIG.SERIES;
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
				solveState={solveState}
				mysteryCrew={mysteryCrew}
				evaluatedGuesses={evaluatedGuesses}
			/>
			{renderInput()}
			{renderShare()}
		</React.Fragment>
	);

	function renderInput(): JSX.Element {
		if (solveState !== SolveState.Unsolved) return <></>;
		return (
			<div style={{ margin: '1em 0' }}>
				<CrewPicker rules={rules} guesses={guesses} handleSelect={handleCrewSelect} />
			</div>
		);
	}

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
				mysteryCrew.usable_variants.forEach(variant => {
					if (variants.includes(variant)) hasVariant = true;
				});
				if (hasVariant) return EvaluationState.Adjacent;
			}
			return EvaluationState.Wrong;
		};

		const evaluateSeries = (series: string) => {
			const getEra = (series: string) => {
				if (series === 'tos' || series === 'tas') return 1;
				if (series === 'tng' || series === 'ds9' || series === 'voy' || series === 'ent') return 2;
				if (series === 'original') return 0;
				if (series === '') return -1;
				return 3;
			};

			if (mysteryCrew.series === series)
				return EvaluationState.Exact;
			else if (getEra(mysteryCrew.series ?? "") === getEra(series))
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
				if (mysteryCrew?.usable_traits.includes(trait) && !matches.includes(trait))
					matches.push(trait);
			});
			return matches;
		};

		return {
			crew: guessedCrew,
			crewEval: guessedCrew.symbol === solution ? EvaluationState.Exact : EvaluationState.Wrong,
			variantEval: evaluateVariant(guessedCrew.symbol, guessedCrew.usable_variants),
			seriesEval: evaluateSeries(guessedCrew.series ?? ''),
			rarityEval: evaluateRarity(guessedCrew.max_rarity),
			skillsEval: [0, 1, 2].map(index => evaluateSkill(guessedCrew.skill_order, index)),
			matching_traits: evaluateTraits(guessedCrew.usable_traits)
		};
	}
};

type CrewPickerProps = {
	rules: GameRules;
	guesses: string[];
	handleSelect: (value: string) => void;
};

const CrewPicker = (props: CrewPickerProps) => {
	const { roster } = React.useContext(WorfleContext);
	const { rules, guesses, handleSelect } = props;

	const [modalIsOpen, setModalIsOpen] = React.useState(false);
	const [searchFilter, setSearchFilter] = React.useState('');
	const [paginationPage, setPaginationPage] = React.useState(1);
	const [selectedCrew, setSelectedCrew] = React.useState<IRosterCrew | undefined>(undefined);
	const [showHints, setShowHints] = React.useState(true);

	const guessesLeft = rules.max_guesses - guesses.length;

	const inputRef = React.createRef<Input>();

	React.useEffect(() => {
		if (modalIsOpen) inputRef.current?.focus();
	}, [modalIsOpen]);

	return (
		<Modal
			open={modalIsOpen}
			onClose={() => setModalIsOpen(false)}
			onOpen={() => setModalIsOpen(true)}
			trigger={renderButton()}
			size='tiny'
			centered={false}
			closeIcon
		>
			<Modal.Header>
				<Input ref={inputRef}
					size='mini' fluid
					iconPosition='left'
					placeholder='Search for crew by name'
					value={searchFilter}
					onChange={(e, { value }) => {
							setSearchFilter(value);
							setPaginationPage(1);
							setSelectedCrew(undefined);
							}}>
						<input />
						<Icon name='search' />
						<Button icon onClick={() => {
							setSearchFilter('');
							setPaginationPage(1);
							setSelectedCrew(undefined);
							inputRef.current?.focus();
							}} >
							<Icon name='delete' />
						</Button>
				</Input>
			</Modal.Header>
			<Modal.Content scrolling>
				{renderGrid()}
			</Modal.Content>
			<Modal.Actions>
				<Button content={`${showHints ? 'Show' : 'Hide'} hints`} onClick={() => setShowHints(!showHints) } />
				{selectedCrew && (
					<Button color='blue'
						content={`Guess ${selectedCrew.name}`}
						onClick={() => confirmGuess(selectedCrew.symbol)} />
				)}
				{!selectedCrew && (
					<Button content='Close' onClick={() => setModalIsOpen(false)} />
				)}
			</Modal.Actions>
		</Modal>
	);

	function renderButton(): JSX.Element {
		return (
			<Button fluid size='big' color='blue'>
				<Icon name='zoom-in' />
				Guess Crew
				<span style={{ fontSize: '.95em', fontWeight: 'normal', paddingLeft: '1em' }}>
					({guessesLeft} guess{guessesLeft !== 1 ? 'es' : ''} remaining)
				</span>
			</Button>
		);
	}

	function renderGrid(): JSX.Element {
		if (!modalIsOpen) return (<></>);

		let data = roster.slice();

		// if (rules.excludedCrew.length > 0)
		// 	data = data.filter(crew => !rules.excludedCrew.includes(crew.symbol));

		// Filtering
		if (searchFilter !== '') {
			const filter = (input: string) => input.toLowerCase().indexOf(searchFilter.toLowerCase()) >= 0;
			data = data.filter(crew => filter(crew.name));
		}
		if (data.length === 0) return (
			<Message>
				<p>No crew names match your current search.</p>
				<p>Only crew that are currently <b>available in the time portal</b> will be used as mystery crew and valid guesses.</p>
			</Message>
		);

		// Pagination
		const itemsPerPage = 24, itemsToShow = itemsPerPage*paginationPage;

		return (
			<div>
				<Grid doubling columns={3} textAlign='center'>
					{data.slice(0, itemsToShow).map(crew => (
						<Grid.Column key={crew.symbol} style={{ cursor: 'pointer' }}
							onClick={() => { if (!guesses.includes(crew.symbol)) setSelectedCrew(crew); }}
							onDoubleClick={() => { if (!guesses.includes(crew.symbol)) confirmGuess(crew.symbol); }}
							color={selectedCrew?.symbol === crew.symbol ? 'blue' as SemanticCOLORS : undefined}
						>
							<img width={48} height={48} src={`${process.env.GATSBY_ASSETS_URL}${crew.imageUrlPortrait}`} />
							<div>
								{guesses.includes(crew.symbol) && (<Icon name='x' color='red' />)}
								{crew.name}
							</div>
							{!showHints && (
								<div>({[crew.series?.toUpperCase(), `${crew.max_rarity}*`, `${Object.keys(crew.base_skills).length}`].join(', ')})</div>
							)}
						</Grid.Column>
					))}
				</Grid>
				{itemsToShow < data.length && (
					<InView as='div' style={{ margin: '2em 0', textAlign: 'center' }}
						onChange={(inView, entry) => { if (inView) setPaginationPage(prevState => prevState + 1); }}
					>
						<Icon loading name='spinner' /> Loading...
					</InView>
				)}
				{itemsToShow >= data.length && (
					<Message>Tip: Double-tap a crew to make your guess more quickly.</Message>
				)}
			</div>
		);
	}

	function confirmGuess(symbol: string): void {
		handleSelect(symbol);
		setModalIsOpen(false);
		setSelectedCrew(undefined);
	}
};
