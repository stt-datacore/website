import React from "react";
import { appelate } from "../../utils/misc";
import { GlobalContext } from "../../context/globalcontext";

export interface TraitSelection {
    trait: string;
    selected: boolean;
    questId: number;
    clicked: boolean;
}

export interface TraitSelectorProps {
    traits: string[];
    questId: number;
    preformatted?: boolean;
    joinString?: string | React.JSX.Element;
    selectedTraits: TraitSelection[];
    setSelectedTraits: (value: TraitSelection[]) => void;
    style?: React.CSSProperties;
}


export const TraitSelectorComponent = (props: TraitSelectorProps) => {
    const { localized } = React.useContext(GlobalContext);
    const { questId, style, traits, preformatted, selectedTraits, setSelectedTraits } = props;
    const joinString = props.joinString ?? ", ";

    const clickTrait = (trait: string) => {
        if (selectedTraits?.some(st => st.trait === trait)) {
            setSelectedTraits(selectedTraits.filter(f => f.trait !== trait) ?? []);
        }
        else {
            setSelectedTraits([ ...selectedTraits ?? []].concat([{ trait, questId, selected: true, clicked: true }]));
        }
    }

    const traitStyle = {
        cursor: 'pointer'
    } as React.CSSProperties;

    const selStyle = {
        cursor: 'pointer',
        color: 'lightgreen'
    } as React.CSSProperties;

    return <div style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        flexWrap: 'wrap',
        gap: "0.25em",
        ... style ?? {},
    }}>
        {traits.map((trait) => {
            let tf = preformatted ? trait : localized.TRAIT_NAMES[trait];
            if (selectedTraits?.some(t => t.trait === trait && t.questId === questId && t.selected)) {
                return <div className={'ui label'} style={selStyle} onClick={(e) => clickTrait(trait)}>{tf}</div>
            }
            else {
                return <div className={'ui label'} style={traitStyle} onClick={(e) => clickTrait(trait)}>{tf}</div>
            }
        }).reduce((p, n) => p ? <>{p}{joinString}{n}</> : n)}
    </div>

}