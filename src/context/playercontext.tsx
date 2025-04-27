import React from 'react';
import { CompactCrew, GalaxyCrewCooldown, GameEvent, ObjectiveEventRoot, PlayerCrew, PlayerData, Stimpack, Voyage, VoyageDescription } from '../model/player';
import { useStateWithStorage } from '../utils/storage';
import { DataContext, DataProviderProperties } from './datacontext';
import { BuffStatTable, calculateBuffConfig, calculateMaxBuffs } from '../utils/voyageutils';
import { prepareProfileData } from '../utils/crewutils';
import { Ship } from '../model/ship';
import { mergeRefShips, mergeShips } from '../utils/shiputils';
import { stripPlayerData } from '../utils/playerutils';
import { BossBattlesRoot } from '../model/boss';
import { ShuttleAdventure } from '../model/shuttle';
import { ArchetypeRoot20 } from '../model/archetype';
import { getItemWithBonus } from '../utils/itemutils';
import { TinyStore } from '../utils/tiny';
import { EquipmentItem } from '../model/equipment';
import { ShipTraitNames } from '../model/traits';

export interface PlayerContextData {
	loaded: boolean;
	showPlayerGlance: boolean,
	setShowPlayerGlance: (value: boolean) => void
	noGradeColors: boolean,
	setNoGradeColors: (value: boolean) => void
	setInput?: (value: PlayerData | undefined) => void;
	setNewCrew: (value: PlayerCrew[] | undefined) => void;
	newCrew?: PlayerCrew[];
	reset?: () => void;
	playerData?: PlayerData;
	ephemeral?: IEphemeralData;
	strippedPlayerData?: PlayerData;
	playerShips?: Ship[];
	buffConfig?: BuffStatTable;
	maxBuffs?: BuffStatTable;
	dataSource?: string;
	sessionStates?: ISessionStates;
	updateSessionState?: (sessionKey: SessionStateKey, sessionValue: number) => void;
	calculatedDemands?: (EquipmentItem | EquipmentItem)[]
	setCalculatedDemands: (value: (EquipmentItem | EquipmentItem)[] | undefined) => void;
};

export interface IEphemeralData {
	activeCrew: CompactCrew[];
	events: GameEvent[];
	fleetBossBattlesRoot: BossBattlesRoot;
	shuttleAdventures: ShuttleAdventure[];
	voyage: Voyage[],
	voyageDescriptions: VoyageDescription[],
	archetype_cache: ArchetypeRoot20;
	objectiveEventRoot: ObjectiveEventRoot;
	galaxyCooldowns: GalaxyCrewCooldown[];
	stimpack?: Stimpack;
};

export interface ISessionStates {
	profileUpload: number;
	voyageHistoryReconcile: number;
};

export type SessionStateKey = 'profileUpload' | 'voyageHistoryReconcile';

const defaultSessionStates = {
	profileUpload: 0,
	voyageHistoryReconcile: 0
} as ISessionStates;

export const defaultPlayer = {
	loaded: false,
	setInput: () => {},
	setNewCrew: () => false,
	reset: () => {},
	sessionStates: defaultSessionStates,
	updateSessionState: () => {},
	showPlayerGlance: true,
	setShowPlayerGlance: () => false,
	noGradeColors: true,
	setNoGradeColors: () => false,
	calculatedDemands: undefined,
	setCalculatedDemands: () => false
} as PlayerContextData;

export const PlayerContext = React.createContext<PlayerContextData>(defaultPlayer as PlayerContextData);

const tiny = TinyStore.getStore(`global_playerSettings`);

export const PlayerProvider = (props: DataProviderProperties) => {

	const coreData = React.useContext(DataContext);
	const { crew, ship_schematics, all_ships } = coreData;

	const { children } = props;

	// Profile can be fully re-constituted on reloads from stripped and ephemeral
	const [stripped, setStripped] = useStateWithStorage<PlayerData | undefined>('playerData', undefined, { compress: true });
	const [calculatedDemands, setCalculatedDemands] = useStateWithStorage<(EquipmentItem | EquipmentItem)[] | undefined>('calculatedDemands', undefined, { compress: true });

	const [ephemeral, setEphemeral] = useStateWithStorage<IEphemeralData | undefined>('ephemeralPlayerData', undefined, { compress: true });

	// This structure is only saved in indexDB
	const [itemArchetypeCache, setItemArchetypeCache] = useStateWithStorage<ArchetypeRoot20>('itemArchetypeCache', {} as ArchetypeRoot20, { rememberForever: true, avoidSessionStorage: true });

	const [profile, setProfile] = React.useState<PlayerData | undefined>(undefined);
	const [playerShips, setPlayerShips] = React.useState<Ship[] | undefined>(undefined);
	const buffConfig = stripped ? calculateBuffConfig(stripped.player) : undefined;
	const maxBuffs = stripped ? calculateMaxBuffs(stripped.player?.character?.all_buffs_cap_hash) : (coreData.all_buffs ?? undefined);
	const [sessionStates, setSessionStates] = useStateWithStorage<ISessionStates | undefined>('sessionStates', defaultSessionStates);
	const [showPlayerGlance, setShowPlayerGlance] = useStateWithStorage(`${stripped ? stripped.player.dbid : ''}_showPlayerGlance`, true, { rememberForever: true })
	const [showBuybackAlerts, setShowBuybackAlerts] = useStateWithStorage(`${stripped ? stripped.player.dbid : ''}_showBuybackAlerts`, true, { rememberForever: true })
	const [restoreHiddenAlerts, setRestoreHiddenAlerts] = React.useState(false);
	const [noGradeColors, internalSetNoGradeColors] = React.useState(tiny.getValue<boolean>('noGradeColors') ?? false)
	const [newCrew, setNewCrew] = useStateWithStorage(`${stripped ? stripped.player.dbid : ''}/newCrew`, undefined as PlayerCrew[] | undefined);
	const setNoGradeColors = (value: boolean) => {
		tiny.setValue('noGradeColors', value, true);
		internalSetNoGradeColors(value);
	}

	const [input, setInput] = React.useState<PlayerData | undefined>(stripped);
	const [loaded, setLoaded] = React.useState(false);

	React.useEffect(() => {
		if (!input || (!all_ships.length) || !crew.length) return;
		// ephemeral data (e.g. active crew, active shuttles, voyage data, and event data)
		//	can be misleading when outdated, so keep a copy for the current session only
		const activeCrew = [] as CompactCrew[];
		input.player.character.crew.forEach(crew => {
			if (crew.active_status > 0) {
				activeCrew.push({
					id: crew.id,
					symbol: crew.symbol,
					rarity: crew.rarity,
					level: crew.level,
					equipment: crew.equipment.map((eq) => eq[0]),
					active_status: crew.active_status,
					active_id: crew.active_id,
					active_index: crew.active_index,
					max_rarity: crew.max_rarity,
					skill_order: []
				});
			}
		});

		if (input.stripped !== true) {
			setCalculatedDemands(undefined);

			if (!!input.archetype_cache?.archetypes?.length) {
				setItemArchetypeCache(input.archetype_cache);
			}

			input.player.character.galaxy_crew_cooldowns?.forEach((gc) => {
				if (typeof gc.disabled_until === 'string') gc.disabled_until = new Date(gc.disabled_until);
			});

			setEphemeral({
				activeCrew,
				events: [...input.player.character.events ?? []],
				fleetBossBattlesRoot: input.fleet_boss_battles_root ?? {} as BossBattlesRoot,
				shuttleAdventures: [...input.player.character.shuttle_adventures ?? []],
				voyage: [...input.player.character.voyage ?? []],
				voyageDescriptions: [...input.player.character.voyage_descriptions ?? []],
				archetype_cache: {} as ArchetypeRoot20,
				objectiveEventRoot: input.objective_event_root ?? {} as ObjectiveEventRoot,
				galaxyCooldowns: input.player.character.galaxy_crew_cooldowns ?? [],
				stimpack: input.player.character.stimpack
			});
		}

		const dtImported = (typeof input.calc?.lastImported === 'string') ? new Date(input.calc?.lastImported) : new Date();

		// stripped is used for any storage purpose, i.e. sharing profile
		//	Ephmeral data is stripped from playerData here
		const strippedData = input.stripped ? input : stripPlayerData(coreData.items, {...input}) as PlayerData;
		strippedData.calc = input.calc ?? { 'lastImported': dtImported.toISOString() };

		if (input.stripped !== true) {
			setStripped({ ... JSON.parse(JSON.stringify(strippedData)), stripped: true });
		}

		// preparedProfileData is expanded with useful data and helpers for DataCore tools
		let preparedProfileData = {...strippedData};

		const quipment = coreData.items.filter(i => i.type === 14).map(i => getItemWithBonus(i));
		prepareProfileData('PLAYER_CONTEXT', coreData.crew, preparedProfileData, dtImported, quipment);
		setProfile(preparedProfileData);

		if (preparedProfileData) {
			const all_ships = JSON.parse(JSON.stringify(coreData.all_ships));
			const mergedShips = mergeRefShips(all_ships, preparedProfileData.player.character.ships, {} as ShipTraitNames);
			setPlayerShips(mergedShips);
		}

		setSessionStates({...defaultSessionStates});
		setLoaded(true);
	}, [input, crew, ship_schematics]);

	const reset = (): void => {
		setStripped(undefined);
		setEphemeral(undefined);
		setProfile(undefined);
		setPlayerShips(undefined);
		setInput(undefined);
		setSessionStates(undefined);
		setLoaded(false);
		setItemArchetypeCache({} as ArchetypeRoot20);
		setCalculatedDemands(undefined);
		// setGameLanguage('en');
		sessionStorage.clear();
	};

	const providerValue = {
		loaded,
		setInput,
		reset,
		playerData: profile,
		ephemeral: {
			...ephemeral,
			archetype_cache: itemArchetypeCache
		},
		strippedPlayerData: stripped,
		playerShips,
		buffConfig,
		maxBuffs,
		dataSource: input?.stripped === true ? 'session' : 'input',
		sessionStates,
		updateSessionState,
		showPlayerGlance,
		setShowPlayerGlance,
		noGradeColors,
		setNoGradeColors,
		setNewCrew,
		newCrew,
		showBuybackAlerts,
		setShowBuybackAlerts,
		restoreHiddenAlerts,
		setRestoreHiddenAlerts,
		calculatedDemands,
		setCalculatedDemands
	} as PlayerContextData;

	return (
		<PlayerContext.Provider value={providerValue}>
			{children}
		</PlayerContext.Provider>
	);

	function updateSessionState(sessionKey: SessionStateKey, sessionValue: number): void {
		const newSessionStates = sessionStates ?? {} as ISessionStates;
		newSessionStates[sessionKey] = sessionValue;
		setSessionStates({...newSessionStates});
	}
};
