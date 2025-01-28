import React from 'react';
import { InView } from 'react-intersection-observer';
import { Header, Icon, Menu, Grid, Input, Button, Table, Image, Rating, Divider, Statistic, Modal, Message, Popup, Dropdown, SemanticCOLORS } from 'semantic-ui-react';

import { useStateWithStorage } from '../utils/storage';
import CONFIG from '../components/CONFIG';
import { PlayerCrew } from '../model/player';
import { BaseSkills, CrewMember, Skill } from '../model/crew';
import DataPageLayout from '../components/page/datapagelayout';
import { crewVariantIgnore, getVariantTraits } from '../utils/crewutils';
import { GlobalContext } from '../context/globalcontext';

const PAGE_TITLE = 'Worfle Crew Challenge';
const GAME_NAME = 'Worfle';
const GAME_URL = 'https://datacore.app/crewchallenge';

const DEFAULT_GUESSES = 8;
const DEFAULT_SERIES = CONFIG.SERIES;
const DEFAULT_RARITIES = [1, 2, 3, 4, 5];

const STYLE_SOLVED = { backgroundColor: 'green', color: 'white' };
const STYLE_ADJACENT = { backgroundColor: 'yellow', color: 'black' };
const STYLE_LOSER = { backgroundColor: 'maroon', color: 'white' };

enum SolveState {
	Unsolved,
	Winner,
	Loser
};

enum EvaluationState {
	Wrong,
	Adjacent,
	Exact
};

interface Guess {
	fail: number;
	[key: number]: number;
}

class GameRules {
	guesses: number;
	excludedCrew: string[];
	series: string[];
	rarities: number[];
	constructor() {
		this.guesses = DEFAULT_GUESSES;
		this.excludedCrew = [];
		this.series = [];
		this.rarities = [];
	}
};

class PlayerStats {
	plays: number = 0;
	wins: number = 0;
	streak: number = 0;
	maxStreak: number = 0;
	guesses: Guess;
	constructor() {
		this.guesses = { fail: 0 };
		for (let i = 1; i <= DEFAULT_GUESSES; i++) {
			this.guesses[i] = 0;
		}
		this.guesses.fail = 0;
	}
};

const PortalCrewContext = React.createContext<PlayerCrew[]>([]);

const CrewChallenge = () => {
	const [portalCrew, setPortalCrew] = React.useState<CrewMember[]>([]);
	const context = React.useContext(GlobalContext);

	function fetchAllCrew() {
		const allcrew = context.core.crew;
		// Sort here to ensure consistency for seedrandom
		const portalcrew = allcrew.filter(crew => crew.in_portal).sort((a, b) => a.name.localeCompare(b.name));
		// Fix incorrect series; changes here are consistent with unofficial Trait Audit thread:
		//	https://forum.wickedrealmgames.com/stt/discussion/18700/trait-audit-thread
		const fixes = [
			/* Missing series */
			{ symbol: 'data_mirror_crew', series: 'tng', audit: '+' },
			/* Incorrect series */
			{ symbol: 'cartwright_crew', series: 'tos', audit: '-tng' },
			{ symbol: 'chang_general_crew', series: 'tos', audit: '-tng' },
			{ symbol: 'earp_wyatt_crew', series: 'tos', audit: '-tng' },
			{ symbol: 'janeway_admiral_crew', series: 'tng', audit: '-voy' },
			{ symbol: 'jarok_crew', series: 'tng', audit: '-ds9' },
			{ symbol: 'keiko_bride_crew', series: 'tng', audit: '-ds9' },
			{ symbol: 'kirk_generations_crew', series: 'tng', audit: '-tos' },
			{ symbol: 'laforge_captain_crew', series: 'voy', audit: '-tng' },
			{ symbol: 'marcus_wok_crew', series: 'tos', audit: '-tng' },
			{ symbol: 'scott_movievest_crew', series: 'tng', audit: '-tos' },
			{ symbol: 'spock_ambassador_crew', series: 'tng', audit: '-tos' },
			{ symbol: 'sulu_demora_ensign_crew', series: 'tng', audit: '-tos' },
			{ symbol: 'trul_subcommander_crew', series: 'ds9', audit: '-tng' },
			{ symbol: 'worf_midwife_crew', series: 'tng', audit: '-ds9' }
		];
		fixes.forEach(fix => {
			const pc = portalcrew.find(crew => crew.symbol === fix.symbol);
			if (pc) pc.series = fix.series;	// Not everyone is in the portal
		});
		setPortalCrew(portalcrew);
	}

	React.useEffect(() => {
		fetchAllCrew();
	}, [context]);

	if (!portalCrew) {
		context.core.spin();
	}

	return (
		<PortalCrewContext.Provider value={portalCrew as PlayerCrew[]}>
			<CrewChallengeLayout />
		</PortalCrewContext.Provider>
	);
};

const CrewChallengeLayout = () => {
	const [activeItem, setActiveItem] = React.useState('daily');

	const menuItems = [
		{ name: 'daily', title: 'Daily Game' },
		{ name: 'practice', title: 'Practice Game' },
		{ name: 'instructions', title: <span><Icon name='question circle outline' /> How to Play</span> }
	];

	return (
		<DataPageLayout pageTitle={PAGE_TITLE}>
			<React.Fragment>
				<Menu>
					{menuItems.map(item => (
						<Menu.Item key={item.name} name={item.name} active={activeItem === item.name} onClick={() => setActiveItem(item.name)}>
							{item.title}
						</Menu.Item>
					))}
				</Menu>
				{activeItem === 'daily' && <DailyGame />}
				{activeItem === 'practice' && <PracticeGame />}
				{activeItem === 'instructions' && renderInstructions()}
			</React.Fragment>
		</DataPageLayout>
	);

	function renderInstructions(): JSX.Element {
		const adjacentStyle = { backgroundColor: 'yellow', color: 'black', padding: '3px .5em' };

		return (
			<React.Fragment>
				<p>How well do you know the characters from Star Trek Timelines? We pick one mystery crew member every day. Guess who it is, using your knowledge of <b>Variants</b>, <b>Series</b>, <b>Rarity</b>, <b>Skills</b>, and <b>Traits</b> to help narrow the possibilities. You have <b>{DEFAULT_GUESSES} tries</b> to guess the mystery crew.</p>
				<p>Only crew that are currently <b>available in the time portal</b> will be used as mystery crew and valid guesses.</p>
				<p>Anything <span style={{ backgroundColor: 'green', padding: '3px .5em' }}>highlighted green</span> indicates an exact match between your guess and the mystery crew on one or more of these criteria: series, rarity, or skills.</p>
				<p>A <span style={adjacentStyle}>yellow crew name</span> indicates the mystery crew is a variant* of your guess.</p>
				<p>A <span style={adjacentStyle}>yellow series</span> indicates the mystery crew is from a different series* in the same production era as your guess. The possible eras are:</p>
				<ol>
					<li>The Original Series, The Animated Series, and the first 6 films</li>
					<li>The Next Generation, Deep Space Nine, Voyager, Enterprise, and the 4 TNG films</li>
					<li>Discovery, Picard, and other shows from the current streaming era</li>
					<li>Star Trek Timelines Originals (non-canonical crew)</li>
				</ol>
				<p>A <span style={adjacentStyle}>yellow rarity</span> indicates the mystery crew has a max rarity that is either 1 star higher or 1 star lower than your guess.</p>
				<p>"<b>Skill Order</b>" lists the guessed crew's skills from highest to lowest base value. A <span style={adjacentStyle}>yellow skill</span> indicates the mystery crew has that skill, but not in the same position as your guess.</p>
				<p>"<b>Traits in Common</b>" identify the traits* your guess and the mystery crew share in common.</p>
				<p>If you need a little help, feel free to use the "Show hints" button on the crew picker. Hints identify a crew's series, rarity, and number of skills.</p>
				<p>* All information used here comes directly from the Star Trek Timelines game data. Variants, series, and traits may not always be what you expect; please see <a href='https://forum.wickedrealmgames.com/stt/discussion/18700/trait-audit-thread'>this thread</a> for known issues.</p>
			</React.Fragment>
		);
	}
};

const DailyGame = () => {
	const portalCrew = React.useContext(PortalCrewContext);
	const [dailyId, setDailyId] = useStateWithStorage('datalore/dailyId', '', { rememberForever: true, onInitialize: variableReady });
	const [solution, setSolution] = useStateWithStorage('datalore/dailySolution', '', { rememberForever: true, onInitialize: variableReady });
	const [guesses, setGuesses] = useStateWithStorage<string[]>('datalore/dailyGuesses', [], { rememberForever: true, onInitialize: variableReady });
	const [stats, setStats] = useStateWithStorage('datalore/dailyStats', new PlayerStats(), { rememberForever: true, onInitialize: variableReady });
	const [loadState, setLoadState] = React.useState(0);
	const [solveState, setSolveState] = React.useState(SolveState.Unsolved);
	const [showStats, setShowStats] = React.useState(false);

	const currentTime = new Date();

	// Game time is current day midnight ET
	const gameTime = new Date(currentTime);
	gameTime.setUTCHours(gameTime.getUTCHours()-4);	// ET is UTC-4
	gameTime.setUTCHours(4, 0, 0, 0);	// Midnight ET is 4:00:00 UTC

	// Daily reset time is next midnight ET
	const resetTime = new Date(gameTime);
	resetTime.setUTCDate(resetTime.getUTCDate()+1)

	React.useEffect(() => {
		if (loadState === 4) initializeDailyGame();
	}, [loadState]);

	React.useEffect(() => {
		setShowStats(solveState !== SolveState.Unsolved);
	}, [solveState]);

	if (loadState < 4 || solution === '')
		return (<></>);

	const rules = new GameRules();

	return (
		<React.Fragment>
			<p>How well do you know the characters from Star Trek Timelines? We pick one mystery crew member every day. Guess who it is, using your knowledge of <b>Variants</b>, <b>Series</b>, <b>Rarity</b>, <b>Skills</b>, and <b>Traits</b> to help narrow the possibilities. You have <b>{DEFAULT_GUESSES} tries</b> to guess the mystery crew. Good luck!</p>
			<CrewChallengeGame rules={rules} solution={solution}
				guesses={guesses} setGuesses={setGuesses}
				solveState={solveState} setSolveState={setSolveState}
				gameTime={gameTime} onGameEnd={handleGameEnd} />
			{renderResetTime()}
			{renderStats()}
		</React.Fragment>
	);

	function variableReady(keyName: string): void {
		setLoadState(prevState => Math.min(prevState + 1, 4));
	}

	function initializeDailyGame(): void {
		const getGameIdFromDate = (gameTime: Date) => {
			const utcYear = gameTime.getUTCFullYear(), utcMonth = gameTime.getUTCMonth()+1, utcDate = gameTime.getUTCDate();
			return `${utcYear}/${utcMonth}/${utcDate}`;
		};

		const getSeed = (gameId: string) => {
			const seedrandom = require('seedrandom');
			const rng = seedrandom(gameId);
			return Math.floor(rng()*portalCrew.length);
		};

		const getFreshSeed = (gameId: string) => {
			let randomSeed = getSeed(gameId);
			while (recentSeeds.includes(randomSeed)) {
				gameId += '+';
				randomSeed = getSeed(gameId);
			}
			return randomSeed;
		};

		// Don't re-use likely solutions from the past 3 weeks
		const recentSeeds = [] as number[];
		const previousDay = new Date(gameTime);
		previousDay.setUTCDate(previousDay.getUTCDate()-21);
		for (let i = 0; i < 20; i++) {
			previousDay.setUTCDate(previousDay.getUTCDate()+1);
			let previousId = getGameIdFromDate(previousDay);
			const previousSeed = getFreshSeed(previousId);
			recentSeeds.push(previousSeed);
		}

		// Daily game id is based on game time
		const gameId = getGameIdFromDate(gameTime);
		setDailyId(gameId);

		const dailySeed = getFreshSeed(gameId);
		const dailySolution = portalCrew[dailySeed].symbol;

		// Create new game
		if (dailyId === '' || dailyId !== gameId) {
			setGuesses([]);
			setSolution(dailySolution);
			setSolveState(SolveState.Unsolved);
			return;
		}

		// No existing solution, get solveState from daily solution
		if (solution === '') {
			setSolution(dailySolution);
			if (guesses.includes(dailySolution))
				setSolveState(SolveState.Winner);
			else if (guesses.length >= DEFAULT_GUESSES)
				setSolveState(SolveState.Loser);
			return;
		}

		// Get solveState from existing solution
		if (guesses.includes(solution))
			setSolveState(SolveState.Winner);
		else if (guesses.length >= DEFAULT_GUESSES)
			setSolveState(SolveState.Loser);
	}

	function handleGameEnd(solveState: number): void {
		stats.plays++;
		if (solveState === SolveState.Winner) {
			stats.wins++;
			stats.guesses[guesses.length]++;
			stats.streak++;
			stats.maxStreak = Math.max(stats.streak, stats.maxStreak);
		}
		else {
			stats.guesses.fail++;
			stats.streak = 0;
		}
		setStats({... stats});
	}

	function renderStats(): JSX.Element {
		if (stats.plays === 0) return (<></>);
		if (!showStats)
			return (
				<div style={{ marginTop: '2em' }}>
					<Button icon='chart bar' content='Stats' onClick={() => setShowStats(true)} />
				</div>
			);

		return (
			<React.Fragment>
				<Divider />
				<Header as='h3'>Statistics</Header>
				<Statistic.Group size='small'>
					<Statistic>
						<Statistic.Value>{stats.plays}</Statistic.Value>
						<Statistic.Label>Played</Statistic.Label>
					</Statistic>
					<Statistic>
						<Statistic.Value>{Math.floor(stats.wins/stats.plays*100)}</Statistic.Value>
						<Statistic.Label>Win%</Statistic.Label>
					</Statistic>
					<Statistic>
						<Statistic.Value>{stats.streak}</Statistic.Value>
						<Statistic.Label>Current Streak</Statistic.Label>
					</Statistic>
					<Statistic>
						<Statistic.Value>{stats.maxStreak}</Statistic.Value>
						<Statistic.Label>Max Streak</Statistic.Label>
					</Statistic>
				</Statistic.Group>
			</React.Fragment>
		);
	}

	function renderResetTime(): JSX.Element {
		if (!showStats || solveState === SolveState.Unsolved) return (<></>);

		const formatTime = (seconds: number) => {
			const h = Math.floor(seconds / 3600);
			const m = Math.floor(seconds % 3600 / 60);
			const s = Math.floor(seconds % 3600 % 60);
			return h+'h ' +m+'m';
		};

		return (
			<div style={{ marginTop: '2em' }}>
				A new mystery crew will be available in <b>{formatTime((resetTime.getTime()-currentTime.getTime())/1000)}</b>.
			</div>
		);
	}
};

const PracticeGame = () => {
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
			<CrewChallengeGame rules={rules} solution={solution}
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

type CrewChallengeGame = {
	rules: GameRules;
	solution: string;
	guesses: string[];
	setGuesses: (guesses: string[]) => void;
	solveState: number;
	setSolveState: (solveState: number) => void;
	gameTime?: Date;
	onGameEnd?: (solveState: number) => void;
};

const CrewChallengeGame = (props: CrewChallengeGame) => {
	const { rules, solution, guesses, setGuesses, solveState, setSolveState } = props;
	const portalCrew = React.useContext(PortalCrewContext);

	const [solvedCrew, setSolvedCrew] = React.useState<PlayerCrew | undefined>(undefined);
	const [guessesEvaluated, setGuessesEvaluated] = React.useState([] as any[]);

	React.useEffect(() => {
		if (solution === '') return;
		setSolvedCrew(getCrew(solution));
		setGuessesEvaluated([]);
	}, [solution]);

	if (!solvedCrew) return (<></>);

	const newEvaluations = [] as any[];
	guesses.forEach(guess => {
		if (!guessesEvaluated.find(evaluation => evaluation.symbol === guess)) {
			const guessedCrew = getCrew(guess);
			guessedCrew.evaluation = evaluateGuess(guessedCrew);
			newEvaluations.push(guessedCrew);
		}
	});
	if (newEvaluations.length > 0)
		setGuessesEvaluated([...guessesEvaluated, ...newEvaluations]);

	return (
		<React.Fragment>
			<GuessTable solveState={solveState} solvedCrew={solvedCrew} guessesEvaluated={guessesEvaluated} />
			{renderInput()}
			{renderShare()}
		</React.Fragment>
	);

	function renderInput(): JSX.Element {
		if (solveState !== SolveState.Unsolved) return (<></>);
		return (
			<div style={{ margin: '1em 0' }}>
				<CrewPicker rules={rules} guesses={guesses} handleSelect={handleCrewSelect} />
			</div>
		);
	}

	function renderShare(): JSX.Element {
		if (solveState === SolveState.Unsolved) return (<></>);
		if (!props.gameTime) return (<></>);

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
			guessesEvaluated.forEach(guess => {
				output += '\n';
				['variant', 'series', 'rarity'].forEach(evaluation => {
					output += formatEvaluation(guess.evaluation[evaluation]);
				});
				[0, 1, 2].forEach(idx => {
					output += formatEvaluation(guess.evaluation.skills[idx]);
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
		else if (guesses.length >= rules.guesses)
			endGame(SolveState.Loser);
	}

	function endGame(solveState: number): void {
		setSolveState(solveState);
		if (props.onGameEnd) props.onGameEnd(solveState);
	}

	function getCrew(symbol: string): any {
		const getSkillOrder = (base_skills: BaseSkills) => {
			const skills = Object.keys(base_skills).map(skill => {
				return {
					skill, core: base_skills[skill].core
				};
			}).sort((a, b) => b.core - a.core);
			for (let i = skills.length; i < 3; i++) {
				skills.push({ skill: '', core: 0 });
			}
			return skills;
		};

		const getVariants = (variantTraits: string[], shortName: string) => {
			const variants = variantTraits.slice();
			// Dax hacks
			const daxIndex = variants.indexOf('dax');
			if (daxIndex >= 0) {
				variantTraits.unshift(shortName);
				variants[daxIndex] = shortName;
			}
			return variants;
		};

		const getUsableTraits = (crew: any, variantTraits: string[]) => {
			const traits = variantTraits.slice();
			['Female', 'Male'].forEach(usable => { if (crew.traits_hidden.includes(usable.toLowerCase())) traits.push(usable); });
			const usableCollections = [
				'A Little Stroll', 'Animated', 'Badda-Bing, Badda-Bang', 'Bride of Chaotica', 'Convergence Day', 'Delphic Expanse',
				'Holodeck Enthusiasts', 'Our Man Bashir', 'Pet People', 'Play Ball!', 'Set Sail!', 'Sherwood Forest',
				'The Big Goodbye', 'The Wild West'
			];
			crew.collections.forEach(collection => {
				if (usableCollections.includes(collection))
					traits.push(collection);
			});
			return traits.concat(crew.traits_named);
		};

		const crew = portalCrew.find(crew => crew.symbol === symbol) ?? {} as PlayerCrew;
		let shortName = crew.short_name;
		// Dax hacks
		if (shortName === 'E. Dax') shortName = 'Ezri';
		if (shortName === 'J. Dax') shortName = 'Jadzia';
		const variantTraits = crewVariantIgnore.includes(crew.symbol) ? [] : getVariantTraits(crew.traits_hidden);
		return {
			symbol: crew.symbol,
			name: crew.name,
			short_name: shortName,
			variants: getVariants(variantTraits, shortName),
			imageUrlPortrait: crew.imageUrlPortrait ?? `${crew.portrait.file.substring(1).replace(/\//g, '_')}.png`,
			flavor: crew.flavor,
			series: crew.series ?? 'original',
			rarity: crew.max_rarity,
			skills: getSkillOrder(crew.base_skills),
			traits: getUsableTraits(crew, variantTraits)
		};
	}

	function evaluateGuess(crew: any): any {
		const evaluateVariant = (symbol: string, variants: string[]) => {
			if (solvedCrew?.symbol === symbol)
				return EvaluationState.Exact;
			else {
				let hasVariant = false;
				solvedCrew?.variants?.forEach(solvedVariant => {
					if (variants.includes(solvedVariant)) hasVariant = true;
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
				return 3;
			};

			if (solvedCrew?.series === series)
				return EvaluationState.Exact;
			else if (getEra(solvedCrew?.series ?? "") === getEra(series))
				return EvaluationState.Adjacent;
			return EvaluationState.Wrong;
		};

		const evaluateRarity = (rarity: number) => {
			if (solvedCrew?.rarity === rarity)
				return EvaluationState.Exact;
			else if (solvedCrew?.rarity === rarity-1 || solvedCrew?.rarity === rarity+1)
				return EvaluationState.Adjacent;
			return EvaluationState.Wrong;
		};

		const evaluateSkill = (skills: any[], index: number) => {
			if (skills[index].skill === '') {
				if (solvedCrew?.skills[index].skill === '')
					return EvaluationState.Exact;
			}
			else {
				if (skills[index].skill === solvedCrew?.skills[index].skill)
					return EvaluationState.Exact;
				else if (solvedCrew && Object.values(solvedCrew.skills)?.find((skill: Skill) => skill.skill === skills[index].skill))
					return EvaluationState.Adjacent;
			}
			return EvaluationState.Wrong;
		};

		const evaluateTraits = (traits: any[]) => {
			const matches = [] as string[];
			traits.forEach(trait => {
				if (solvedCrew?.traits.includes(trait) && !matches.includes(trait))
					matches.push(trait);
			});
			return matches;
		};

		return {
			crew: crew.symbol === solution ? EvaluationState.Exact : EvaluationState.Wrong,
			variant: evaluateVariant(crew.symbol, crew.variants),
			series: evaluateSeries(crew.series),
			rarity: evaluateRarity(crew.rarity),
			skills: [0, 1, 2].map(index => evaluateSkill(crew.skills, index)),
			traits: evaluateTraits(crew.traits)
		};
	}
};

type CrewPickerProps = {
	rules: GameRules;
	guesses: string[];
	handleSelect: (value: string) => void;
};

const CrewPicker = (props: CrewPickerProps) => {
	const { rules, guesses, handleSelect } = props;
	const portalCrew = React.useContext(PortalCrewContext);

	const [modalIsOpen, setModalIsOpen] = React.useState(false);
	const [searchFilter, setSearchFilter] = React.useState('');
	const [paginationPage, setPaginationPage] = React.useState(1);
	const [selectedCrew, setSelectedCrew] = React.useState<PlayerCrew | undefined>(undefined);
	const [showHints, setShowHints] = React.useState(true);

	const guessesLeft = rules.guesses - guesses.length;

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

		let data = portalCrew.slice();

		if (rules.excludedCrew.length > 0)
			data = data.filter(crew => !rules.excludedCrew.includes(crew.symbol));

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

type GuessTableProps = {
	solveState: number;
	solvedCrew: any;
	guessesEvaluated: any[];
};

const GuessTable = (props) => {
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

export default CrewChallenge;
