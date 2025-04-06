import React from 'react';
import { Dropdown, Checkbox, Icon, Message } from 'semantic-ui-react';

import { BossBattle, BossCrew, BossGroup, ExportPreferences, SoloPreferences, Spotter, SpotterPreferences, Status, UserPreferences } from '../../model/boss';
import { GlobalContext } from '../../context/globalcontext';
import { crewCopy } from '../../utils/crewutils';
import { useStateWithStorage } from '../../utils/storage';

import { userDefaults, exportDefaults, soloDefaults, spotterDefaults } from './fbbdefaults';
import { IUserContext, UserContext, ISolverContext, SolverContext } from './context';
import { ChainSolver } from './chainsolver';
import { Collaborator } from './collaborator';

export const DIFFICULTY_NAME = {
	1: 'Easy',
	2: 'Normal',
	3: 'Hard',
	4: 'Brutal',
	5: 'Nightmare',
	6: 'Ultra-Nightmare'
};

type PlayerBossBattleProps = {
	dbid: string;
};

export const PlayerBossBattle = (props: PlayerBossBattleProps) => {
	const globalContext = React.useContext(GlobalContext);
	const { playerData } = globalContext.player;

	const [bossCrew, setBossCrew] = React.useState<BossCrew[] | undefined>(undefined);
	const [userPrefs, setUserPrefs] = useStateWithStorage<UserPreferences>(props.dbid+'/fbb/prefs', userDefaults, { rememberForever: true });
	const [spotterPrefs, setSpotterPrefs] = useStateWithStorage<SpotterPreferences>(props.dbid+'/fbb/filtering', spotterDefaults, { rememberForever: true });
	const [soloPrefs, setSoloPrefs] = useStateWithStorage<SoloPreferences>(props.dbid+'/fbb/soloing', soloDefaults, { rememberForever: true });
	const [exportPrefs, setExportPrefs] = useStateWithStorage<ExportPreferences>(props.dbid+'/fbb/exporting', exportDefaults, { rememberForever: true });

	React.useEffect(() => {
		// Calculate highest owned rarities
		const bossCrew = crewCopy(globalContext.core.crew.filter(c => !c.preview)) as BossCrew[];
		bossCrew.forEach(crew => {
			const owned = playerData?.player.character.crew.filter(oc => oc.symbol === crew.symbol) ?? [];
			crew.highest_owned_rarity = owned.length > 0 ? owned.sort((a, b) => b.rarity - a.rarity)[0].rarity : 0;
			crew.only_frozen = owned.length > 0 && owned.filter(oc => oc.immortal > 0).length === owned.length;
			crew.only_expiring = owned.length > 0 && owned.every(o => !!o.expires_in);
		});
		setBossCrew([...bossCrew]);
	}, [playerData]);

	if (!playerData) return <></>;

	const providerValue = {
		userType: 'player',
		bossCrew,
		userPrefs, setUserPrefs,
		spotterPrefs, setSpotterPrefs,
		soloPrefs, setSoloPrefs,
		exportPrefs, setExportPrefs
	} as IUserContext;

	return (
		<React.Fragment>
			<UserContext.Provider value={providerValue}>
				<BossBattlePicker />
			</UserContext.Provider>
		</React.Fragment>
	);
};

interface BossBattleOption {
	key: number;
	value: number;
	text: string;
};

const BossBattlePicker = () => {
	const globalContext = React.useContext(GlobalContext);
	const { t } = globalContext.localized;
	const { ephemeral } = globalContext.player;

	const [bossBattleOptions, setBossBattleOptions] = React.useState<BossBattleOption[] | undefined>(undefined);
	const [activeBossBattleId, setActiveBossBattleId] = React.useState<number | undefined>(undefined);
	const [collaborationEnabled, setCollaborationEnabled] = React.useState(false);

	React.useEffect(() => {
		if (!ephemeral) return;
		const bossGroups = ephemeral?.fleetBossBattlesRoot?.groups ?? [] as BossGroup[];
		const bossBattleOptions = [] as BossBattleOption[];
		ephemeral.fleetBossBattlesRoot.statuses.forEach(status => {
			if (status.id && status.combo && status.ends_in) {
				const unlockedNodes = status.combo.nodes.filter(node => node.unlocked_character);
				if (status.combo.nodes.length - unlockedNodes.length > 0) {
					bossBattleOptions.push(
						{
							key: status.id,
							value: status.id,
							text: describeBoss(bossGroups, status)
						}
					);
				}
			}
		});
		setBossBattleOptions([...bossBattleOptions]);
		if (!activeBossBattleId && bossBattleOptions.length === 1)
			setActiveBossBattleId(bossBattleOptions[0].value);
	}, [ephemeral]);

	React.useEffect(() => {
		setCollaborationEnabled(false);
	}, [activeBossBattleId]);

	if (!bossBattleOptions)
		return (<><Icon loading name='spinner' /> Loading...</>);

	if (bossBattleOptions.length === 0)
		return <Message>No boss data found. Please import an updated version of your player data.</Message>;

	return (
		<React.Fragment>
			{bossBattleOptions.length > 0 &&
				<div style={{ display: 'flex', flexFlow: 'row wrap', alignItems: 'center', columnGap: '1em' }}>
					<Dropdown selection
						placeholder={t('fbb.select')}
						options={bossBattleOptions}
						value={activeBossBattleId}
						onChange={(e, { value }) => setActiveBossBattleId(value as number)}
					/>
					{/* {activeBossBattleId &&
						<Checkbox toggle
							label='Collaborate'
							checked={collaborationEnabled}
							onClick={() => setCollaborationEnabled(!collaborationEnabled)}
						/>
					} */}
				</div>
			}
			{bossBattleOptions.length === 0 && <Message>You have no open fleet boss battles.</Message>}
			{activeBossBattleId && (
				<BossBattleSpotter key={activeBossBattleId}
					bossBattleId={activeBossBattleId}
					collaborationEnabled={collaborationEnabled}
				/>
			)}
		</React.Fragment>
	);
};

type BossBattleSpotterProps = {
	bossBattleId: number;
	collaborationEnabled: boolean;
};

const BossBattleSpotter = (props: BossBattleSpotterProps) => {
	const globalContext = React.useContext(GlobalContext);
	const { playerData, ephemeral } = globalContext.player;
	const { bossBattleId, collaborationEnabled } = props;

	const [bossBattle, setBossBattle] = React.useState<BossBattle | undefined>(undefined);
	const [spotter, setSpotter] = useStateWithStorage<Spotter | undefined>(`fbb/${bossBattleId}/spotter`, undefined);
	const [spotterBattleId, setSpotterBattleId] = useStateWithStorage<string | undefined>(`fbb/spotterBattleId`, undefined);

	React.useEffect(() => {
		if (!playerData || !ephemeral) return;

		const status = ephemeral.fleetBossBattlesRoot.statuses.find(status => status.id === bossBattleId);
		if (!status || !status.combo) return;

		const bossGroups = ephemeral.fleetBossBattlesRoot?.groups ?? [] as BossGroup[];
		const chainIndex = status.combo.previous_node_counts.length;

		const bossBattle = {
			id: status.id,
			fleetId: playerData.player.fleet.id,
			bossGroup: status.group,
			difficultyId: status.difficulty_id,
			chainIndex,
			chain: {
				id: `${status.id}-${chainIndex}`,
				traits: status.combo.traits,
				nodes: status.combo.nodes
			},
			description: describeBoss(bossGroups, status)
		} as BossBattle;
		setBossBattle({...bossBattle});

		if (!spotter || ((!collaborationEnabled) && spotterBattleId !== bossBattle.chain.id)) {
			setSpotter({
				id: bossBattle.chain.id,
				solves: [],
				attemptedCrew: [],
				pendingCrew: [],
				ignoredTraits: []
			});
			setSpotterBattleId(bossBattle.chain.id);
		}
	}, [ephemeral, playerData, bossBattleId]);

	if (!bossBattle || !spotter) return <></>;

	if (!collaborationEnabled && bossBattle.chain.id !== spotter.id)
		return <Message>Your fleet boss battle data may be outdated. Please import an updated version of your player data.</Message>;

	return (
		<React.Fragment>
			{!collaborationEnabled &&
				<SoloPlayer
					bossBattle={bossBattle}
					spotter={spotter}
					setSpotter={setSpotter}
				/>
			}
			{collaborationEnabled &&
				<Collaborator
					bossBattleId={bossBattle.id}
					localBossBattle={bossBattle}
					localSpotter={spotter}
					setLocalSpotter={setSpotter}
					userRole='player'
				/>
			}
		</React.Fragment>
	)
};

type SoloPlayerProps = {
	bossBattle: BossBattle;
	spotter: Spotter;
	setSpotter: (spotter: Spotter) => void;
};

const SoloPlayer = (props: SoloPlayerProps) => {
	const { bossBattle, spotter, setSpotter } = props;

	const chainId = bossBattle.chain.id;

	const providerValue = {
		bossBattleId: bossBattle.id,
		bossBattle,
		spotter, setSpotter
	} as ISolverContext;

	return (
		<React.Fragment>
			<SolverContext.Provider value={providerValue}>
				<ChainSolver key={chainId} />
			</SolverContext.Provider>
		</React.Fragment>
	);
};

const describeBoss = (bossGroups: BossGroup[], bossBattle: Status) => {
	const description = [] as string[];
	const bossName = bossGroups.find(group => group.symbol === bossBattle.group)?.name;
	if (bossName) description.push(bossName);
	description.push(`${DIFFICULTY_NAME[bossBattle.difficulty_id]}`);
	return description.join(', ');
};
