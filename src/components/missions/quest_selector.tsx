import React from "react";
import { ContinuumMission } from "../../model/continuum";
import { Mission } from "../../model/missions";
import { Step } from "semantic-ui-react";
import { iOS, mobileCheck } from "../../utils/misc";
import { DEFAULT_MOBILE_WIDTH } from "../hovering/hoverstat";

export interface QuestSelectorProps {
    pageId: string;
    mastery: number;
    setMastery: (value: number) => void;
    questId?: number;
    setQuestId: (value?: number) => void;
    mission?: Mission | ContinuumMission;
    highlighted?: boolean[];
}

export const QuestSelector = (props: QuestSelectorProps) => {

    const { highlighted, pageId, mastery, setMastery, questId, setQuestId, mission } = props;
    const isMobile = typeof window !== 'undefined' && window.innerWidth < DEFAULT_MOBILE_WIDTH;

    return (<React.Fragment>

        <Step.Group fluid>
            <Step
                onClick={(e) => setMastery(0)}
                active={mastery === 0}
            >
                <Step.Content>
                    <Step.Title>Standard</Step.Title>
                    <Step.Description style={{ maxWidth: isMobile ? '100%' : "10vw" }} >Standard Difficulty</Step.Description>
                </Step.Content>
            </Step>
            <Step
                onClick={(e) => setMastery(1)}
                active={mastery === 1}
            >
                <Step.Content>
                    <Step.Title>Elite</Step.Title>
                    <Step.Description style={{ maxWidth: isMobile ? '100%' : "10vw" }} >Elite Difficulty</Step.Description>
                </Step.Content>
            </Step>
            <Step
                onClick={(e) => setMastery(2)}
                active={mastery === 2}
            >
                <Step.Content>
                    <Step.Title>Epic</Step.Title>
                    <Step.Description style={{ maxWidth: isMobile ? '100%' : "10vw" }} >Epic Difficulty</Step.Description>
                </Step.Content>
            </Step>
        </Step.Group>
        <Step.Group fluid>
            {mission?.quests?.map((quest, idx) => (
                <Step
                    key={pageId + "quest_" + idx + "_" + quest.id} active={questId === idx}
                    onClick={() => setQuestId(idx)}>
                    <Step.Content>
                        <Step.Title>{(highlighted && highlighted[idx] === true) ? <span style={{ color: 'lightgreen', fontWeight: 'bold' }}>{quest.name}</span> : quest.name}</Step.Title>
                        <Step.Description style={{ maxWidth: isMobile ? '100%' : "10vw" }} >{quest.description}</Step.Description>
                    </Step.Content>
                </Step>
            ))}

        </Step.Group>

    </React.Fragment>)

}