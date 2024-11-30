import React from "react"
import { StatsCalendarChart } from "./charts/calendar"
import { Dropdown, DropdownItemProps, Step } from "semantic-ui-react"
import { GlobalContext } from "../../context/globalcontext"
import { useStateWithStorage } from "../../utils/storage"



export const ChartsView = () => {

    const globalContext = React.useContext(GlobalContext);
    const { t } = globalContext.localized;
    const graphOpts = [] as DropdownItemProps[];

    const [currGraph, setCurrGraph] = useStateWithStorage(`stat_trends_graphs_selector`, 'release_graph', { rememberForever: true });

    graphOpts.push(
        { key: 'release_graph', value: 'release_graph', text: t('stat_trends.graphs.release_graph')}
    )

    const flexCol: React.CSSProperties = {display:'flex', textAlign: 'left', flexDirection: 'column', alignItems:'flex-start', justifyContent: 'flex-start', gap: '0.5em'};
    const flexRow: React.CSSProperties = {display:'flex', flexDirection: 'row', alignItems:'top', justifyContent: 'flex-start', gap: '2em', flexWrap: 'wrap'};

    return <React.Fragment>

        <div style={flexRow}>
            <div style={flexCol}>
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


        <h3>{t(`stat_trends.graphs.${currGraph}`)}</h3>
        {currGraph === 'release_graph' && <StatsCalendarChart />}

    </React.Fragment>
}