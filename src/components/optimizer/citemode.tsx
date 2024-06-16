import React from "react"
import { Segment, Input, Dropdown } from "semantic-ui-react";
import { RarityFilter, PortalFilter } from "../crewtables/commonoptions";
import { DEFAULT_MOBILE_WIDTH } from "../hovering/hoverstat";
import { useStateWithStorage } from "../../utils/storage";
import { GlobalContext } from "../../context/globalcontext";
import { CiteMode } from "../../model/player";
import { SymCheck } from "./context";



export interface CiteModeProviderProps {
    pageId: string;
}


export const CiteModeConfigPanel = (props: CiteModeProviderProps) => {
    const globalContext = React.useContext(GlobalContext);
    const { t } = globalContext.localized;
    const { pageId } = props;

    if (!globalContext.player.playerData) return <></>;

    const { dbid } = globalContext.player.playerData.player;
    const [citeMode, setCiteMode] = useStateWithStorage<CiteMode>(`${dbid}/${pageId}/citeMode`, {}, { rememberForever: true });

    const [checks, SetChecks] = React.useState<SymCheck[] | undefined>();

    return <React.Fragment> 
            <Segment>
                <h3>{t('global.filters')}</h3>
                <div style={{
                    display: "flex",
                    flexDirection: window.innerWidth < DEFAULT_MOBILE_WIDTH ? "column" : "row"
                }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "left", margin: 0, marginRight: "1em"}}>
                        <RarityFilter
                            altTitle='Calculate specific rarity'
                            multiple={false}
                            rarityFilter={citeMode?.rarities ?? []}
                            setRarityFilter={(data) => {
                                this.setState({ ...this.state, citeMode: { ... citeMode ?? {}, rarities: data }, citeData: null });
                            }}
                            />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "left"}}>
                        <PortalFilter
                            portalFilter={citeMode?.portal}
                            setPortalFilter={(data) => {
                                setCiteMode({ ... citeMode ?? {}, portal: data });
                            }}
                            />
                    </div>
                    <div style={{ display: "flex", height: "3em", flexDirection: "row", justifyContent: "center", alignItems: "center", marginLeft: "1em"}}>
                        <Input
                            label={"Search"}
                            value={citeMode.nameFilter}
                            onChange={(e, { value }) => setCiteMode({ ... citeMode ?? {}, nameFilter: value })}
                            />
                        <i className='delete icon'
                            title={"Clear Searches and Comparison Marks"}
                            style={{
                                cursor: "pointer",
                                marginLeft: "0.75em"
                            }}
                            onClick={(e) => {
                                    setCiteMode({ ... citeMode ?? {}, nameFilter: '' });
                                    window.setTimeout(() => {
                                        this.setState({ ...this.state, checks: undefined });
                                    });

                                }
                            }
                        />

                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "left", marginLeft: "1em"}}>
                        <Dropdown
                            options={priSkills}
                            multiple
                            clearable
                            placeholder={"Filter by primary skill"}
                            value={citeMode.priSkills}
                            onChange={(e, { value }) => setCiteMode({ ... citeMode ?? {}, priSkills: value as string[] })}
                            />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "left", marginLeft: "1em"}}>
                        <Dropdown
                            options={secSkills}
                            multiple
                            clearable
                            placeholder={"Filter by secondary skill"}
                            value={citeMode.secSkills}
                            onChange={(e, { value }) => setCiteMode({ ... citeMode ?? {}, secSkills: value as string[] })}
                            />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "left", marginLeft: "1em"}}>
                        <Dropdown
                            options={seatSkills}
                            multiple
                            clearable
                            placeholder={"Filter by voyage seating"}
                            value={citeMode.seatSkills}
                            onChange={(e, { value }) => setCiteMode({ ... citeMode ?? {}, seatSkills: value as string[] })}
                            />
                    </div>

                </div>
            </Segment>

    </React.Fragment>
}