import React from "react";
import { NarrativeData, VoyageNarrative } from "../../../model/voyagelog"
import { GlobalContext } from "../../../context/globalcontext";
import { Dilemma, DilemmaChoice } from "../../../model/voyage";
import { CrewMember } from "../../../model/crew";
import { ITableConfigRow, SearchableTable } from "../../searchabletable";
import { Filter } from "../../../model/game-elements";
import { Table } from "semantic-ui-react";
import { OptionsPanelFlexColumn, OptionsPanelFlexRow } from "../../stats/utils";
import { AvatarView } from "../../item_presenters/avatarview";

export interface DilemmaTableProps {
    voyageLog?: NarrativeData;
}

export const DilemmaTable = (props: DilemmaTableProps) => {
    const globalContext = React.useContext(GlobalContext);
    const { dilemmas: dilemmaSource, crew } = globalContext.core;
    const { t } = globalContext.localized;
    const { voyageLog } = props;
    const flexRow = OptionsPanelFlexRow;
    const flexCol = OptionsPanelFlexColumn;

    const dilemmas = React.useMemo(() => {
        return getDilemmaData(crew, dilemmaSource, voyageLog?.voyage_narrative);
    }, [voyageLog, dilemmaSource, crew]);

    const tableConfig: ITableConfigRow[] = [
        { width: 1, title: t('voyage.dilemma'), column: 'title' },
        { width: 1, title: t('base.rarity'), column: 'rarity' },
        { width: 1, title: t('base.crew'), column: 'parsed.crew.name' },
        { width: 1, title: t('global.behold'), column: 'parsed.behold' },
    ]

    return (
        <React.Fragment>
            <SearchableTable
                data={dilemmas}
                config={tableConfig}
                filterRow={searchTable}
                renderTableRow={renderTableRow}
                />
        </React.Fragment>
    )

    function searchTable(row: Dilemma, filter: Filter[], filterType?: string) {
        return true;
    }

    function renderTableRow(row: Dilemma, idx?: number) {
        let choices = [row.choiceA, row.choiceB, row.choiceC].filter(f => f !== undefined);
        let crewrewards = choices.map(c => c.parsed?.crew).filter(f => f !== undefined);
        return <>
            <Table.Row>
                <Table.Cell>
                    {row.title}
                </Table.Cell>
                <Table.Cell>
                    {row.rarity}
                </Table.Cell>
                <Table.Cell>
                    <div style={{...flexRow}}>
                        {crewrewards.map(crew => {
                            return (
                                <div style={{...flexCol}}>
                                    <AvatarView
                                        mode='crew'
                                        item={crew}
                                        size={64}
                                        />
                                    {crew.name}
                                </div>
                            )
                        })}
                    </div>
                </Table.Cell>
                <Table.Cell>
                    {(choices.some(c => c.parsed?.behold) && t('global.yes')) || t('global.no')}
                </Table.Cell>
            </Table.Row>
        </>
    }
}

function getChoiceRarity(choice: DilemmaChoice) {
	if (choice.reward.some((r: string) => r.includes("100 :honor:"))) return 5;
	else if (choice.reward.some((r: string) => r.includes("60 :honor:"))) return 4;
	else return 3;
}

function getDilemmaData(allCrew: CrewMember[], dilemmas: Dilemma[], log?: VoyageNarrative[]): Dilemma[] {
    let rex = new RegExp(/.*\*\*(.+)\*\*.*/);
    let schem = /.*\s+(\d+) Ship Schematics.*/;
    let honorex = /(\d+)\s*:honor:/;
    let meritrex = /(\d+)\s*:merits:/;
    let chronrex = /(\d+)\s*:chrons:/;
    let botCrew = allCrew.filter(crew => crew.traits_hidden.includes("exclusive_voyage"));
    let legend = [] as string[];
    dilemmas = JSON.parse(JSON.stringify(dilemmas));

    for (let dilemma of dilemmas) {
        let crewurl = undefined as string | undefined;
        let dil = 0;
        if (log) {
            let n = log.find(f => f.text.replace("Dilemma: ", "").toLowerCase() === dilemma.title.toLowerCase());
            if (n) {
                dilemma.narrative = n;
            }
        }
        let maxrare = 3;
        [dilemma.choiceA, dilemma.choiceB, dilemma.choiceC ?? null].forEach((choice) => {
            if (choice) {
                let i = 0;
                choice.parsed ??= {};
                choice.parsed.rarity = getChoiceRarity(choice);
                if (choice.parsed.rarity > maxrare) maxrare = choice.parsed.rarity;
                for (let s of choice.reward) {
                    if (schem.test(s)) {
                        let val = schem.exec(s);
                        if (val?.length) choice.parsed.schematics = Number(val[1]);
                    }
                    else if (honorex.test(s)) {
                        let val = honorex.exec(s);
                        if (val?.length) choice.parsed.honor = Number(val[1]);
                    }
                    else if (meritrex.test(s)) {
                        let val = meritrex.exec(s);
                        if (val?.length) choice.parsed.merits = Number(val[1]);
                    }
                    else if (chronrex.test(s)) {
                        let val = chronrex.exec(s);
                        if (val?.length) choice.parsed.chrons = Number(val[1]);
                    }

                    // Check for 4/5 star behold eligibility
                    if (s.includes('4') && s.includes(':star:')) {
                        legend.push(dil === 0 ? 'A' : (dil === 1 ? 'B' : 'C'));
                        choice.parsed.behold = true;
                    }

                    if (rex.test(s)) {
                        let result = rex.exec(s);
                        if (result && result.length) {
                            let crewname = result[1];
                            let crew = botCrew.find(crew => crew.name === crewname);
                            if (crew) {
                                choice.parsed.crew = crew;
                            }
                        }
                    }
                    i++;
                }
            }
            dil++;
        });

        dilemma.rarity = maxrare;

        let r = getChoiceRarity(dilemma.choiceA);
        let r2 = getChoiceRarity(dilemma.choiceB);
        let r3 = dilemma.choiceC ? getChoiceRarity(dilemma.choiceC) : 0;
        if (r2 > r) r = r2;
        if (r3 > r) r = r3;
        if (crewurl && r < 4) r = 4;
    }

    return dilemmas;
}