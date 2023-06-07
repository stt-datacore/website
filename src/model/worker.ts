import { BossBattlesRoot } from "./boss";
import { Skill } from "./crew"
import { PlayerCrew, PlayerData } from "./player"
import { Ship } from "./ship";

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
}

export interface CalculatorProps {
	playerData: PlayerData;
	allCrew: PlayerCrew[];
};

export interface AllData extends CalculatorProps {
	allShips?: Ship[];
	useInVoyage?: boolean;	
    bossData?: BossBattlesRoot;	
}

export interface VoyageConsideration {
	ship: Ship;
	score: number;
	traited: boolean;
	bestIndex: number;
}

export interface Calculation {
    id: string
    requestId: string
    name: string
    calcState: number
	result?: CalcResult;
	compared?: string;
}
  
  export interface CalcResult {
    estimate: Estimate
    entries: Entry[]
    aggregates: Aggregates
    startAM: number
    confidence: number
  }
  
  export interface Estimate {
    refills: Refill[]
    dilhr20: number
    refillshr20: number
    final: boolean
    deterministic?: boolean;
  }
  
  export interface Refill {
    all: number[]
    result: number
    safeResult: number
    saferResult: number
    moonshotResult: number
    lastDil: number
    dilChance: number
    refillCostResult: number
  }
  
  export interface Entry {
    slotId: number
    choice: PlayerCrew
    hasTrait: boolean
  }
  
  export interface Aggregates {
    command_skill: AggregateSkill
    science_skill: AggregateSkill
    security_skill: AggregateSkill
    engineering_skill: AggregateSkill
    diplomacy_skill: AggregateSkill
    medicine_skill: AggregateSkill
  }
  
  export interface AggregateSkill extends Skill {
    skill: string
  }
  
  export interface CalcConfig {
	estimate: number,
	minimum: number,
	moonshot: number,
	antimatter: number,
	dilemma: {
		hour: number,
		chance: number
	}
	refills?: Refill[];
	confidence?: number;
}
