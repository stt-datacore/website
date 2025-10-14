import React from "react"
import { GlobalContext } from "../../../context/globalcontext"
import { useStateWithStorage } from "../../../utils/storage";
import { RosterTable } from "../../crewtables/rostertable";
import { PlayerBuffMode, PlayerCrew } from "../../../model/player";
import { getPortalLog } from "../../../utils/misc";
import { Dropdown, DropdownItemProps } from "semantic-ui-react";
import { OptionsPanelFlexColumn, OptionsPanelFlexRow } from "../utils";
import { IRosterCrew } from "../../crewtables/model";
import { CrewPreparer } from "../../item_presenters/crew_preparer";




export const PortalUpdateTable = () => {

    const globalContext = React.useContext(GlobalContext);
    const { t } = globalContext.localized;

    const { portal_log, crew } = globalContext.core;

    const [update, setUpdate] = useStateWithStorage<number | undefined>(`portal_update/selection`, undefined);

    const [buffMode, setBuffMode] = useStateWithStorage<PlayerBuffMode | undefined>(`portal_update/buff_mode`, undefined);

    const [selections, setSelections] = React.useState<DropdownItemProps[]>([]);

    const portalLog = React.useMemo(() => {
        const wholeLog = portal_log;
        const unique = [] as number[];

        for (let e of wholeLog) {
            if (e.portal_batch_id && !unique.includes(e.portal_batch_id)) unique.push(e.portal_batch_id);
        }
        const newsels = [] as DropdownItemProps[];
        for (let d of unique) {
            let frec = wholeLog.find(e => e.portal_batch_id === d)?.date;
            newsels.push({
                key: `portal_update_${d}`,
                value: d,
                text: frec?.toLocaleDateString() || '<invalid_date>'
            });
        }
        setSelections(newsels);
        if (update === undefined && wholeLog?.length) {
            setUpdate(wholeLog[wholeLog.length-1].portal_batch_id);
        }
        return wholeLog;
    }, [portal_log, crew]);

    const selCrew = React.useMemo(() => {
        if (!update) return [];
        return portalLog.filter(f => f.portal_batch_id === update).map(pl => crew.find(c => c.symbol === pl.symbol)! as IRosterCrew)
            .map(c => {
                return CrewPreparer.prepareCrewMember(c, buffMode || 'none', 'shown_full', globalContext, false)[0];
            })
            .filter(c => !!c?.ranks?.scores) as PlayerCrew[];
    }, [update, portalLog]);

    const flexCol = OptionsPanelFlexColumn;

    return (<div style={{...flexCol, margin: '1em 0', gap: '1em', alignItems: 'flex-start'}}>
        <div style={{...flexCol, alignItems: 'flex-start'}}>
            {t('global.portal_update')}
            <Dropdown
                placeholder={t('hints.filter_by_date')}
                selection
                value={update}
                options={selections}
                onChange={(e, { value }) => setUpdate(value as number | undefined)}
                />
        </div>
        <RosterTable
            buffMode={buffMode}
            pageId='portal_update'
            rosterCrew={selCrew}
            setBuffMode={setBuffMode}
            rosterType="allCrew"
            />
        </div>)

}