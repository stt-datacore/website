import React from 'react';
import { Icon, Popup } from "semantic-ui-react";

const text = (
  <div style={{marginTop: "0.25em"}}>
    <p>Missions are divided into stages, presented from left to right.</p>
    <p>Each stage consists of one or more challenges.</p>
    <p>Click on a challenge to select it.</p>
    <p>Selected challenges will be highlighted with a <Icon name='star' color='green' /> green star.</p>
    <p>Selecting challenges a second time will exclude them from consideration, and they will be highlighted with a <Icon name='ban' color='red' /> red ban.</p>
    <p>All challenges whose paths intersect that challenge will automatically be highlighted in light gray.</p>
    <p>All challenges highlighted in light gray will be considered by the crew finder.</p>
    <p>If you select two or more challenges, only challenges whose paths run through all selected challenges will be highlighted.</p>
    <p>If you tap a challenge that is not in the highlight group, all challenges will be deselected.</p>
  </div>
);

export interface MapExplanationProps {
    header?: string;
    altContent?: React.JSX.Element;
}

const MapExplanation = (props: MapExplanationProps) => (
  <Popup wide trigger={<Icon name="help" />} header={props.header} content={props.altContent ?? text}/>
);

export default MapExplanation;
