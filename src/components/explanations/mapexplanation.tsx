import React from 'react';
import { Icon, Popup } from "semantic-ui-react";

const text = (
  <>
    <p>Missions are divided into stages, presented from left to right.</p>
    <p>Each stage consists of one or more challenges.</p>    
    <p>Click on a challenge to select it.</p>
    <p>Selected challenges will be highlighted with a green star <Icon name='star' color='green' />.</p>
    <p>All challenges whose paths intersect that challenge will automatically be highlighted in light gray.</p>
    <p>If you select two or more challenges, only challenges whose paths run through all selected challenges will be highlighted.</p>
    <p>If you tap a challenge that is not in the highlight group, all challenges will be deselected.</p>
  </>
);

export interface MapExplanationProps {
    header?: string;
    altContent?: JSX.Element;
}

const MapExplanation = (props: MapExplanationProps) => (
  <Popup wide trigger={<Icon name="help" />} header={props.header} content={props.altContent ?? text}/>
);

export default MapExplanation;
