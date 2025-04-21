import React from "react"
import { GlobalContext } from "../../context/globalcontext"
import { Dropdown } from "semantic-ui-react";
import { ObjectiveEvent, OERefType } from "../../model/oemodel";
import { OptionsPanelFlexColumn, OptionsPanelFlexRow } from "../stats/utils";
import { OEInfo } from "./oeinfo";
import { FactionAbbrMap, KnownStages, KSRegExp } from "./utils";
import CONFIG from "../CONFIG";

export const OEPicker = () => {

    const globalContext = React.useContext(GlobalContext);
    const { t } = globalContext.localized;
    const { objective_events, factions } = globalContext.core;

    const [active, setActive] = React.useState<string>(objective_events?.length ? objective_events[0].symbol : '');

    React.useEffect(() => {
        if (!active && objective_events?.length) setActive(objective_events[0].symbol);
    }, [objective_events]);

    const activeEventInfo = React.useMemo(() => {
        let info = objective_events.find(oe => oe.symbol === active);
        if (!info) return;
        info = JSON.parse(JSON.stringify(info)) as ObjectiveEvent;
        info.objective_archetypes.forEach((oearch) => {
            let sym = oearch.symbol;
            let x = sym.indexOf("_");
            sym = sym.slice(x+1);
            for (let kt of KnownStages) {
                let re = KSRegExp[kt];
                let results = re.exec(sym);
                let obj: OERefType | undefined = undefined;
                if (results?.length) {
                    if (CONFIG.SERIES.includes(results[1])) {

                        obj = {
                            id: CONFIG.SERIES.indexOf(results[1]),
                            symbol: `${results[1]}_series`,
                            name: t(`series.${results[1]}`)
                        }
                    }
                    else if (sym.includes("_crew")) {
                        sym = results[1] + "_crew";
                        obj = globalContext.core.crew.find(f => f.symbol === sym);
                    }
                    else if (sym.includes("battle")) {
                        sym = results[1] + "_ship";
                        obj = globalContext.core.all_ships.find(f => f.symbol === sym);
                    }
                    else if (FactionAbbrMap[results[1]]) {
                        obj = factions.find(f => f.id === FactionAbbrMap[results[1]]);
                    }

                    oearch.target = obj;
                }
            }
        });
        return info;
    }, [active]);

    const pickerOpts = objective_events.map(oe => ({
        key: `oe_${oe.id}`,
        value: oe.symbol,
        text: oe.name
    }));

    const flexRow = OptionsPanelFlexRow;
    const flexCol = OptionsPanelFlexColumn;

    return <div style={{...flexCol, alignItems: 'stretch', justifyContent: 'stretch', gap: '1em' }}>
        <Dropdown
            selection
            fluid
            options={pickerOpts}
            value={active}
            onChange={(e, { value }) => setActive(value as string)}
            />

        {!!activeEventInfo && <div>
            <OEInfo data={activeEventInfo} />
        </div>}
    </div>
}