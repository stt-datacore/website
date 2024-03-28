import React from 'react';
import { Icon, Message, Form, Checkbox, Button } from 'semantic-ui-react';

import { BossBattle, Chain, Collaboration, CrewTrial, Solve, Spotter } from '../../model/boss';

import { UserContext, ISolverContext, SolverContext } from './context';
import { ChainSolver } from './chainsolver';

const API_URL = process.env.GATSBY_DATACORE_URL;
const SIMULATE_API = false;

interface IDetectedChanges {
	newChain: boolean;
	newSolves: boolean;
	attemptedCrew: string[];
	pendingCrew: string[];
};

type CollaboratorProps = {
	bossBattleId: number;
	localBossBattle?: BossBattle;
	localSpotter?: Spotter;
	setLocalSpotter?: (spotter: Spotter) => void;
	userRole: 'player' | 'anonymous';
};

export const Collaborator = (props: CollaboratorProps) => {
	const { userPrefs, setUserPrefs } = React.useContext(UserContext);
	const { bossBattleId, userRole } = props;

	// Simulated remote response
	const [remoteSim, setRemoteSim] = React.useState<Collaboration | undefined>(undefined);

	const [control, setControl] = React.useState<Collaboration | undefined>(undefined);
	const [isChecking, setIsChecking] = React.useState(false);

	const [updatesDetected, setUpdatesDetected] = React.useState(false);
	const [detectedChanges, setDetectedChanges] = React.useState<IDetectedChanges>({
		newChain: false,
		newSolves: false,
		attemptedCrew: [] as string[],
		pendingCrew: [] as string[]
	});

	React.useEffect(() => {
		reconcileCollaboration();
	}, [bossBattleId, props.localBossBattle]);

	React.useEffect(() => {
		if (control) setUpdatesDetected(false);
	}, [control]);

	const pollingEnabled = control && !updatesDetected && userPrefs.pollInterval > 0 && !isChecking;

	useInterval(pollCollaboration, pollingEnabled ? userPrefs.pollInterval*1000 : null);

	if (!control)
		return (<div style={{ marginTop: '1em' }}><Icon loading name='spinner' /> Loading...</div>);

	const providerValue = {
		bossBattleId,
		bossBattle: {
			id: control.bossBattleId,
			fleetId: control.fleetId,
			bossGroup: control.bossGroup,
			difficultyId: control.difficultyId,
			chainIndex: control.chainIndex,
			chain: control.chain,
			description: control.description
		},
		spotter: {
			id: control.chain.id,
			solves: control.solves,
			attemptedCrew: control.trials.filter(trial => trial.trialType === 'attemptedCrew').map(trial => trial.crewSymbol),
			pendingCrew: control.trials.filter(trial => trial.trialType === 'pendingCrew').map(trial => trial.crewSymbol),
			ignoredTraits: [] as string[]
		},
		setSpotter,
		collaboration: {
			roomCode: control.roomCode,
			userRole
		}
	} as ISolverContext;

	return (
		<React.Fragment>
			{updatesDetected && (
				<Message icon warning
					onClick={() => { fetchCollaboration().then(collaboration => { if (collaboration) setControl({...collaboration}); }) }}
					style={{ cursor: 'pointer' }}
				>
					{!isChecking && <Icon name='cloud download' />}
					{isChecking && <Icon loading name='circle notched' />}
					<Message.Content>
						<Message.Header>
							Collaboration Updates Available!
						</Message.Header>
						<p>There are updates available to this collaboration. Tap here to refresh this tool with the latest information.</p>
					</Message.Content>
				</Message>
			)}
			{!updatesDetected && (
				<Message icon>
					{!isChecking && <Icon name='cloud upload' color='green' />}
					{isChecking && <Icon loading name='circle notched' />}
					<Message.Content>
						<Message.Header>
							Collaboration Mode Enabled{SIMULATE_API && <>{` `}*** SIMULATION ONLY! ***</>}
						</Message.Header>
						<p>You are now sharing your solutions and attempted crew with all collaborating fleetmates. You will also be notified here when other players make progress on this fleet boss battle.</p>
						<Form>
							<Form.Group inline style={{ marginBottom: '0' }}>
								<Form.Field>
									<Checkbox
										label='Check for updates every 60 seconds'
										checked={userPrefs.pollInterval > 0}
										onChange={(e, { checked }) => setUserPrefs({...userPrefs, pollInterval: checked ? 60 : 0})}
									/>
								</Form.Field>
								<Form.Field>
									<Button
										content='Check now'
										onClick={() => { fetchCollaboration().then(collaboration => { if (collaboration) setControl({...collaboration}); }) }}
									/>
								</Form.Field>
							</Form.Group>
						</Form>
					</Message.Content>
				</Message>
			)}
			<SolverContext.Provider value={providerValue}>
				<ChainSolver key={control.chain.id} />
			</SolverContext.Provider>
		</React.Fragment>
	);

	function setSpotter(spotter: Spotter): void {
		if (!control) return;

		const chainIndex = control.chainIndex;
		postSpotter(chainIndex, spotter).then(() => {
			if (props.setLocalSpotter) props.setLocalSpotter({...spotter});
			fetchCollaboration().then(collaboration => {
				if (collaboration) setControl({...collaboration});
			});
		});
	}

	function reconcileCollaboration(): void {
		fetchCollaboration().then(remoteCollaboration => {
			const localBossBattle = props.localBossBattle;
			const localSpotter = props.localSpotter;

			// Remote and local exists, so compare which one is newer
			if (remoteCollaboration && localBossBattle) {
				// Newer is if chainIndex is higher or solved nodes is higher
				const isLocalNewer = () => {
					if (localBossBattle.chainIndex > remoteCollaboration.chainIndex) return true;
					const countSolves = (chain: Chain) => {
						return chain.nodes.filter(node => node.unlocked_character);
					};
					return countSolves(localBossBattle.chain) > countSolves(remoteCollaboration.chain);
				};
				// If props.localBossBattle is newer, POST props.localBossBattle and use as control
				if (isLocalNewer()) {
					postBossBattle(localBossBattle).then(postSuccessful => {
						if (postSuccessful) {
							if (localSpotter) {
								postSpotter(localBossBattle.chainIndex, localSpotter).then(() => {
									fetchCollaboration().then(collaboration => {
										if (collaboration) setControl({...collaboration});
									});
								});
							}
							else {
								fetchCollaboration().then(collaboration => {
									if (collaboration) setControl({...collaboration});
								});
							}
						}
					});
				}
				// If remote is newer, use remote as control
				else {
					setControl({...remoteCollaboration});
				}
			}
			// No remote => use local as control
			else if (localBossBattle) {
				// POST props.localBossBattle and use as control
				postBossBattle(localBossBattle).then(postSuccessful => {
					if (postSuccessful) {
						if (localSpotter) {
							postSpotter(localBossBattle.chainIndex, localSpotter).then(() => {
								fetchCollaboration().then(collaboration => {
									if (collaboration) setControl({...collaboration});
								});
							});
						}
						else {
							fetchCollaboration().then(collaboration => {
								if (collaboration) setControl({...collaboration});
							});
						}
					}
				});
			}
			// No local => use remote as control
			else if (remoteCollaboration) {
				setControl({...remoteCollaboration});
			}
			// No remote OR local => ERROR!
			else {
				throw('No fleet boss battle data!');
			}
		});
	}

	async function fetchCollaboration(): Promise<Collaboration | undefined> {
		setIsChecking(true);
		if (SIMULATE_API) {
			return new Promise((resolve, reject) => {
				if (remoteSim) {
					setTimeout(() => {
						resolve(remoteSim);
						setIsChecking(false);
					}, Math.random()*1000);
				}
				else {
					resolve(undefined);
					setIsChecking(false);
				}
			});
		}

		const route = `${API_URL}api/getBossBattle?id=${bossBattleId}`;
		return fetch(route)
			.then((response: Response) => response.json())
			.then((result: Collaboration[]) => {
				if (result.length === 0) return undefined;
				const collaboration = result[0];
				// Remove duplicate solves here
				const validatedSolves = [] as Solve[];
				collaboration.solves.forEach(solve => {
					const existing = validatedSolves.find(existing => existing.node === solve.node);
					if (existing) {
						existing.traits = solve.traits;	// Assume newer traits are more accurate on duplicate solve
					}
					else {
						validatedSolves.push(solve);
					}
				});
				collaboration.solves = validatedSolves;
				// Remove duplicate trials here
				const validatedTrials = [] as CrewTrial[];
				collaboration.trials.forEach(trial => {
					const existing = validatedTrials.find(existing => existing.crewSymbol === trial.crewSymbol);
					if (existing) {
						if (trial.trialType === 'attemptedCrew') existing.trialType = 'attemptedCrew';	// Assume attempt is more accurate on duplicate trial
					}
					else {
						validatedTrials.push(trial);
					}
				});
				collaboration.trials = validatedTrials;
				return collaboration;
			})
			.catch((error) => { throw(error); })
			.finally(() => setIsChecking(false));
	}

	async function postBossBattle(bossBattle: BossBattle): Promise<boolean> {
		if (SIMULATE_API) {
			return new Promise((resolve, reject) => {
				const newCollaboration = {
					bossBattleId: bossBattle.id,
					fleetId: bossBattle.fleetId,
					bossGroup: bossBattle.bossGroup,
					difficultyId: bossBattle.difficultyId,
					chainIndex: bossBattle.chainIndex,
					chain: bossBattle.chain,
					description: bossBattle.description,
					roomCode: 'ABCDE',
					solves: [],
					trials: []
				} as Collaboration;
				setRemoteSim({...newCollaboration});
				setControl({...newCollaboration});
				resolve(false);
			});
		}

		const route = `${API_URL}api/postBossBattle`;
		return fetch(route, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(bossBattle)
			})
			.then((response: Response) => !!response)
			.catch((error) => { throw(error); });
	}

	async function postSpotter(chainIndex: number, spotter: Spotter): Promise<boolean> {
		if (SIMULATE_API) {
			return new Promise((resolve, reject) => {
				if (!remoteSim) {
					resolve(false);
					return;
				}
				const newSim = JSON.parse(JSON.stringify(remoteSim)) as Collaboration;
				newSim.solves = spotter.solves;
				const newTrials = [] as CrewTrial[];
				['attemptedCrew', 'pendingCrew'].forEach(trialType => {
					spotter[trialType].forEach((crewSymbol: string) => {
						newTrials.push({ crewSymbol, trialType });
					});
				});
				newSim.trials = newTrials;
				setRemoteSim({...newSim});
				resolve(false);
			});
		}

		interface PostRequest {
			route: string;
			body: string;
		};
		const postRequests = [] as PostRequest[];

		const newSolves = [] as Solve[];
		spotter.solves.forEach(solve => {
			const exists = control?.solves.find(control =>
				control.node === solve.node
				&& control.traits.length === solve.traits.length
				&& control.traits.every(trait => solve.traits.includes(trait))
			);
			if (!exists) newSolves.push(solve);
		});
		if (newSolves.length > 0) {
			postRequests.push({
				route: `${API_URL}api/postBossBattleSolves`,
				body: JSON.stringify({
					bossBattleId,
					chainIndex,
					solves: newSolves
				})
			});
		}

		const newTrials = [] as CrewTrial[];
		['attemptedCrew', 'pendingCrew'].forEach(trialType => {
			spotter[trialType].forEach((crewSymbol: string) => {
				const exists = control?.trials.find(trial => trial.crewSymbol === crewSymbol && trial.trialType === trialType);
				if (!exists) newTrials.push({ crewSymbol, trialType });
			});
		});
		if (newTrials.length > 0) {
			postRequests.push({
				route: `${API_URL}api/postBossBattleTrials`,
				body: JSON.stringify({
					bossBattleId,
					chainIndex,
					trials: newTrials
				})
			});
		}

		return Promise.all(postRequests.map(async request => {
			await fetch(request.route, {
				method: 'post',
				headers: { 'Content-Type': 'application/json' },
				body: request.body
			});
		}))
		.then(() => true);
	}

	function pollCollaboration(): void {
		if (!control) return;

		const countSolves = (collaboration: Collaboration) => {
			let solved = 0;
			collaboration.chain.nodes.forEach((node, nodeIndex) => {
				if (node.unlocked_character) {
					solved++;
				}
				else {
					const solve = collaboration.solves.find(solve => solve.node === nodeIndex);
					if (solve) solved++;
				}
			});
			return solved;
		};

		fetchCollaboration().then(remoteCollaboration => {
			if (remoteCollaboration) {
				const newChain = control.chainIndex !== remoteCollaboration.chainIndex;
				const newSolves = countSolves(control) !== countSolves(remoteCollaboration);
				const newTrials = [] as CrewTrial[];
				remoteCollaboration.trials.forEach(trial => {
					const existing = control.trials.find(existing => existing.crewSymbol === trial.crewSymbol && existing.trialType === trial.trialType);
					if (!existing) newTrials.push(trial);
				});
				const attemptedCrew = newTrials.filter(trial => trial.trialType === 'attemptedCrew').map(trial => trial.crewSymbol);
				const pendingCrew = newTrials.filter(trial => trial.trialType === 'pendingCrew').map(trial => trial.crewSymbol);
				setDetectedChanges({
					newChain, newSolves, attemptedCrew, pendingCrew
				});
				setUpdatesDetected(newChain || newSolves || attemptedCrew.length > 0 || pendingCrew.length > 0);
			}
		});
	}
};

const useInterval = (callback: Function, delay?: number | null) => {
	const savedCallback = React.useRef<Function>(() => {});
	React.useEffect(() => {
		savedCallback.current = callback;
	}, [callback]);
	React.useEffect(() => {
		if (delay !== null) {
			const interval = setInterval(() => savedCallback.current(), delay || 0);
			return () => clearInterval(interval);
		}
		return undefined;
	}, [delay]);
};
