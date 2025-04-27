import React from "react";
import { ObjectiveEvent, OERefType } from "../../model/player";
import { Container, Modal, Tab, Image, Header, Menu, Segment, Label } from "semantic-ui-react";
import { OEInfo } from "./oeinfo";
import { FactionAbbrMap, getArchetypeTitle, KnownStages, KSRegExp } from "./utils";
import { CrewHoverStat } from "../hovering/crewhoverstat";
import { ItemHoverStat } from "../hovering/itemhoverstat";
import { ShipHoverStat } from "../hovering/shiphoverstat";
import { getIconPath } from "../../utils/assets";
import CONFIG from "../CONFIG";
import factions from "../factions";
import { GlobalContext } from "../../context/globalcontext";
import { OptionsPanelFlexColumn, OptionsPanelFlexRow } from "../stats/utils";


export interface OEModalProps {
    isOpen: boolean;
    setIsOpen: (value: boolean) => void;
    data?: ObjectiveEvent;
}


export const OEModal = (props: OEModalProps) => {

    const globalContext = React.useContext(GlobalContext);
    const { factions } = globalContext.core;
    const { t } = globalContext.localized;
    const { isOpen, setIsOpen, data } = props;

    const [activePane, setActivePane] = React.useState(0);
    const flexRow = OptionsPanelFlexRow;

    const activeEventInfo = React.useMemo(() => {
        let info = data;
        if (!info) return;
        info = JSON.parse(JSON.stringify(info)) as ObjectiveEvent;
        info.objective_archetypes.forEach((oearch) => {
            let sym = oearch.symbol;
            let x = sym.indexOf("_");
            sym = sym.slice(x + 1);
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
    }, [data]);

    React.useEffect(() => {
        setActivePane(0);
    }, [activeEventInfo]);

    const panes = activeEventInfo?.objective_archetypes.map(oearch => ({
        menuTitle: getArchetypeTitle(oearch),
        render: () => <Tab.Pane attached={false}>
            <OEInfo data={activeEventInfo} objective_archetype={oearch} />
        </Tab.Pane>
    })) ?? [];

    if (!activeEventInfo) return <></>;

    return (
        <Modal
            open={isOpen}
            onClose={() => setIsOpen(false)}
            header={
                <Header style={{padding:'0.1em'}}>
                    <Segment style={{margin:0,}}>
                        <h3>
                        {activeEventInfo.name}
                        </h3>
                    </Segment>
                </Header>
            }
            content={
                renderContent()
            }
        />
    )

    function renderContent() {
        if (!activeEventInfo) return <></>;
        return (
            <Container style={{ padding: '1em' }}>
                <div style={{ ...flexRow }}>
                    <Menu vertical tabular secondary pointing>
                        {panes.map((pane, idx) => (
                            <Menu.Item
                                active={activePane === idx}
                                key={`tab_upper_${pane.menuTitle}`} onClick={() => setActivePane(idx)}>
                                {pane.menuTitle}
                            </Menu.Item>
                        ))}
                    </Menu>
                    <div className="ui segment" style={{ margin: 'auto' }}>
                        <img
                            style={{ height: '300px', width: '500px', margin: 'auto' }}
                            src={`${process.env.GATSBY_ASSETS_URL}${getIconPath(activeEventInfo.image, true)}`}
                        />
                    </div>
                </div>
                <Tab
                    activeIndex={activePane}
                    //menu={{vertical: true, tabular: true,secondary: true, pointing: true }}
                    style={{ marginTop: '1em' }}
                    panes={panes}
                    renderActiveOnly
                />
                <CrewHoverStat targetGroup='event_info' modalPositioning={true} />
                <ItemHoverStat targetGroup='event_info_items' modalPositioning={true} />
                <ShipHoverStat targetGroup='event_info_ships' modalPositioning={true} />
            </Container>
        );
    }
}

