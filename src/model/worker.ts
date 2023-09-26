import React from "react";
import { BossBattlesRoot } from "./boss";
import { BaseSkills, Skill } from "./crew";
import { PlayerCrew, PlayerData, VoyageDescription } from "./player";
import { Ship } from "./ship";
import { BuffStatTable } from "../utils/voyageutils";
import { EquipmentItem } from "./equipment";

export interface GameWorkerOptionsList {
    key: number;
    value: number;
    text: string;
}
export interface VoyageStatsConfig {
    others?: number[];
    numSims: number;
    startAm: number;
    currentAm: number;
    elapsedSeconds: number;
    variance: number;
    ps?: Skill;
    ss?: Skill;
}

export interface GameWorkerOptions {
    initialized: boolean;
    list?: GameWorkerOptionsList[];
    strategy?: string;
    searchDepth?: number;
    extendsTarget?: number;
    // roster?: PlayerCrew[];
    // voyage_description?: VoyageDescription;
}

export interface CalculatorProps {
    playerData: PlayerData;
    allCrew: PlayerCrew[];
}

export interface AllData extends CalculatorProps {
    allShips?: Ship[];
    playerShips?: Ship[];    
    useInVoyage?: boolean;
    bossData?: BossBattlesRoot;
    buffConfig?: BuffStatTable;
}

export interface VoyageConsideration {
    ship: Ship;
    score: number;
    traited: boolean;
    bestIndex: number;
}

export interface Calculation {
    id: string;
    requestId: string;
    name: string;
    calcState: number;
    result?: CalcResult;
    compared?: string;
}

export interface CalcResult {
    estimate: Estimate;
    entries: CalcResultEntry[];
    aggregates: Aggregates;
    startAM: number;
    confidence: number;
}

export interface Estimate {
    refills: Refill[];
    dilhr20: number;
    refillshr20: number;
    final: boolean;
    deterministic?: boolean;
    antimatter?: number;
}

export interface Refill {
    all: number[];
    result: number;
    safeResult: number;
    saferResult: number;
    moonshotResult: number;
    lastDil: number;
    dilChance: number;
    refillCostResult: number;
}

export interface CalcResultEntry {
    slotId: number;
    choice: PlayerCrew;
    hasTrait: boolean | number;
}

export interface Aggregates {
    command_skill: AggregateSkill;
    science_skill: AggregateSkill;
    security_skill: AggregateSkill;
    engineering_skill: AggregateSkill;
    diplomacy_skill: AggregateSkill;
    medicine_skill: AggregateSkill;
}

export interface AggregateSkill extends Skill {
    skill: string;
}

export interface CalcConfig {
    estimate: number;
    minimum: number;
    moonshot: number;
    antimatter: number;
    dilemma: {
        hour: number;
        chance: number;
    };
    refills?: Refill[];
    confidence?: number;
}

export interface JohnJayBest {
    key: string;
    crew: JJBestCrewEntry[];
    traits: number[];
    skills: BaseSkills;
    estimate: Estimate;
}

export interface JJBestCrewEntry {
    id: number;
    name: string;
    score: number;
}

export interface ExportCrew {
    id: number;
    name: string;
    traitBitMask: number;
    max_rarity: number;
    skillData: number[];
}
