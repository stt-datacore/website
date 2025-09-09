import React from "react";
import { Accordion, Icon, Segment, SemanticICONS, Table } from "semantic-ui-react";
import { GlobalContext } from "../../../context/globalcontext";
import { CrewMember } from "../../../model/crew";
import { Filter } from "../../../model/game-elements";
import { AlphaRef, Dilemma, DilemmaChoice, DilemmaMultipartData } from "../../../model/voyage";
import { NarrativeData, VoyageNarrative } from "../../../model/voyagelog";
import { omniSearchFilter } from "../../../utils/omnisearch";
import CONFIG from "../../CONFIG";
import { AvatarView } from "../../item_presenters/avatarview";
import { printChrons, printHonor, printMerits } from "../../retrieval/context";
import { ITableConfigRow, SearchableTable } from "../../searchabletable";
import { OptionsPanelFlexColumn, OptionsPanelFlexRow } from "../../stats/utils";
import { ReferenceShip, Ship } from "../../../model/ship";
import { formatTime } from "../../../utils/voyageutils";

export interface DilemmaTableProps {
    voyageLog?: NarrativeData;
    crewTargetGroup?: string;
    shipTargetGroup?: string;
    updateDilemma?: (dil: Dilemma, choice: number, clear: boolean) => void;
}


export const DilemmaReferenceAccordion = (props: DilemmaTableProps) => {
	const globalContext = React.useContext(GlobalContext);
    const { t } = globalContext.localized;

    const [isActive, setIsActive] = React.useState<boolean>(false);
	const { crewTargetGroup, shipTargetGroup, voyageLog, updateDilemma } = props;

	return (
		<Accordion>
			<Accordion.Title
				active={isActive}
				onClick={() => setIsActive(!isActive)}
			>
				<Icon name={isActive ? 'caret down' : 'caret right' as SemanticICONS} />
				{t('voyage_log.reference')}
			</Accordion.Title>
			<Accordion.Content active={isActive}>
				{isActive && (
					<Segment>
						<DilemmaTable
                            voyageLog={voyageLog}
                            crewTargetGroup={crewTargetGroup}
                            shipTargetGroup={shipTargetGroup}
                            updateDilemma={updateDilemma}
                            />
					</Segment>
				)}
			</Accordion.Content>
		</Accordion>
	);
};


export const DilemmaTable = (props: DilemmaTableProps) => {
    const globalContext = React.useContext(GlobalContext);
    const { playerShips } = globalContext.player;
    const { playerData } = globalContext.player
    const playerCrew = playerData?.player.character.crew;
    const { dilemmas: dilemmaSource, crew, all_ships: ships } = globalContext.core;
    const { t } = globalContext.localized;
    const { voyageLog, crewTargetGroup, shipTargetGroup, updateDilemma } = props;
    const flexRow = OptionsPanelFlexRow;
    const flexCol = OptionsPanelFlexColumn;
    const goldRewards = crew.filter(f => f.traits_hidden.includes("exclusive_voyage") && f.max_rarity === 5);

    const [dilemmas, setDilemmas] = React.useState<Dilemma[]>([]);

    const [eligible, setEligble] = React.useState<DilemmaMultipartData[]>([]);
    const [inverse, setInverse] = React.useState<DilemmaMultipartData[]>([]);
    const [maxRun, setMaxRun] = React.useState(0);

    React.useEffect(() => {
        const dilemmas = getDilemmaData(crew, ships, dilemmaSource, voyageLog?.voyage_narrative)
        const { eligible, inverse } = getForwardDilemmaInfo(dilemmas);
        dilemmas.sort((a, b) => nameSort(a, b, eligible));
        setDilemmas(dilemmas);
        setEligble(eligible);
        setInverse(inverse);
        if (dilemmas.some(d => d.narrative) && playerData) {
            setMaxRun(2 * ((dilemmas.length - inverse.length) + 1));
        }
        else {
            setMaxRun(0);
        }
    }, [voyageLog, dilemmaSource, crew, ships]);

    const tableConfig: ITableConfigRow[] = [
        {
            width: 1, title: t('global.name'), column: 'title',
            customCompare: (a, b, config) => nameSort(a, b, eligible)
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
                extraSearchContent={<>
                    {!!maxRun && <div style={{...flexRow, justifyContent: 'flex-end', flexGrow: 1, alignItems: 'center', gap: '0.5em'}}>
                        <span>
                            {t('hof.max_duration')}{t('global.colon')}
                        </span>
                        <span style={{fontSize: '1.25em', fontWeight: 'bold'}}>{formatTime(maxRun, t, false)}</span>
                    </div>}
                </>}
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
        let elig = eligible?.find(e => e.dilemma === row);
        let inv = inverse?.find(i => i.dilemma === row);;

        let bgColor: string | undefined = undefined;

        if (inv && !elig && inv.unlock === undefined) {
            bgColor = 'salmon';
        }
        else if (elig && !row.narrative) {
            bgColor = 'steelblue';
        }
        if (!!row.narrative) {
            bgColor = 'forestgreen';
        }
        const key = `${idx}_dilemma_${row.title}`;
        return <>
            <Table.Row key={key}>
                <Table.Cell
                    style={{
                        backgroundColor: bgColor
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
                    let choiceBg: string | undefined = undefined;

                    if (elig?.unlock === i) {
                        choiceBg = 'darkslateblue';
                    }
                    if (row.narrative?.selection === i) {
                        choiceBg = 'royalblue';
                    }
                    if (row.narrative?.selection === undefined && row.multipart?.some(mp => mp.requiredChoices.includes(AlphaRef[i]))) {
                        choiceBg = 'mediumpurple';
                    }
                    if (inv?.unlock === i && elig?.unlock !== i) {
                        choiceBg = 'salmon';
                    }
                    return (
                        <Table.Cell
                            key={`${key}_choice_${choice.text}`}
                            className="top aligned"
                            style={{
                                cursor: !!row.narrative ? 'pointer' : undefined,
                                backgroundColor: choiceBg
                            }}
                            onClick={() => updateDilemma ? updateDilemma(row, i, row.selection === i) : false}
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
        let shiprewards = [choice.parsed?.ship].filter(f => f !== undefined);

        if (choice.parsed?.rarity == 5 && !choice.parsed?.ship) {
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
                        {formatChoiceText(choice.text)}
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
                                <div key={`${choice.text}_${crew.symbol}`} style={{...flexRow, gap: '1em'}}>
                                    <AvatarView
                                        mode='crew'
                                        item={crew}
                                        size={32}
                                        targetGroup={crewTargetGroup}
                                        />
                                    {crew.name}
                                </div>
                            )
                        })}
                    </div>}
                    {!!shiprewards?.length &&
                    <div style={{...flexCol, alignItems: 'flex-start', justifyContent: 'flex-start', flexWrap: 'wrap', gap: '1em'}}>
                        {shiprewards.map(ship => {
                            return (
                                <div key={`${choice.text}_${ship.symbol}`} style={{...flexRow, gap: '1em'}}>
                                    <AvatarView
                                        mode='ship'
                                        item={ship}
                                        partialItem={true}
                                        size={32}
                                        targetGroup={shipTargetGroup}
                                        />
                                    {ship.name}
                                </div>
                            )
                        })}
                    </div>}

                </div>
            </div>
        )
    }

    function formatChoiceText(text: string, click?: () => void) {
        let parts = text.split("**");
        if (parts.length === 1) return <>{text}</>;
        return parts.map((part, i) => {
            if ((i + 1) % 2 == 0) {
                return (
                    <b style={{cursor: click ? 'pointer' : undefined, color: 'darkslateblue'}} key={`${text}_${i}`} onClick={() => click ? click() : false}>{part}</b>
                )
            }
            else {
                return <React.Fragment key={`${text}_${i}`}>{part}</React.Fragment>;
            }
        })
    }

    function nameSort(a: Dilemma, b: Dilemma, eligible?: DilemmaMultipartData[]) {
        if (a.narrative && b.narrative) {
            return a.narrative.index - b.narrative.index;
        }
        if (a.narrative && !b.narrative) {
            return -1;
        }
        else if (b.narrative && !a.narrative) {
            return 1;
        }

        let aelig = !!(eligible?.some(e => e.dilemma === a));
        let belig = !!(eligible?.some(e => e.dilemma === b));

        if (aelig && !belig) return -1;
        else if (belig && !aelig) return 1;

        return a.title.localeCompare(b.title);
    }

    function getChoices(d: Dilemma) {
        const res = [d.choiceA, d.choiceB];
        if (d.choiceC) res.push(d.choiceC);
        return res;
    }

    function getChoiceRarity(choice: DilemmaChoice) {
        if (choice.reward.some((r: string) => r.includes("100 :honor:")) && choice.reward.some(s => s.includes('4') && s.includes(':star:'))) return 5;
        else if (choice.reward.some((r: string) => r.includes("60 :honor:"))) return 4;
        else return 3;
    }

    function getDilemmaData(allCrew: CrewMember[], allShips: ReferenceShip[], dilemmas: Dilemma[], log?: VoyageNarrative[]): Dilemma[] {
        let rex = new RegExp(/.*\*\*(.+)\*\*.*/);
        let schem = /^(\d+) Ship Schematics$/i;
        let honorex = /(\d+)\s*:honor:/;
        let meritrex = /(\d+)\s*:merits:/;
        let chronrex = /(\d+)\s*:chrons:/;
        let voyCrew = allCrew.filter(crew => crew.traits_hidden.includes("exclusive_voyage"));
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
                        // Parse rewards
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
                                let reward_name = result[1];
                                let crew = playerCrew?.find(crew => crew.name === reward_name) || voyCrew.find(crew => crew.name === reward_name);
                                if (crew) {
                                    choice.parsed.crew = crew;
                                    if (!choice.parsed.behold) {
                                        choice.parsed.behold = true;
                                    }
                                    if (choice.parsed.rarity < crew.max_rarity) {
                                        choice.parsed.rarity = crew.max_rarity;
                                    }
                                }
                                else {
                                    let ship = playerShips?.find(ship => ship.name === reward_name) || allShips.find(ship => ship.name === reward_name);
                                    if (ship) {
                                        choice.parsed.ship = ship;
                                        if (!choice.parsed.behold) {
                                            choice.parsed.behold = true;
                                        }
                                        choice.parsed.schematics = choice.parsed.schematics || 500;
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

            linkMultipart(dilemma, dilemmas);
        }

        return dilemmas;
    }

    function getForwardDilemmaInfo(dilemmas: Dilemma[]) {
        let resp = dilemmas.filter(f => f.selection !== undefined && f.multipart !== undefined);
        if (!resp?.length) return {
            eligible: [],
            inverse: [],
        };

        const results = [] as DilemmaMultipartData[];
        const invres = [] as DilemmaMultipartData[];
        resp.forEach((dilemma, idx) => {
            let res = dilemma.selection!;
            let mp = dilemma.multipart!.filter(f => f.requiredChoices.includes(AlphaRef[res]));
            let nomp = dilemma.multipart!.filter(f => !mp.includes(f));
            for (let m of mp) {
                results.push(m);
                if (m.dilemma.multipart?.length) results.push(...m.dilemma.multipart);
            }
            for (let n of nomp) {
                invres.push(n);
                if (n.dilemma.multipart?.length) invres.push(...n.dilemma.multipart);
            }
        });

        return {
            eligible: results,
            inverse: invres,
        };
    }

    function linkMultipart(dilemma: Dilemma, dilemmas: Dilemma[]) {
        const titleRex = /^(.+),\s*Part\s+(\d+)$/;
        let res = titleRex.exec(dilemma.title);
        if (res) {
            dilemma.baseTitle = res[1];
        }
        //const group = findDilemmaGroup(dilemma.baseTitle, dilemmas);
        const choiceRex = /^(.+)\s+\(.*\*\*(.+)\*\*.*\)\s*$/;
        const dscRex = /^.*\s+Choice\s+(\d|\w)\s+.*/;
        const mp = [] as DilemmaMultipartData[];
        getChoices(dilemma).forEach((choice, idx) => {
            let cres = choiceRex.exec(choice.text);
            if (cres && !choice.text.includes("Requires") && !choice.text.includes("If you")) {
                let tdil = dilemmas.find(f => f.title === cres[2]);
                if (tdil) {
                    let tres = dscRex.exec(choice.text);
                    let c = -1;
                    if (tres) {
                        c = AlphaRef.findIndex((a, idx) => a === tres[1] || idx === Number(tres[1]) - 1);
                    }

                    let mpfind = mp.find(m => m.dilemma === tdil);
                    if (!mpfind || c !== -1){
                        mpfind = {
                            requiredChoices: [AlphaRef[idx]],
                            dilemma: tdil,
                            unlock: c === -1 ? undefined : c
                        };
                        mp.push(mpfind);
                    }
                    else {
                        mpfind.requiredChoices.push(AlphaRef[idx]);
                    }
                }
            }
        });
        if (mp.length) dilemma.multipart = mp;

    }

}

