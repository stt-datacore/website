import React from "react"
import { ITableConfigRow, SearchableTable } from "../../searchabletable"
import { TraitStats } from "../model"
import { GlobalContext } from "../../../context/globalcontext"
import { CrewBaseCells, getBaseTableConfig } from "../../crewtables/views/base"
import { CrewMember, Skill } from "../../../model/crew"
import { Button, Item, Table } from "semantic-ui-react"
import { IRosterCrew } from "../../retrieval/model"
import { omniSearchFilter } from "../../../utils/omnisearch"
import { Filter } from "../../../model/game-elements"
import { OptionsPanelFlexColumn, OptionsPanelFlexRow } from "../utils"
import { CrewBuffModes } from "../../crewtables/commonoptions"
import { useStateWithStorage } from "../../../utils/storage"
import { PlayerBuffMode } from "../../../model/player"
import { applyCrewBuffs, crewCopy, gradeToColor, skillAdd } from "../../../utils/crewutils"
import { CrewConfigTable } from "../../crewtables/crewconfigtable"
import CONFIG from "../../CONFIG"



export interface TraitDiveProps {
    info: TraitStats;
    onClose: () => void;
}

export const TraitDive = (props: TraitDiveProps) => {

    const { info: info, onClose } = props;
    const globalContext = React.useContext(GlobalContext);
    const { playerData } = globalContext.player;
    const { t, tfmt, TRAIT_NAMES } = globalContext.localized;
    const [buffMode, setBuffMode] = useStateWithStorage<PlayerBuffMode | undefined>('stat_trends/traits_dive/buff_mode', undefined);
    const tableConfig = getBaseTableConfig('allCrew', t);

    const workingBuffMode = React.useMemo(() => {
        if (buffMode) return buffMode;
        if (!playerData) return 'max';
        return 'player';
    }, [playerData, buffMode]);

    const crew = React.useMemo(() => {
        const newRoster = crewCopy(info.crew) as IRosterCrew[];
        return newRoster.map((c) => {
            if (workingBuffMode === 'player' && globalContext.player.buffConfig) {
                applyCrewBuffs(c, globalContext.player.buffConfig);
            }
            else if (workingBuffMode === 'max' && globalContext.maxBuffs) {
                applyCrewBuffs(c, globalContext.maxBuffs);
            }
            else {
                Object.keys(CONFIG.SKILLS).forEach((skill) => {
                    c[skill] = { core: 0, min: 0, max: 0 };
                });
                Object.entries(c.base_skills).forEach(([skill, data]: [string, Skill]) => {
                    c[skill] = {
                        core: data.core,
                        min: data.range_min,
                        max: data.range_max
                    }
                })
            }
            const pc = playerData?.player.character.crew.filter(f => f.symbol === c.symbol);
            if (pc?.length) {
                pc.sort((a, b) => b.rarity - a.rarity || b.level - a.level || a.immortal - b.immortal);
                c.rarity = c.highest_owned_rarity = pc[0].rarity;
            }
            else if (playerData) {
                c.rarity = 0;
            }
            else {
                c.rarity = c.max_rarity;
            }
            return c;
        });
    }, [info, playerData, workingBuffMode]);

    const flexCol = OptionsPanelFlexColumn;
    const flexRow = OptionsPanelFlexRow;

    return <React.Fragment>
        <div style={{...flexCol, alignItems: 'stretch', gap: '1em'}}>

        <div className="ui segment"
            style={{
                display: 'grid',
                gridTemplateAreas: "'trait1 trait2 img' 'hidden1 hidden2 img' 'crew1 crew2 img' 'cols cols img'",
                gridTemplateColumns: "7em auto auto"
            }}
        >
            <span style={{gridArea: 'trait1'}}>{t('stat_trends.trait_columns.trait')}</span>
            <span style={{fontSize: '1.5em', gridArea: 'trait2'}}>
                <div style={{...flexCol, gap: '0.25em', alignItems: 'flex-start'}}>
                    <div style={{...flexRow, justifyContent: 'flex-start', gap: '1em'}}>
                        {!!info.icon && <img src={info.icon} style={{height: '32px'}} />}
                        <span>{info.trait}</span>
                    </div>
                    {!!info.short_names &&
                        <div style={{...flexRow, justifyContent: 'flex-start', gap: '0.25em', fontStyle: 'italic', color: 'lightgreen'}}>
                            ({info.short_names.sort().join(", ")})
                        </div>
                    }
                    {CONFIG.SERIES.includes(info.trait_raw) &&
                    <div style={{...flexRow, justifyContent: 'flex-start', gap: '0.25em', fontStyle: 'italic', color: 'lightgreen'}}>
                        {t(`series.${info.trait_raw}`)}
                    </div>
                    }
                </div>
            </span>
            <div style={{gridArea: 'hidden1'}}>
                {t('global.hidden')}
            </div>
            <div style={{gridArea: 'hidden2'}}>
                {info.hidden ? t('global.yes') : t('global.no')}
            </div>
            <div style={{gridArea: 'crew1'}}>
                {t('base.crew')}
            </div>
            <div style={{gridArea: 'crew2'}}>
                {info.crew.length.toLocaleString()}
            </div>
            {!!info.grade && <div style={{gridArea: 'cols', marginTop: '1em'}}>
                {tfmt('stat_trends.traits.potential_collection_score_n', {
                    n: <span style={{color: gradeToColor(info.grade / 10)}}>
                        {info.grade}
                    </span>
                })}
            </div>}
            {CONFIG.SERIES.includes(info.trait_raw) &&
                    <img
                        style={{ height: '4em', margin: '0.25em', gridArea: 'img', alignSelf: 'center'}}
                        src={`${process.env.GATSBY_DATACORE_URL}/media/series/${info.trait_raw}.png`} />
                }

        </div>

        <Button onClick={() => onClose()}>{t('global.close')}</Button>
        <div style={{...flexRow, justifyContent: 'flex-start', gap: '1em'}}>
            <CrewBuffModes noneValue="none" playerAvailable={!!playerData} altTitle={t(`buffs.${workingBuffMode}_buffs`)} buffMode={buffMode} setBuffMode={setBuffMode} />
        </div>
        <CrewConfigTable
            pageId='trait_dive'
            rosterType='allCrew'
            tableConfig={tableConfig}
            renderTableCells={(crew) => <CrewBaseCells
                pageId='trait_deep_dive'
                tableType="allCrew"
                crew={crew as IRosterCrew} />}
            rosterCrew={crew as IRosterCrew[]}
            crewFilters={[]}

            />
        </div>
    </React.Fragment>

}