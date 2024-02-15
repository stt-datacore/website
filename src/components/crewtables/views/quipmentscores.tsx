import React from "react";
import { IRosterCrew } from "../model";
import { ITableConfigRow } from "../../searchabletable";
import CONFIG from "../../CONFIG";
import { Table } from "semantic-ui-react";
import { QuipmentScores } from "../../../model/crew";
import { gradeToColor, numberToGrade, skillToRank } from "../../../utils/crewutils";



export interface QuipmentScoreProps {
    crew: IRosterCrew;
    top: QuipmentScores;
}

export const getQuipmentTableConfig = () => {
    const config = [] as ITableConfigRow[];
    config.push({ width: 1, column: 'quipmentScore', title: "Overall", reverse: true });
    config.push({ width: 1, column: 'quipmentScores.trait_limited', title: "Specialty", reverse: true });

    CONFIG.SKILLS_SHORT.map(p => p.name).forEach((skill) => {
        config.push({ 
            width: 1,
            column: `quipmentScores.${skill}`,
            reverse: true,
            title: 
            <div style={{display: 'inline-block'}}>
            <div style={{display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center'}}>
                <img
                    style={{ height: '16px'}}
                    src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${skill}.png`}
                    />
                <span>
                &nbsp;{skillToRank(skill)}
                </span>                
            </div>
            </div>
        })
    })    

    return config;
}

export const QuipmentScoreCells = (props: QuipmentScoreProps) => {
    const { crew, top } = props;

    const quipment_score = crew.quipmentScore ?? 0;
    const top_quipment = top.quipmentScore ?? 1;
    
    const trait_score = crew.quipmentScores?.trait_limited ?? 0;
    const top_trait = top.quipmentScores?.trait_limited ?? 1;

    const q_grade = quipment_score / top_quipment;
    const tr_grade = trait_score / top_trait;
    return <React.Fragment>
        <Table.Cell>
            <div style={{display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: "0.5em"}}>
                <div style={{color: gradeToColor(q_grade, true) ?? undefined }}>
                    {numberToGrade(q_grade, "None")}
                </div>
                <sub>
                    {quipment_score.toLocaleString() ?? "0"}
                </sub>       
            </div>     
        </Table.Cell>
        <Table.Cell>
            <div style={{display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: "0.5em"}}>
                <div style={{color: gradeToColor(tr_grade, true) ?? undefined }}>
                    {numberToGrade(tr_grade, "None")}
                </div>
                <sub>
                    {trait_score.toLocaleString() ?? "0"}
                </sub>       
            </div>     
        </Table.Cell>
        {CONFIG.SKILLS_SHORT.map(p => {
            
            const top_skill = top.quipmentScores ? top.quipmentScores[p.name] : 1;
            const skill_score = crew.quipmentScores ? crew.quipmentScores[p.name] : 0;
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
    </React.Fragment>
}


