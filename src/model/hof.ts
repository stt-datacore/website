import { RankMode } from "../utils/misc";
import { RawVoyageRecord } from "../utils/voyageutils";
import { CrewMember } from "./crew";
import { PlayerCrew } from "./player";

export interface VoyageHOFProps {};

export interface VoyageStatSeat {
    seat_skill: string;
    seat_index: number;
    averageDuration: number;
    crewCount: number;
}

export interface VoyageStatEntry {
    crewSymbol: string;
    crewCount: number;
    estimatedDuration?: number;
    averageDuration?: number;
    startDate?: Date;
    endDate?: Date;
    seats: VoyageStatSeat[];
    quipmentCounts?: { [key: string]: number };
}

export interface VoyageHOFState {
    voyageStats?: {
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
};

export type VoyageHOFPeriod = "allTime" | "lastSevenDays" | "lastThirtyDays" | "lastSixMonths" | "lastNinetyDays" | "oneYear";

export const niceNamesForPeriod = {
    lastNinetyDays: "Last 90 days",
    lastThirtyDays: "Last 30 days",
    lastSevenDays: "Last 7 days",
    lastSixMonths: "Last 6 Months",
    oneYear: "Last Year",
//    allTime: "All Time",
};
