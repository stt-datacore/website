import React from 'react';
import {
	Checkbox,
	Dropdown,
	DropdownItemProps,
	Icon,
	Message
} from 'semantic-ui-react';

import { BossBattle, BossCrew, BossGroup, ComboNode, ExportPreferences, SoloPreferences, Spotter, SpotterPreferences, Status, UserPreferences } from '../../model/boss';
import { PlayerCrew } from '../../model/player';
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

enum CollaborationMode {
	Disabled,
	Enabled,
	Failed
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
			const owned: PlayerCrew[] = playerData?.player.character.crew.filter(oc => oc.symbol === crew.symbol) ?? [];
			crew.highest_owned_rarity = owned.length > 0 ? owned.sort((a, b) => b.rarity - a.rarity)[0].rarity : 0;
			crew.only_frozen = owned.length > 0 && owned.filter(oc => oc.immortal > 0).length === owned.length;
			crew.only_expiring = owned.length > 0 && owned.every(o => !!o.expires_in);
		});
		setBossCrew([...bossCrew]);
	}, [playerData]);

	if (!playerData) return <></>;

	const providerValue: IUserContext = {
		userType: 'player',
		bossCrew: bossCrew ?? [],
		userPrefs, setUserPrefs,
		spotterPrefs, setSpotterPrefs,
		soloPrefs, setSoloPrefs,
		exportPrefs, setExportPrefs
	};

	return (
		<React.Fragment>
			<UserContext.Provider value={providerValue}>
				<BossBattlePicker />
			</UserContext.Provider>
		</React.Fragment>
	);
};

const BossBattlePicker = () => {
	const globalContext = React.useContext(GlobalContext);
	const { t } = globalContext.localized;
	const { ephemeral } = globalContext.player;

	const [bossBattleOptions, setBossBattleOptions] = React.useState<DropdownItemProps[] | undefined>(undefined);
	const [activeBossBattleId, setActiveBossBattleId] = React.useState<number | undefined>(undefined);
	const [collaborationMode, setCollaborationMode] = React.useState<CollaborationMode>(CollaborationMode.Disabled);

	React.useEffect(() => {
		if (!ephemeral) return;
		const bossGroups: BossGroup[] = ephemeral?.fleetBossBattlesRoot?.groups ?? [];
		const bossBattleOptions: DropdownItemProps[] = [];
		ephemeral.fleetBossBattlesRoot.statuses.forEach(status => {
			if (status.id && status.combo && status.ends_in) {
				const unlockedNodes: ComboNode[] = status.combo.nodes.filter(node => node.unlocked_character);
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
			setActiveBossBattleId(bossBattleOptions[0].value as number);
	}, [ephemeral]);

	if (!bossBattleOptions)
		return <><Icon loading name='spinner' /> Loading...</>;

	if (bossBattleOptions.length === 0)
		return <Message>No boss data found. Please import an updated version of your player data.</Message>;

	return (
		<React.Fragment>
			{bossBattleOptions.length > 0 && (
				<div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', columnGap: '1em' }}>
					<Dropdown selection
						placeholder={t('fbb.select')}
						options={bossBattleOptions}
						value={activeBossBattleId}
						onChange={(e, { value }) => {
							setActiveBossBattleId(value as number);
							setCollaborationMode(CollaborationMode.Disabled);
						}}
					/>
					{activeBossBattleId && (
						<Checkbox	/* Collaborate */
							label='Collaborate'
							checked={collaborationMode === CollaborationMode.Enabled}
							onClick={() => setCollaborationMode(collaborationMode === CollaborationMode.Enabled ? CollaborationMode.Disabled : CollaborationMode.Enabled)}
							toggle
						/>
					)}
				</div>
			)}
			{bossBattleOptions.length === 0 && <Message>You have no open fleet boss battles.</Message>}
			{collaborationMode === CollaborationMode.Failed && (
				<Message icon negative onDismiss={() => setCollaborationMode(CollaborationMode.Disabled)}>
					<Icon name='warning sign' />
					Error! Unable to synchronize. The service may not be available right now. Please try again. If the error persists, contact the DataCore support team.
				</Message>
			)}
			{activeBossBattleId && (
				<BossBattleSpotter key={activeBossBattleId}
					bossBattleId={activeBossBattleId}
					collaborationEnabled={collaborationMode === CollaborationMode.Enabled}
					abortCollaboration={() => setCollaborationMode(CollaborationMode.Failed)}
				/>
			)}
		</React.Fragment>
	);
};

type BossBattleSpotterProps = {
	bossBattleId: number;
	collaborationEnabled: boolean;
	abortCollaboration: () => void;
};

const BossBattleSpotter = (props: BossBattleSpotterProps) => {
	const globalContext = React.useContext(GlobalContext);
	const { playerData, ephemeral } = globalContext.player;
	const { bossBattleId, collaborationEnabled, abortCollaboration } = props;

	const [bossBattle, setBossBattle] = React.useState<BossBattle | undefined>(undefined);
	const [spotter, setSpotter] = useStateWithStorage<Spotter | undefined>(`fbb/${bossBattleId}/spotter`, undefined);
	const [spotterBattleId, setSpotterBattleId] = useStateWithStorage<string | undefined>(`fbb/spotterBattleId`, undefined);

	React.useEffect(() => {
		if (!playerData || !ephemeral) return;

		const status: Status | undefined = ephemeral.fleetBossBattlesRoot.statuses.find(status => status.id === bossBattleId);
		if (!status || !status.combo) return;

		const bossGroups: BossGroup[] = ephemeral.fleetBossBattlesRoot?.groups ?? [];
		const chainIndex: number = status.combo.previous_node_counts.length;

		const bossBattle: BossBattle = {
			id: bossBattleId,
			fleetId: playerData.player.fleet.id,
			bossGroup: status.group,
			difficultyId: status.difficulty_id,
			chainIndex,
			chain: {
				id: `${bossBattleId}-${chainIndex}`,
				traits: status.combo.traits,
				nodes: status.combo.nodes
			},
			description: describeBoss(bossGroups, status)
		};
		setBossBattle({...bossBattle});

		if (!spotter || (!collaborationEnabled && spotterBattleId !== bossBattle.chain.id)) {
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
			{!collaborationEnabled && (
				<SoloPlayer
					bossBattle={bossBattle}
					spotter={spotter}
					setSpotter={setSpotter}
				/>
			)}
			{collaborationEnabled && (
				<Collaborator
					bossBattleId={bossBattle.id}
					fleetId={bossBattle.fleetId}
					localBossBattle={bossBattle}
					localSpotter={spotter}
					setLocalSpotter={setSpotter}
					userRole='player'
					abortCollaboration={abortCollaboration}
				/>
			)}
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

	const chainId: string = bossBattle.chain.id;

	const providerValue: ISolverContext = {
		bossBattleId: bossBattle.id,
		bossBattle,
		spotter, setSpotter
	};

	return (
		<React.Fragment>
			<SolverContext.Provider value={providerValue}>
				<ChainSolver key={chainId} />
			</SolverContext.Provider>
		</React.Fragment>
	);
};

const describeBoss = (bossGroups: BossGroup[], bossBattle: Status) => {
	const description: string[] = [];
	const bossName: string | undefined = bossGroups.find(group => group.symbol === bossBattle.group)?.name;
	if (bossName) description.push(bossName);
	description.push(`${DIFFICULTY_NAME[bossBattle.difficulty_id]}`);
	return description.join(', ');
};
