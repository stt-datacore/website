import React from "react"
import { Button, Icon, Table } from "semantic-ui-react"
import { GlobalContext } from "../../../context/globalcontext"
import { Filter } from "../../../model/game-elements"
import { ObjectiveArchetype, PlayerCrew } from "../../../model/player"
import { crewMatchesSearchFilter } from "../../../utils/crewsearch"
import { missionsToNext, qbitsToSlots, qbProgressToNext, skillSum } from "../../../utils/crewutils"
import { useStateWithStorage } from "../../../utils/storage"
import { SkillPicker } from "../../base/skillpicker"
import { RarityFilter } from "../../crewtables/commonoptions"
import { renderMainDataScore } from "../../crewtables/views/base"
import { AvatarView } from "../../item_presenters/avatarview"
import { ITableConfigRow, SearchableTable } from "../../searchabletable"
import { OptionsPanelFlexRow } from "../../stats/utils"
import { getPossibleQuipment } from "../../../utils/itemutils"

interface SlotHelperProps {
    data: ObjectiveArchetype
}

type Logic = 'AND' | 'OR' | 'NOR' | 'XOR';
const Logics = ['OR', 'AND', 'XOR', 'NOR'] as Logic[];

export const SlotHelperMiniTool = (props: SlotHelperProps) => {
    const globalContext = React.useContext(GlobalContext);
    const { t } = globalContext.localized;
    const { ephemeral, playerData } = globalContext.player;
    const { data } = props;

    const [logic, setLogic] = useStateWithStorage<Logic>(`oe_mini/slot_helper/logic`, 'OR', { rememberForever: true });
    const [filters, setFilters] = useStateWithStorage(`oe_mini/slot_helper/filters`, [] as number[], { rememberForever: true });
    const [rarities, setRarities] = useStateWithStorage(`oe_mini/slot_helper/rarities`, [] as number[], { rememberForever: true });
    const [skills, setSkills] = useStateWithStorage(`oe_mini/slot_helper/skills`, undefined as string[] | undefined, { rememberForever: true });

    const tableConfig = [
        {
            width: 1, column: 'skill_order', title: t('base.skills'), reverse: true,
            customCompare: (a: PlayerCrew, b: PlayerCrew) => {
                return a.skill_order[0].localeCompare(b.skill_order[0]) || Math.ceil(skillSum(a[a.skill_order[0]])) - Math.ceil(skillSum(b[b.skill_order[0]]));
            }
        },
        { width: 3, column: 'name', title: t('base.crew') },
        { width: 1, column: 'ranks.scores.overall', title: t('rank_names.datascore'), reverse: true },
        {
            width: 1, column: 'q_bits', title: t('base.quipment'),
            customCompare: (a: PlayerCrew, b: PlayerCrew) => {
                let [aprog, agoal] = qbProgressToNext(a.q_bits);
                let [bprog, bgoal] = qbProgressToNext(b.q_bits);
                return aprog - bprog || agoal - bgoal || b.ranks.scores.overall - a.ranks.scores.overall;
            }
        },
    ] as ITableConfigRow[];

    const workData = React.useMemo(() => {
        const quipment = globalContext.core.items.filter(f => f.type === 14);
        if (!ephemeral || !playerData?.player?.character?.crew?.length) return [] as PlayerCrew[];
        return playerData?.player?.character?.crew.filter(c => {
            if (!c.immortal) return false;
            if (c.q_bits >= 1300) return false;

            if (filters.length) {
                let p = false;
                if (filters.includes(3)) {
                    let possquip = getPossibleQuipment(c, quipment);
                    p = possquip?.some(item => !!item.traits_requirement?.length);
                }
                //let f = (filters.includes(4) && !!c.immortal && c.immortal > 0);
                let v = (filters.includes(0) && c.ranks.voyRank <= 50);
                let g = (filters.includes(1) && c.ranks.gauntletRank <= 50);
                let b = (filters.includes(2) && c.ranks.shuttleRank <= 50);
                if (logic === 'OR') {
                    if (!(v || g || b || p)) return false;
                }
                else if (logic === 'AND') {
                    v = !filters.includes(0) || v;
                    g = !filters.includes(1) || g;
                    b = !filters.includes(2) || b;
                    p = !filters.includes(3) || p;
                    //f = !filters.includes(4) || f;
                    if (!(v && g && b && p)) return false;
                }
                else if (logic === 'XOR') {
                    if ([v, g, b, p].filter(f => f).length !== 1) return false;
                }
                else if (logic === 'NOR') {
                    if (v || g || b || p) return false;
                }
            }

            if (!filters.includes(4) && !!c.immortal && c.immortal > 0) return false;

            if (skills?.length) {
                if (!skills.includes(c.skill_order[0])) return false;
            }
            //if (ephemeral && ephemeral.activeCrew.some(ac => ac.id === c.id)) return false;
            if (rarities.length && !rarities.includes(c.max_rarity)) return false;
            return true;
        })
        .sort((a, b) => {
            let [aprog, agoal] = qbProgressToNext(a.q_bits);
            let [bprog, bgoal] = qbProgressToNext(b.q_bits);
            let anext = missionsToNext(a.q_bits);
            let bnext = missionsToNext(b.q_bits);
            return anext - bnext || aprog - bprog || agoal - bgoal || b.ranks.scores.overall - a.ranks.scores.overall;
        });
    }, [playerData, ephemeral, data, filters, rarities, skills, logic]);


    if (!workData) {
        return globalContext.core.spin(t('spinners.default'));
    }

    const flexRow = OptionsPanelFlexRow;
    const btnWidth = '40px';

    return (
        <div style={{ marginTop: '-8px' }}>
            <div style={{ height: 'calc(300px + 1.5em)' }}>
                <SearchableTable
                    id="slot_helper_mini_table"
                    pagingOptions={[{ key: '0', value: 4, text: '4' }]}
                    initOptions={{
                        rows: 4,
                        column: 'q_bits',
                        direction: 'ascending'
                    }}
                    noSearch
                    data={workData}
                    config={tableConfig}
                    filterRow={filterRow}
                    renderTableRow={renderTableRow}
                />
            </div>
            <div style={{ ...flexRow, margin: 0, padding: 0, justifyContent: 'center', backgroundColor: '#3A3F44', zIndex: '100' }}>
                <RarityFilter selection={false} multiple={false} rarityFilter={rarities} setRarityFilter={setRarities} />
                <SkillPicker multiple={false} search={false} selection={false} value={skills} setValue={setSkills} />
                <Button
                    active={filters.includes(0)}
                    style={{ width: btnWidth, padding: 4 }}
                    onClick={() => toggleFilter(0)}
                    color={filters.includes(0) ? 'blue' : undefined}
                    >
                    <img src={`/media/voyage.png`} style={{ height: '24px', alignSelf: 'flex-end' }} />
                </Button>
                <Button
                    active={filters.includes(1)}
                    style={{ width: btnWidth, padding: 4 }}
                    onClick={() => toggleFilter(1)}
                    color={filters.includes(1) ? 'blue' : undefined}
                    >
                    <img src={`/media/gauntlet.png`} style={{ height: '24px', alignSelf: 'flex-end' }} />
                </Button>
                <Button
                    active={filters.includes(2)}
                    style={{ width: btnWidth, padding: 4 }}
                    onClick={() => toggleFilter(2)}
                    color={filters.includes(2) ? 'blue' : undefined}
                    >
                    <img src={`/media/faction.png`} style={{ height: '24px', alignSelf: 'flex-end' }} />
                </Button>
                <Button
                    active={filters.includes(3)}
                    style={{ width: btnWidth, padding: 4 }}
                    onClick={() => toggleFilter(3)}
                    color={filters.includes(3) ? 'blue' : undefined}
                    >
                    <div style={{...flexRow, gap: 0, margin: 0, justifyContent: 'center', height: '28px',
                            fontSize: '0.9em', fontWeight: 'bold', textAlign: 'center'}}>
                        <span>
                            <Icon style={{margin:0,padding:0}} name='object group' />
                        </span>
                    </div>
                </Button>
                <Button
                    style={{ width: '32px', padding: 4 }}
                    onClick={() => nextLogic()}
                    >
                    <div style={{...flexRow, gap: 0, margin: 0, justifyContent: 'center', height: '28px',
                            fontSize: '0.9em', fontWeight: 'bold', textAlign: 'center'}}>
                        <span>
                            {t(`logic.${logic}`)}
                        </span>
                    </div>
                </Button>
                <Button
                    active={filters.includes(4)}
                    style={{ width: btnWidth, padding: 4 }}
                    onClick={() => toggleFilter(4)}
                    color={filters.includes(4) ? 'blue' : undefined}
                    >
                    <div style={{...flexRow, gap: 0, margin: 0, justifyContent: 'center', height: '28px',
                            fontSize: '0.9em', fontWeight: 'bold', textAlign: 'center'}}>
                        <span>
                            <Icon style={{margin:0,padding:0}} name='snowflake' />
                        </span>
                    </div>
                </Button>

            </div>

        </div>
    )

    function filterRow(row: PlayerCrew, filters: Filter[], filterType?: string) {
        return crewMatchesSearchFilter(row, filters, filterType);
    }

    function renderTableRow(row: PlayerCrew, idx?: number) {

        return (
            <Table.Row key={`${row.id}_${row.symbol}_slots_mini_helper`}>
                <Table.Cell>
                    <div style={{...flexRow, gap: '0.5em'}}>
                    <img src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${row.skill_order[0]}.png`} style={{width: '18px'}} />
                    <span style={{fontSize: '0.8em'}}>
                        {Math.ceil(skillSum(row[row.skill_order[0]]))}
                    </span>
                    </div>
                </Table.Cell>
                <Table.Cell>
                    <div style={{ ...flexRow, gap: '1em', alignItems: 'center' }}>
                        <AvatarView
                            mode='crew'
                            targetGroup="event_info"
                            item={row}
                            size={32}
                        />
                        {!!row.immortal && row.immortal > 0 &&
                        <Icon name='snowflake' style={{margin: 0, padding: 0}} />}
                        <div style={{ flexGrow: 1 }}>
                            {row.name}
                        </div>
                        {row.ranks.voyRank <= 50 && <img src={`/media/voyage.png`} style={{ height: '24px', alignSelf: 'flex-end' }} />}
                        {row.ranks.gauntletRank <= 50 && <img src={`/media/gauntlet.png`} style={{ height: '24px', alignSelf: 'flex-end' }} />}
                        {row.ranks.shuttleRank <= 50 && <img src={`/media/faction.png`} style={{ height: '24px', alignSelf: 'flex-end' }} />}
                    </div>
                </Table.Cell>
                <Table.Cell>
                    {renderMainDataScore(row, true)}
                </Table.Cell>
                <Table.Cell>
                    {renderQBitData(row)}
                </Table.Cell>
            </Table.Row>
        )
    }

    function renderQBitData(crew: PlayerCrew) {
        const qbslots = qbitsToSlots(crew.q_bits);
        return (
            <React.Fragment>
                {!!crew.immortal &&
                    <div style={{ fontSize: "0.8em", minWidth: '4em' }}>
                        ({qbslots === 1 && t('base.one_slot')}{qbslots !== 1 && t('base.n_slots', { n: qbitsToSlots(crew.q_bits).toString() })})
                    </div>}
                {!!crew.immortal && qbslots < 4 &&
                    <div style={{ fontSize: "0.8em", minWidth: '6em' }}>
                        {/* ({t('base.n_to_next', { n: qbProgressToNext(crew.q_bits)[0].toString() })}) */}
                        ({t('crew_views.n_missions_to_next', { n: missionsToNext(crew.q_bits).toString() })})
                    </div>}
            </React.Fragment>
        )
    }

    function toggleFilter(filter: number) {
        if (logic !== 'XOR') {
            if (filters.includes(filter)) {
                setFilters(filters.filter(f => f !== filter));
            }
            else {
                setFilters([...filters, filter]);
            }
        }
        else {
            if (filters.includes(filter)) {
                setFilters(filters.filter(f => f !== filter));
            }
            else {
                setFilters([filter]);
            }
        }
    }

    function nextLogic() {
        let i = Logics.indexOf(logic);
        if (i === Logics.length - 1) i = 0;
        else i++;
        setLogic(Logics[i]);
    }
}