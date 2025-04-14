import React from "react";
import { Grid, Table } from "semantic-ui-react";
import { GlobalContext } from "../../context/globalcontext";
import { CiteData, VoyageImprovement } from "../../model/worker";
import CONFIG from "../CONFIG";
import { AvatarView } from "../item_presenters/avatarview";
import { CiteOptContext } from "./context";
import { PlayerCrew } from "../../model/player";
import { ITableConfigRow, SearchableTable } from "../searchabletable";
import { Filter } from "../../model/game-elements";
import { omniSearchFilter } from "../../utils/omnisearch";



export interface VoyageGroupsComponentProps {
    data: CiteData;
    confine: string[];
}


export const VoyageGroupsComponent = (props: VoyageGroupsComponentProps) => {
    const globalContext = React.useContext(GlobalContext);
    const citeContext = React.useContext(CiteOptContext);
    const { t, tfmt } = globalContext.localized;
    const { data, confine } = props;

    const voyages = [] as VoyageImprovement[];
    let currVoy: string = '';
    const { playerData } = globalContext.player;

    const voyageData = globalContext.player.ephemeral;
    const citeMode = citeContext.citeConfig;
    const setCiteMode = citeContext.setCiteConfig;

    const { checks } = citeMode;

    if (voyageData?.voyage?.length) {
        let v = voyageData.voyage[0];
        let sk = [v.skills.primary_skill, v.skills.secondary_skill].map((t) => t.replace("_skill", "")).reduce((prev, curr) => prev + "/" + curr);
        if (sk) currVoy = sk.split('/').map(s => CONFIG.SKILLS[s.trim().toLowerCase() + "_skill"] || s).join("/");
    }

    const currentVoyage = currVoy;

    [data.crewToCite, data.crewToTrain].forEach((dataSet) => {
        for (let voycrew of dataSet) {
            const findcrew = playerData?.player.character.crew.find((c) => c.name === voycrew.name) ?? globalContext.core.crew.find(f => f.symbol === voycrew.symbol);

            if (!findcrew) continue;

            if (checks?.some(c => c.checked) && !checks?.some(c => c.checked && c.symbol === findcrew?.symbol)) {
                continue;
            }

            const crew = JSON.parse(JSON.stringify(findcrew), (key, value) => {
                if (key.includes("date")) {
                    try {
                        let v = new Date(value);
                        return v;
                    }
                    catch {
                        return value;
                    }
                }
                return value;
            }) as PlayerCrew;

            crew.voyagesImproved = voycrew.voyagesImproved;
            crew.evPerCitation = voycrew.evPerCitation;
            crew.addedEV = voycrew.addedEV;
            crew.totalEVContribution = voycrew.totalEVContribution;
            crew.totalEVRemaining = voycrew.totalEVRemaining;
            crew.pickerId = voycrew.pickerId;

            for (let voyage of crew.voyagesImproved ?? []) {
                if (!!(confine?.length) && !confine.includes(voyage)) continue;

                let vname = voyage.split('/').map(s => CONFIG.SKILLS[s.trim().toLowerCase() + "_skill"] || s).join("/")
                let currvoy = voyages.find((v) => v.voyage === vname);

                if (!currvoy) {
                    currvoy = { voyage: vname, crew: [], maxEV: 0, remainingEV: 0, skills: voyage.split('/').map(s => s.trim().toLowerCase() + "_skill") };
                    voyages.push(currvoy);
                }

                let test = currvoy.crew.find((c) => c.name === crew.name);

                if (!test) {
                    currvoy.crew.push(crew);
                }
            }
        }
    });

    voyages.sort((a, b) => {
        let ma = Math.max(...a.crew.map(ac => ac.totalEVContribution ?? 0));
        let mb = Math.max(...b.crew.map(bc => bc.totalEVContribution ?? 0));

        if (!a.maxEV) a.maxEV = ma;
        if (!b.maxEV) b.maxEV = mb;

        let ra = Math.min(...a.crew.map(ac => ac.totalEVRemaining ?? 0));
        let rb = Math.min(...b.crew.map(bc => bc.totalEVRemaining ?? 0));

        if (!a.remainingEV) a.remainingEV = ra;
        if (!b.remainingEV) b.remainingEV = rb;

        if (a.voyage === currentVoyage) return -1;
        else if (b.voyage === currentVoyage) return 1;

        let r = mb - ma;

        if (r) return r;

        r = ra - rb;

        if (r) return r;

        ma = a.crew.map(ac => ac.pickerId ?? 0).reduce((prev, curr) => prev + curr);
        mb = b.crew.map(bc => bc.pickerId ?? 0).reduce((prev, curr) => prev + curr);

        r = ma - mb;

        if (r) return r;

        r = b.crew.length - a.crew.length;
        if (!r) r = a.voyage.localeCompare(b.voyage);

        return r;
    });
    voyages.forEach((voyage) => {
        voyage.crew.sort((a, b) => {
            if (a.totalEVContribution !== undefined && b.totalEVContribution !== undefined) {
                return b.totalEVContribution - b.totalEVContribution;
            }
            else if (a.pickerId !== undefined && b.pickerId !== undefined) {
                return a.pickerId - b.pickerId;
            }
            else {
                return a.name.localeCompare(b.name);
            }
        });
    });

    const tableConfig = [
        {
            width: 1, column: 'voyage', title: t('global.name'),
            pseudocolumns: ['voyage', 'maxEV'],
            translatePseudocolumn: (field) => {
                if (field === 'voyage') return t('global.name');
                else if (field === 'maxEV') return t('cite_opt.columns.final_ev');
            },
            customCompare: (a: VoyageImprovement, b: VoyageImprovement, config) => {
                if (config.field === 'maxEV') {
                    if (a.voyage === currentVoyage) return 1;
                    else if (b.voyage === currentVoyage) return -1;
                    let r = a.maxEV - b.maxEV;
                    if (!r) r = a.remainingEV - b.remainingEV;
                    return r;
                }
                return a.voyage.localeCompare(b.voyage);
            }
        },
        { width: 10, column: 'crew.length', title: t('base.crew') },
    ] as ITableConfigRow[];

    const sizeChoices = [1, 2, 5].map((n) => {
        return {
            key: "page" + n.toString(),
            value: n,
            text: n.toString()
        }
    });

    return (<div style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "stretch"
    }}>
        <SearchableTable
            pagingOptions={sizeChoices}
            defaultPaginationRows={5}
            config={tableConfig}
            data={voyages}
            renderTableRow={renderTableRow}
            filterRow={filterTableRow}
            />
    </div>)

    function filterTableRow(row: VoyageImprovement, filter: Filter[], filterType?: string) {

        omniSearchFilter(row, filter, filterType,
            [
                'voyage',
                {
                    "field": 'crew',
                    customMatch: (row: PlayerCrew, text) => {
                        text = text.toLowerCase();
                        return row.traits_named?.some(tn => tn.toLowerCase().includes(text))
                            || row.name.includes(text)
                            || row.short_name.includes(text)
                            || !!row.name_english?.includes(text)
                            || row.flavor.includes(text)
                            || !!row.flavor_english?.includes(text)
                            || row.traits.some(t => t.includes(text))
                            || row.traits_hidden.some(t => t.includes(text))
                        }
                }
            ])

        return true;
    }

    function renderTableRow(voyage: VoyageImprovement, idx?: number) {
        let sp = voyage.skills;
        if (citeMode?.priSkills?.length) {
            if (!citeMode.priSkills.includes(sp[0])) return (<></>);
        }
        if (citeMode?.secSkills?.length) {
            if (!citeMode.secSkills.includes(sp[1])) return (<></>);
        }

        return (<Table.Row key={"voy" + idx}>
            <Table.Cell width={6} style={{ backgroundColor: voyage.voyage === currentVoyage ? 'green' : undefined, }}>
                <div style={{
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                    height: "100%",
                    margin: "1em",
                    textAlign: 'center'
                }}>
                    {voyage.voyage === currentVoyage && <h3 style={{ marginBottom: 0 }}><u>{t('voyage.active_voyage')}</u></h3>}
                    <h2 style={{ marginBottom: 0 }}>{voyage.voyage}</h2>
                    <i style={{ margin: 0 }}>({ tfmt('cite_opt.max_final_ev_n', { n: <b>+{Math.ceil(voyage.maxEV)}</b> }) })</i>
                    <i style={{ margin: 0 }}>({ tfmt('cite_opt.min_remaining_ev_n', { n: <b>+{Math.ceil(voyage.remainingEV)}</b> }) })</i>
                </div>
            </Table.Cell>
            <Table.Cell>
                <Grid doubling columns={3} textAlign='center'>
                    {voyage.crew.filter(c => !!c).map((crew) => (
                        <Grid.Column>
                        <div style={{ margin: "1.5em", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                            <AvatarView
                                mode='crew'
                                size={64}
                                targetGroup='citationTarget'
                                item={crew}
                            />
                            <b onClick={(e) => setCiteMode({ ...citeMode ?? {}, nameFilter: crew.name })}
                                style={{
                                    cursor: "pointer",
                                    margin: "0.5em 0 0 0",
                                    textDecoration: "underline"
                                }}
                                title={"Click to see only this crew member"}
                            >
                                {crew.name} ({crew.pickerId})
                            </b>
                            <i style={{ margin: "0" }} >
                                <span
                                    title={"Click to see only voyages involving this crew member"}
                                    style={{ cursor: "pointer", margin: "0", textDecoration: "underline" }}
                                    onClick={(e) => setCiteMode({ ...citeMode ?? {}, nameFilter: "voyage:" + crew.name })}
                                >{crew.voyagesImproved?.length} {t('base.voyages')}, </span>
                                {Math.ceil(crew.totalEVContribution ?? 0)} {t('cite_opt.total_ev')}
                            </i>
                        </div>
                        </Grid.Column>
                    ))}
                </Grid>
            </Table.Cell>
        </Table.Row>)
    }

}