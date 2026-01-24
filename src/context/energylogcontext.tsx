import React from "react"
import { GlobalContext } from "./globalcontext";
import { EnergyLog, EnergyLogContext, EnergyLogEntry, getAllEnergy, IEnergyLogContext, RemoteEnergyLogEntry, TrackedEnergy } from "../components/page/util";
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
    const [energyUpdated, setEnergyUpdated] = React.useState(false);

    const { children } = props;

    React.useEffect(() => {
        if (!energyUpdated) return;
        setEnergyUpdated(false);
        setTimeout(() => {
            updateEnergy();
        }, 50);
    }, [energyUpdated]);

    const enabled = getEnabledState();
    const remoteEnabled = getRemoteEnabledState();

    const energyData: IEnergyLogContext = {
        enabled,
        log: energyLog,
        setEnabled,
        setLog: setEnergyLog,
        clearLog: clearEnergyLog,
        setRemoteEnabled,
        remoteEnabled,
        searchRemote,
        updateRemote,
        energyUpdated,
        setEnergyUpdated
    };

    return (<>
        <EnergyLogContext.Provider value={energyData}>
            {children}
        </EnergyLogContext.Provider>
    </>);

    function updateEnergy() {
        if (energyLogEnabled && playerData && ephemeral && energyLogEnabled[playerData.player.dbid]) {
            trackEnergy();
            // if (remoteLogEnabled && remoteLogEnabled[playerData.player.dbid]) {
            //     searchRemote()
            //         .then(() => trackEnergy());
            // }
            // else {
            //     trackEnergy();
            // }
        }
    }

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

                    let newobj: EnergyLogEntry = {
                        energy: logEntry,
                        timestamp: ts,
                        remote: remoteEnabled
                    };
                    if (!!remoteEnabled) {
                        logToRemote(newobj);
                    }
                    elognew[dbid].push(newobj);
                }
            }
            else {
                let newobj: EnergyLogEntry = {
                    energy: logEntry,
                    timestamp: ts,
                    remote: remoteEnabled
                };
                if (!!remoteEnabled) {
                    logToRemote(newobj);
                }
                elognew[dbid].push(newobj);
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
        if (remoteEnabled) {
            clearRemote();
        }
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
        setRemoteLogEnabled({...remoteLogEnabled});
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

    async function searchRemote(startDate?: Date, endDate?: Date) {
        if (!playerData) return undefined;
        const dbid = playerData.player.dbid;
        let url = `${process.env.GATSBY_DATACORE_URL}api/playerResources?dbid=${dbid}`;
        if (startDate) {
            url += `&startDate=${startDate.toLocaleDateString()}`;
        }
        if (endDate) {
            url += `&endDate=${endDate.toLocaleDateString()}`;
        }
        return fetch(url)
            .then((res) => res.json())
            .then((data) => {
                if (Array.isArray(data)) {
                    let newlog = [...energyLog[dbid] ?? []]
                    let energy = data as RemoteEnergyLogEntry[];
                    for (let eobj of energy) {
                        delete eobj.dbid;
                        eobj.remote = true;
                        if (eobj.resources) {
                            eobj.energy = eobj.resources;
                            delete eobj.resources;
                        }
                        newlog.push(eobj);
                    }
                    newlog = newlog.map(nl => {
                        nl.timestamp = new Date(nl.timestamp);
                        return nl;
                    });
                    newlog.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
                    newlog = newlog.filter((l, i) => newlog.findLastIndex(l2 => l.timestamp?.toString() === l2?.timestamp?.toString()) === i);
                    energyLog[dbid] = newlog;
                    setEnergyLog({...energyLog});
                    return energy;
                }
                return undefined;
            })
            .catch(e => {
                console.log(`Could not post remote energy`);
                console.log(e);
                return undefined;
            })
    }

    async function logToRemote(entry: EnergyLogEntry) {
        if (!playerData) return false;
        let dbid = playerData.player.dbid;
        let url = `${process.env.GATSBY_DATACORE_URL}api/playerResources`;
        let postBody = {
            resources: entry.energy,
            timestamp: entry.timestamp,
            dbid
        }
        return fetch(url, {
            method: "POST",
            body: JSON.stringify(postBody),
            headers: {
                "Content-type": "application/json"
            }
        })
        .then(res => res.json())
        .catch(e => {
            console.log(`Could not post remote energy`);
            console.log(e);
        })
    }

    async function updateRemote(entries: EnergyLogEntry[]) {
        if (!playerData) return false;
        let dbid = playerData.player.dbid;
        let url = `${process.env.GATSBY_DATACORE_URL}api/playerResourcesBatch`;
        let resources = entries.filter(e => !e.remote && !!e.energy).map((e) => ({ ...e, dbid })) as RemoteEnergyLogEntry[];
        if (!resources?.length) return { "result": "ok" };
        let postBody = {
            resources,
            dbid
        }
        return fetch(url, {
            method: "POST",
            body: JSON.stringify(postBody),
            headers: {
                "Content-type": "application/json"
            }
        })
        .then(res => res.json())
        .catch(e => {
            console.log(`Could not post remote energy`);
            console.log(e);
        });
    }

    async function clearRemote() {
        if (!playerData) return false;
        let dbid = playerData.player.dbid;
        let url = `${process.env.GATSBY_DATACORE_URL}api/clearPlayerResources`;
        let postBody = { dbid };
         return fetch(url, {
            method: "POST",
            body: JSON.stringify(postBody),
            headers: {
                "Content-type": "application/json"
            }
        })
        .then(res => res.json())
        .catch(e => {
            console.log(`Could not post remote energy`);
            console.log(e);
        })

    }
}