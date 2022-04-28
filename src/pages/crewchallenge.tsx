import React from 'react';
import { InView } from 'react-intersection-observer';
import { Header, Icon, Menu, Grid, Input, Button, Table, Image, Rating, Divider, Statistic, Modal, Message } from 'semantic-ui-react';

import Layout from '../components/layout';

import { useStateWithStorage } from '../utils/storage';

const PAGE_TITLE = 'Worfle Crew Challenge';
const MAX_GUESSES = 8;
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

class PlayerStats {
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

const CrewChallenge = () => {
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
			<CrewChallengeLayout />
		</PortalCrewContext.Provider>
	);
};

const CrewChallengeLayout = () => {
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
		const adjacentStyle = { backgroundColor: 'yellow', color: 'black', padding: '3px .5em' };

		return (
			<React.Fragment>
				<p>Guess the Mystery Crew from Star Trek Timelines, using your knowledge of <b>Series</b>, <b>Rarity</b>, <b>Skills</b>, and <b>Traits</b> to help narrow the possibilities. You have <b>{MAX_GUESSES} tries</b> to guess the mystery crew.</p>
				<p>Anything <span style={{ backgroundColor: 'green', padding: '3px .5em' }}>highlighted green</span> indicates an exact match between your guess and the mystery crew.</p>
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
				<p>Only crew that are currently <b>available in the portal</b> will be used as mystery crew and valid guesses.</p>
				<p>* All information used here comes directly from the Star Trek Timelines game data. Variants, series, and traits may not always be what you expect; please see <a href='https://github.com/stt-datacore/website/issues/364'>this thread</a> for some of the biggest known issues.</p>
			</React.Fragment>
		);
	}
};

const DailyGame = () => {
	const portalCrew = React.useContext(PortalCrewContext);
	const [dailyId, setDailyId] = useStateWithStorage('datalore/dailyId', '', { rememberForever: true, onInitialize: variableReady });
	const [guesses, setGuesses] = useStateWithStorage('datalore/dailyGuesses', [], { rememberForever: true, onInitialize: variableReady });
	const [stats, setStats] = useStateWithStorage('datalore/dailyStats', new PlayerStats(), { rememberForever: true, onInitialize: variableReady });
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
			<CrewChallengeGame solution={solution}
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
			<CrewChallengeGame solution={solution}
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

type CrewChallengeGame = {
	solution: string;
	guesses: string[];
	setGuesses: (guesses: string[]) => void;
	solveState: number;
	setSolveState: (solveState: number) => void;
	onGameEnd?: (solveState: number) => void;
};

const CrewChallengeGame = (props: CrewChallengeGame) => {
	const { solution, guesses, setGuesses, solveState, setSolveState } = props;
	const portalCrew = React.useContext(PortalCrewContext);

	const [solvedCrew, setSolvedCrew] = React.useState(undefined);
	const [guessesEvaluated, setGuessesEvaluated] = React.useState([]);

	React.useEffect(() => {
		if (solution === '') return;
		setSolvedCrew(getCrew(solution));
		setGuessesEvaluated([]);
	}, [solution]);

	if (!solvedCrew) return (<></>);

	const newEvaluations = [];
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
				<CrewPicker guesses={guesses} handleSelect={handleCrewSelect} />
			</div>
		);
	}

	function renderShare(): JSX.Element {
		if (solveState === SolveState.Unsolved) return (<></>);
		if (!props.onGameEnd) return (<></>);
	}

	function handleCrewSelect(symbol: string): void {
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

	function getCrew(symbol: string): any {
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

		const getUsableTraits = (crew: any) => {
			const traits = [crew.short_name];
			const short = simpleName(crew.short_name);
			const series = ['tos', 'tas', 'tng', 'ds9', 'voy', 'ent', 'dsc', 'pic', 'low', 'snw'];
			const ignore = [
				'artificial_life', 'nonhuman', 'organic', 'species_8472',
				'admiral', 'captain', 'commander', 'lieutenant_commander', 'lieutenant', 'ensign', 'general', 'nagus', 'first_officer',
				'ageofsail', 'bridge_crew', 'evsuit', 'gauntlet_jackpot', 'mirror', 'niners', 'original', 'crewman',
				'crew_max_rarity_5', 'crew_max_rarity_4', 'crew_max_rarity_3', 'crew_max_rarity_2', 'crew_max_rarity_1'
			];
			crew.traits_hidden.forEach(trait => {
				if (!series.includes(trait) && !ignore.includes(trait) && simpleName(trait).indexOf(short) === -1) {
					// Also ignore multishow variant traits, e.g. spock_tos, spock_dsc
					if (!/_[a-z]{3}$/.test(trait) || !series.includes(trait.substr(-3)))
						traits.push(properName(trait));
				}
			});
			const usableCollections = [
				'A Little Stroll', 'Badda-Bing, Badda-Bang', 'Bride of Chaotica', 'Delphic Expanse', 'Holodeck Enthusiasts',
				'Our Man Bashir', 'Play Ball!', 'Set Sail!', 'Sherwood Forest', 'The Big Goodbye', 'The Wild West'
			];
			crew.collections.forEach(collection => {
				if (usableCollections.includes(collection))
					traits.push(collection);
			});
			return traits.concat(crew.traits_named);
		};

		const simpleName = (trait: string) => {
			return trait.replace(/[^A-Z]/gi, '').toLowerCase();
		};
		const properName = (trait: string) => {
			return trait.replace(/_/g, ' ').split(' ').map(word => word.substr(0, 1).toUpperCase()+word.substr(1)).join(' ');
		};

		const crew = portalCrew.find(crew => crew.symbol === symbol);
		return {
			symbol: crew.symbol,
			name: crew.name,
			short_name: crew.short_name,
			imageUrlPortrait: crew.imageUrlPortrait ?? `${crew.portrait.file.substring(1).replaceAll('/', '_')}.png`,
			flavor: crew.flavor,
			series: crew.series ?? 'original',
			rarity: crew.max_rarity,
			skills: getSkillOrder(crew.base_skills),
			traits: getUsableTraits(crew)
		};
	}

	function evaluateGuess(crew: any): any {
		const evaluateVariant = (symbol: string, short_name: string) => {
			if (solvedCrew.symbol === symbol)
				return EvaluationState.Exact;
			else if (solvedCrew.short_name === short_name)
				return EvaluationState.Adjacent;
			return EvaluationState.Wrong;
		};

		const evaluateSeries = (series: string) => {
			const getEra = (series: string) => {
				if (series === 'tos' || series === 'tas') return 1;
				if (series === 'tng' || series === 'ds9' || series === 'voy' || series === 'ent') return 2;
				if (series === 'original') return 0;
				return 3;
			};

			if (solvedCrew.series === series)
				return EvaluationState.Exact;
			else if (getEra(solvedCrew.series) === getEra(series))
				return EvaluationState.Adjacent;
			return EvaluationState.Wrong;
		};

		const evaluateRarity = (rarity: number) => {
			if (solvedCrew.rarity === rarity)
				return EvaluationState.Exact;
			else if (solvedCrew.rarity === rarity-1 || solvedCrew.rarity === rarity+1)
				return EvaluationState.Adjacent;
			return EvaluationState.Wrong;
		};

		const evaluateSkill = (skills: any[], index: number) => {
			if (skills[index].skill === '') {
				if (solvedCrew.skills[index].skill === '')
					return EvaluationState.Exact;
				else if (index === 1 && solvedCrew.skills[2].skill === '')
					return EvaluationState.Adjacent;
			}
			else {
				if (skills[index].skill === solvedCrew.skills[index].skill)
					return EvaluationState.Exact;
				else if (solvedCrew.skills.find(skill => skill.skill === skills[index].skill))
					return EvaluationState.Adjacent;
			}
			return EvaluationState.Wrong;
		};

		const evaluateTraits = (traits: any[]) => {
			const matches = [];
			traits.forEach(trait => {
				if (solvedCrew.traits.includes(trait) && !matches.includes(trait))
					matches.push(trait);
			});
			return matches;
		};

		return {
			crew: crew.symbol === solution ? EvaluationState.Exact : EvaluationState.Wrong,
			variant: evaluateVariant(crew.symbol, crew.short_name),
			series: evaluateSeries(crew.series),
			rarity: evaluateRarity(crew.rarity),
			skills: [0, 1, 2].map(index => evaluateSkill(crew.skills, index)),
			traits: evaluateTraits(crew.traits)
		};
	}
};

type CrewPickerProps = {
	guesses: string[];
	handleSelect: (value: string) => void;
};

const CrewPicker = (props: CrewPickerProps) => {
	const { guesses, handleSelect } = props;
	const portalCrew = React.useContext(PortalCrewContext);

	const [modalIsOpen, setModalIsOpen] = React.useState(false);
	const [searchFilter, setSearchFilter] = React.useState('');
	const [paginationPage, setPaginationPage] = React.useState(1);
	const [selectedCrew, setSelectedCrew] = React.useState(undefined);
	const [showHints, setShowHints] = React.useState(true);

	const guessesLeft = MAX_GUESSES - guesses.length;

	const inputRef = React.createRef();

	React.useEffect(() => {
		if (modalIsOpen) inputRef.current.focus();
	}, [modalIsOpen]);

	return (
		<Modal
			open={modalIsOpen}
			onClose={() => setModalIsOpen(false)}
			onOpen={() => setModalIsOpen(true)}
			trigger={renderButton()}
			size='tiny'
			centered={false}
		>
			<Modal.Header>
				<Input ref={inputRef}
					size='mini' fluid
					iconPosition='left'
					placeholder='Search for crew by name'
					value={searchFilter}
					onChange={(e, { value }) => { setSearchFilter(value); setPaginationPage(1); setSelectedCrew(undefined); }}>
						<input />
						<Icon name='search' />
						<Button icon onClick={() => { setSearchFilter(''); setPaginationPage(1); setSelectedCrew(undefined); inputRef.current.focus(); }} >
							<Icon name='delete' />
						</Button>
				</Input>
			</Modal.Header>
			<Modal.Content scrolling>
				{renderGrid()}
			</Modal.Content>
			<Modal.Actions>
				<Button content='Show hints' onClick={() => setShowHints(!showHints) } />
				<Button color={selectedCrew ? 'blue' : null}
					content={selectedCrew ? `Guess ${selectedCrew.name}` : 'Select a crew'}
					onClick={() => { if (selectedCrew) confirmGuess(selectedCrew.symbol); }} />
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

		// Filtering
		if (searchFilter !== '') {
			const filter = (input: string) => input.toLowerCase().indexOf(searchFilter.toLowerCase()) >= 0;
			data = data.filter(crew => filter(crew.name) || filter(crew.short_name));
		}
		if (data.length === 0) return (<Message>No crew names match your current search.</Message>);

		// Pagination
		const itemsPerPage = 24, itemsToShow = itemsPerPage*paginationPage;

		return (
			<div>
				<Grid doubling columns={3} textAlign='center'>
					{data.slice(0, itemsToShow).map(crew => (
						<Grid.Column key={crew.symbol} style={{ cursor: 'pointer' }}
							onClick={() => { if (!guesses.includes(crew.symbol)) setSelectedCrew(crew); }}
							onDoubleClick={() => { if (!guesses.includes(crew.symbol)) confirmGuess(crew.symbol); }}
							color={selectedCrew?.symbol === crew.symbol ? 'blue' : null}
						>
							<img width={48} height={48} src={`${process.env.GATSBY_ASSETS_URL}${crew.imageUrlPortrait}`} />
							<div>
								{guesses.includes(crew.symbol) && (<Icon name='x' color='red' />)}
								{crew.name}
							</div>
							{!showHints && (
								<div>({[crew.series.toUpperCase(), `${crew.max_rarity}*`].join(', ')})</div>
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

/* Not used yet */
const SpoilerFreeTable = (props: GuessTableProps) => {
	const { guessesEvaluated } = props;

	const [modalIsOpen, setModalIsOpen] = React.useState(false);

	return (
		<Modal
			centered={false}
			open={modalIsOpen}
			onClose={() => setModalIsOpen(false)}
			onOpen={() => setModalIsOpen(true)}
			trigger={<Button><Icon name='share alternate' />Share</Button>}
			dimmer='blurring'
			size='tiny'
		>
			<Modal.Content scrolling>
				{renderGrid()}
			</Modal.Content>
		</Modal>
	);

	function renderGrid(): JSX.Element {
		if (!modalIsOpen) return (<></>);
		return (
			<Table celled collapsing padded fixed style={{ margin: '0 auto' }}>
				<Table.Body>
					{guessesEvaluated.map(guess => (
						<Table.Row key={guess.symbol} {...styleCell(guess.evaluation.crew === EvaluationState.Exact ? EvaluationState.Exact : EvaluationState.Wrong)}>
							<Table.Cell {...styleCell(guess.evaluation.variant)}></Table.Cell>
							<Table.Cell {...styleCell(guess.evaluation.series)}></Table.Cell>
							<Table.Cell {...styleCell(guess.evaluation.rarity)}></Table.Cell>
							{guess.skills.map((skill, idx) => (
								<Table.Cell key={idx} {...styleCell(guess.evaluation.skills[idx])}></Table.Cell>
							))}
						</Table.Row>
					))}
				</Table.Body>
			</Table>
		);
	}
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
					<img width={48} src={`${process.env.GATSBY_ASSETS_URL}${guess.imageUrlPortrait}`} style={{ verticalAlign: 'middle' }}/>
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
						{trait}{idx < traits.length-1 ? ',' : ''}
					</span>
				)).reduce((prev, curr) => [prev, ' ', curr], [])}
			</Table.Cell>
		</Table.Row>
	);

	function styleRow(): any {
		if (!isSolution) return {};
		const attributes = {};
		attributes.style = solveState === SolveState.Winner ? STYLE_SOLVED : STYLE_LOSER;
		return attributes;
	}
};

function styleCell(evaluationState: number): any {
	const attributes = {};
	if (evaluationState === EvaluationState.Exact)
		attributes.style = STYLE_SOLVED;
	else if (evaluationState === EvaluationState.Adjacent)
		attributes.style = STYLE_ADJACENT;
	return attributes;
}

export default CrewChallenge;
