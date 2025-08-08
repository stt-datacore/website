import React from 'react';
import {
	Button,
	Dropdown,
	Icon,
	Modal
} from 'semantic-ui-react';

import { useStateWithStorage } from '../../utils/storage';

import { SolveState } from './model';
import { PortalCrewContext } from './context';
import { DEFAULT_GUESSES, DEFAULT_RARITIES, DEFAULT_SERIES, Game, GameRules } from './game';

export const PracticeGame = () => {
	const portalCrew = React.useContext(PortalCrewContext);
	const [rules, setRules] = useStateWithStorage('datalore/practiceRules', newPracticeRules());
	const [solution, setSolution] = useStateWithStorage('datalore/practiceSolution', '');
	const [guesses, setGuesses] = useStateWithStorage('datalore/practiceGuesses', [] as string[]);
	const [solveState, setSolveState] = useStateWithStorage('datalore/practiceSolveState', SolveState.Unsolved);

	if (!solution) {
		createPracticeGame();
		return (<></>);
	}

	return (
		<React.Fragment>
			<p>
				You can play as many practice games as you like. Statistics for practice games will not be recorded.
				<CustomRules rules={rules} changeRules={changePracticeRules} />
			</p>
			<Game rules={rules} solution={solution}
				guesses={guesses} setGuesses={setGuesses}
				solveState={solveState} setSolveState={setSolveState} />
			<div style={{ marginTop: '2em' }}>
				{solveState === SolveState.Unsolved && <Button content='Give Up' onClick={() => resignPracticeGame()} />}
				{solveState !== SolveState.Unsolved && <Button content='Play Again' onClick={() => createPracticeGame()} />}
			</div>
		</React.Fragment>
	);

	function newPracticeRules(): GameRules {
		const newRules = new GameRules();
		newRules.series = DEFAULT_SERIES;
		newRules.rarities = DEFAULT_RARITIES;
		return newRules;
	}

	function changePracticeRules(newRules: GameRules): void {
		setRules(newRules);
		setSolution('');
	}

	function createPracticeGame(): void {
		let pool = portalCrew.slice();
		if (rules.excludedCrew.length > 0)
			pool = pool.filter(crew => !rules.excludedCrew.includes(crew.symbol));
		const randomIndex = Math.floor(Math.random()*pool.length);
		setSolution(pool[randomIndex].symbol);
		setGuesses([]);
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
	const portalCrew = React.useContext(PortalCrewContext);
	const [modalIsOpen, setModalIsOpen] = React.useState(false);
	const [guesses, setGuesses] = React.useState(props.rules.guesses);
	const [series, setSeries] = React.useState(props.rules.series);
	const [rarities, setRarities] = React.useState(props.rules.rarities);
	const [excludedCrew, setExcludedCrew] = React.useState<string[]>([]);

	React.useEffect(() => {
		const excludes = portalCrew.filter(crew => !series.includes(crew.series ?? "") || !rarities.includes(crew.max_rarity)).map(crew => crew.symbol);
		setExcludedCrew([...excludes ?? []]);
	}, [series, rarities]);

	const guessOptions = [] as { key: number, value: number, text: number }[];
	for (let i = 1; i <= 20; i++) {
		guessOptions.push(
			{ key: i, value: i, text: i }
		);
	}

	const seriesOptions = [
		{ key: 'tos', value: 'tos', text: 'The Original Series' },
		{ key: 'tas', value: 'tas', text: 'The Animated Series' },
		{ key: 'tng', value: 'tng', text: 'The Next Generation' },
		{ key: 'ds9', value: 'ds9', text: 'Deep Space Nine' },
		{ key: 'voy', value: 'voy', text: 'Voyager' },
		{ key: 'ent', value: 'ent', text: 'Enterprise' },
		{ key: 'dsc', value: 'dsc', text: 'Discovery' },
		{ key: 'pic', value: 'pic', text: 'Picard' },
		{ key: 'low', value: 'low', text: 'Lower Decks' },
		{ key: 'snw', value: 'snw', text: 'Strange New Worlds' },
		{ key: 'original', value: 'original', text: 'Timelines Originals' }
	];

	const rarityOptions = [
		{ key: '1*', value: 1, text: '1* Common' },
		{ key: '2*', value: 2, text: '2* Uncommon' },
		{ key: '3*', value: 3, text: '3* Rare' },
		{ key: '4*', value: 4, text: '4* Super Rare' },
		{ key: '5*', value: 5, text: '5* Legendary' }
	];

	const isDefault = guesses === DEFAULT_GUESSES && series.length === DEFAULT_SERIES.length && rarities.length === DEFAULT_RARITIES.length;
	const isDirty = guesses !== props.rules.guesses || series.length !== props.rules.series.length || rarities.length !== props.rules.rarities.length;
	const isValid = portalCrew.length - excludedCrew.length > 0;

	return (
		<Modal
			open={modalIsOpen}
			onClose={() => { revertRules(); setModalIsOpen(false); }}
			onOpen={() => setModalIsOpen(true)}
			trigger={renderTrigger()}
			size='tiny'
		>
			<Modal.Header>
				Custom rules
				<span style={{ paddingLeft: '1em', fontSize: '.9em', fontWeight: 'normal' }}>
					(Possible solutions: {portalCrew.length - excludedCrew.length})
				</span>
			</Modal.Header>
			<Modal.Content>
				<div>
					Max guesses:{' '}
					<Dropdown selection
						options={guessOptions}
						value={guesses}
						onChange={(e, { value }) => setGuesses(value as number)}
					/>
				</div>
				<div style={{ marginTop: '1em' }}>
					Include crew by series:
					<Dropdown selection multiple fluid clearable closeOnChange
						placeholder='Select at least 1 series'
						options={seriesOptions}
						value={series}
						onChange={(e, { value }) => setSeries(value as string[])}
					/>
				</div>
				<div style={{ marginTop: '1em' }}>
					Include crew by rarity:
					<Dropdown selection multiple fluid clearable closeOnChange
						placeholder='Select at least 1 rarity'
						options={rarityOptions}
						value={rarities}
						onChange={(e, { value }) => setRarities(value as number[])}
					/>
				</div>
			</Modal.Content>
			<Modal.Actions>
				{!isDefault && <Button content='Reset' onClick={() => resetRules()} />}
				{isDirty && <Button positive={isValid ? true : undefined} content='New Practice Game' onClick={() => applyRules()} />}
				{!isDirty && <Button content='Close' onClick={() => setModalIsOpen(false)} />}
			</Modal.Actions>
		</Modal>
	);

	function renderTrigger(): JSX.Element {
		return (
			<span style={{ paddingLeft: '1em' }}>
				<Button compact>
					{!isDefault && <span><Icon name='check' color='green' /> Use custom rules</span>}
					{isDefault && <span>Use custom rules...</span>}
				</Button>
			</span>
		);
	}

	function revertRules(): void {
		setGuesses(props.rules.guesses);
		setSeries(props.rules.series);
		setRarities(props.rules.rarities);
	}

	function resetRules(): void {
		setGuesses(DEFAULT_GUESSES);
		setSeries(DEFAULT_SERIES);
		setRarities(DEFAULT_RARITIES);
	}

	function applyRules(): void {
		if (!isValid) return;
		const newRules = new GameRules();
		newRules.guesses = guesses;
		newRules.excludedCrew = excludedCrew;
		newRules.series = series;
		newRules.rarities = rarities;
		props.changeRules(newRules);
		setModalIsOpen(false);
	}
};
