import React from "react";
import { Table } from "semantic-ui-react";
import { GlobalContext } from "../../../context/globalcontext";
import { CrewMember } from "../../../model/crew";
import { Filter } from "../../../model/game-elements";
import { Dilemma, DilemmaChoice } from "../../../model/voyage";
import { NarrativeData, VoyageNarrative } from "../../../model/voyagelog";
import { omniSearchFilter } from "../../../utils/omnisearch";
import CONFIG from "../../CONFIG";
import { AvatarView } from "../../item_presenters/avatarview";
import { printChrons, printHonor, printMerits } from "../../retrieval/context";
import { ITableConfigRow, SearchableTable } from "../../searchabletable";
import { OptionsPanelFlexColumn, OptionsPanelFlexRow } from "../../stats/utils";

export interface DilemmaTableProps {
    voyageLog?: NarrativeData;
    targetGroup?: string;
    updateDilemma: (dil: Dilemma, choice: number, clear: boolean) => void;
}

export const DilemmaTable = (props: DilemmaTableProps) => {
    const globalContext = React.useContext(GlobalContext);
    const { dilemmas: dilemmaSource, crew } = globalContext.core;
    const { t } = globalContext.localized;
    const { voyageLog, targetGroup, updateDilemma } = props;
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
        {
            width: 1, title: t('base.rarity'), column: 'rarity',
            customCompare: (a: Dilemma, b: Dilemma) => {
                let r = 0;
                if (!r) r = (a.rarity || 3) - (b.rarity || 3);
                if (!r) r = a.chances.legendary_behold - b.chances.legendary_behold;
                if (!r) r = a.chances.superrare_behold - b.chances.superrare_behold;
                if (!r) r = a.chances.ship_schematic - b.chances.ship_schematic;
                if (!r && !!a.narrative !== !!b.narrative) r = a.narrative ? 1 : -1;
                return r;
            }

        },
        {
            width: 1, title: t('voyage_log.behold'), column: 'parsed.behold',
            customCompare: (a: Dilemma, b: Dilemma) => {
                let r = 0;
                if (!r) r = a.chances.legendary_behold - b.chances.legendary_behold;
                if (!r) r = a.chances.superrare_behold - b.chances.superrare_behold;
                if (!r) r = a.chances.ship_schematic - b.chances.ship_schematic;
                if (!r) r = (a.rarity || 3) - (b.rarity || 3);
                if (!r && !!a.narrative !== !!b.narrative) r = a.narrative ? 1 : -1;
                return r;
            }
        },
        {
            width: 2, title: t('voyage_log.choice_x', { x: 'A' }), column: 'choiceA.title',
            customCompare: (a: Dilemma, b: Dilemma) => {
                return a.choiceA.text.localeCompare(b.choiceA.text);
            }
        },
        {
            width: 2, title: t('voyage_log.choice_x', { x: 'B' }), column: 'choiceB.title',
            customCompare: (a: Dilemma, b: Dilemma) => {
                return a.choiceB.text.localeCompare(b.choiceB.text);
            }
        },
        {
            width: 2, title: t('voyage_log.choice_x', { x: 'C' }), column: 'choiceC.title',
            customCompare: (a: Dilemma, b: Dilemma) => {
                if (a.choiceC && b.choiceC) {
                    return a.choiceC.text.localeCompare(b.choiceC.text);
                }
                else if (a.choiceC) return 1;
                else if (b.choiceC) return -1;
                return 0;
            }
        },
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
        return omniSearchFilter(row, filter, filterType, [
            "title",
            {
                field: "choiceA",
                customMatch: (fieldValue: DilemmaChoice, text: string) => {
                    text = text.toLowerCase();
                    let search = (fieldValue.text + fieldValue.reward.join()).toLowerCase();
                    return search.includes(text);
                }
            },
            {
                field: "choiceB",
                customMatch: (fieldValue: DilemmaChoice, text: string) => {
                    text = text.toLowerCase();
                    let search = (fieldValue.text + fieldValue.reward.join()).toLowerCase();
                    return search.includes(text);
                }
            },
            {
                field: "choiceC",
                customMatch: (fieldValue: DilemmaChoice, text: string) => {
                    if (!fieldValue) return false;
                    text = text.toLowerCase();
                    let search = (fieldValue.text + fieldValue.reward.join()).toLowerCase();
                    return search.includes(text);
                }
            },
        ]);
        //return true;
    }

    function renderTableRow(row: Dilemma, idx?: number) {
        let choices = [row.choiceA, row.choiceB, row.choiceC].filter(f => f !== undefined);
        return <>
            <Table.Row>
                <Table.Cell
                    style={{
                        backgroundColor: !!row.narrative ? 'forestgreen' : undefined
                    }}
                >
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
                    {!!row.chances.superrare_behold && <div>{`4* ${row.chances.superrare_behold}%`}</div>}
                    {!!row.chances.legendary_behold && <div>{`5* ${row.chances.legendary_behold}%`}</div>}
                    {!!row.chances.ship_schematic && <div>{t('global.item_types.ship_schematic')}</div>}

                    {!row.chances.legendary_behold &&
                     !row.chances.superrare_behold &&
                     !row.chances.ship_schematic &&
                      t('global.no')}
                </Table.Cell>
                {choices.map((choice, i) => {
                    return (
                        <Table.Cell
                            key={`table_cell_${row.title}_choice_${choice.text}`}
                            className="top aligned"
                            style={{
                                cursor: !!row.narrative ? 'pointer' : undefined,
                                backgroundColor: row.narrative?.selection === i ? 'royalblue' : undefined
                            }}
                            onClick={() => updateDilemma(row, i, row.selection === i)}
                            >
                            {renderChoiceRewards(choice)}
                        </Table.Cell>
                    )
                })}
                {!row.choiceC && <Table.Row></Table.Row>}
            </Table.Row>
        </>
    }

    function renderChoiceRewards(choice: DilemmaChoice) {
        let crewrewards = [choice.parsed?.crew].filter(f => f !== undefined);
        if (choice.parsed?.rarity == 5) {
            crewrewards = goldRewards;
        }
        let scheme = choice.parsed?.schematics;

        return (
            <div style={{...flexCol, gap: '1em', alignItems: 'flex-start', justifyContent: 'flex-start'}}>
                <div style={{
                    backgroundColor: 'slategray',
                    border: '1px solid',
                    padding: '1em',
                    borderRadius: '0.75em',
                    fontWeight: 'bold',
                    width: '100%'}}>
                        {choice.text}
                </div>
                {!!scheme && <div>{scheme} {t('global.item_types.ship_schematic')}</div>}
                {!!choice.parsed?.chrons && printChrons(choice.parsed.chrons, t, true)}
                {!!choice.parsed?.merits && printMerits(choice.parsed.merits, t, true)}
                {!!choice.parsed?.honor && printHonor(choice.parsed.honor, t, true)}
                <div style={{...flexCol, alignItems: 'center', justifyContent: 'space-between', gap: '1em'}}>
                    {!!crewrewards?.length &&
                    <div style={{...flexCol, alignItems: 'flex-start', justifyContent: 'flex-start', flexWrap: 'wrap', gap: '1em'}}>
                        {crewrewards.map(crew => {
                            return (
                                <div key={`${choice.text}_${crew.symbol}`} style={{...flexRow}}>
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
                </div>
            </div>
        )
    }
}

function getChoiceRarity(choice: DilemmaChoice) {
	if (choice.reward.some((r: string) => r.includes("100 :honor:")) && choice.reward.some(s => s.includes('4') && s.includes(':star:'))) return 5;
	else if (choice.reward.some((r: string) => r.includes("60 :honor:"))) return 4;
	else return 3;
}

function getDilemmaData(allCrew: CrewMember[], dilemmas: Dilemma[], log?: VoyageNarrative[]): Dilemma[] {
    let rex = new RegExp(/.*\*\*(.+)\*\*.*/);
    let schem = /^(\d+) Ship Schematics$/i;
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
                if (n.selection !== undefined) dilemma.selection = n.selection;
            }
        }
        let maxrare = 3;
        [dilemma.choiceA, dilemma.choiceB, dilemma.choiceC ?? null].forEach((choice) => {
            if (choice) {
                let i = 0;
                choice.parsed ??= {};
                choice.parsed.rarity = getChoiceRarity(choice);
                for (let s of choice.reward) {
                    if (s.includes("Schematics") || schem.test(s)) {
                        let val = schem.exec(s);
                        if (val?.length) choice.parsed.schematics = Number(val[1]);
                    }
                    if (honorex.test(s)) {
                        let val = honorex.exec(s);
                        if (val?.length) choice.parsed.honor = Number(val[1]);
                    }
                    if (meritrex.test(s)) {
                        let val = meritrex.exec(s);
                        if (val?.length) choice.parsed.merits = Number(val[1]);
                    }
                    if (chronrex.test(s)) {
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
                                if (!choice.parsed.behold) {
                                    choice.parsed.behold = true;
                                }
                                if (choice.parsed.rarity < crew.max_rarity) {
                                    choice.parsed.rarity = crew.max_rarity;
                                }
                            }
                        }
                    }
                    i++;
                }
                if (maxrare < choice.parsed.rarity) {
                    maxrare = choice.parsed.rarity;
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