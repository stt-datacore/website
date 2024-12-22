import React from "react";
import { GameWorkerOptions } from "../../../model/worker";
import { QuipmentProspectConfig } from "../quipmentprospects";

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
};

export const UserPrefsContext = React.createContext<IUserPrefsContext>({} as IUserPrefsContext);
