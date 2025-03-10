import React from "react"
import { CiteData, VoyageImprovement } from "../../model/worker"
import { Table, Grid } from "semantic-ui-react";
import { CiteMode } from "../../model/player";
import { appelate } from "../../utils/misc";
import ItemDisplay from "../itemdisplay";
import { GlobalContext } from "../../context/globalcontext";
import { CiteOptContext } from "./context";
import { AvatarView } from "../item_presenters/avatarview";
import CONFIG from "../CONFIG";



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
        if (sk) currVoy = appelate(sk);
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
                if (key.includes("data")) {
                    try {
                        let v = new Date(value);
                        return v;
                    }
                    catch {
                        return value;
                    }
                }
                return value;
            });

            crew.voyagesImproved = voycrew.voyagesImproved;
            crew.evPerCitation = voycrew.evPerCitation;
            crew.addedEV = voycrew.addedEV;
            crew.totalEVContribution = voycrew.totalEVContribution;
            crew.totalEVRemaining = voycrew.totalEVRemaining;
            crew.pickerId = voycrew.pickerId;

            for (let voyage of crew.voyagesImproved ?? []) {
                if (!!(confine?.length) && !confine.includes(voyage)) continue;

                let vname = appelate(voyage);
                let currvoy = voyages.find((v) => v.voyage === vname);

                if (!currvoy) {
                    currvoy = { voyage: vname, crew: [], maxEV: 0, remainingEV: 0 };
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

        })
    })

    return (<div style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "stretch"
    }}>
        <Table striped>
            {voyages.map((voyage, idx) => {

                let sp = voyage.voyage.split("/").map(s => s.toLowerCase().trim());

                voyage.voyage = sp.map(s => CONFIG.SKILLS[s.trim().toLowerCase() + "_skill"] || s).join("/")

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
                                <div style={{ margin: "1.5em", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                                    <AvatarView
                                        mode='crew'
                                        size={64}
                                        targetGroup='citationTarget'
                                        symbol={crew.symbol}
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
                            ))}
                        </Grid>
                    </Table.Cell>
                </Table.Row>)
            }
            )}

        </Table>
    </div>)



}