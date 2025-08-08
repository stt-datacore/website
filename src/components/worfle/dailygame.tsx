import React from 'react';
import {
	Button,
	Divider,
	Header,
	Statistic
} from 'semantic-ui-react';

import { useStateWithStorage } from '../../utils/storage';

import { Guess, SolveState } from './model';
import { PortalCrewContext } from './context';
import { DEFAULT_GUESSES, Game, GameRules } from './game';

export class PlayerStats {
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
}

export const DailyGame = () => {
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
			<Game rules={rules} solution={solution}
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
