import React from "react";

import { IRosterCrew } from "../crewtables/model";
import { prettyObtained, printPortalStatus } from "../../utils/crewutils";
import CONFIG from "../CONFIG";
import { TranslateMethod } from "../../model/player";

export function printFancyPortal(crew: IRosterCrew, t: TranslateMethod, alwaysObtained?: boolean) {
    const color = printPortalStatus(crew, t, true, false) === t('global.never') ? CONFIG.RARITIES[5].color : undefined;
    const obtained = prettyObtained(crew, t);

    return (
        <span title={printPortalStatus(crew, t, true, true, true)}>
            <div>{printPortalStatus(crew, t, true, false)}</div>
            <div>{crew.in_portal && (crew.unique_polestar_combos?.length ? t('base.uniquely_retrievable') : t('base.less_than_100_retrieval'))}</div>
            <div>{(!!color || !!alwaysObtained) && <div style={{ color: color }}>({obtained})</div>}</div>
        </span>
    )
}