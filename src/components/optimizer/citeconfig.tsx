import React from "react";
import { Segment, Input, Dropdown, Button, Icon } from "semantic-ui-react";
import { PortalFilter } from "../crewtables/commonoptions";
import { DEFAULT_MOBILE_WIDTH } from "../hovering/hoverstat";
import { GlobalContext } from "../../context/globalcontext";
import { PlayerCrew } from "../../model/player";
import { CiteOptContext, DefaultCiteConfig } from "./context";
import CONFIG from "../CONFIG";
import { CollectionDropDown } from "../collections/collectiondropdown";

export interface CiteConfigPanelProps {
    pageId: string;
}

export const CiteConfigPanel = (props: CiteConfigPanelProps) => {
    const globalContext = React.useContext(GlobalContext);
    const citeContext = React.useContext(CiteOptContext);
    const { t } = globalContext.localized;

    if (!globalContext.player.playerData) return <></>;

    const { citeConfig, setCiteConfig, results } = citeContext;

    let proccrew: PlayerCrew[] | undefined = [...results?.citeData?.crewToCite ?? [], ...results?.citeData?.crewToTrain ?? [], ...results?.citeData?.crewToRetrieve ?? [] ];

    if (proccrew.length === 0) {
        proccrew = undefined;
    }
    else if (!proccrew[0].skills) {
        proccrew = proccrew.map(mc => globalContext.player.playerData?.player.character.crew.find(f => f.name === mc.name)!)!
    }

    const resultCrew = proccrew?.filter((f, idx) => f && proccrew.findIndex(f2 => f2 && ((f.symbol && f2.symbol === f.symbol) || (f.name && f.name === f2.name))) === idx);

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

    const resCols = resultCrew?.map(m => m.collection_ids).flat();
    const availCols = [ ...new Set(resCols?.map(m => Number(m)) ?? globalContext.core.collections.map(m => Number(m.id))) ];
    const counts = availCols.map((ac) => {
        let t = resultCrew?.filter(crew => crew.collection_ids.includes(ac?.toString()))?.length;
        return {
            col: ac,
            count: t
        }
    });
    return (
        <React.Fragment>
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
                <div style={{
                    display: "flex",
                    flexDirection: window.innerWidth < DEFAULT_MOBILE_WIDTH ? "column" : "row",
                    marginTop: "0.5em",
                    alignItems: 'center',
                    gap: '1em'
                }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "left"}}>
                        <CollectionDropDown
                            filter={availCols}
                            showMilestones={true}
                            multiple={true}
                            selection={citeConfig.collections}
                            setSelection={(data) => {
                                setCiteConfig({ ... citeConfig ?? {}, collections: typeof data === 'number' ? [data] : (!data ? [] : data) });
                            }}
                            customRender={(col) => {

                                let count = counts.find(f => f.col === Number(col.type_id))?.count ?? 0;
                                let green = false;
                                let mig = '';
                                if ("milestone" in col) {
                                    if (col.milestone.goal !== 'n/a' && col.progress !== 'n/a') {
                                        let remain = col.milestone.goal - col.progress;
                                        mig = ` (${col.progress} / ${col.milestone.goal})`;
                                        if (count >= remain) {
                                            green = true;
                                        }
                                    }
                                }

                                return <div style={{
                                        display: 'grid',
                                        gridTemplateAreas: `'name name name' 'left center right'`,
                                        gridTemplateColumns: '4em auto 4em',
                                        gap: '0.25em'
                                }}>
                                    <div style={{gridArea:'name'}}>
                                        {col.name}
                                    </div>
                                    <div style={{
                                        color: green ? 'lightgreen' : undefined,
                                        gridArea: 'left',
                                        fontSize: '0.8em'}}>
                                        {count}
                                    </div>
                                    <div style={{ gridArea: 'right', fontSize: '0.8em', textAlign: 'right'}}>
                                        {mig}
                                    </div>
                                </div>
                            }}

                            />
                    </div>
                    <div>
                        <Button onClick={resetFilters}><Icon name='eraser' />&nbsp;{t('global.clear')}</Button>
                    </div>
                </div>
            </Segment>
        </React.Fragment>
    );

    function resetFilters() {
        setCiteConfig({
            ...citeConfig,
            nameFilter: '',
            priSkills: [],
            secSkills: [],
            seatSkills: [],
            checks: [],
            collections: [],
            portal: undefined
        });
    }

}