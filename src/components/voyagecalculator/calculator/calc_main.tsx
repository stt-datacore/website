import React from 'react';

import { GameWorkerOptions } from '../../../model/worker';
import { GlobalContext } from '../../../context/globalcontext';
import { useStateWithStorage } from '../../../utils/storage';
import { CalculatorContext } from '../context';

import { DefaultQuipmentConfig, QPConfigProvider, QPContext, QuipmentProspectConfig } from '../../qpconfig/provider';
import { IUserPrefsContext, UserPrefsContext } from './userprefs';
import { CalculatorForm } from './calcform';

export const Calculator = () => {
	const globalContext = React.useContext(GlobalContext);
	const { playerData } = globalContext.player;
	const { voyage_type } = React.useContext(CalculatorContext).voyageConfig;

	return (
		<QPConfigProvider pageId={'voyage_calc'}>
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
		</QPConfigProvider>
	);
};

type PlayerCalculatorProps = {
	dbid: string;
	voyageType: string;
};

const PlayerCalculator = (props: PlayerCalculatorProps) => {
	const qpContext = React.useContext(QPContext);
	const { useQPConfig } = qpContext;

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

	const [qpConfig, setQPConfig, applyQp] = useQPConfig();

	const userPrefs: IUserPrefsContext = {
		calculator, setCalculator,
		calcOptions, setCalcOptions,
		telemetryOptIn, setTelemetryOptIn,
		qpConfig, setQPConfig, applyQp
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
	const qpContext = React.useContext(QPContext);
	const { useQPConfig } = qpContext;

	const [calculator, setCalculator] = React.useState<string>('iampicard');
	const [calcOptions, setCalcOptions] = React.useState<GameWorkerOptions>({} as GameWorkerOptions);
	const [telemetryOptIn, setTelemetryOptIn] = React.useState<boolean>(false);
	//const [qpConfig, setQPConfig] = React.useState<QuipmentProspectConfig>(DefaultQuipmentConfig);
	const [qpConfig, setQPConfig, applyQp] = useQPConfig();

	const userPrefs: IUserPrefsContext = {
		calculator, setCalculator,
		calcOptions, setCalcOptions,
		telemetryOptIn, setTelemetryOptIn,
		qpConfig, setQPConfig, applyQp
	};

	return (
		<UserPrefsContext.Provider value={userPrefs}>
			<React.Fragment>
				<CalculatorForm />
			</React.Fragment>
		</UserPrefsContext.Provider>
	);
};
