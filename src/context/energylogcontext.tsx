import React from "react"
import { GlobalContext } from "./globalcontext";
import { EnergyLog, EnergyLogContext, getAllEnergy } from "../components/page/util";
import { useStateWithStorage } from "../utils/storage";

export interface IEnergyLogContextProvider {
    children: React.ReactNode;
}

export const EnergyLogContextProvider = (props: IEnergyLogContextProvider) => {
    const globalContext = React.useContext(GlobalContext);
    const { playerData, ephemeral } = globalContext.player;
    const [energyLog, setEnergyLog] = useStateWithStorage(`energy_log`, {} as EnergyLog, { rememberForever: true, avoidSessionStorage: true });
    const [energyLogEnabled, setenergyLogEnabled] = useStateWithStorage(`energy_log_enabled`, false, { rememberForever: true });

    const { children } = props;

    React.useEffect(() => {
        if (playerData && ephemeral && energyLogEnabled) {
            const ts = new Date();
            const dbid = playerData.player.dbid;
            const {
                money,
                premium_purchasable,
                honor,
                premium_earnable,
                shuttle_rental_tokens,
                chrons,
                ism,
                quantum,
            } = getAllEnergy(playerData, ephemeral);
            const logEntry = {
                money,
                premium_purchasable,
                honor,
                premium_earnable,
                shuttle_rental_tokens,
                chrons,
                ism,
                quantum,
            };
            energyLog[dbid] ??= [];
            if (energyLog[dbid].length) {
                energyLog[dbid][energyLog[dbid].length-1].timestamp = new Date(energyLog[dbid][energyLog[dbid].length-1].timestamp);
                if (energyLog[dbid][energyLog[dbid].length-1].timestamp.getDate() !== ts.getDate() ||
                    JSON.stringify(energyLog[dbid][energyLog[dbid].length - 1].energy) !== JSON.stringify(logEntry)) {
                    energyLog[dbid].push({
                        energy: logEntry,
                        timestamp: ts
                    });
                    setEnergyLog({...energyLog});
                }
            }
            else {
                energyLog[dbid].push({
                    energy: logEntry,
                    timestamp: ts
                });
                setEnergyLog({...energyLog});
            }
        }
    }, [playerData, ephemeral, energyLogEnabled]);

    const energyData = {
        enabled: energyLogEnabled,
        log: energyLog,
        setEnabled: setenergyLogEnabled,
        setLog: setEnergyLog,
        clearLog: clearEnergyLog
    };

    return (<>
        <EnergyLogContext.Provider value={energyData}>
            {children}
        </EnergyLogContext.Provider>
    </>)

    function clearEnergyLog(clearAll?: boolean) {
		if (clearAll) {
			setEnergyLog(structuredClone({}));
			return;
		}
		if (!playerData) return;
		let dbid = playerData.player.dbid;
		energyLog[dbid] = [].slice();
		setEnergyLog(structuredClone(energyLog));
	}
}