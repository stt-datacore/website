import React from "react"
import { StatsCalendarChart } from "./charts/calendar"
import { Checkbox, Dropdown } from "semantic-ui-react"
import { GlobalContext } from "../../context/globalcontext"
import { useStateWithStorage } from "../../utils/storage"
import { OptionsPanelFlexColumn, OptionsPanelFlexRow } from "./utils"
import { StatsCreepGraphs } from "./charts/statscreep"
import { StatsCircleChart } from "./charts/circle"
import { CrewLab } from "./charts/crewlab"

export const ChartsView = () => {

    const globalContext = React.useContext(GlobalContext);
    const { t } = globalContext.localized;

    const [currGraph, setCurrGraph] = useStateWithStorage(`stat_trends_graphs_selector`, 'release_graph', { rememberForever: true });
    const [useFilters, setUseFilters] = useStateWithStorage(`stats_calendar_use_filters`, true, { rememberForever: true });

    const graphOpts = [
        { key: 'release_graph', value: 'release_graph', text: t('stat_trends.graphs.release_graph')},
        { key: 'skill_area', value: 'skill_area', text: t('stat_trends.graphs.skill_area')},
        { key: 'circle', value: 'circle', text: t('stat_trends.graphs.circle')},
        { key: 'experimental1', value: 'experimental1', text: t('global.experimental') + " #1"},
        // { key: 'experimental2', value: 'experimental2', text: t('global.experimental') + " #2"},
        // { key: 'experimental3', value: 'experimental3', text: t('global.experimental') + " #3"},
    ];

    const flexRow = OptionsPanelFlexRow;
    const flexCol = OptionsPanelFlexColumn;

    return <React.Fragment>
        <div style={flexRow}>
            <div style={{...flexCol, textAlign: 'left', alignItems: 'flex-start'}}>
                {t('stat_trends.graphs.title')}
                <Dropdown
                    selection
                    placeholder={t('stat_trends.graphs.title')}
                    options={graphOpts}
                    value={currGraph}
                    onChange={(e, { value}) => setCurrGraph(value as string)}
                    />
            </div>
        </div>

        <div style={{...flexRow, alignSelf: 'flex-start', margin: '1em 0' }}>
            <Checkbox
                label={t('stat_trends.graphs.ignore_filters')}
                checked={!useFilters}
                onChange={(e, { checked }) => setUseFilters(!checked)}
                />
        </div>

        <h3>{t(`stat_trends.graphs.${currGraph}`)}</h3>

        {currGraph === 'release_graph' && <StatsCalendarChart useFilters={useFilters} />}
        {currGraph === 'skill_area' && <StatsCreepGraphs useFilters={useFilters} />}
        {currGraph === 'circle' && <StatsCircleChart useFilters={useFilters} />}
        {currGraph === 'experimental1' && <CrewLab useFilters={useFilters} />}

    </React.Fragment>
}