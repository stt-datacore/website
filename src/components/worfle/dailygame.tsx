import React from 'react';
import {
	Button,
	Divider,
	Header,
	Statistic
} from 'semantic-ui-react';

import { useStateWithStorage } from '../../utils/storage';

import { IRosterCrew, SolveState } from './model';
import { WorfleContext } from './context';
import { DEFAULT_GUESSES, Game, GameRules } from './game';

interface IPlayerGuesses {
	fail: number;
	[key: number]: number;
};

class PlayerStats {
	plays: number = 0;
	wins: number = 0;
	streak: number = 0;
	maxStreak: number = 0;
	guesses: IPlayerGuesses;
	constructor() {
		this.guesses = { fail: 0 };
		for (let i = 1; i <= DEFAULT_GUESSES; i++) {
			this.guesses[i] = 0;
		}
		this.guesses.fail = 0;
	}
}

export const DailyGame = () => {
	const { roster } = React.useContext(WorfleContext);

	const [dailyId, setDailyId] = useStateWithStorage<string>('datalore/dailyId', '', { rememberForever: true, onInitialize: variableReady });
	const [solution, setSolution] = useStateWithStorage<string>('datalore/dailySolution', '', { rememberForever: true, onInitialize: variableReady });
	const [guesses, setGuesses] = useStateWithStorage<string[]>('datalore/dailyGuesses', [], { rememberForever: true, onInitialize: variableReady });
	const [stats, setStats] = useStateWithStorage<PlayerStats>('datalore/dailyStats', new PlayerStats(), { rememberForever: true, onInitialize: variableReady });
	const [loadState, setLoadState] = React.useState<number>(0);
	const [solveState, setSolveState] = React.useState<SolveState>(SolveState.Unsolved);
	const [showStats, setShowStats] = React.useState<boolean>(false);

	const currentTime: Date = new Date();

	// Game time is current day midnight ET
	const gameTime: Date = new Date(currentTime);
	gameTime.setUTCHours(gameTime.getUTCHours() - 4);	// ET is UTC-4
	gameTime.setUTCHours(4, 0, 0, 0);	// Midnight ET is 4:00:00 UTC

	// Daily reset time is next midnight ET
	const resetTime: Date = new Date(gameTime);
	resetTime.setUTCDate(resetTime.getUTCDate() + 1)

	React.useEffect(() => {
		if (loadState === 4) initializeDailyGame();
	}, [loadState]);

	React.useEffect(() => {
		setShowStats(solveState !== SolveState.Unsolved);
	}, [solveState]);

	if (loadState < 4 || solution === '')
		return <></>;

	const rules: GameRules = new GameRules();

	return (
		<React.Fragment>
			<p>How well do you know the characters from Star Trek Timelines? We pick one mystery crew member every day. Guess who it is, using your knowledge of <b>Variants</b>, <b>Series</b>, <b>Rarity</b>, <b>Skills</b>, and <b>Traits</b> to help narrow the possibilities. You have <b>{DEFAULT_GUESSES} tries</b> to guess the mystery crew. Good luck!</p>
			<Game
				rules={rules} solution={solution}
				guesses={guesses} setGuesses={setGuesses}
				solveState={solveState} setSolveState={setSolveState}
				gameTime={gameTime} onGameEnd={handleGameEnd}
			/>
			{renderResetTime()}
			{renderStats()}
		</React.Fragment>
	);

	function variableReady(_keyName: string): void {
		setLoadState(prevState => Math.min(prevState + 1, 4));
	}

	function initializeDailyGame(): void {
		// Only consider crew currently in portal for daily game
		//	Consistency of seedrandom relies on number of crew in portal
		const portalCrew: IRosterCrew[] = roster.filter(crew => crew.in_portal);

		const getGameIdFromDate = (gameTime: Date) => {
			const utcYear: number = gameTime.getUTCFullYear();
			const utcMonth: number = gameTime.getUTCMonth() + 1;
			const utcDate: number = gameTime.getUTCDate();
			return `${utcYear}/${utcMonth}/${utcDate}`;
		};

		const getSeed = (gameId: string) => {
			const seedrandom = require('seedrandom');
			const rng = seedrandom(gameId);
			return Math.floor(rng() * portalCrew.length);
		};

		const getFreshSeed = (gameId: string) => {
			let randomSeed: number = getSeed(gameId);
			let crewIsViable: boolean = testViability(randomSeed);
			while (!crewIsViable) {
				gameId += '+';
				randomSeed = getSeed(gameId);
				crewIsViable = testViability(randomSeed);
			}
			return randomSeed;
		};

		// Viable as solution for daily game only if:
		//	1) Crew matches conditions of all defined rules (can NOT be customized)
		//	2) Not a recently-used solution
		const testViability = (index: number) => {
			const testCrew: IRosterCrew = portalCrew[index];
			return rules.series.includes(testCrew.gamified_series)
				&& rules.rarities.includes(testCrew.max_rarity)
				&& (!rules.portal_only || testCrew.in_portal)
				&& !recentSeeds.includes(index);
		};

		// Don't re-use likely solutions from the past 3 weeks
		const recentSeeds: number[] = [];
		const previousDay: Date = new Date(gameTime);
		previousDay.setUTCDate(previousDay.getUTCDate() - 21);
		for (let i = 0; i < 20; i++) {
			previousDay.setUTCDate(previousDay.getUTCDate() + 1);
			let previousId: string = getGameIdFromDate(previousDay);
			const previousSeed: number = getFreshSeed(previousId);
			recentSeeds.push(previousSeed);
		}

		// Daily game id is based on game time
		const gameId: string = getGameIdFromDate(gameTime);
		setDailyId(gameId);

		const dailySeed: number = getFreshSeed(gameId);
		const dailySolution: string = portalCrew[dailySeed].symbol;

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
		if (stats.plays === 0) return <></>;
		if (!showStats)
			return (
				<div style={{ marginTop: '2em' }}>
					<Button icon='chart bar' content='Stats' onClick={() => setShowStats(true)} />
				</div>
			);

		return (
			<React.Fragment>
				<Divider />
				<Header as='h3' /* Statistics */>
					Statistics
				</Header>
				<Statistic.Group size='small'>
					<Statistic>
						<Statistic.Value>{stats.plays}</Statistic.Value>
						<Statistic.Label /* Played */>
							Played
						</Statistic.Label>
					</Statistic>
					<Statistic>
						<Statistic.Value>{Math.floor(stats.wins/stats.plays*100)}</Statistic.Value>
						<Statistic.Label /* Win% */>
							Win%
						</Statistic.Label>
					</Statistic>
					<Statistic>
						<Statistic.Value>{stats.streak}</Statistic.Value>
						<Statistic.Label /* Current Streak */>
							Current Streak
						</Statistic.Label>
					</Statistic>
					<Statistic>
						<Statistic.Value>{stats.maxStreak}</Statistic.Value>
						<Statistic.Label /* Max Streak */>
							Max Streak
						</Statistic.Label>
					</Statistic>
				</Statistic.Group>
			</React.Fragment>
		);
	}

	function renderResetTime(): JSX.Element {
		if (!showStats || solveState === SolveState.Unsolved) return <></>;

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
