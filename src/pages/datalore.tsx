import React from 'react';
import { Header, Icon, Menu, Grid, Dropdown, Button, Table, Image, Rating, Divider, Statistic } from 'semantic-ui-react';

import Layout from '../components/layout';

import { useStateWithStorage } from '../utils/storage';

const PAGE_TITLE = 'DataLore crew challenge';
const MAX_GUESSES = 8;

enum CrewOptionsState {
	Uninitialized,
	Initializing,
	Ready
};

enum SolveState {
	Unsolved,
	Winner,
	Loser
};

class DataLoreStats {
	plays: number = 0;
	wins: number = 0;
	streak: number = 0;
	maxStreak: number = 0;
	constructor() {
		this.guesses = {};
		for (let i = 1; i <= MAX_GUESSES; i++) {
			this.guesses[i] = 0;
		}
		this.guesses.fail = 0;
	}
};

const PortalCrewContext = React.createContext();

const DataLore = () => {
	const [portalCrew, setPortalCrew] = React.useState(undefined);

	async function fetchAllCrew() {
		const crewResponse = await fetch('/structured/crew.json');
		const allcrew = await crewResponse.json();
		// Sort here to ensure consistency for seedrandom
		const portalcrew = allcrew.filter(crew => crew.in_portal).sort((a, b) => a.name.localeCompare(b.name));
		// Fix crew with missing series
		const fixes = [
			{ symbol: 'abe_lincoln_crew', series: 'tos' },
			{ symbol: 'borg_queen_crew', series: 'tng' },
			{ symbol: 'data_mirror_crew', series: 'tng' },
			{ symbol: 'defiant_helmsman_crew', series: 'tng' },
			{ symbol: 'ephraim_dot_crew', series: 'dsc' },
			{ symbol: 'laforge_mirror_crew', series: 'tng' },
			{ symbol: 'lonzak_crew', series: 'voy' },
			{ symbol: 'neelix_human_crew', series: 'tng' }
		];
		fixes.forEach(fix => {
			const pc = portalcrew.find(crew => crew.symbol === fix.symbol);
			if (pc) pc.series = fix.series;	// Not everyone is in the portal
		});
		setPortalCrew(portalcrew);
	}

	React.useEffect(() => {
		fetchAllCrew();
	}, []);

	if (!portalCrew) {
		return (
			<Layout title={PAGE_TITLE}>
				<Icon loading name='spinner' /> Loading...
			</Layout>
		);
	}

	return (
		<PortalCrewContext.Provider value={portalCrew}>
			<DataLoreMain />
		</PortalCrewContext.Provider>
	);
};

const DataLoreMain = () => {
	const [activeItem, setActiveItem] = React.useState('daily');

	const menuItems = [
		{ name: 'daily', title: 'Daily Game' },
		{ name: 'practice', title: 'Practice Game' },
		{ name: 'instructions', title: 'How to Play' }
	];

	return (
		<Layout title={PAGE_TITLE}>
			<Header as='h2'>{PAGE_TITLE}</Header>
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
		</Layout>
	);

	function renderInstructions(): JSX.Element {
		return (
			<React.Fragment>
				<p>Guess the Mystery Crew from Star Trek Timelines, using your knowledge of <b>Series</b>*, <b>Rarity</b>, <b>Skills</b>, and <b>Traits</b>* to help narrow the possibilities. You have <b>{MAX_GUESSES} tries</b> to guess the mystery crew.</p>
				<p>Anything <span style={{ backgroundColor: 'green', padding: '3px .5em' }}>highlighted green</span> indicates an exact match between your guess and the mystery crew.</p>
				<p>A <span style={{ backgroundColor: 'yellow', color: 'black', padding: '3px .5em' }}>yellow series</span> indicates the mystery crew is not from the same series as your guess, but they are from the same production era. The possible eras are:</p>
				<ol>
					<li>The Original Series, The Animated Series, and the first 6 films</li>
					<li>The Next Generation, Deep Space Nine, Voyager, Enterprise, and the 4 TNG films</li>
					<li>Discovery, Picard, and other shows from the current streaming era</li>
					<li>Star Trek Timelines Originals (non-canonical crew)</li>
				</ol>
				<p>A <span style={{ backgroundColor: 'yellow', color: 'black', padding: '3px .5em' }}>yellow rarity</span> indicates the mystery crew has a max rarity that is either 1 star higher or 1 star lower than your guess.</p>
				<p>"<b>Skill Order</b>" lists the guessed crew's skills from highest to lowest base value. A <span style={{ backgroundColor: 'yellow', color: 'black', padding: '3px .5em' }}>yellow skill</span> indicates the mystery crew has that skill, but not in the same position as your guess.</p>
				<p>"<b>Traits in Common</b>" identify the traits your guess and the mystery crew share in common.</p>
				<p>Only crew that are currently <b>available in the portal</b> will be used as mystery crew and valid guesses.</p>
				<p>* All information used here comes directly from the Star Trek Timelines game data. Series and traits may not always be what you expect; please see <a href='https://github.com/stt-datacore/website/issues/364'>this thread</a> for a list of known issues.</p>
			</React.Fragment>
		);
	}
};

const DailyGame = () => {
	const portalCrew = React.useContext(PortalCrewContext);
	const [dailyId, setDailyId] = useStateWithStorage('datalore/dailyId', '', { rememberForever: true, onInitialize: variableReady });
	const [guesses, setGuesses] = useStateWithStorage('datalore/dailyGuesses', [], { rememberForever: true, onInitialize: variableReady });
	const [stats, setStats] = useStateWithStorage('datalore/dailyStats', new DataLoreStats(), { rememberForever: true, onInitialize: variableReady });
	const [loadState, setLoadState] = React.useState(0);
	const [solution, setSolution] = React.useState('');
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
		if (loadState === 3) initializeDailyGame();
	}, [loadState]);

	React.useEffect(() => {
		setShowStats(solveState !== SolveState.Unsolved);
	}, [solveState]);

	if (loadState < 3 || solution === '')
		return (<></>);

	return (
		<React.Fragment>
			<p>How well do you know the characters from Star Trek Timelines? We pick one mystery crew member every day. Guess who it is in {MAX_GUESSES} tries! Wrong guesses can help you by narrowing down the series, rarity, skills, and traits of the mystery crew.</p>
			<DataLoreGame solution={solution}
				guesses={guesses} setGuesses={setGuesses}
				solveState={solveState} setSolveState={setSolveState}
				onGameEnd={handleGameEnd} />
			{renderStats()}
			{renderResetTime()}
		</React.Fragment>
	);

	function variableReady(keyName: string): void {
		setLoadState(prevState => Math.min(prevState + 1, 3));
	}

	function initializeDailyGame(): void {
		// Daily game id is based on game time
		const utcYear = gameTime.getUTCFullYear(), utcMonth = gameTime.getUTCMonth()+1, utcDate = gameTime.getUTCDate();
		const gameId = `${utcYear}/${utcMonth}/${utcDate}`;
		const randomIndex = getDailySeed(gameId);
		const solution = portalCrew[randomIndex].symbol;

		setDailyId(gameId);
		setSolution(solution);
		if (dailyId === '' || dailyId !== gameId) {
			setGuesses([]);
			setSolveState(SolveState.Unsolved);
		}
		else {
			if (guesses.includes(solution))
				setSolveState(SolveState.Winner);
			else if (guesses.length >= MAX_GUESSES)
				setSolveState(SolveState.Loser);
		}
	}

	function getDailySeed(gameId: string): number {
		const seedrandom = require('seedrandom');
		const rng = seedrandom(gameId);
		return Math.floor(rng()*portalCrew.length);
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
		if (!showStats) return (<></>);

		const formatTime = (seconds: number) => {
			const h = Math.floor(seconds / 3600);
			const m = Math.floor(seconds % 3600 / 60);
			const s = Math.floor(seconds % 3600 % 60);
			return h+'h ' +m+'m';
		};

		return (
			<React.Fragment>
				<Divider />
				<p>A new mystery crew will be available in <b>{formatTime((resetTime.getTime()-currentTime.getTime())/1000)}</b>.</p>
			</React.Fragment>
		);
	}
};

const PracticeGame = () => {
	const portalCrew = React.useContext(PortalCrewContext);
	const [solution, setSolution] = useStateWithStorage('datalore/practiceSolution', '');
	const [guesses, setGuesses] = useStateWithStorage('datalore/practiceGuesses', []);
	const [solveState, setSolveState] = useStateWithStorage('datalore/practiceSolveState', SolveState.Unsolved);

	if (!solution) {
		createPracticeGame();
		return (<></>);
	}

	return (
		<React.Fragment>
			<p>You can play as many practice games as you like. Statistics for practice games will not be recorded.</p>
			<DataLoreGame solution={solution}
				guesses={guesses} setGuesses={setGuesses}
				solveState={solveState} setSolveState={setSolveState} />
			<div style={{ marginTop: '2em' }}>
				{solveState === SolveState.Unsolved && <Button content='Give Up' onClick={() => resignPracticeGame()} />}
				{solveState !== SolveState.Unsolved && <Button content='Play Again' onClick={() => createPracticeGame()} />}
			</div>
		</React.Fragment>
	);

	function createPracticeGame(): void {
		const randomIndex = Math.floor(Math.random()*portalCrew.length);
		setSolution(portalCrew[randomIndex].symbol);
		setGuesses([]);
		setSolveState(SolveState.Unsolved);
	}

	function resignPracticeGame(): void {
		setSolveState(SolveState.Loser);
	}
};

type DataLoreGame = {
	solution: string;
	guesses: string[];
	setGuesses: (guesses: string[]) => void;
	solveState: number;
	setSolveState: (solveState: number) => void;
	createGame?: () => void;
	onGameEnd?: (solveState: number) => void;
};

const DataLoreGame = (props: DataLoreGame) => {
	const { id, solution, guesses, setGuesses, solveState, setSolveState } = props;
	const portalCrew = React.useContext(PortalCrewContext);

	const [crewOptions, setCrewOptions] = React.useState({
		state: CrewOptionsState.Uninitialized,
		list: []
	});

	return (
		<React.Fragment>
			<GuessTable solveState={solveState} solution={solution} guesses={guesses} />
			{renderCrewPicker()}
		</React.Fragment>
	);

	function renderCrewPicker(): JSX.Element {
		if (portalCrew.length === 0) return (<></>);
		if (solveState !== SolveState.Unsolved) return (<></>);

		const placeholder = crewOptions.state === CrewOptionsState.Initializing ? 'Loading. Please wait...' : 'Guess Crew';

		return (
			<div style={{ margin: '1em 0' }}>
				<p>You have <b>{MAX_GUESSES-guesses.length}</b> guess{MAX_GUESSES-guesses.length !== 1 ? 'es' : ''} remaining.</p>
				<Dropdown search selection multiple closeOnChange fluid
					placeholder={placeholder}
					options={crewOptions.list}
					value={[]}
					onFocus={() => { if (crewOptions.state === CrewOptionsState.Uninitialized) populateCrewOptions(); }}
					onChange={(e, { value }) => handleCrewSelect(value)}
				/>
			</div>
		);
	}

	function populateCrewOptions(): void {
		setCrewOptions({
			state: CrewOptionsState.Initializing,
			list: []
		});
		// Populate inside a timeout so that UI can update with a Loading placeholder first
		setTimeout(() => {
			const populatePromise = new Promise((resolve, reject) => {
				const poolList = portalCrew.map((c) => (
					{
						key: c.symbol,
						value: c.symbol,
						image: { avatar: true, src: `${process.env.GATSBY_ASSETS_URL}${c.imageUrlPortrait}` },
						text: c.name
					}
				));
				resolve(poolList);
			});
			populatePromise.then(poolList => {
				setCrewOptions({
					state: CrewOptionsState.Initialized,
					list: poolList
				});
			});
		}, 0);
	}

	function handleCrewSelect(symbols: string[]): void {
		if (symbols.length === 0) return;
		const symbol = symbols[0];
		if (symbol === '' || guesses.includes(symbol)) return;
		guesses.push(symbol);
		setGuesses([...guesses]);
		if (guesses.includes(solution))
			endGame(SolveState.Winner);
		else if (guesses.length >= MAX_GUESSES)
			endGame(SolveState.Loser);
	}

	function endGame(solveState: number): void {
		setSolveState(solveState);
		if (props.onGameEnd) props.onGameEnd(solveState);
	}
};

type GuessTableProps = {
	solveState: number;
	solution: string;
	guesses: string[];
};

const GuessTable = (props) => {
	const { solveState, solution } = props;
	const portalCrew = React.useContext(PortalCrewContext);

	const guesses = props.guesses.slice();
	if (solveState === SolveState.Loser) guesses.push(solution);
	if (guesses.length === 0) return (<></>);

	const STYLE_SOLVED = { backgroundColor: 'green' };
	const STYLE_ADJACENT = { backgroundColor: 'yellow' };

	const getEra = (series: string) => {
		if (series === 'tos' || series === 'tas') return 1;
		if (series === 'tng' || series === 'ds9' || series === 'voy' || series === 'ent') return 2;
		if (series === 'original') return 0;
		return 3;
	};

	const getSkillOrder = (base_skills: any) => {
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

	const solvedCrew = portalCrew.find(crew => crew.symbol === solution);
	const solvedSkillOrder = getSkillOrder(solvedCrew.base_skills);

	const data = guesses.map(guess => {
		const guessedCrew = portalCrew.find(crew => crew.symbol === guess);
		const imageUrlPortrait = guessedCrew.imageUrlPortrait ?? `${guessedCrew.portrait.file.substring(1).replaceAll('/', '_')}.png`;
		return {...guessedCrew,
			imageUrlPortrait
		};
	});

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
					{data.map((crew, idx) => {
						const skillOrder = getSkillOrder(crew.base_skills);
						return (
							<Table.Row key={idx} {...solved(crew.symbol)}>
								<Table.Cell>
									{crew.symbol === solution && (
										<div>
											{solveState === SolveState.Winner && (<span>You got it in {props.guesses.length} tr{props.guesses.length !== 1 ? 'ies' : 'y'}!</span>)}
											{solveState === SolveState.Loser && (<span>You lose! The correct answer is:</span>)}
										</div>
									)}
									<div style={{ margin: '.5em 0', whiteSpace: 'nowrap' }}>
										<img width={48} src={`${process.env.GATSBY_ASSETS_URL}${crew.imageUrlPortrait}`} style={{ verticalAlign: 'middle' }}/>
										<span style={{ padding: '0 .5em', fontSize: '1.25em' }}>{crew.name}</span>
									</div>
									{crew.symbol === solution && crew.flavor && (
										<div>{crew.flavor}</div>
									)}
								</Table.Cell>
								<Table.Cell {...solvedSeries(crew.series)}>
									{crew.series && <Image src={`/media/series/${crew.series}.png`} size='small' style={{ margin: '0 auto' }} />}
								</Table.Cell>
								<Table.Cell {...solvedRarity(crew.max_rarity)}>
									<Rating defaultRating={crew.max_rarity} maxRating={crew.max_rarity} icon='star' size='large' disabled />
								</Table.Cell>
								{skillOrder.map((skill, idx) => (
									<Table.Cell key={idx} textAlign='center' {...solvedSkill(skillOrder, idx)}>
										{skill.skill !== '' && <img alt={idx} src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${skill.skill}.png`} style={{ height: '2em' }} />}
										{skill.skill === '' && <Icon name='minus' />}
									</Table.Cell>
								))}
								<Table.Cell textAlign='center'>
									{commonTraits(crew)}
								</Table.Cell>
							</Table.Row>
						);
					})}
				</Table.Body>
			</Table>
		</div>
	);

	function solved(symbol: string): any {
		const attributes = {};
		if (solvedCrew.symbol === symbol)
			attributes.style = STYLE_SOLVED;
		return attributes;
	}

	function solvedSeries(series: string): any {
		const attributes = {};
		if (solvedCrew.series === series)
			attributes.style = STYLE_SOLVED;
		else if (getEra(solvedCrew.series) === getEra(series))
			attributes.style = STYLE_ADJACENT;
		return attributes;
	}

	function solvedRarity(rarity: number): any {
		const attributes = {};
		if (solvedCrew.max_rarity === rarity)
			attributes.style = STYLE_SOLVED;
		else if (solvedCrew.max_rarity === rarity-1 || solvedCrew.max_rarity === rarity+1)
			attributes.style = STYLE_ADJACENT;
		return attributes;
	}

	function solvedSkill(skills: any[], index: number): any {
		const attributes = {};
		if (skills[index].skill === '') {
			if (solvedSkillOrder[index].skill === '')
				attributes.style = STYLE_SOLVED;
			else if (index === 1 && solvedSkillOrder[2].skill === '')
				attributes.style = STYLE_ADJACENT;
		}
		else {
			if (skills[index].skill === solvedSkillOrder[index].skill)
				attributes.style = STYLE_SOLVED;
			else if (solvedSkillOrder.find(skill => skill.skill === skills[index].skill))
				attributes.style = STYLE_ADJACENT;
		}
		return attributes;
	}

	function commonTraits(crew: any): JSX.Element {
		const usableHiddens = ['female', 'male'];
		const matches = [];
		if (crew.short_name === solvedCrew.short_name) matches.push(crew.short_name);
		crew.traits_hidden.forEach(trait => {
			if (usableHiddens.includes(trait) && solvedCrew.traits_hidden.includes(trait))
				matches.push(trait.replace(/\s/g, ' ').substr(0, 1).toUpperCase()+trait.substr(1));
		});
		crew.traits_named.forEach(trait => {
			if (solvedCrew.traits_named.includes(trait) && !matches.includes(trait))
				matches.push(trait);
		});
		return matches.map((match, idx) => (
			<span key={idx} style={{ whiteSpace: 'nowrap' }}>
				{match}{idx < matches.length-1 ? ',' : ''}
			</span>
		)).reduce((prev, curr) => [prev, ' ', curr], []);
	}
};

export default DataLore;
