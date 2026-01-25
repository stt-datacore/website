import React from 'react';
import { Dropdown } from 'semantic-ui-react';
import { GlobalContext } from '../../context/globalcontext';
import { useStateWithStorage } from '../../utils/storage';
import { OptionsPanelFlexColumn, OptionsPanelFlexRow } from '../stats/utils';
import { ResourceBar } from './bargraph';
import { ResourceCandles } from './candlegraph';
import { ResourceLine } from './linegraph';
import { ResourcePie } from './piegraph';
import { ResourceData } from "./utils";

export type GraphMode = 'amount' | 'change_pct' | 'total_change_pct';

export interface ResourceGraphProps {
    resources: ResourceData[];
    dbid: number;
    maxDays?: number;
    mode?: GraphMode;
}

export type ValidResourceGraphs = 'candles' | 'line' | 'bar' | 'pie';

export const ResourceGraphPicker = (props: ResourceGraphProps) => {
    const globalContext = React.useContext(GlobalContext);
    const { t } = globalContext.localized;
    const { dbid } = props;
    const [currentGraph, setCurrentGraph] = useStateWithStorage<ValidResourceGraphs>(`${dbid}/resource_tracker/graph/selected_graph`, 'candles', { rememberForever: true });
    const [currentMode, setCurrentMode] = useStateWithStorage<GraphMode>(`${dbid}/resource_tracker/graph/graph_mode`, 'amount', { rememberForever: true });

    const graphChoices = ['candles', 'line', 'bar', 'pie'].map((value) => {
        return {
            key: value,
            value,
            text: t(`resource_tracker.graphs.${value}`)
        }
    });

    const modeChoices = ['amount', 'change_pct', 'total_change_pct'].map((value) => {
        return {
            key: value,
            value,
            text: t(`resource_tracker.graphs.view.${value}`)
        }
    });

    return (<>
        <div style={{...OptionsPanelFlexColumn, alignItems: 'stretch', gap: '1em'}}>
            <div style={{...OptionsPanelFlexRow, justifyContent: 'flex-start'}}>
                <div style={{...OptionsPanelFlexColumn, alignItems: 'flex-start', gap: '0.5em'}}>
                    <span>
                        {t(`resource_tracker.graphs.select`)}
                    </span>
                    <Dropdown
                        selection
                        options={graphChoices}
                        value={currentGraph}
                        onChange={(e, { value }) => setCurrentGraph(value as any)}
                        />
                </div>
                <div style={{...OptionsPanelFlexColumn, alignItems: 'flex-start', gap: '0.5em'}}>
                    <span>
                        {t(`resource_tracker.graphs.view.select`)}
                    </span>
                    <Dropdown
                        selection
                        options={modeChoices}
                        value={currentMode}
                        onChange={(e, { value }) => setCurrentMode(value as any)}
                        />
                </div>
            </div>
            <div>
                {currentGraph === 'candles' && (
                    <ResourceCandles
                        {...props}
                        mode={currentMode}
                        />
                )}
                {currentGraph === 'bar' && (
                    <ResourceBar
                        {...props}
                        mode={currentMode}
                        />
                )}
                {currentGraph === 'pie' && (
                    <ResourcePie
                        {...props}
                        mode={currentMode}
                        />
                )}
                {currentGraph === 'line' && (
                    <ResourceLine
                        {...props}
                        mode={currentMode}
                        />
                )}
            </div>
        </div>
    </>)
}
