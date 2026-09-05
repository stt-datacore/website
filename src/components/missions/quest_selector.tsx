import React from "react";
import { ContinuumMission } from "../../model/continuum";
import { Mission } from "../../model/missions";
import { Step } from "semantic-ui-react";
import { iOS, mobileCheck } from "../../utils/misc";
import { DEFAULT_MOBILE_WIDTH } from "../hovering/hoverstat";
import { GlobalContext } from "../../context/globalcontext";

export interface QuestSelectorProps {
    pageId: string;
    mastery: number;
    setMastery: (value: number) => void;
    questIdx?: number;
    setQuestIdx: (callerDebug: string, value?: number) => void;
    mission?: Mission | ContinuumMission;
    highlighted?: boolean[];
    masteryPlacement?: 'top' | 'bottom';
}

export const QuestSelector = (props: QuestSelectorProps) => {
    const globalContext = React.useContext(GlobalContext);
    const { t } = globalContext.localized;
    const { highlighted, pageId, mastery, setMastery, questIdx, setQuestIdx, mission } = props;
    const isMobile = typeof window !== 'undefined' && window.innerWidth < DEFAULT_MOBILE_WIDTH;

    const renderMastery = () => {

        return    (<Step.Group fluid>
        <Step
            onClick={(e) => setMastery(0)}
            active={mastery === 0}
        >
            <Step.Content>
                <Step.Title>{t('mastery.normal')}</Step.Title>
                <Step.Description style={{ maxWidth: isMobile ? '100%' : "10vw" }} >{t('mastery.normal_difficulty')}</Step.Description>
            </Step.Content>
        </Step>
        <Step
            onClick={(e) => setMastery(1)}
            active={mastery === 1}
        >
            <Step.Content>
                <Step.Title>{t('mastery.elite')}</Step.Title>
                <Step.Description style={{ maxWidth: isMobile ? '100%' : "10vw" }} >{t('mastery.elite_difficulty')}</Step.Description>
            </Step.Content>
        </Step>
        <Step
            onClick={(e) => setMastery(2)}
            active={mastery === 2}
        >
            <Step.Content>
                <Step.Title>{t('mastery.epic')}</Step.Title>
                <Step.Description style={{ maxWidth: isMobile ? '100%' : "10vw" }} >{t('mastery.epic_difficulty')}</Step.Description>
            </Step.Content>
        </Step>
    </Step.Group>)
    }

    return (<React.Fragment>
        {props.masteryPlacement !== 'bottom' && renderMastery()}
        <Step.Group fluid style={{display: 'flex', flexWrap: 'wrap'}}>

            {mission?.quests?.map((quest, idx) => (
                <Step
                    key={pageId + "quest_" + idx + "_" + quest.id} active={questIdx === idx}
                    onClick={() => setQuestIdx("selectorClick", idx)}>
                    <Step.Content>
                        <Step.Title>{(highlighted && highlighted[idx] === true) ? <span style={{ color: 'lightgreen', fontWeight: 'bold' }}>{quest.name}</span> : quest.name}</Step.Title>
                        <Step.Description style={{ maxWidth: isMobile ? '100%' : "10vw" }} >{quest.description}</Step.Description>
                    </Step.Content>
                </Step>
            ))}
        </Step.Group>
        {props.masteryPlacement === 'bottom' && renderMastery()}
    </React.Fragment>)

}