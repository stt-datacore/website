import { NavigateFunction } from "react-router-dom";
import { RankMode } from "../utils/misc";
import { RawVoyageRecord } from "../utils/voyageutils";
import { EquipmentItem } from "./equipment";
import { TranslateMethod } from "./player";

export interface VoyageHOFProps {
    navigate: NavigateFunction;
    crew_symbols?: string;
};

export type HOFViewModes = 'rankings' | 'details';

export type VoyageStats = {
        timestamp?: Date;
        lastSevenDays: VoyageStatEntry[];
        lastThirtyDays: VoyageStatEntry[];
        lastNinetyDays: VoyageStatEntry[];
        lastSixMonths?: VoyageStatEntry[];
        oneYear?: VoyageStatEntry[];
        allTime?: VoyageStatEntry[];
    };


export interface VoyageHOFState {
    voyageStats?: {
        timestamp?: Date;
        lastSevenDays: VoyageStatEntry[];
        lastThirtyDays: VoyageStatEntry[];
        lastNinetyDays: VoyageStatEntry[];
        lastSixMonths?: VoyageStatEntry[];
        oneYear?: VoyageStatEntry[];
        allTime?: VoyageStatEntry[];
    };
    errorMessage?: string;
    rankBy: RankMode;
    crewSymbol?: string[];
    rawVoyages?: RawVoyageRecord[];
    glanceDays: number;
    viewMode: HOFViewModes;
    rows: { stats: VoyageStatEntry[], key: VoyageHOFPeriod }[][];
};

export interface VoyageStatSeat {
    seat_skill: string;
    seat_index: number;
    averageDuration: number;
    crewCount: number;
}

export interface CrewQuipStats {
    kwipment_id: string,
    count: number,
    equipment: EquipmentItem
}

export interface VoyageStatEntry {
    crewSymbol: string;
    crewCount: number;
    estimatedDuration?: number;
    averageDuration?: number;
    maxDuration?: number;
    startDate?: Date;
    endDate?: Date;
    seats: VoyageStatSeat[];
    quipmentCounts?: { [key: string]: number };
    quipStats?: CrewQuipStats[];
    voyageTypes?: { [key: string]: number };
}

export type VoyageHOFPeriod = "allTime" | "lastSevenDays" | "lastThirtyDays" | "lastSixMonths" | "lastNinetyDays" | "oneYear";

export const NiceNamesForPeriod = [
    "lastSevenDays",
    "lastThirtyDays",
    "lastNinetyDays",
    "lastSixMonths",
    "oneYear",
];

export function getNiceNames(t: TranslateMethod) {
    const result = {} as any;
    NiceNamesForPeriod.map(key => result[key] = t(`hof.timeframes.${key}`));
    return result;
}