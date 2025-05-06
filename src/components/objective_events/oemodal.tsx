import React from "react";
import { Container, Header, Icon, Label, Menu, Modal, Popup, Segment, Tab } from "semantic-ui-react";
import { GlobalContext } from "../../context/globalcontext";
import { ObjectiveEvent, OERefType } from "../../model/player";
import { getIconPath } from "../../utils/assets";
import CONFIG from "../CONFIG";
import { CrewHoverStat } from "../hovering/crewhoverstat";
import { DEFAULT_MOBILE_WIDTH } from "../hovering/hoverstat";
import { ItemHoverStat } from "../hovering/itemhoverstat";
import { ShipHoverStat } from "../hovering/shiphoverstat";
import { OptionsPanelFlexColumn, OptionsPanelFlexRow } from "../stats/utils";
import { RegisteredTools } from "./mini_tools/registered_tools";
import { OEInfo } from "./oeinfo";
import { FactionAbbrMap, getArchetypeTitle, KnownStages, KSRegExp } from "./utils";
import { useStateWithStorage } from "../../utils/storage";

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
    const { ephemeral } = globalContext.player;
    const [activePane, setActivePane] = React.useState(0);
    const [toolActive, setToolActive] = useStateWithStorage(`oe_modal/tool_active`, true, { rememberForever: true });
    const isMobile = typeof window !== 'undefined' && window.innerWidth < DEFAULT_MOBILE_WIDTH;

    const flexRow = OptionsPanelFlexRow;
    const flexCol = OptionsPanelFlexColumn;

    const activeEventInfo = React.useMemo(() => {
        return parseOE(data);
    }, [data]);

    React.useEffect(() => {
        setActivePane(0);
    }, [activeEventInfo]);

    const panes = activeEventInfo?.objective_archetypes.map(oearch => ({
        menuTitle: getArchetypeTitle(oearch),
        data: oearch,
        render: () => <Tab.Pane attached={false}>
            <OEInfo data={activeEventInfo} objective_archetype={oearch} />
        </Tab.Pane>
    })) ?? [];

    const Tool = React.useMemo(() => {
        if (activePane < 0 || activePane >= panes.length) return undefined;
        const symbol = panes[activePane].data.symbol;
        const registered = RegisteredTools.find(f => f.archetypes.includes(symbol));
        if (registered) {
            if (registered.player_required && !globalContext.player.playerData) return undefined;
            return registered.component;
        }
        return undefined;
    }, [activePane]);

    const activeArchetype = React.useMemo(() => {
        if (activePane < 0 || activePane >= panes.length) return undefined;
        return panes[activePane].data;
    }, [activePane]);

    if (!activeEventInfo) return <></>;

    return (
        <Modal
            open={isOpen}
            onClose={() => setIsOpen(false)}
            header={
                <Header style={{ padding: '0.1em' }}>
                    <Segment style={{ margin: 0, }}>
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
                <div style={{ ...(isMobile ? flexCol : flexRow), marginBottom: 0 }}>
                    <Menu vertical tabular secondary pointing>
                        {panes.map((pane, idx) => (
                            <Menu.Item
                                active={activePane === idx}
                                key={`tab_upper_${pane.menuTitle}`} onClick={() => setActivePane(idx)}>
                                <div style={{ ...flexRow, gap: '1em' }}>
                                    {!!pane.data.objective && pane.data.objective.current_value >= pane.data.objective.target_value &&
                                        <Icon name='check' color='green' /> ||
                                        (!!RegisteredTools.find(f => f.archetypes.includes(pane.data.symbol)) &&
                                            <Popup
                                                content={t('objective_events.mini_helper_available')}
                                                trigger={
                                                    <Icon name='arrows alternate horizontal' color='blue' />
                                                } />)
                                    }
                                    {pane.menuTitle}
                                </div>
                            </Menu.Item>
                        ))}
                    </Menu>
                    <div className="ui segment" style={{ margin: 'auto', padding: (toolActive && Tool) ? '0.5em 1em 1em 1em' : undefined }}>
                        {(!toolActive || !Tool) && <img
                            style={{ height: '300px', width: '500px', margin: 'auto' }}
                            src={`${process.env.GATSBY_ASSETS_URL}${getIconPath(activeEventInfo.image, true)}`}
                        />}
                        {!!toolActive && !!Tool && !!activeArchetype &&
                            <div style={{ width: '500px', height: '300px' }}>
                                <Tool data={activeArchetype} />
                            </div>
                        }
                        {!!Tool &&
                            <Popup
                                content={t('objective_events.toggle_mini_helper')}
                                trigger={
                                    <Label color="blue" corner='right' style={{ cursor: 'pointer' }} onClick={() => toggleTool()}>
                                        <Icon style={{ cursor: 'pointer' }} name='arrows alternate horizontal' />
                                    </Label>}
                            />}
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

    function parseOE(info: ObjectiveEvent | undefined) {
        if (!info) return;
        info = JSON.parse(JSON.stringify(info)) as ObjectiveEvent;
        let curr = ephemeral?.objectiveEventRoot?.statuses?.find(f => f.id === info.id);
        if (curr) {
            info.objectives = curr.objectives;
        }
        info.objective_archetypes = info.objective_archetypes.map((oearch) => {
            let sym = oearch.symbol;
            let x = sym.indexOf("_");
            sym = sym.slice(x + 1);
            if (curr) {
                oearch.objective = curr.objectives?.find(ob => ob.archetype_id === oearch.id);
            }
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
            return oearch;
        });
        return info;
    }

    function toggleTool() {
        setToolActive(!toolActive);
    }
}



