import { CrewMember } from "../model/crew";
import { EquipmentItem, ICrewDemands } from "../model/equipment";
import { PlayerCrew } from "../model/player";
import { calculateRosterDemands } from "../utils/equipment";

export interface ParaDemandConfig {
    crew: (CrewMember | PlayerCrew)[],
    fromCurrLvl: boolean,
    excludePrimary?: boolean
}

// eslint-disable-next-line no-restricted-globals
self.onmessage = async (message: { data: { id: string; config: ParaDemandConfig; }; }) => {
    const itemCache = await fetch('/structured/items.json');
    const items = (await itemCache.json()) as EquipmentItem[];

    const id = message.data.id;
    const postResult = (result: ICrewDemands | undefined, inProgress: boolean) => {
        postMessage({ result, inProgress, id });
        if (!inProgress) window.close();
    };
    const config = message.data.config as ParaDemandConfig;
    const { crew, fromCurrLvl, excludePrimary } = config;

    if (!items?.length) postResult({} as any, false);
    const rosterDemands = calculateRosterDemands(crew, items!, fromCurrLvl, excludePrimary);
    postResult(rosterDemands, false);
};
