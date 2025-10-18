import React from "react"
import { StatsCalendarChart } from "./charts/calendar"
import { Checkbox, Dropdown } from "semantic-ui-react"
import { GlobalContext } from "../../context/globalcontext"
import { useStateWithStorage } from "../../utils/storage"
import { OptionsPanelFlexColumn, OptionsPanelFlexRow } from "./utils"
import { StatsCreepGraphs } from "./charts/statscreep"
import { StatsCircleChart } from "./charts/circle"
import { CrewLab } from "./charts/crewlab"
import { EventDistributionPicker } from "./charts/eventdistribution"
import { TraitDistributions } from "./charts/traitdistribution"
import { getVariantTraits } from "../../utils/crewutils"

interface ChartsViewProps {
    setHideFilters: (value: boolean) => void;
    hideFilters: boolean;
}
export const ChartsView = (props: ChartsViewProps) => {

    const { hideFilters, setHideFilters } = props;

    const globalContext = React.useContext(GlobalContext);
    const { t } = globalContext.localized;

    const [currGraph, setCurrGraph] = useStateWithStorage(`stat_trends_graphs_selector`, 'release_graph', { rememberForever: true });
    const [useFilters, setUseFilters] = useStateWithStorage(`stats_calendar_use_filters`, true, { rememberForever: true });

    React.useEffect(() => {
        if (currGraph !== 'event_distributions' && hideFilters) {
            setHideFilters(false);
        }
        else if (currGraph === 'event_distributions' && !hideFilters) {
            setHideFilters(true);
        }
    }, [currGraph]);

    const portalTraits = React.useMemo(() => {
        if (currGraph !== 'trait_distributions') return [];
        const { crew } = globalContext.core;
        const minLen = Math.ceil(crew.length / 15);
        const proto = [...new Set(crew.filter(f => f.in_portal).map(m => m.traits).flat())].sort();
        return proto.filter(trait => crew.filter(c => c.traits.includes(trait)).length >= minLen);
    }, [currGraph]);

    const variantTraits = React.useMemo(() => {
        if (currGraph !== 'trait_distributions') return [];
        const { crew } = globalContext.core;
        const minLen = 2; // Math.ceil(crew.length / 50);
        const proto = [...new Set(crew.filter(f => f.in_portal).map(m => getVariantTraits(m)).flat())].sort();
        return proto.filter(trait => crew.filter(c => c.traits_hidden.includes(trait)).length >= minLen);
    }, [currGraph]);

    const hiddenTraits = React.useMemo(() => {
        if (currGraph !== 'trait_distributions') return [];
        const { crew } = globalContext.core;
        const minLen = Math.ceil(crew.length / 50);
        const proto = [...new Set(crew.map(m => m.traits_hidden).flat())].sort();
        return proto.filter(trait => crew.filter(c => c.traits_hidden.includes(trait)).length >= minLen);
    }, [currGraph]);

    const allTraits = React.useMemo(() => {
        if (currGraph !== 'trait_distributions') return [];
        const { crew } = globalContext.core;
        const minLen = Math.ceil(crew.length / 50);
        const proto = [...new Set(crew.map(m => m.traits_hidden.concat(m.traits)).flat())].sort();
        return proto.filter(trait => crew.filter(c => c.traits.includes(trait) || c.traits_hidden.includes(trait)).length >= minLen);
    }, [currGraph]);

    const graphOpts = [
        { key: 'release_graph', value: 'release_graph', text: t('stat_trends.graphs.release_graph')},
        { key: 'skill_area', value: 'skill_area', text: t('stat_trends.graphs.skill_area')},
        { key: 'circle', value: 'circle', text: t('stat_trends.graphs.circle')},
        { key: 'event_distributions', value: 'event_distributions', text: t('stat_trends.graphs.event_distributions')},
        { key: 'trait_distributions', value: 'trait_distributions', text: t('stat_trends.graphs.trait_distributions')},
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

        {currGraph !== 'event_distributions' && <div style={{...flexRow, alignSelf: 'flex-start', margin: '1em 0' }}>
            <Checkbox
                label={t('stat_trends.graphs.ignore_filters')}
                checked={!useFilters}
                onChange={(e, { checked }) => setUseFilters(!checked)}
                />
        </div>}

        <h3>{t(`stat_trends.graphs.${currGraph}`)}</h3>

        {currGraph === 'release_graph' && <StatsCalendarChart useFilters={useFilters} />}
        {currGraph === 'skill_area' && <StatsCreepGraphs useFilters={useFilters} />}
        {currGraph === 'circle' && <StatsCircleChart useFilters={useFilters} />}
        {currGraph === 'experimental1' && <CrewLab useFilters={useFilters} />}
        {currGraph === 'event_distributions' && <EventDistributionPicker />}
        {currGraph === 'trait_distributions' && (
            <TraitDistributions
                portalTraits={portalTraits}
                variantTraits={variantTraits}
                hiddenTraits={hiddenTraits}
                allTraits={allTraits}
            />
        )}
    </React.Fragment>
}