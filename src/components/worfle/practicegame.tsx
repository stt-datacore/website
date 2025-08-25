import React from 'react';
import {
	Button,
	Checkbox,
	Dropdown,
	DropdownItemProps,
	Form,
	Icon,
	Modal
} from 'semantic-ui-react';

import { useStateWithStorage } from '../../utils/storage';

import { IDeduction, IRosterCrew, SolveState, THintGroup } from './model';
import { SERIES_ERAS } from './config';
import { WorfleContext } from './context';
import { DEFAULT_GUESSES, DEFAULT_PORTAL_ONLY, DEFAULT_RARITIES, DEFAULT_SERIES, Game, GameRules } from './game';

export const PracticeGame = () => {
	const { roster } = React.useContext(WorfleContext);
	const [rules, setRules] = useStateWithStorage<GameRules>('datalore/practiceRules', new GameRules());
	const [solution, setSolution] = useStateWithStorage<string>('datalore/practiceSolution', '');
	const [guesses, setGuesses] = useStateWithStorage<string[]>('datalore/practiceGuesses', []);
	const [hints, setHints] = useStateWithStorage<IDeduction[]>('datalore/practiceHints', []);
	const [hintGroups, setHintGroups] = useStateWithStorage<THintGroup[]>('datalore/practiceGroups', []);
	const [solveState, setSolveState] = useStateWithStorage<SolveState>('datalore/practiceSolveState', SolveState.Unsolved);

	if (!solution) {
		createPracticeGame();
		return <></>;
	}

	return (
		<React.Fragment>
			<p>
				You can play as many practice games as you like. Statistics for practice games will not be recorded.
				<CustomRules rules={rules} changeRules={changePracticeRules} />
			</p>
			<Game
				rules={rules} solution={solution}
				guesses={guesses} setGuesses={setGuesses}
				hints={hints} setHints={setHints}
				hintGroups={hintGroups} setHintGroups={setHintGroups}
				solveState={solveState} setSolveState={setSolveState}
			/>
			<div style={{ marginTop: '2em' }}>
				{solveState === SolveState.Unsolved && (
					<Button /* Give Up */
						content='Give Up'
						onClick={() => resignPracticeGame()}
					/>
				)}
				{solveState !== SolveState.Unsolved && (
					<Button /* Play Again */
						content='Play Again'
						onClick={() => createPracticeGame()}
					/>
				)}
			</div>
		</React.Fragment>
	);

	function changePracticeRules(newRules: GameRules): void {
		setRules(newRules);
		setSolution('');
	}

	function createPracticeGame(): void {
		// Viable as solution for practice game only if:
		//	1) Crew matches conditions of all defined rules
		const testViability = (index: number) => {
			const testCrew: IRosterCrew = roster[index];
			return rules.series.includes(testCrew.gamified_series)
				&& rules.rarities.includes(testCrew.max_rarity)
				&& (!rules.portal_only || testCrew.in_portal)
		};

		let randomIndex: number = Math.floor(Math.random() * roster.length);
		let crewIsViable: boolean = testViability(randomIndex);
		while (!crewIsViable) {
			randomIndex = Math.floor(Math.random() * roster.length);
			crewIsViable = testViability(randomIndex);
		}

		setSolution(roster[randomIndex].symbol);
		setGuesses([]);
		setHints([]);
		setHintGroups([]);
		setSolveState(SolveState.Unsolved);
	}

	function resignPracticeGame(): void {
		setSolveState(SolveState.Loser);
	}
};

type CustomRulesProps = {
	rules: GameRules;
	changeRules: (newRules: GameRules) => void;
};

const CustomRules = (props: CustomRulesProps) => {
	const { roster } = React.useContext(WorfleContext);
	const [modalIsOpen, setModalIsOpen] = React.useState<boolean>(false);
	const [maxGuesses, setMaxGuesses] = React.useState<number>(props.rules.max_guesses);
	const [series, setSeries] = React.useState<string[]>(props.rules.series);
	const [rarities, setRarities] = React.useState<number[]>(props.rules.rarities);
	const [portalOnly, setPortalOnly] = React.useState<boolean>(props.rules.portal_only);

	const possibleCount = React.useMemo(() => {
		return roster.filter(crew =>
			crew.gamified_series !== 'n/a'
				&& series.includes(crew.gamified_series)
				&& rarities.includes(crew.max_rarity)
				&& (!portalOnly || crew.in_portal)
		).length;
	}, [series, rarities, portalOnly]);

	const guessOptions: DropdownItemProps[] = [];
	for (let i = 1; i <= 20; i++) {
		guessOptions.push(
			{ key: i, value: i, text: i }
		);
	}

	const seriesOptions: DropdownItemProps[] = SERIES_ERAS.map(seriesEra => {
		return {
			key: seriesEra.series,
			value: seriesEra.series,
			text: seriesEra.title
		};
	});

	const rarityOptions: DropdownItemProps[] = [
		{ key: '1*', value: 1, text: '1* Common' },
		{ key: '2*', value: 2, text: '2* Uncommon' },
		{ key: '3*', value: 3, text: '3* Rare' },
		{ key: '4*', value: 4, text: '4* Super Rare' },
		{ key: '5*', value: 5, text: '5* Legendary' }
	];

	const isDefault: boolean = maxGuesses === DEFAULT_GUESSES
		&& series.length === DEFAULT_SERIES.length
		&& rarities.length === DEFAULT_RARITIES.length
		&& portalOnly === DEFAULT_PORTAL_ONLY;
	const isDirty: boolean = maxGuesses !== props.rules.max_guesses
		|| series.length !== props.rules.series.length
		|| rarities.length !== props.rules.rarities.length
		|| portalOnly !== props.rules.portal_only;
	const isValid: boolean = possibleCount > 0;

	return (
		<Modal
			open={modalIsOpen}
			onClose={() => { revertRules(); setModalIsOpen(false); }}
			onOpen={() => setModalIsOpen(true)}
			trigger={renderTrigger()}
			size='tiny'
		>
			<Modal.Header /* Custom rules */>
				Custom rules
				<span style={{ paddingLeft: '1em', fontSize: '.9em', fontWeight: 'normal' }}>
					(Possible solutions: {possibleCount})
				</span>
			</Modal.Header>
			<Modal.Content>
				<Form>
					<Form.Field	/* Max guesses: */
						control={Dropdown}
						label='Max guesses:'
						placeholder='Select a number'
						inline selection
						options={guessOptions}
						value={maxGuesses}
						onChange={(e, { value }) => setMaxGuesses(value as number)}
					/>
					<Form.Field	/* Include crew by series: */
						control={Dropdown}
						label='Include crew by series:'
						placeholder='Select at least 1 series'
						selection multiple fluid clearable closeOnChange
						options={seriesOptions}
						value={series}
						onChange={(e, { value }) => setSeries(value as string[])}
					/>
					<Form.Field	/* Include crew by rarity: */
						control={Dropdown}
						label='Include crew by rarity:'
						placeholder='Select at least 1 rarity'
						selection multiple fluid clearable closeOnChange
						options={rarityOptions}
						value={rarities}
						onChange={(e, { value }) => setRarities(value as number[])}
					/>
					<Form.Field	/* Only use crew in portal */
						control={Checkbox}
						label='Only use crew in portal'
						checked={portalOnly}
						onChange={(e, { checked }) => setPortalOnly(checked)}
					/>
				</Form>
			</Modal.Content>
			<Modal.Actions>
				{!isDefault && (
					<Button /* Reset */
						content='Reset'
						onClick={() => resetRules()}
					/>
				)}
				{isDirty && (
					<Button /* New Practice Game */
						content='New Practice Game'
						disabled={!isValid ? true : undefined}
						onClick={() => applyRules()}
					/>
				)}
				{!isDirty && (
					<Button /* Close */
						content='Close'
						onClick={() => setModalIsOpen(false)}
					/>
				)}
			</Modal.Actions>
		</Modal>
	);

	function renderTrigger(): JSX.Element {
		return (
			<span style={{ paddingLeft: '1em' }}>
				<Button compact>
					{!isDefault && (
						<span /* Use custom rules */>
							<Icon name='check' color='green' /> Use custom rules
						</span>
					)}
					{isDefault && (
						<span /* Use custom rules... */>
							Use custom rules...
						</span>
					)}
				</Button>
			</span>
		);
	}

	function revertRules(): void {
		setMaxGuesses(props.rules.max_guesses);
		setSeries(props.rules.series);
		setRarities(props.rules.rarities);
		setPortalOnly(props.rules.portal_only);
	}

	function resetRules(): void {
		setMaxGuesses(DEFAULT_GUESSES);
		setSeries(DEFAULT_SERIES);
		setRarities(DEFAULT_RARITIES);
		setPortalOnly(DEFAULT_PORTAL_ONLY);
	}

	function applyRules(): void {
		if (!isValid) return;
		const newRules: GameRules = new GameRules();
		newRules.max_guesses = maxGuesses;
		newRules.series = series;
		newRules.rarities = rarities;
		newRules.portal_only = portalOnly;
		props.changeRules(newRules);
		setModalIsOpen(false);
	}
};
