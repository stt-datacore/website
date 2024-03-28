import React from 'react';
import { Icon, Popup } from "semantic-ui-react";
import { CrewChallengeInfo, IQuestCrew } from '../../model/worker';

export const PowerColors = {
    MinRoll: 'lightgreen',
    MaxRoll: 'aqua',
    Reduced: 'yellow',
    MaxReduced: 'orange'
}

const paraStyle = {
    display: 'flex', 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'left', 
    marginTop: "0.25em"
} as React.CSSProperties;

const swatchStyle = {
    width: "24px", 
    height: "24px", 
    border: "1px solid black", 
    color: 'black',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '10pt',
    padding: 0,
    fontWeight: 'bold'
} as React.CSSProperties;

export const gradeCrew = (info: CrewChallengeInfo) => {
    if (info.max_solve && info.power_decrease) {
        return "D";
    }
    else if (info.power_decrease) {
        return "C";
    }
    else if (info.max_solve) {
        return "B";    
    }
    return "A";
}

export const GradeSwatch = (props: { grade: 'A' | 'B' | 'C' | 'D', style?: React.CSSProperties }) => {
    const { grade, style } = props;

    let clr = '';
    if (grade === 'A') clr = PowerColors.MinRoll;
    else if (grade === 'B') clr = PowerColors.MaxRoll;
    else if (grade === 'C') clr = PowerColors.Reduced;
    else if (grade === 'D') clr = PowerColors.MaxReduced;

    return (
        <div style={{...swatchStyle, backgroundColor: clr, ...style}}>{grade}</div>
    )
}

const text = (
  <div style={{fontSize: "1em", marginTop: "0.5em"}}>
    <p style={paraStyle}>
        <GradeSwatch grade={'A'} style={{marginRight: "0.25em"}} />
        Full power; Min roll to succeed (best)
    </p>
    <p style={paraStyle}>
        <GradeSwatch grade={'B'} style={{marginRight: "0.25em"}} />
        Full power; Max roll to succeed
    </p>
    <p style={paraStyle}>
        <GradeSwatch grade={'C'} style={{marginRight: "0.25em"}} />
        Reduced power; Min roll to succeed
    </p>
    <p style={paraStyle}>
        <GradeSwatch grade={'D'} style={{marginRight: "0.25em"}} />
        Reduced power; Max roll to succeed
    </p>
    <i style={{fontSize:"0.9em"}}>
        <b>Note:&nbsp;</b>If a jackpot reward has not been claimed for a node, then success is derived from crit chances, otherwise it is derived from simple pass chances.
    </i>
  </div>
);

const PowerExplanation = () => (
  <Popup wide trigger={<Icon name="help" />} header={'Skill Power Legend'} content={text}/>
);

export default PowerExplanation;
