import React from "react";
import { IRosterCrew } from "../model";
import { ITableConfigRow } from "../../searchabletable";
import CONFIG from "../../CONFIG";
import { Table } from "semantic-ui-react";



export interface QuipmentScoreProps {
    crew: IRosterCrew;
}

export const getQuipmentTableConfig = () => {
    const config = [] as ITableConfigRow[];
    config.push({ width: 1, column: 'quipmentScore', title: "Quipment Score", reverse: true });

    CONFIG.SKILLS_SHORT.map(p => p.name).forEach((skill) => {
        config.push({ 
            width: 1,
            column: `quipmentScores.${skill}`,
            reverse: true,
            title: <div style={{display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center'}}>
                <img
                    style={{ height: '16px'}}
                    src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${skill}.png`}
                    />
                <span>
                &nbsp;Quipment Score
                </span>                
            </div>
        })
    })    

    return config;
}

export const QuipmentScoreCells = (props: QuipmentScoreProps) => {
    const { crew } = props;

    return <React.Fragment>
        <Table.Cell>
            {crew.quipmentScore?.toLocaleString() ?? "0"}
        </Table.Cell>
        {CONFIG.SKILLS_SHORT.map(p => {
            return <Table.Cell key={p.name+"_quipment_cell"}>
                &nbsp;{crew.quipmentScores ? crew.quipmentScores[p.name].toLocaleString() : ""}
            </Table.Cell>
        })}
    </React.Fragment>
}


