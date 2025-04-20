import React from "react"
import { GlobalContext } from "../../context/globalcontext"
import { Dropdown } from "semantic-ui-react";
import { ObjectiveEvent } from "../../model/oemodel";

const Known = [
    'complete_faction_([a-z0-9_]+)_objective',
    'level_crew_([a-z0-9_]+)_objective',
    'complete_ship_battle_mission_([a-z0-9_]+)_objective',
    'level_([a-z0-9_]+)_crew_objective',
    'fuse_([a-z0-9_]+)_crew_objective',
    'level_crew_objective',
    'fuse_crew_objective',
    'immortalize_crew_objective',
    'complete_ship_battle_mission_objective',
    'complete_dilemma_objective',
    'complete_gauntlet_objective'
];

export const OEPicker = () => {

    const globalContext = React.useContext(GlobalContext);

    const { objective_events } = globalContext.core;

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
            for (let kt of Known) {
                let re = new RegExp(kt);
                let results = re.exec(sym);
                let obj: any = null;
                if (results?.length) {
                    if (sym.includes("_crew")) {
                        sym = results[1] + "_crew";
                        obj = globalContext.core.crew.find(f => f.symbol === sym);
                    }
                    else if (sym.includes("battle")) {
                        sym = results[1] + "_ship";
                        obj = globalContext.core.all_ships.find(f => f.symbol === sym);
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

    return <React.Fragment>
        <Dropdown
            selection
            fluid
            options={pickerOpts}
            value={active}
            onChange={(e, { value }) => setActive(value as string)}
            />

    </React.Fragment>
}