import React from 'react';

import { GameWorkerOptions } from '../../../model/worker';
import { GlobalContext } from '../../../context/globalcontext';
import { useStateWithStorage } from '../../../utils/storage';
import { CalculatorContext } from '../context';

import { QuipmentProspectConfig } from '../quipment/options';
import { IUserPrefsContext, UserPrefsContext } from './userprefs';
import { CalculatorForm } from './calcform';

const DefaultQuipmentConfig: QuipmentProspectConfig = {
	mode: 'best',
	voyage: 'voyage',
	current: false,
	enabled: false,
	slots: 0,
	calc: 'all'
};

export const Calculator = () => {
	const globalContext = React.useContext(GlobalContext);
	const { playerData } = globalContext.player;
	const { voyage_type } = React.useContext(CalculatorContext).voyageConfig;

	return (
		<React.Fragment>
			{playerData && (
				<PlayerCalculator
					key={voyage_type}
					dbid={`${playerData.player.dbid}`}
					voyageType={voyage_type}
				/>
			)}
			{!playerData && <NonPlayerCalculator />}
		</React.Fragment>
	);
};

type PlayerCalculatorProps = {
	dbid: string;
	voyageType: string;
};

const PlayerCalculator = (props: PlayerCalculatorProps) => {
	const voyageTypePath: string = props.voyageType === 'encounter' ? '/encounter' : '';
	const defaultCalculator: string = props.voyageType === 'encounter' ? 'ussjohnjay-mvam' : 'iampicard';

	const [calculator, setCalculator] = useStateWithStorage<string>(
		`${props.dbid}/voyage/calculator${voyageTypePath}`,
		defaultCalculator,
		{ rememberForever: true }
	);
	const [calcOptions, setCalcOptions] = useStateWithStorage<GameWorkerOptions>(
		`${props.dbid}/voyage/calcOptions${voyageTypePath}`,
		{} as GameWorkerOptions,
		{ rememberForever: true }
	);
	const [telemetryOptIn, setTelemetryOptIn] = useStateWithStorage<boolean>(
		`${props.dbid}/voyage/telemetryOptIn`,
		true,
		{ rememberForever: true }
	);
	const [qpConfig, setQPConfig] = useStateWithStorage<QuipmentProspectConfig>(
		`${props.dbid}/${voyageTypePath}/voyage_quipment_prospect_config`,
		DefaultQuipmentConfig,
		{ rememberForever: true }
	);

	const userPrefs: IUserPrefsContext = {
		calculator, setCalculator,
		calcOptions, setCalcOptions,
		telemetryOptIn, setTelemetryOptIn,
		qpConfig, setQPConfig
	};

	return (
		<UserPrefsContext.Provider value={userPrefs}>
			<React.Fragment>
				<CalculatorForm />
			</React.Fragment>
		</UserPrefsContext.Provider>
	);
};

const NonPlayerCalculator = () => {
	const [calculator, setCalculator] = React.useState<string>('iampicard');
	const [calcOptions, setCalcOptions] = React.useState<GameWorkerOptions>({} as GameWorkerOptions);
	const [telemetryOptIn, setTelemetryOptIn] = React.useState<boolean>(false);
	const [qpConfig, setQPConfig] = React.useState<QuipmentProspectConfig>(DefaultQuipmentConfig);

	const userPrefs: IUserPrefsContext = {
		calculator, setCalculator,
		calcOptions, setCalcOptions,
		telemetryOptIn, setTelemetryOptIn,
		qpConfig, setQPConfig
	};

	return (
		<UserPrefsContext.Provider value={userPrefs}>
			<React.Fragment>
				<CalculatorForm />
			</React.Fragment>
		</UserPrefsContext.Provider>
	);
};
