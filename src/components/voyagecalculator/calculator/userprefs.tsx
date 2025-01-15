import React from "react";
import { GameWorkerOptions } from "../../../model/worker";
import { QuipmentProspectConfig } from "../../qpconfig/provider";
import { CrewMember } from "../../../model/crew";
import { PlayerCrew } from "../../../model/player";
import { IVoyageInputConfig } from "../../../model/voyage";

// These preferences are per-user, so they need separate handlers when there's no player data
export interface IUserPrefsContext {
	calculator: string;
	setCalculator: (calculator: string) => void;
	calcOptions: GameWorkerOptions;
	setCalcOptions: (calcOptions: GameWorkerOptions) => void;
	telemetryOptIn: boolean;
	setTelemetryOptIn: (telemetryOptIn: boolean) => void;
	qpConfig: QuipmentProspectConfig;
	setQPConfig: (qpConfig: QuipmentProspectConfig) => void;
	applyQp: (crew: (PlayerCrew | CrewMember), voyageConfig?: IVoyageInputConfig) => (PlayerCrew | CrewMember)
};

export const UserPrefsContext = React.createContext<IUserPrefsContext>({} as IUserPrefsContext);
