import localforage from "localforage";
import { CrewMember } from "../model/crew";
import { EquipmentItem, ICrewDemands } from "../model/equipment";
import { PlayerCrew } from "../model/player";
import { calculateRosterDemands } from "../utils/equipment";

export interface ParaDemandConfig {
    crew: (CrewMember | PlayerCrew)[],
    items: EquipmentItem[],
    fromCurrLvl: boolean,
    excludePrimary?: boolean
}

// eslint-disable-next-line no-restricted-globals
self.onmessage = async (message: { data: { id: string; config: ParaDemandConfig; }; }) => {
    const id = message.data.id;
    const postResult = (result: ICrewDemands | undefined, inProgress: boolean) => {
        postMessage({ result, inProgress, id });
        if (!inProgress) self.close();
    };
    const config = message.data.config as ParaDemandConfig;
    const { crew, fromCurrLvl, excludePrimary } = config;
    const items = await localforage.getItem<EquipmentItem[]>('itemsWorker_coreItems');
    if (!items?.length) postResult({} as any, false);
    const rosterDemands = calculateRosterDemands(crew, items!, fromCurrLvl, excludePrimary);
    postResult(rosterDemands, false);
};
