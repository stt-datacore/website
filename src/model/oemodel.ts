import { Icon } from "semantic-ui-react";
import { AtlasIcon, PlayerCrew, Reward } from "./player";
import { CrewMember } from "./crew";
import { ReferenceShip, Ship } from "./ship";
import { StaticFaction } from "./shuttle";

export interface ObjectiveEvent {
  id: number;
  symbol: string;
  name: string;
  description: string;
  image: AtlasIcon;
  rewards: Reward[];
  participation_rewards: ParticipationReward[];
  objective_archetype_ids: number[];
  level_gate: number;
  prerequisites: Prerequisite[];
  announce_at: number;
  start_at: number;
  end_at: number;
  opened: boolean;
  concluded?: boolean;
  completion_rewards_claimed?: boolean;
  participation_rewards_claimed?: boolean;
  eligible_for_completion_rewards?: boolean;
  eligible_for_participation_rewards?: boolean;
  objectives?: Objective[];
  objective_archetypes: ObjectiveArchetype[];
}

export interface ParticipationReward {
  type: number;
  id: number;
  symbol: string;
  name: string;
  full_name: string;
  flavor: string;
  icon: Icon;
  quantity: number;
  rarity: number;
}

export interface Prerequisite {
  dependent: string;
  dependencies: string[];
}

export interface Objective {
  id: number;
  archetype_id: number;
  status: number;
  current_value: number;
  target_value: number;
}

export type OERefType = CrewMember | PlayerCrew | ReferenceShip | Ship | StaticFaction | { id: number, name: string, symbol: string };

export interface ObjectiveArchetype {
  id: number;
  symbol: string;
  type: string;
  area: string;
  milestones: ObjectiveMilestone[];
  target?: OERefType;
}

export interface ObjectiveMilestone {
  rewards: Reward[];
  requirement: string;
  target_value: number;
}
