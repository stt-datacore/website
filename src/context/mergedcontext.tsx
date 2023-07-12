import React from 'react';
import { useStateWithStorage } from '../utils/storage';
import { PlayerCrew, PlayerData } from '../model/player';
import { Schematics, Ship } from '../model/ship';
import { BuffStatTable } from '../utils/voyageutils';
import { EquipmentItem } from '../model/equipment';
import { ContextCommon, DataContext, DataProviderProperties, DefaultCore, ValidDemands } from './datacontext';
import { PlayerContext } from './playercontext';
import { CrewMember } from '../model/crew';
import { BossBattlesRoot } from '../model/boss';
import { KeystoneBase, Polestar, Constellation } from '../model/game-elements';
import { Gauntlet } from '../model/gauntlets';

export interface MergedData {
    playerData: PlayerData;
    crew: PlayerCrew[];
    ships?: Ship[];
    playerShips?: Ship[];  
    ship_schematics?: Schematics[];  
    useInVoyage?: boolean;
    fleetBossBattlesRoot?: BossBattlesRoot;
    buffConfig?: BuffStatTable;
    maxBuffs?: BuffStatTable;
    dataSource?: string;
    keystones?: (KeystoneBase | Polestar | Constellation)[];
    items?: EquipmentItem[];
    gauntlets?: Gauntlet[];
    data?: any;
    pageId?: string;
    clearPlayerData?: () => void;
}

const defaultMerged = {
    playerData: {} as PlayerData,
    crew: []
} as MergedData;

export const MergedContext = React.createContext<MergedData>(defaultMerged);
