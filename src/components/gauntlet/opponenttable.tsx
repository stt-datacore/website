import React from "react"
import { Dropdown, DropdownItemProps, Pagination, Table } from "semantic-ui-react"
import { GlobalContext } from "../../context/globalcontext"
import { Gauntlet, Opponent } from "../../model/gauntlets"
import { CompletionState, PlayerCrew } from "../../model/player";
import { DEFAULT_MOBILE_WIDTH } from "../hovering/hoverstat";
import { AvatarView } from "../item_presenters/avatarview";
import CrewStat from "../crewstat";
import { PlayerSkill, Skill } from "../../model/crew";
import { useStateWithStorage } from "../../utils/storage";
import { getCrewCrit } from "../../utils/gauntlet";
import { getIconPath } from "../../utils/assets";

export interface OpponentTableProps {
    opponents: Opponent[];
    gauntlet: Gauntlet;
}

export const OpponentTable = (props: OpponentTableProps) => {

    const globalContext = React.useContext(GlobalContext);
    const { t } = globalContext.localized;
    const { opponents: externalOpponents, gauntlet } = props;
    const [opponents, setOpponents] = React.useState<Opponent[]>([]);
    const [activePageOpponents, setActivePageOpponents] = React.useState<Opponent[] | undefined>(undefined);

    const [sortOrder, setSortOrder] = useStateWithStorage<'ascending' | 'descending'>(`gauntletOpponentSortOrder`, 'ascending');
    const [sortColumn, setSortColumn] = useStateWithStorage('gauntletOpponentSortColumn', 'rank');
    const [totalPages, setTotalPages] = React.useState(1);
    const [itemsPerPage, setItemsPerPage] = React.useState(10);
    const [activePage, setActivePage] = React.useState(1);
    const pageStartIdx = (activePage - 1) * itemsPerPage;

    React.useEffect(() => {
        const newOppo = [...externalOpponents];
        let o = sortOrder === 'descending' ? -1 : 1;

        if (sortColumn === 'opponent') {
            newOppo.sort((a, b) => a.name.localeCompare(b.name) * o)
        }
        else if (sortColumn === 'rank') {
            newOppo.sort((a, b) => (a.rank - b.rank) * o);
        }
        else if (sortColumn === 'level') {
            newOppo.sort((a, b) => (a.level - b.level) * o);
        }
        else if (sortColumn === 'crew') {
            newOppo.sort((a, b) => {
                let r = (a.crew_contest_data.crew.length - b.crew_contest_data.crew.length) * o;
                if (!r) {
                    let apower = a.crew_contest_data.crew.map(m => m.skills.map(s => (s.max + s.min) * 0.5).reduce((p, n) => p + n, 0)).reduce((p, n) => p + n, 0);
                    let bpower = b.crew_contest_data.crew.map(m => m.skills.map(s => (s.max + s.min) * 0.5).reduce((p, n) => p + n, 0)).reduce((p, n) => p + n, 0);
                    r = bpower - apower;
                }
                if (!r) r = a.rank - b.rank;
                if (!r) r = a.name.localeCompare(b.name);
                return r;
            });
        }
        setOpponents(newOppo);
    }, [externalOpponents, sortColumn, sortOrder]);

    React.useEffect(() => {
        if (!opponents?.length) return;
        let pages = Math.ceil(opponents.length / itemsPerPage);
        if (totalPages !== pages) {
            setTotalPages(pages);
            if (activePage > pages) {
                setActivePage(pages);
                return;
            }
            else if (activePage < 1 && pages) {
                setActivePage(1);
                return;
            }
        }
        opponents.forEach((oppo) => {
            oppo.crew_contest_data.crew.sort((a, b) => {
                let ask = a.skills.map(s => (s.max + s.min) * 0.5).reduce((p, n) => p + n, 0);
                let bsk = b.skills.map(s => (s.max + s.min) * 0.5).reduce((p, n) => p + n, 0);
                return bsk - ask;
            })
        })
        setActivePageOpponents(opponents.slice(pageStartIdx, pageStartIdx + itemsPerPage));
    }, [opponents, itemsPerPage, activePage, totalPages]);

    const pageSizes = [1, 5, 10, 20, 50, 100].map(size => {
        return {
            key: `pageSize_${size}`,
            value: size,
            text: `${size}`
        } as DropdownItemProps;
    });

    return <React.Fragment>
        <Table striped sortable>
            <Table.Header>
                <Table.Row>
                    <Table.HeaderCell width={2}
                        sorted={sortColumn === 'opponent' ? sortOrder : undefined}
                        onClick={() => sortColumn === 'opponent' ? setSortOrder(sortOrder === 'descending' ? 'ascending' : 'descending') : setSortColumn('opponent')}
                    >
                        {t('gauntlet.opponent_table.opponent')}
                    </Table.HeaderCell>
                    <Table.HeaderCell width={1}
                        sorted={sortColumn === 'level' ? sortOrder : undefined}
                        onClick={() => sortColumn === 'level' ? setSortOrder(sortOrder === 'descending' ? 'ascending' : 'descending') : setSortColumn('level')}
                    >
                        {t('base.level')}
                    </Table.HeaderCell>
                    <Table.HeaderCell width={1}
                        sorted={sortColumn === 'rank' ? sortOrder : undefined}
                        onClick={() => sortColumn === 'rank' ? setSortOrder(sortOrder === 'descending' ? 'ascending' : 'descending') : setSortColumn('rank')}
                    >
                        {t('cite_opt.columns.rank')}
                    </Table.HeaderCell>
                    <Table.HeaderCell
                        sorted={sortColumn === 'crew' ? sortOrder : undefined}
                        onClick={() => sortColumn === 'crew' ? setSortOrder(sortOrder === 'descending' ? 'ascending' : 'descending') : setSortColumn('crew')}
                    >
                        {t('gauntlet.opponent_table.opponent_crew_n', { n: "" })}
                    </Table.HeaderCell>
                </Table.Row>
            </Table.Header>
            <Table.Body>
                {activePageOpponents?.map((opponent, idx) => {
                    return <Table.Row key={`${opponent.name}_${idx}_${opponent.player_id}`}>
                        <Table.Cell>
                            <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                                <img className="ui segment" style={{ margin: "4px 8px", borderRadius: "6px", height: "72px" }} src={`${process.env.GATSBY_ASSETS_URL}${opponent?.icon?.file ? getIconPath(opponent?.icon, true) : 'crew_portraits_cm_empty_sm.png'}`} />
                                {opponent.name}
                            </div>
                        </Table.Cell>
                        <Table.Cell>
                            {opponent.level}
                        </Table.Cell>
                        <Table.Cell>
                            {opponent.rank || "?"}
                        </Table.Cell>
                        <Table.Cell width={8}>
                            <div style={{ textAlign: 'center', gap: '4em', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-evenly', flexWrap: 'wrap' }}>
                                {opponent.crew_contest_data.crew.map((crew, idx2) => {
                                    const refcrew = globalContext.core.crew.find(f => f.symbol === crew.archetype_symbol);
                                    const item = {
                                        ...crew,
                                        symbol: crew.archetype_symbol,
                                        immortal: CompletionState.DisplayAsImmortalOpponent
                                    } as any as PlayerCrew;

                                    const skills = crew.skills.map((m) => {
                                        item[m.skill] = m;

                                        const newskill = ({
                                            core: 0,
                                            range_max: m.max,
                                            range_min: m.min,
                                            skill: m.skill as PlayerSkill
                                        } as Skill)
                                        item.base_skills ??= {};
                                        item.base_skills[m.skill] = newskill;
                                        return newskill;
                                    });

                                    return (
                                        <div
                                            key={`opponent_${crew.archetype_symbol}_${idx}_${idx2}`}
                                            style={{
                                                textAlign: 'center',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                justifyContent: 'center',
                                                width: '225px',
                                                gap: "0.25em",
                                                alignItems: 'center'
                                            }}>

                                            <AvatarView
                                                passDirect={true}
                                                targetGroup="gauntletsHover"
                                                mode='crew'
                                                symbol={crew.archetype_symbol}
                                                item={item}
                                                partialItem={true}
                                                size={64}
                                            />

                                            {getCrewCrit(crew, gauntlet)} %
                                            <div style={{ display: 'flex', flexDirection: 'row' }}>
                                                {skills.map((skill) => (
                                                    <CrewStat proficiencies scale={0.65} vertical={false} skill_name={skill.skill as string} data={skill} />
                                                ))}
                                            </div>

                                            <i>{refcrew!.name}</i>
                                        </div>
                                    )
                                })}
                            </div>
                        </Table.Cell>
                    </Table.Row>
                })}
            </Table.Body>
            <Table.Footer>
                <Table.Row>
                    <Table.HeaderCell colspan={4}>
                        <Pagination
                            totalPages={totalPages}
                            activePage={activePage}
                            onPageChange={(e, data) => setActivePage(data.activePage as number)}
                        />

                        <span style={{ paddingLeft: '2em' }}>
                            {t('global.rows_per_page')}:{' '}
                            <Dropdown
                                options={pageSizes}
                                value={itemsPerPage}
                                inline
                                onChange={(e, { value }) => setItemsPerPage(value as number)}
                            />
                        </span>
                    </Table.HeaderCell>
                </Table.Row>
            </Table.Footer>
        </Table>
    </React.Fragment>
}