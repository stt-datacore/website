import React from "react"
import { GlobalContext } from "./globalcontext";
import { EnergyLog, EnergyLogContext, EnergyLogEntry, getAllEnergy, IEnergyLogContext, TrackedEnergy } from "../components/page/util";
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
    const [remoteLogEnabled, setRemoteLogEnabled] = useStateWithStorage(`energy_log_remote_enabled`, {} as EnergyEnabledType, { rememberForever: true });

    const { children } = props;

    React.useEffect(() => {
        trackEnergy();
    }, [playerData, ephemeral, energyLogEnabled]);

    const enabled = getEnabledState();
    const remoteEnabled = getRemoteEnabledState();

    const energyData: IEnergyLogContext = {
        enabled,
        log: energyLog,
        setEnabled,
        setLog: setEnergyLog,
        clearLog: clearEnergyLog,
        setRemoteEnabled,
        remoteEnabled
    };

    return (<>
        <EnergyLogContext.Provider value={energyData}>
            {children}
        </EnergyLogContext.Provider>
    </>);

    function trackEnergy() {
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
            } as TrackedEnergy;

            const elognew = energyLog ? { ...energyLog } : {};
            elognew[dbid] ??= [];

            if (elognew[dbid].length) {
                elognew[dbid][elognew[dbid].length-1].timestamp = new Date(elognew[dbid][elognew[dbid].length-1].timestamp);
                if (
                    elognew[dbid][elognew[dbid].length-1].timestamp.getDate() !== ts.getDate() ||
                    JSON.stringify(elognew[dbid][elognew[dbid].length - 1].energy) !== JSON.stringify(logEntry)
                ) {
                    if (!!remoteEnabled[dbid]) {
                        logToRemote(logEntry);
                    }
                    elognew[dbid].push({
                        energy: logEntry,
                        timestamp: ts
                    });
                }
            }
            else {
                if (!!remoteEnabled[dbid]) {
                    logToRemote(logEntry);
                }
                elognew[dbid].push({
                    energy: logEntry,
                    timestamp: ts
                });
            }

            setEnergyLog(elognew);
        }
    }

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

    function setRemoteEnabled(value: boolean) {
        if (!playerData) return;
		let dbid = playerData.player.dbid;
        remoteLogEnabled[dbid] = value;
        setRemoteLogEnabled({...energyLogEnabled});
    }

    function getEnabledState() {
        if (!playerData) return false;
        let dbid = playerData.player.dbid;
        return !!energyLogEnabled[dbid];
    }

    function getRemoteEnabledState() {
        if (!playerData) return false;
        let dbid = playerData.player.dbid;
        return !!remoteLogEnabled[dbid];
    }

    function logToRemote(entry: TrackedEnergy) {
        if (!playerData) return false;
        let dbid = playerData.player.dbid;
        let url = `${process.env.GATSBY_DATACORE_URL}api/playerResources`;
        let postBody = {
            resources: entry,
            dbid
        }
        fetch(url, {
            method: "POST",
            body: JSON.stringify(postBody),
            headers: {
                "Content-type": "application/json"
            }
        })
        .catch(e => {
            console.log(`Could not post remote energy`);
            console.log(e);
        })
    }




}