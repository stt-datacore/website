import React from "react";
import { IRosterCrew } from "../model";
import { ITableConfigRow } from "../../searchabletable";
import CONFIG from "../../CONFIG";
import { Table } from "semantic-ui-react";
import { QuipmentScores } from "../../../model/crew";
import { gradeToColor, missionsToNext, numberToGrade, qbitsToSlots, qbProgressToNext, skillToShort } from "../../../utils/crewutils";
import { TranslateMethod } from "../../../model/player";
import { GlobalContext } from "../../../context/globalcontext";



export interface QuipmentScoreProps {
    crew: IRosterCrew;
    top: QuipmentScores;
    excludeSkills: boolean;
    excludeSpecialty?: boolean;
    excludeGrade?: boolean;
    excludeQBits?: boolean;
}

export const getQuipmentTableConfig = (t: TranslateMethod, excludeQBits?: boolean, excludeSpecialty?: boolean) => {
    const config = [] as ITableConfigRow[];
    config.push({ width: 1, column: 'quipment_score', title: t('quipment_ranks.overall'), reverse: true });
    if (!excludeSpecialty) config.push({ width: 1, column: 'quipment_scores.trait_limited', title: t('quipment_ranks.specialty'), reverse: true });

    CONFIG.SKILLS_SHORT.map(p => p.name).forEach((skill) => {
        config.push({
            width: 1,
            column: `quipment_scores.${skill}`,
            reverse: true,
            title:
            <div style={{display: 'inline-block'}}>
            <div style={{display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center'}}>
                <img
                    style={{ height: '16px'}}
                    src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${skill}.png`}
                    />
                <span>
                &nbsp;{skillToShort(skill)}
                </span>
            </div>
            </div>
        })
    })

    if (!excludeQBits) {
        config.push({ width: 1, column: 'q_bits', title: t('base.qp'), reverse: true });
        config.push({
            width: 1, column: 'to_next', title: t('collections.panes.progress.title'), reverse: false,
            customCompare: (a: IRosterCrew, b: IRosterCrew) => {
                let an = qbProgressToNext(a.q_bits)[0];
                let bn = qbProgressToNext(b.q_bits)[0];
                return an - bn;
            }
        });
    }
    return config;
}

export const QuipmentScoreCells = (props: QuipmentScoreProps) => {
    const { t } = React.useContext(GlobalContext).localized;
    const { excludeGrade, excludeSpecialty, excludeQBits, excludeSkills, crew, top } = props;

    const quipment_score = crew.quipment_score ?? 0;
    const top_quipment = top.quipment_score ?? 1;

    const trait_score = crew.quipment_scores?.trait_limited ?? 0;
    const top_trait = top.quipment_scores?.trait_limited ?? 1;

    const q_grade = quipment_score / top_quipment;
    const tr_grade = trait_score / top_trait;
    const qbslots = crew.q_bits === undefined ? 4 : qbitsToSlots(crew.q_bits);

    const to_next = crew.q_bits >= 1300 ? 0 : missionsToNext(crew.q_bits);

    return <React.Fragment>
        {!excludeGrade && <Table.Cell>
            <div style={{display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: "0.5em"}}>
                <div style={{color: gradeToColor(q_grade, true) ?? undefined }}>
                    {numberToGrade(q_grade, "None")}
                </div>
                <sub>
                    {quipment_score.toLocaleString() ?? "0"}
                </sub>
            </div>
        </Table.Cell>}
        {!excludeSpecialty && !excludeGrade && <Table.Cell>
            <div style={{display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: "0.5em"}}>
                <div style={{color: gradeToColor(tr_grade, true) ?? undefined }}>
                    {numberToGrade(tr_grade, "None")}
                </div>
                <sub>
                    {trait_score.toLocaleString() ?? "0"}
                </sub>
            </div>
        </Table.Cell>}
        {!excludeSkills && CONFIG.SKILLS_SHORT.map(p => {

            const top_skill = top.quipment_scores ? top.quipment_scores[p.name] : 1;
            const skill_score = crew.quipment_scores ? crew.quipment_scores[p.name] : 0;
            const sk_grade = skill_score / top_skill;

            return <Table.Cell key={p.name+"_quipment_cell"}>
                <div style={{display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: "0.5em"}}>
                    <div style={{color: gradeToColor(sk_grade, true) ?? undefined }}>
                        {numberToGrade(sk_grade, "None")}
                    </div>
                    <sub>
                        {skill_score.toLocaleString() ?? "0"}
                    </sub>
                </div>
            </Table.Cell>
        })}
        {!excludeQBits && <Table.Cell style={{textAlign: 'center'}}>
           {qbslots !== undefined && <div title={
                !crew.immortal || crew.immortal < -1 ? 'Frozen, unfinished or unowned crew do not have q-bits' : qbslots + " Slot(s) Open"
                }>
                <div>
                    {!!crew.immortal && crew.immortal >= -1 ? crew.q_bits.toLocaleString() : 'N/A'}
                </div>
                {!!crew.immortal && crew.immortal >= -1 &&
                <div style={{fontSize:"0.8em"}}>
                    ({t('base.n_slots', { n: `${qbslots}`})})
                </div>}
            </div> || <>N/A</>}
        </Table.Cell>}
        {!excludeQBits && <Table.Cell style={{textAlign: 'center'}}>
           {qbslots !== undefined && <div>
                {!!to_next && !!crew.immortal && crew.immortal >= -1 &&
                <div style={{fontSize:"0.8em"}}>
                    ({t('crew_views.n_missions_to_next', { n: to_next })})
                </div>
                || <>N/A</>
                }
            </div> || <>N/A</>}
        </Table.Cell>}
    </React.Fragment>
}


