import React from "react"
import { Segment, Input, Dropdown } from "semantic-ui-react";
import { RarityFilter, PortalFilter } from "../crewtables/commonoptions";
import { DEFAULT_MOBILE_WIDTH } from "../hovering/hoverstat";
import { useStateWithStorage } from "../../utils/storage";
import { GlobalContext } from "../../context/globalcontext";
import { CiteMode } from "../../model/player";
import { CiteConfig, CiteOptContext, SymCheck } from "./context";
import CONFIG from "../CONFIG";



export interface CiteConfigPanelProps {
    pageId: string;
}


export const CiteConfigPanel = (props: CiteConfigPanelProps) => {
    const globalContext = React.useContext(GlobalContext);
    const citeContext = React.useContext(CiteOptContext);
    const { t } = globalContext.localized;

    if (!globalContext.player.playerData) return <></>;

    const { citeConfig, setCiteConfig } = citeContext;

    const priSkills = Object.entries(CONFIG.SKILLS).map(([skill, name]) => {
        return {
            key: skill.replace('_skill', ''),
            value: skill.replace('_skill', ''),
            text: name
        }
    });

    const secSkills = Object.entries(CONFIG.SKILLS).map(([skill, name]) => {
        return {
            key: skill.replace('_skill', ''),
            value: skill.replace('_skill', ''),
            text: name
        }
    });

    const seatSkills = Object.entries(CONFIG.SKILLS).map(([skill, name]) => {
        return {
            key: skill.replace('_skill', ''),
            value: skill.replace('_skill', ''),
            text: name
        }
    });

    return <React.Fragment>
            <Segment>
                <h3>{t('global.filters')}</h3>
                <div style={{
                    display: "flex",
                    flexDirection: window.innerWidth < DEFAULT_MOBILE_WIDTH ? "column" : "row"
                }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "left"}}>
                        <PortalFilter
                            portalFilter={citeConfig?.portal}
                            setPortalFilter={(data) => {
                                setCiteConfig({ ... citeConfig ?? {}, portal: data });
                            }}
                            />
                    </div>
                    <div style={{ display: "flex", height: "3em", flexDirection: "row", justifyContent: "center", alignItems: "center", marginLeft: "1em"}}>
                        <Input
                            label={t('global.search')}
                            value={citeConfig.nameFilter}
                            onChange={(e, { value }) => setCiteConfig({ ... citeConfig ?? {}, nameFilter: value })}
                            />
                        <i className='delete icon'
                            title={t('cite_opt.config.clear')}
                            style={{
                                cursor: "pointer",
                                marginLeft: "0.75em"
                            }}
                            onClick={(e) => {
                                    setCiteConfig({ ... citeConfig ?? {}, nameFilter: '' });
                                    setTimeout(() => {
                                        setCiteConfig({ ...citeConfig ?? {}, nameFilter: '' , checks: [] });
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
                            placeholder={t('hints.filter_by_primary_skill')}
                            value={citeConfig.priSkills}
                            onChange={(e, { value }) => setCiteConfig({ ... citeConfig ?? {}, priSkills: value as string[] })}
                            />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "left", marginLeft: "1em"}}>
                        <Dropdown
                            options={secSkills}
                            multiple
                            clearable
                            placeholder={t('hints.filter_by_secondary_skill')}
                            value={citeConfig.secSkills}
                            onChange={(e, { value }) => setCiteConfig({ ... citeConfig ?? {}, secSkills: value as string[] })}
                            />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "left", marginLeft: "1em"}}>
                        <Dropdown
                            options={seatSkills}
                            multiple
                            clearable
                            placeholder={t('hints.filter_by_voyage_seating')}
                            value={citeConfig.seatSkills}
                            onChange={(e, { value }) => setCiteConfig({ ... citeConfig ?? {}, seatSkills: value as string[] })}
                            />
                    </div>

                </div>
            </Segment>

    </React.Fragment>
}