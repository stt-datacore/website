import React from 'react';
import { Accordion } from 'semantic-ui-react';
import { GlobalContext } from '../../context/globalcontext';



export const CiteOptExplainer = () => {

    const { t } = React.useContext(GlobalContext).localized;

    return (
        <>
            <Accordion
                defaultActiveIndex={-1}
                panels={[
                    {
                        index: 0,
                        key: 0,
                        title: 'EV Explainer (Click To Expand)',
                        content: {
                            content: (
                                <div>
                                    {/* <h3>Explanation</h3> */}
                                    <p>
                                        A crew's Expected Value (EV) is the average you can expect a crew to contribute to all voyages. EV Final accounts for the crew fully fused. EV Left, while less important, calculates the difference in contribution between fully fused and their current rank. Voyages Improved is how many of the voyage combinations the crew contributes to. Primary and secondary are taken into account, because CMD/DIP voyage will yield different results than DIP/CMD.
                                    </p>
                                    <p>
                                        A crew's EV for a voyage is found by finding the crew's average for the skill "Base + (Min + Max) / 2", multiplying that by 0.35 if the skill is the primary for the voyage, 0.25 if it is secondary, and 0.1 otherwise. To find how much the crew contributes to the total voyage, we find the best crew for the voyage that are fully leveled and equipped.
                                    </p>
                                    <p>
                                        "Training" is considered simply leveling and equipping the considered crew <u>at their current rarity</u>. This is done by comparing the current total EV of all voyages with those as if the considered crew were fully leveled and equiped <u>at current rarity</u>.
                                    </p>
                                    <p>
                                        "Citing" considered <u>fully fusing</u>, leveling and equipping the considered crew. This is done by comparing the current total EV of all voyages with those as if the considered crew were fully leveled and equiped <u>and fused</u>.
                                    </p>
                                </div>
                            )
                        }
                    }
                ]}
            />
        </>
    )
}