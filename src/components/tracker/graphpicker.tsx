import React, { useState } from 'react';
import { ResourceData } from "./utils";
import { useStateWithStorage } from '../../utils/storage';
import { OptionsPanelFlexColumn, OptionsPanelFlexRow } from '../stats/utils';
import { GlobalContext } from '../../context/globalcontext';
import { Dropdown } from 'semantic-ui-react';
import { ResourceBar } from './bargraph';
import { ResourceCandles } from './candlegraph';
import { ResourcePie } from './piegraph';
import { ResourceLine } from './linegraph';



export interface ResourceGraphProps {
    resources: ResourceData[];
    dbid: number;
    maxDays?: number;
}

export type ValidResourceGraphs = 'candles' | 'line' | 'bar' | 'pie';

export const ResourceGraphPicker = (props: ResourceGraphProps) => {
    const globalContext = React.useContext(GlobalContext);
    const { t } = globalContext.localized;
    const { dbid } = props;
    const [currentGraph, setCurrentGraph] = useStateWithStorage<ValidResourceGraphs>(`${dbid}/resource_tracker/graph/selected_graph`, 'candles', { rememberForever: true });

    const graphChoices = ['candles', 'line', 'bar', 'pie'].map((value) => {
        return {
            key: value,
            value,
            text: t(`resource_tracker.graphs.${value}`)
        }
    });

    return (<>
        <div style={{...OptionsPanelFlexColumn, alignItems: 'stretch', gap: '1em'}}>
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
            <div>
                {currentGraph === 'candles' && (
                    <ResourceCandles
                        {...props}
                        />
                )}
                {currentGraph === 'bar' && (
                    <ResourceBar
                        {...props}
                        />
                )}
                {currentGraph === 'pie' && (
                    <ResourcePie
                        {...props}
                        />
                )}
                {currentGraph === 'line' && (
                    <ResourceLine
                        {...props}
                        />
                )}
            </div>
        </div>
    </>)
}
