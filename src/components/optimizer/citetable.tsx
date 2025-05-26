import React from "react";
import { useStateWithStorage } from "../../utils/storage";
import { CrewMember } from "../../model/crew";
import { calculateBuffConfig } from "../../utils/voyageutils";
import CONFIG from "../CONFIG";
import { Link } from "gatsby";
import { Table, Rating, Popup, Checkbox, Pagination, Dropdown } from "semantic-ui-react";
import { printSkillOrder, gradeToColor, numberToGrade, printPortalStatus } from "../../utils/crewutils";
import { appelate } from "../../utils/misc";
import { descriptionLabel } from "../crewtables/commonoptions";
import { CrewTarget } from "../hovering/crewhoverstat";
import { GlobalContext } from "../../context/globalcontext";
import { PlayerCrew } from "../../model/player";
import { CiteOptContext } from "./context";

type SortDirection = 'ascending' | 'descending';

export interface CiteOptTableProps {
    data?: PlayerCrew[],
    tabName?: string,
    training?: boolean,
    pageId: string;
}

const pagingOptions = [
    { key: '0', value: 10, text: '10' },
    { key: '1', value: 25, text: '25' },
    { key: '2', value: 50, text: '50' },
    { key: '3', value: 100, text: '100' }
];

interface SortConfig {
    sort: string;
    direction: SortDirection;
}

export const CiteOptTable = (props: CiteOptTableProps) => {

    const { pageId } = props;
    const globalContext = React.useContext(GlobalContext);
    const citeContext = React.useContext(CiteOptContext);
    const { citeConfig, setCiteConfig, engine, results, appliedProspects, crewSkills } = citeContext;
    const { showEV } = citeConfig;

    const skoMap = results?.skoMap ?? undefined;

    let training = props.training ?? true;
    const { tabName, data } = props;
    const [rows, setRows] = React.useState<PlayerCrew[]>([]);

    const { t, tfmt } = globalContext.localized;

    const [paginationPage, setPaginationPage] = React.useState<number>(1);
    const [rowsPerPage, setRowsPerPage] = useStateWithStorage<number>(`${pageId}/rowsPerPage`, 25, { rememberForever: true });

    const [sortConfig, setSortConfig] = useStateWithStorage<SortConfig>(`${pageId}/sortConfig`, { direction: 'ascending', sort: 'pickerId' });
    const { direction, sort } = sortConfig;

    React.useEffect(() => {
        setRows(sortCrew([...data ?? [] ], training, engine))
    }, [sortConfig, data]);

    if (!data || !globalContext.player.playerData) return <></>;

    const baseRow = (paginationPage - 1) * rowsPerPage;
    const totalPages = Math.ceil(data.length / rowsPerPage);

    const imageClick = (e: React.MouseEvent<HTMLImageElement, MouseEvent>, data: any) => {
        console.log("imageClick");
        // if (matchMedia('(hover: hover)').matches) {
        // 	window.location.href = "/crew/" + data.symbol;
        // }
    }

    const maxQuip = data.map(d => d.quipment_score ?? 0).reduce((p, n) => p > n ? p : n, 0);

    const formatVoyImp = (value: string) => {
        return value.split("/").map(m => m + "_skill").map(skill => CONFIG.SKILLS[skill]).join("/");
    }

    return (<div style={{ overflowX: "auto" }}>
        <Table sortable celled selectable striped collapsing unstackable compact="very">
            <Table.Header>
                <Table.Row>
                    <Table.HeaderCell
                        onClick={(e) => sort === 'pickerId' ? setDirection(direction === 'descending' ? 'ascending' : 'descending') : setSort('pickerId')}
                        sorted={sort === 'pickerId' ? direction : undefined}>

                        {t('cite_opt.columns.rank')}
                    </Table.HeaderCell>
                    <Table.HeaderCell
                        onClick={(e) => sort === 'name' ? setDirection(direction === 'descending' ? 'ascending' : 'descending') : setSort('name')}
                        sorted={sort === 'name' ? direction : undefined}>
                        {t('cite_opt.columns.crew')}
                    </Table.HeaderCell>
                    <Table.HeaderCell
                        onClick={(e) => sort === 'rarity' ? setDirection(direction === 'descending' ? 'ascending' : 'descending') : setSort('rarity')}
                        sorted={sort === 'rarity' ? direction : undefined}>
                        {t('cite_opt.columns.rarity')}
                    </Table.HeaderCell>
                    {(engine !== 'beta_tachyon_pulse' || showEV) && <Table.HeaderCell
                        onClick={(e) => sort === 'finalEV' ? setDirection(direction === 'descending' ? 'ascending' : 'descending') : setSort('finalEV')}
                        sorted={sort === 'finalEV' ? direction : undefined}>
                        {t('cite_opt.columns.final_ev')}
                    </Table.HeaderCell>}
                    {!training && (engine !== 'beta_tachyon_pulse' || showEV) &&
                        <React.Fragment>
                            <Table.HeaderCell
                                onClick={(e) => sort === 'remainingEV' ? setDirection(direction === 'descending' ? 'ascending' : 'descending') : setSort('remainingEV')}
                                sorted={sort === 'remainingEV' ? direction : undefined}>
                                {t('cite_opt.columns.remaining_ev')}
                            </Table.HeaderCell>
                            <Table.HeaderCell
                                onClick={(e) => sort === 'evPer' ? setDirection(direction === 'descending' ? 'ascending' : 'descending') : setSort('evPer')}
                                sorted={sort === 'evPer' ? direction : undefined}>
                                {tfmt('cite_opt.columns.ev_per_cite')}
                            </Table.HeaderCell>
                        </React.Fragment>
                    }
                    <Table.HeaderCell
                        onClick={(e) => sort === 'voyages' ? setDirection(direction === 'descending' ? 'ascending' : 'descending') : setSort('voyages')}
                        sorted={sort === 'voyages' ? direction : undefined}>
                        {tfmt('cite_opt.columns.voyages_groups')}
                    </Table.HeaderCell>
                    {engine === 'beta_tachyon_pulse' &&
                        <React.Fragment>
                            <Table.HeaderCell
                                onClick={(e) => sort === 'groupSparsity' ? setDirection(direction === 'descending' ? 'ascending' : 'descending') : setSort('groupSparsity')}
                                sorted={sort === 'groupSparsity' ? direction : undefined}>
                                {tfmt('cite_opt.columns.group_sparsity')}
                            </Table.HeaderCell>
                            <Table.HeaderCell
                                onClick={(e) => sort === 'amTraits' ? setDirection(direction === 'descending' ? 'ascending' : 'descending') : setSort('amTraits')}
                                sorted={sort === 'amTraits' ? direction : undefined}>
                                {tfmt('cite_opt.columns.antimatter_traits')}
                            </Table.HeaderCell>
                            <Table.HeaderCell
                                onClick={(e) => sort === 'colIncreased' ? setDirection(direction === 'descending' ? 'ascending' : 'descending') : setSort('colIncreased')}
                                sorted={sort === 'colIncreased' ? direction : undefined}>
                                {tfmt('cite_opt.columns.stat_boosting')}
                            </Table.HeaderCell>
                            <Table.HeaderCell
                                onClick={(e) => sort === 'skillOrder' ? setDirection(direction === 'descending' ? 'ascending' : 'descending') : setSort('skillOrder')}
                                sorted={sort === 'skillOrder' ? direction : undefined}>
                                {tfmt('cite_opt.columns.skill_order')}
                            </Table.HeaderCell>
                            <Table.HeaderCell
                                onClick={(e) => sort === 'quipment_score' ? setDirection(direction === 'descending' ? 'ascending' : 'descending') : setSort('quipment_score')}
                                sorted={sort === 'quipment_score' ? direction : undefined}>
                                {tfmt('cite_opt.columns.quipment_score')}
                            </Table.HeaderCell>
                        </React.Fragment>
                    }
                    <Table.HeaderCell
                        onClick={(e) => sort === 'in_portal' ? setDirection(direction === 'descending' ? 'ascending' : 'descending') : setSort('in_portal')}
                        sorted={sort === 'in_portal' ? direction : undefined}>
                        {tfmt('cite_opt.columns.in_portal')}
                    </Table.HeaderCell>
                    <Table.HeaderCell
                        onClick={(e) => sort === 'compare' ? setDirection(direction === 'descending' ? 'ascending' : 'descending') : setSort('compare')}
                        sorted={sort === 'compare' ? direction : undefined}>
                        {tfmt('cite_opt.columns.compare')}
                    </Table.HeaderCell>
                </Table.Row>
            </Table.Header>
            <Table.Body>
                {rows.slice(baseRow, baseRow + rowsPerPage).map((row, idx: number) => {
                    let cop: PlayerCrew | undefined;

                    if (engine === 'beta_tachyon_pulse') {
                        cop = appliedProspects.find(c => c.id === row.id) ?? globalContext.player.playerData?.player.character.crew.find(c => c.id == row.id);
                    }
                    else {
                        cop = appliedProspects.find(c => c.name === row.name) ?? globalContext.player.playerData?.player.character.crew.find(c => c.name == row.name);
                    }

                    const crew = cop;
                    const crew_quipment_score = row.ranks.scores.quipment;
                    const crew_sparsity = Math.round(((row.groupSparsity ?? 0)) * 1000) / 10;
                    const skp = engine === 'beta_tachyon_pulse' && !!crew ? printSkillOrder(crew).replace(/_skill/g, '') : 'no_order';
                    const sko = engine === 'beta_tachyon_pulse' && !!crew ? crew.skill_order : 'no_order';
                    //const isProspect = !!crew?.prospect;
                    const rarecolor = skp !== 'no_order' && !!skoMap ? CONFIG.RARITIES[skoMap[skp].rarity].color : undefined;

                    return (!!crew && !!sko && !!skp &&
                        <Table.Row key={crew.symbol + idx + tabName} positive={getChecked(crew.symbol)}>

                            <Table.Cell>{row.pickerId}</Table.Cell>
                            <Table.Cell>
                                <div
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: '60px auto',
                                        gridTemplateAreas: `'icon stats' 'icon description'`,
                                        gridGap: '1px'
                                    }}>
                                    <div style={{ gridArea: 'icon' }}

                                    >
                                        <CrewTarget targetGroup='citationTarget'
                                            inputItem={crew}>
                                            <img
                                                onClick={(e) => imageClick(e, crew)}
                                                width={48}
                                                src={`${process.env.GATSBY_ASSETS_URL}${crew.imageUrlPortrait}`}
                                            />
                                        </CrewTarget>
                                    </div>
                                    <div style={{ gridArea: 'stats' }}>
                                        <span style={{ fontWeight: 'bolder', fontSize: '1.25em' }}><Link to={`/crew/${crew.symbol}/`}>{crew.name}</Link></span>
                                    </div>
                                    <div style={{ gridArea: 'description' }}>{descriptionLabel(t, crew, false)}</div>
                                </div>
                            </Table.Cell>
                            <Table.Cell>
                                <Rating icon='star' rating={crew.rarity} maxRating={crew.max_rarity} size='large' disabled />
                            </Table.Cell>
                            {(engine !== 'beta_tachyon_pulse' || showEV) && <Table.Cell>
                                {Math.ceil(training ? (row.addedEV ?? row.totalEVContribution ?? 0) : (row.totalEVContribution ?? 0))}
                            </Table.Cell>}
                            {
                                !training && (engine !== 'beta_tachyon_pulse' || showEV) &&
                                <React.Fragment>
                                    <Table.Cell>
                                        {Math.ceil(row.totalEVRemaining ?? 0)}
                                    </Table.Cell>
                                    <Table.Cell>
                                        {Math.ceil(row.evPerCitation ?? 0)}
                                    </Table.Cell>
                                </React.Fragment>
                            }
                            <Table.Cell>
                                <Popup trigger={<b>{row.voyagesImproved?.length}</b>} content={row.voyagesImproved?.map(voy => formatVoyImp(voy)).join(', ')} />
                            </Table.Cell>
                            {engine === 'beta_tachyon_pulse' &&
                                <React.Fragment>
                                    <Table.Cell>
                                        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: "0.25em" }}>
                                            <span style={{
                                                color: gradeToColor(crew_sparsity / 100) ?? undefined
                                            }}>
                                                {numberToGrade(crew_sparsity / 100)}
                                            </span>
                                            <sub><i>({crew_sparsity.toLocaleString()})</i></sub>
                                        </div>
                                    </Table.Cell>
                                    <Table.Cell>
                                        <Popup trigger={<b>{row.amTraits?.length}</b>} content={row.amTraits?.map(tr => globalContext.localized.TRAIT_NAMES[tr]).join(', ')} />
                                    </Table.Cell>
                                    <Table.Cell>
                                        {row.collectionsIncreased === undefined ? "N/A" :
                                            <Popup trigger={<b>{row.collectionsIncreased?.length}</b>} content={row.collectionsIncreased?.join(' / ')} />}
                                    </Table.Cell>
                                    <Table.Cell width={2}>
                                        <div style={{
                                            display: "flex",
                                            flexDirection: "row",
                                            justifyContent: "flex-start",
                                            alignItems: "left"
                                        }}>

                                            <div style={{
                                                display: "flex",
                                                flexDirection: "column",
                                                justifyContent: "center",
                                                alignItems: "center"
                                            }}>
                                                <div style={{
                                                    display: "flex",
                                                    flexDirection: "row",
                                                    justifyContent: "space-evenly",
                                                    alignItems: "center"
                                                }}>
                                                    {row.skill_order.map((mskill, idx) => (
                                                        <img
                                                            title={appelate(mskill)}
                                                            key={"skimage" + idx + mskill}
                                                            src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${mskill}.png`}
                                                            style={{
                                                                maxHeight: "1.5em",
                                                                maxWidth: "1.5em",
                                                                margin: "0.5em",
                                                            }}

                                                        />))}
                                                </div>

                                                {!!skoMap && !!skoMap[skp] && <div>
                                                    <Popup trigger={
                                                        <div style={{ textAlign: 'center' }}>
                                                            <hr style={{ width: "100px", height: "2px", borderRadius: "2px", color: rarecolor, background: rarecolor }} color={rarecolor} />
                                                            <i style={{
                                                                fontSize: "0.75em",
                                                                fontWeight: "bold",
                                                                color: gradeToColor(row.scoreTrip ?? 0) ?? 'lightgreen'
                                                            }}>
                                                                {Math.floor(100 * (row?.scoreTrip ?? 0)) / 10} / 10
                                                            </i>
                                                        </div>
                                                        //<Rating icon='star' size='mini' style={{color: CONFIG.RARITIES[skoMap[skp].rarity].color}} disabled rating={skoMap[skp].rarity} maxRating={5} />
                                                    }
                                                        content={
                                                            <div>
                                                                <b>Skill Order:</b><br />
                                                                <b style={{ color: rarecolor }}>{CONFIG.RARITIES[skoMap[skp].rarity].name}</b>
                                                                {skoMap[skp].skills.map((sk, idx) => <div key={sk + idx.toString()}>{idx + 1}. {appelate(sk)}</div>)}
                                                                <hr />
                                                                <div>Crew Rank: <i style={{
                                                                    fontWeight: "bold",
                                                                    color: gradeToColor(row.scoreTrip ?? 0) ?? 'lightgreen'
                                                                }}>
                                                                    {Math.floor(100 * (row?.scoreTrip ?? 0)) / 10} / 10
                                                                </i>
                                                                </div>
                                                                <div>Total Crew: <b>{skoMap[skp].count}</b></div>
                                                            </div>
                                                        } />

                                                </div>}
                                            </div>
                                        </div>
                                    </Table.Cell>
                                    <Table.Cell>
                                        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: "0.25em" }}>
                                            <span style={{
                                                color: gradeToColor(crew_quipment_score / 100) ?? undefined
                                            }}>
                                                {numberToGrade(crew_quipment_score / 100)}
                                            </span>
                                            <sub><i>({crew_quipment_score.toLocaleString()})</i></sub>
                                        </div>
                                    </Table.Cell>
                                </React.Fragment>

                            }

                            <Table.Cell>
                                <span title={printPortalStatus(crew, t, true, true)}>
                                    {printPortalStatus(crew, t, true, true)}
                                </span>
                            </Table.Cell>
                            <Table.Cell>
                                <Checkbox checked={getChecked(crew.symbol)} onChange={(e, { checked }) => setChecked(crew.symbol, checked as boolean)} />
                            </Table.Cell>
                        </Table.Row>
                    );
                })}
            </Table.Body>
            <Table.Footer>
                <Table.Row>
                    <Table.HeaderCell colSpan={engine === 'beta_tachyon_pulse' ? 15 : 9}>
                        <div style={{ paddingLeft: '2em', display: 'flex', flexDirection: 'row', alignItems: 'center' }}>

                            <Pagination
                                totalPages={totalPages}
                                activePage={paginationPage}
                                onPageChange={(event, { activePage }) => setPaginationPage(activePage as number)}
                            />
                            <div style={{ paddingLeft: '2em', display: 'flex', flexDirection: 'row', alignItems: 'center' }}>

                                <div style={{ marginRight: "0.5em" }}>{t('global.rows_per_page')}:</div>
                                <Dropdown
                                    inline
                                    options={pagingOptions}
                                    value={rowsPerPage}
                                    onChange={(event, { value }) => {
                                        setRowsPerPage(value as number);
                                    }}
                                />
                            </div>
                        </div>
                    </Table.HeaderCell>
                </Table.Row>
            </Table.Footer>
        </Table>
    </div>);


    function getChecked(symbol: string) {
        return citeConfig.checks.some(chk => chk.symbol === symbol && !!chk.checked);
    }

    function setChecked(symbol: string, value?: boolean) {
        if (value === undefined) {
            setCiteConfig({
                ...citeConfig,
                checks: citeConfig.checks.filter(f => f.symbol !== symbol)
            });
        }
        else {
            let f = citeConfig.checks.find(f => f.symbol === symbol);
            if (f) {
                f.checked = !!value;
                setCiteConfig({
                    ...citeConfig,
                    checks: [...citeConfig.checks]
                });
            }
            else {
                setCiteConfig({
                    ...citeConfig,
                    checks: [...citeConfig.checks, { symbol, checked: true }]
                })
            }
        }
    }

    function sortCrew(crew: PlayerCrew[], training: boolean, engine: 'original' | 'beta_tachyon_pulse') {

        if (!sort || !direction) return crew;

        return crew.sort((a, b) => {
            let r = 0;

            if (sort === 'pickerId' && a.pickerId && b.pickerId) {
                r = a.pickerId - b.pickerId;
            }
            else if (sort === 'name') {
                r = a.name.localeCompare(b.name);
            }
            else if (sort === 'rarity') {
                r = a.max_rarity - b.max_rarity;
                if (!r) r = a.rarity - b.rarity;
            }
            else if (sort === 'quipment_score') {
                r = Math.ceil(a.ranks.scores.quipment ?? 0) - Math.ceil(b.ranks.scores.quipment ?? 0);
            }
            else if (sort === 'groupSparsity') {
                r = (a.groupSparsity ?? 0) - (b.groupSparsity ?? 0);
            }
            else if (sort === 'finalEV') {
                let aev = Math.ceil(training ? (a.addedEV ?? a.totalEVContribution ?? 0) : (a.totalEVContribution ?? 0));
                let bev = Math.ceil(training ? (b.addedEV ?? b.totalEVContribution ?? 0) : (b.totalEVContribution ?? 0));
                r = aev - bev;
            }
            else if (sort === 'remainingEV' && !training) {
                r = Math.ceil(a.totalEVRemaining ?? 0) - Math.ceil(b.totalEVRemaining ?? 0);
            }
            else if (sort === 'evPer' && !training) {
                r = Math.ceil(a.evPerCitation ?? 0) - Math.ceil(b.evPerCitation ?? 0);
            }
            else if (sort === 'voyages') {
                r = (a.voyagesImproved?.length ?? 0) - (b.voyagesImproved?.length ?? 0);
            }
            else if (sort === 'amTraits' && engine === 'beta_tachyon_pulse') {
                r = (a.amTraits?.length ?? 0) - (b.amTraits?.length ?? 0);
            }
            else if (sort === 'colIncreased' && engine === 'beta_tachyon_pulse') {
                r = (a.collectionsIncreased?.length ?? 0) - (b.collectionsIncreased?.length ?? 0);
            }
            else if (sort === 'eventScore' && engine === 'beta_tachyon_pulse') {
                r = (a.events ?? 0) - (b.events ?? 0);
            }
            else if (sort === 'skillOrder' && engine === 'beta_tachyon_pulse') {
                let ska = crewSkills[a.symbol];
                let skb = crewSkills[b.symbol];
                if (skoMap) r = skoMap[ska].count - skoMap[skb].count;
                if (!r) {
                    r = (a.scoreTrip ?? 0) - (b.scoreTrip ?? 0);
                    if (direction === 'ascending') r *= -1;
                }
            }
            else if (sort === 'in_portal') {
                if (a.in_portal) r--;
                if (b.in_portal) r++;

                //if (!r) r = a.obtained.localeCompare(b.obtained);
            }
            else if (sort === 'compare') {
                if (getChecked(a.symbol)) r--;
                if (getChecked(b.symbol)) r++;
            }

            if (!r) {
                r = (a.pickerId ?? 0) - (b.pickerId ?? 0);
            }
            if (!r) {
                r = a.name.localeCompare(b.name);
            }

            if (direction === 'descending') r *= -1;

            return r;
        })
    }

    function setDirection(direction: SortDirection) {
        setSortConfig({ ... sortConfig, direction });
    }

    function setSort(sort: string) {
        setSortConfig({ ... sortConfig, sort });
    }


}