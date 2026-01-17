import React from "react"
import { GlobalContext } from "./globalcontext";
import { EnergyLog, EnergyLogContext, getAllEnergy, IEnergyLogContext } from "../components/page/util";
import { useStateWithStorage } from "../utils/storage";

export interface IEnergyLogContextProvider {
    children: React.ReactNode;
}

type EnergyEnabledType = { [key:string]:boolean };
export const EnergyLogContextProvider = (props: IEnergyLogContextProvider) => {
    const globalContext = React.useContext(GlobalContext);
    const { playerData, ephemeral } = globalContext.player;
    const [energyLog, setEnergyLog] = useStateWithStorage(`energy_log`, {} as EnergyLog, { rememberForever: true, avoidSessionStorage: true });
    const [energyLogEnabled, setEnergyLogEnabled] = useStateWithStorage(`energy_log_enabled`, {} as EnergyEnabledType, { rememberForever: true });

    const { children } = props;

    React.useEffect(() => {
        if (playerData && ephemeral) {
            const ts = new Date();
            const dbid = playerData.player.dbid;

            if (!energyLogEnabled[dbid]) {
                return;
            }

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

            const elognew = energyLog ? { ...energyLog } : {};
            elognew[dbid] ??= [];

            if (elognew[dbid].length) {
                elognew[dbid][elognew[dbid].length-1].timestamp = new Date(elognew[dbid][elognew[dbid].length-1].timestamp);
                if (elognew[dbid][elognew[dbid].length-1].timestamp.getDate() !== ts.getDate() ||
                    JSON.stringify(elognew[dbid][elognew[dbid].length - 1].energy) !== JSON.stringify(logEntry)) {
                    elognew[dbid].push({
                        energy: logEntry,
                        timestamp: ts
                    });
                }
            }
            else {
                elognew[dbid].push({
                    energy: logEntry,
                    timestamp: ts
                });
            }

            setEnergyLog(elognew);
        }
    }, [playerData, ephemeral, energyLogEnabled]);

    const enabled = getEnabledState();

    const energyData: IEnergyLogContext = {
        enabled,
        log: energyLog,
        setEnabled,
        setLog: setEnergyLog,
        clearLog: clearEnergyLog
    };

    return (<>
        <EnergyLogContext.Provider value={energyData}>
            {children}
        </EnergyLogContext.Provider>
    </>);

    function clearEnergyLog(clearAll?: boolean) {
		if (clearAll) {
			setEnergyLog(structuredClone({}));
			return;
		}
		if (!playerData) return;
		let dbid = playerData.player.dbid;
		energyLog[dbid] = [].slice();
		setEnergyLog({...energyLog});
	}

    function setEnabled(value: boolean) {
        if (!playerData) return;
		let dbid = playerData.player.dbid;
        energyLogEnabled[dbid] = value;
        setEnergyLogEnabled({...energyLogEnabled});
    }

    function getEnabledState() {
        if (!playerData) return false;
        let dbid = playerData.player.dbid;
        return !!energyLogEnabled[dbid];
    }
}