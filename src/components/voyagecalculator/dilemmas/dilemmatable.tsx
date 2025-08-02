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
import CONFIG from "../../CONFIG";
import { CrewHoverStat } from "../../hovering/crewhoverstat";

export interface DilemmaTableProps {
    voyageLog?: NarrativeData;
    targetGroup?: string;
}

export const DilemmaTable = (props: DilemmaTableProps) => {
    const globalContext = React.useContext(GlobalContext);
    const { dilemmas: dilemmaSource, crew } = globalContext.core;
    const { t } = globalContext.localized;
    const { voyageLog, targetGroup } = props;
    const flexRow = OptionsPanelFlexRow;
    const flexCol = OptionsPanelFlexColumn;
    const goldRewards = crew.filter(f => f.traits_hidden.includes("exclusive_voyage") && f.max_rarity === 5);

    function nameSort(a: Dilemma, b: Dilemma) {
        if (a.narrative && b.narrative) {
            return a.narrative.index - b.narrative.index;
        }
        else if (a.narrative && !b.narrative) {
            return -1;
        }
        else if (b.narrative && !a.narrative) {
            return 1;
        }
        return a.title.localeCompare(b.title);
    }
    const dilemmas = React.useMemo(() => {
        return getDilemmaData(crew, dilemmaSource, voyageLog?.voyage_narrative).sort(nameSort);
    }, [voyageLog, dilemmaSource, crew]);

    const tableConfig: ITableConfigRow[] = [
        {
            width: 1, title: t('global.name'), column: 'title',
            customCompare: (a, b, config) => nameSort(a, b)
        },
        { width: 1, title: t('base.rarity'), column: 'rarity' },
        { width: 4, title: t('base.rewards'), column: 'parsed.crew.name' },
        { width: 1, title: t('voyage_log.behold'), column: 'parsed.behold' },
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
        if (row.rarity === 5) {
            crewrewards = goldRewards;
        }
        let scheme = choices.find(f => f.parsed?.schematics)?.parsed?.schematics;
        return <>
            <Table.Row positive={!!row.narrative}>
                <Table.Cell>
                    <div style={{
                        display: 'grid',
                        gridTemplateAreas: `'left right'`,
                        gridTemplateColumns: '12px auto',
                        gap: '0.5em'
                    }}>
                        <div style={{gridArea: 'left', height: "100%", width: "100%", backgroundColor: CONFIG.RARITIES[row.rarity!].color}}>
                            &nbsp;
                        </div>
                        <div style={{gridArea: 'right'}}>
                            {row.title}
                        </div>
                    </div>
                </Table.Cell>
                <Table.Cell>
                    {row.rarity}
                </Table.Cell>
                <Table.Cell>
                    <div style={{...flexRow, alignItems: 'center', justifyContent: 'space-between', gap: '1em', minHeight: '3em', margin: "0 2em"}}>
                        {!!crewrewards?.length &&
                        <div style={{...flexCol, alignItems: 'flex-start', justifyContent: 'flex-start', flexWrap: 'wrap', maxHeight: '14em', gap: '1em'}}>
                            {crewrewards.map(crew => {
                                return (
                                    <div style={{...flexRow}}>
                                        <AvatarView
                                            mode='crew'
                                            item={crew}
                                            size={32}
                                            targetGroup={targetGroup}
                                            />
                                        {crew.name}
                                    </div>
                                )
                            })}
                        </div>}
                        {!!scheme && <div>{scheme} {t('global.item_types.ship_schematic')}</div>}
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