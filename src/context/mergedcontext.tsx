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

export interface MergedData {
    playerData: PlayerData;
    allCrew: PlayerCrew[];
    allShips?: Ship[];
    playerShips?: Ship[];    
    useInVoyage?: boolean;
    bossData?: BossBattlesRoot;
    buffConfig?: BuffStatTable;
    items?: EquipmentItem[];
}

const defaultMerged = {
    playerData: {} as PlayerData,
    allCrew: []
} as MergedData;

export const MergedContext = React.createContext<MergedData>(defaultMerged);
