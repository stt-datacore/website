import React from "react";
import { Mission, MissionChallenge, ProtoMission, Quest } from "../../model/missions";
import { GlobalContext } from "../../context/globalcontext";
import { Dropdown, DropdownItemProps, Form } from "semantic-ui-react";
import { ContinuumMission } from "../../model/continuum";

export interface QuestDropDownProps {
    mission?: ProtoMission;
    missionsfull?: Mission[];
    selection?: string | string[];
    multiple?: boolean;
    continuum?: boolean;
    setSelection: (value?: string | string[]) => void;
    customRender?: (value: Quest) => JSX.Element;
}

export const QuestDropDown = (props: QuestDropDownProps) => {
    const globalContext = React.useContext(GlobalContext);
    const { t } = globalContext.localized;
    const { customRender, multiple, selection, setSelection } = props;
    const { missionsfull } = props;

    const [mission, setMission] = React.useState(props.mission as ProtoMission | Mission | ContinuumMission);
    const [choices, setChoices] = React.useState<DropdownItemProps[]>([]);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        if (!mission && props.continuum) {
            const { continuum_missions } = globalContext.core;
            if (continuum_missions.length) {
                const current = continuum_missions[continuum_missions.length - 1];
                setTimeout(() => {
                    fetchContinuum(current);
                });
            }
        }
    }, []);

    React.useEffect(() => {
        if (!mission) return;
        if ((missionsfull?.length || mission.quests?.some(q => q.challenges?.length)) && props.continuum && mission && "quest_ids" in mission && !!mission.quest_ids) {
            const result = mission;
            const rq = {} as { [key: number]: Quest };
            if (missionsfull && props.continuum && !mission.quests?.every(q => q.challenges?.length)) {
                missionsfull
                    .filter((mission) =>
                        mission.quests.some((q) => result.quest_ids.includes(q.id))
                    )
                    .map((mission) =>
                        mission.quests.filter((q) => result.quest_ids.includes(q.id))
                    )
                    .flat()
                    .forEach((q) => {
                        rq[q.id] = q;
                    });

                if (result.quests) {
                    for (let i = 0; i < result.quests.length; i++) {
                        let quests = result.quests;
                        result.quests[i].challenges = rq[quests[i].id].challenges ? JSON.parse(JSON.stringify(rq[quests[i].id].challenges)) : undefined;
                        result.quests[i].challenges?.forEach(ch => {
                            ch.trait_bonuses = [];
                            ch.difficulty_by_mastery = [];
                        });
                    }
                }
            }
        }

        const newchoice = mission.quests?.map((m) => {
            return {
                key: `${m.symbol}_dropdown_quest`,
                value: m.symbol,
                text: `${m.name}`,
                content: customRender ? customRender(m) : undefined
            } as DropdownItemProps;
        });
        setChoices(newchoice ?? []);
        setLoading(false);
    }, [mission, missionsfull]);

    if (loading) {
        return globalContext.core.spin(t('global.quest'));
    }

    return (
        <Form.Field
            placeholder={t('hints.filter_by_quest')}
            control={Dropdown}
            clearable
            multiple={multiple}
            search
            selection
            options={choices}
            value={selection}
            onChange={(e, { value }) => setSelection(value as string[] | string)}
            closeOnChange
        />
    )

    function fetchContinuum(mission: ContinuumMission) {
        const missionUrl = `/structured/continuum/${mission.id}.json`;
        fetch(missionUrl)
            .then((response) => response.json())
            .then((result: ContinuumMission) => {
                setMission(result);
            });
    }

}