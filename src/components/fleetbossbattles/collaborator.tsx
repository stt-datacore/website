import React from 'react';
import {
	Button,
	Checkbox,
	Dimmer,
	Form,
	Icon,
	Loader,
	Message
} from 'semantic-ui-react';

import { BossBattle, Chain, Collaboration, CrewTrial, Solve, Spotter, UnlockedCharacter } from '../../model/boss';

import { UserContext, ISolverContext, SolverContext } from './context';
import { ChainSolver } from './chainsolver';

const SIMULATE_API: boolean = false;

const API_URL: string | undefined = process.env.GATSBY_DATACORE_URL;
const DEFAULT_POLL: number = 60;	// In seconds

enum FetchState {
	Idle,
	Fetching
};

enum SyncState {
	Idle,
	Syncing,
	Failed
};

interface IDetectedChanges {
	newChain: boolean;
	newSolves: boolean;
	attemptedCrew: string[];
	pendingCrew: string[];
};

interface IPostRequest {
	route: string;
	body: string;
};

type CollaboratorProps = {
	bossBattleId: number;
	fleetId: number;
	localBossBattle?: BossBattle;
	localSpotter?: Spotter;
	setLocalSpotter?: (spotter: Spotter) => void;
	userRole: 'player' | 'anonymous';
	abortCollaboration: () => void;
};

export const Collaborator = (props: CollaboratorProps) => {
	const { userPrefs, setUserPrefs } = React.useContext(UserContext);
	const { bossBattleId, fleetId, userRole, abortCollaboration } = props;

	// Simulated remote response
	const [remoteSim, setRemoteSim] = React.useState<Collaboration | undefined>(undefined);

	const [control, setControl] = React.useState<Collaboration | undefined>(undefined);

	const [fetchState, setFetchState] = React.useState<FetchState>(FetchState.Idle);
	const [syncState, setSyncState] = React.useState<SyncState>(SyncState.Idle);

	const [updatesDetected, setUpdatesDetected] = React.useState<boolean>(false);
	const [detectedChanges, setDetectedChanges] = React.useState<IDetectedChanges>({
		newChain: false,
		newSolves: false,
		attemptedCrew: [],
		pendingCrew: []
	});

	React.useEffect(() => {
		reconcileCollaboration();
	}, [bossBattleId, props.localBossBattle]);

	React.useEffect(() => {
		if (control) setUpdatesDetected(false);
	}, [control]);

	const pollingEnabled: boolean = !!control
		&& userPrefs.pollInterval > 0
		&& !updatesDetected
		&& fetchState === FetchState.Idle
		&& syncState === SyncState.Idle;

	useInterval(pollCollaboration, pollingEnabled ? userPrefs.pollInterval * 1000 : null);

	if (!control)
		return <div style={{ marginTop: '1em' }}><Icon loading name='spinner' /> Loading...</div>;

	const providerValue: ISolverContext = {
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
			ignoredTraits: []
		},
		setSpotter,
		collaboration: {
			roomCode: control.roomCode,
			userRole
		}
	};

	return (
		<React.Fragment>
			{updatesDetected && (
				<Message icon warning
					onClick={() => {
						fetchCollaboration().then(collaboration => {
							if (collaboration) setControl({...collaboration});
						})
						.catch(e => {
							console.warn('Warning! Unable to fetch collaboration after detected updates requested.', e);
						});
					}}
					style={{ cursor: 'pointer' }}
				>
					{fetchState === FetchState.Idle && <Icon name='cloud download' />}
					{fetchState === FetchState.Fetching && <Icon loading name='circle notched' />}
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
					{fetchState === FetchState.Idle && <Icon name='cloud upload' color='green' />}
					{fetchState === FetchState.Fetching && <Icon loading name='circle notched' />}
					<Message.Content>
						<Message.Header>
							Collaboration Mode Enabled{SIMULATE_API && <>{` `}*** SIMULATION ONLY! ***</>}
						</Message.Header>
						<p>You are sharing your solutions and attempted crew with all collaborating fleetmates.</p>
						{userPrefs.pollInterval > 0 && <p>You will be notified here when other players make progress on this fleet boss battle.</p>}
						<Form>
							<Form.Group inline style={{ marginBottom: '0' }}>
								<Form.Field>
									<Checkbox	/* Check for updates every DEFAULT_POLL seconds */
										label={`Check for updates every ${DEFAULT_POLL} seconds`}
										checked={userPrefs.pollInterval > 0}
										onChange={(e, { checked }) => setUserPrefs({...userPrefs, pollInterval: checked ? DEFAULT_POLL : 0})}
									/>
								</Form.Field>
								<Form.Field>
									<Button	/* Check now */
										content='Check now'
										onClick={() => {
											fetchCollaboration().then(collaboration => {
												if (collaboration) setControl({...collaboration});
											})
											.catch(e => {
												console.warn('Warning! Unable to fetch collaboration after manual check requested.', e);
											});
										}}
									/>
								</Form.Field>
							</Form.Group>
						</Form>
					</Message.Content>
				</Message>
			)}
			{syncState === SyncState.Failed && (
				<Message icon negative onDismiss={() => setSyncState(SyncState.Idle)}>
					<Icon name='warning sign' />
					Error! Unable to synchronize. The service may not be available right now. Please try again. If the error persists, contact the DataCore support team.
				</Message>
			)}
			<SolverContext.Provider value={providerValue}>
				<ChainSolver key={control.chain.id} />
			</SolverContext.Provider>
			<Dimmer active={syncState === SyncState.Syncing} page>
				<Loader />
			</Dimmer>
		</React.Fragment>
	);

	function setSpotter(spotter: Spotter): void {
		if (!control) return;

		setSyncState(SyncState.Syncing);
		const chainIndex: number = control.chainIndex;
		postSpotter(chainIndex, spotter).then(postSuccessful => {
			if (postSuccessful) {
				// Update control from spotter (to update UI immediately)
				setControl({
					...control,
					solves: spotter.solves,
					trials: getCrewTrialsFromSpotter(spotter)
				})

				// Update local spotter (to preserve spotter when disabling collaboration)
				if (props.setLocalSpotter) props.setLocalSpotter({...spotter});

				setSyncState(SyncState.Idle);

				// Update control from remote (to download new collaborations)
				fetchCollaboration().then(collaboration => {
					if (collaboration) setControl({...collaboration});
				})
				.catch(e => {
					console.warn('Warning! Unable to fetch collaboration after posting spotter.', e);
				});
			}
			else {
				setSyncState(SyncState.Failed);
				console.error('Error! Unable to post spotter to remote.');
			}
		});
	}

	function reconcileCollaboration(): void {
		fetchCollaboration().then(remoteCollaboration => {
			const localBossBattle: BossBattle | undefined = props.localBossBattle;
			const localSpotter: Spotter | undefined = props.localSpotter;

			// Remote and local exists
			if (remoteCollaboration && localBossBattle) {
				// Chain newer on remote => use remote as control
				if (remoteCollaboration.chainIndex > localBossBattle.chainIndex) {
					setControl({...remoteCollaboration});
				}
				else {
					const countSolves = (chain: Chain) => {
						return chain.nodes.filter(node => node.unlocked_character);
					};
					// Chain newer on local OR authenticated solves count higher on local
					//	=> POST localBossBattle/localSpotter and use as control
					if (localBossBattle.chainIndex > remoteCollaboration.chainIndex || countSolves(localBossBattle.chain) > countSolves(remoteCollaboration.chain)) {
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
							else {
								abortCollaboration();
								console.error('Error! Unable to post updated local data to remote.');
							}
						});
					}
					// Same chain => POST localSpotter and use merge as control
					else {
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
				}
			}
			// No remote => POST localBossBattle and localSpotter, and use as control
			else if (localBossBattle) {
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
					else {
						abortCollaboration();
						console.error('Error! Unable to post initial local data to remote.');
					}
				});
			}
			// No local => use remote as control
			else if (remoteCollaboration) {
				setControl({...remoteCollaboration});
			}
			// No remote OR local => ERROR!
			else {
				abortCollaboration();
				console.error('Error! No fleet boss battle data.');
			}
		})
		.catch(e => {
			abortCollaboration();
			console.error('Error! Unable to connect to collaboration API.', e);
		});
	}

	async function fetchCollaboration(): Promise<Collaboration | undefined> {
		setFetchState(FetchState.Fetching);
		if (SIMULATE_API) {
			return new Promise((resolve, reject) => {
				if (remoteSim) {
					setTimeout(() => {
						resolve(remoteSim);
						setFetchState(FetchState.Idle);
					}, Math.random()*1000);
				}
				else {
					resolve(undefined);
					setFetchState(FetchState.Idle);
				}
			});
		}

		const route: string = `${API_URL}api/getBossBattle?fleetId=${fleetId}&id=${bossBattleId}`;
		return fetch(route)
			.then((response: Response) => {
				if (response.status !== 200) throw(response.statusText);
				return response.json();
			})
			.then((result: Collaboration[]) => {
				if (result.length === 0) return undefined;
				const collaboration: Collaboration = result[0];
				// Remove duplicate solves here
				const validatedSolves: Solve[] = [];
				collaboration.solves.forEach(solve => {
					const existing: Solve | undefined = validatedSolves.find(existing => existing.node === solve.node);
					// Assume newer entries are more accurate on duplicate solve
					if (existing) {
						existing.traits = solve.traits;
						existing.crew = solve.crew;
					}
					else {
						validatedSolves.push(solve);
					}
				});
				// Also remove solves where all traits are ? (i.e. an undone solve)
				collaboration.solves = validatedSolves.filter(solve => !solve.traits.every(trait => trait === '?'));
				// Remove duplicate trials here
				const validatedTrials: CrewTrial[] = [];
				collaboration.trials.forEach(trial => {
					const existing: CrewTrial | undefined = validatedTrials.find(existing => existing.crewSymbol === trial.crewSymbol);
					// Assume attempt is more accurate on duplicate trial
					if (existing) {
						if (trial.trialType === 'attemptedCrew') existing.trialType = 'attemptedCrew';
					}
					else {
						validatedTrials.push(trial);
					}
				});
				collaboration.trials = validatedTrials;
				return collaboration;
			})
			.catch(e => {
				// fetchCollaboration callers should CATCH ERRORS
				//	INITIAL fetchCollaboration error => abort collaboration
				//	SUBSEQUENT fetchCollaboration errors => silently ignore
				throw(e);
			})
			.finally(() => setFetchState(FetchState.Idle));
	}

	async function postBossBattle(bossBattle: BossBattle): Promise<boolean> {
		if (SIMULATE_API) {
			return new Promise((resolve, reject) => {
				const newCollaboration: Collaboration = {
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
				};
				setRemoteSim({...newCollaboration});
				setControl({...newCollaboration});
				resolve(false);
			});
		}

		const route: string = `${API_URL}api/postBossBattle`;
		return fetch(route, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(bossBattle)
			})
			.then((response: Response) => {
				return response.status === 201;
			})
			.catch(e => {
				// postBossBattle callers should handle FALSE response
				//	ALL postBossBattle errors => abort collaboration
				console.warn('Warning! Unable to post collaboration.', e);
				return false;
			});
	}

	async function postSpotter(chainIndex: number, spotter: Spotter): Promise<boolean> {
		if (SIMULATE_API) {
			return new Promise((resolve, reject) => {
				if (!remoteSim) {
					resolve(false);
					return;
				}
				const newSim: Collaboration = JSON.parse(JSON.stringify(remoteSim));
				newSim.solves = spotter.solves;
				const newTrials: CrewTrial[] = [];
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

		const postRequests: IPostRequest[] = [];

		const sameChain: boolean = control?.chainIndex === chainIndex;

		// Only post solves if new chain or new solve on the same chain
		const solvesToPost: Solve[] = [];
		spotter.solves.forEach(spotterSolve => {
			const alreadyPosted: Solve | undefined = control?.solves.find(controlSolve =>
				sameChain
					&& controlSolve.node === spotterSolve.node
					&& controlSolve.traits.length === spotterSolve.traits.length
					&& controlSolve.traits.every(trait => spotterSolve.traits.includes(trait))
					&& controlSolve.crew.length === spotterSolve.crew.length
			);
			if (!alreadyPosted) solvesToPost.push(spotterSolve);
		});
		if (solvesToPost.length > 0) {
			postRequests.push({
				route: `${API_URL}api/postBossBattleSolves`,
				body: JSON.stringify({
					fleetId,
					bossBattleId,
					chainIndex,
					solves: solvesToPost
				})
			});
		}

		// Delete trials first if fewer trials are in spotter than control
		const deleteTrialsFirst: boolean = sameChain && getCrewTrialsFromSpotter(spotter).length < (control?.trials ?? []).length;

		// Only post trials if new chain, new trial on the same chain, or fewer trials in spotter than control
		const trialsToPost: CrewTrial[] = [];
		['attemptedCrew', 'pendingCrew'].forEach(trialType => {
			spotter[trialType].forEach((crewSymbol: string) => {
				const alreadyPosted: CrewTrial | undefined = control?.trials.find(controlTrial =>
					sameChain
						&& controlTrial.crewSymbol === crewSymbol
						&& controlTrial.trialType === trialType
				);
				if (deleteTrialsFirst || !alreadyPosted) trialsToPost.push({ crewSymbol, trialType });
			});
		});
		if (trialsToPost.length > 0) {
			postRequests.push({
				route: `${API_URL}api/postBossBattleTrials`,
				body: JSON.stringify({
					fleetId,
					bossBattleId,
					chainIndex,
					trials: trialsToPost
				})
			});
		}

		// postSpotter callers should handle FALSE response
		//	ALL postSpotter errors => try again prompt
		if (deleteTrialsFirst) {
			return deleteTrials(chainIndex)
				.then(deleteSuccessful => {
					if (deleteSuccessful) return postAllAsync(postRequests);
					return false;
				});
		}
		return postAllAsync(postRequests);
	}

	async function deleteTrials(chainIndex: number): Promise<boolean> {
		const route: string = `${API_URL}api/deleteBossBattleTrial?fleetId=${fleetId}&bossBattleId=${bossBattleId}&chainIndex=${chainIndex}`;
		return fetch(route, { method: 'delete' })
			.then((response: Response) => {
				return response.status === 200;
			})
			.catch(e => {
				// deleteTrials callers should handle FALSE response
				//	ALL deleteTrials errors => try again prompt
				console.warn('Warning! Unable to delete trials.', e);
				return false;
			});
	}

	async function postAllAsync(postRequests: IPostRequest[]): Promise<boolean> {
		return Promise.all(postRequests.map(async request => {
			await fetch(request.route, {
				method: 'post',
				headers: { 'Content-Type': 'application/json' },
				body: request.body
			});
		}))
		.then(() => true)
		.catch(e => {
			// postAllAsync callers should handle FALSE response
			//	ALL postAllAsync errors => try again prompt
			console.warn('Warning! Unable to post all async requests.', e);
			return false;
		});
	}

	function pollCollaboration(): void {
		if (!control) return;

		const compareSolves = (a: Collaboration, b: Collaboration) => {
			let differs: boolean = false;
			for (let nodeIndex = 0; nodeIndex < a.chain.nodes.length; nodeIndex++) {
				const aUnlocked: UnlockedCharacter | undefined = a.chain.nodes[nodeIndex].unlocked_character;
				const bUnlocked: UnlockedCharacter | undefined = b.chain.nodes[nodeIndex].unlocked_character;
				if ((aUnlocked && !bUnlocked) || (!aUnlocked && bUnlocked)) {
					differs = true;
				}
				else {
					const aSolve: Solve | undefined = a.solves.find(solve => solve.node === nodeIndex);
					const bSolve: Solve | undefined = b.solves.find(solve => solve.node === nodeIndex);
					if ((aSolve && !bSolve) || (!aSolve && bSolve)) {
						differs = true;
					}
					else if (aSolve && bSolve) {
						if ((aSolve.traits.length !== bSolve.traits.length) || (!aSolve.traits.every(aTrait => bSolve.traits.includes(aTrait)))) {
							differs = true;
						}
						else if ((aSolve.crew.length !== bSolve.crew.length) || (!aSolve.crew.every(aCrew => bSolve.crew.includes(aCrew)))) {
							differs = true;
						}
					}
				}
				if (differs) break;
			}
			return differs;
		};

		fetchCollaboration().then(remoteCollaboration => {
			if (remoteCollaboration) {
				const newChain: boolean = control.chainIndex !== remoteCollaboration.chainIndex;
				const newSolves: boolean = newChain || compareSolves(control, remoteCollaboration);
				const newTrials: CrewTrial[] = [];
				remoteCollaboration.trials.forEach(trial => {
					const existing: CrewTrial | undefined = control.trials.find(existing =>
						existing.crewSymbol === trial.crewSymbol && existing.trialType === trial.trialType
					);
					if (!existing) newTrials.push(trial);
				});
				const attemptedCrew: string[] = newTrials.filter(trial => trial.trialType === 'attemptedCrew').map(trial => trial.crewSymbol);
				const pendingCrew: string[] = newTrials.filter(trial => trial.trialType === 'pendingCrew').map(trial => trial.crewSymbol);
				setDetectedChanges({
					newChain, newSolves, attemptedCrew, pendingCrew
				});
				setUpdatesDetected(
					newChain
						|| newSolves
						|| attemptedCrew.length > 0
						|| pendingCrew.length > 0
						|| control.trials.length !== remoteCollaboration.trials.length
				);
			}
		})
		.catch(e => {
			console.warn('Warning! Unable to fetch collaboration for polling.', e);
		});
	}

	function getCrewTrialsFromSpotter(spotter: Spotter): CrewTrial[] {
		const crewTrials: CrewTrial[] = [];
		['attemptedCrew', 'pendingCrew'].forEach(trialType => {
			spotter[trialType].forEach((crewSymbol: string) => {
				crewTrials.push({
					crewSymbol,
					trialType
				});
			});
		});
		return crewTrials;
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
