import React from "react"
import { Button, Table } from "semantic-ui-react"
import { GlobalContext } from "../../../context/globalcontext"
import { Filter } from "../../../model/game-elements"
import { ObjectiveArchetype, PlayerCrew } from "../../../model/player"
import { crewMatchesSearchFilter } from "../../../utils/crewsearch"
import { qbitsToSlots, qbProgressToNext } from "../../../utils/crewutils"
import { RarityFilter } from "../../crewtables/commonoptions"
import { renderMainDataScore } from "../../crewtables/views/base"
import { AvatarView } from "../../item_presenters/avatarview"
import { ITableConfigRow, SearchableTable } from "../../searchabletable"
import { OptionsPanelFlexRow } from "../../stats/utils"
import { useStateWithStorage } from "../../../utils/storage"

interface SlotHelperProps {
    data: ObjectiveArchetype
}

export const SlotHelperMiniTool = (props: SlotHelperProps) => {
    const globalContext = React.useContext(GlobalContext);
    const { t } = globalContext.localized;
    const { ephemeral, playerData } = globalContext.player;
    const { data } = props;
    const [filters, setFilters] = useStateWithStorage(`oe_mini/slot_helper/filters`, [] as number[], { rememberForever: true });
    const [rarities, setRarities] = useStateWithStorage(`oe_mini/slot_helper/rarities`, [] as number[], { rememberForever: true });

    const tableConfig = [
        { width: 3, column: 'name', title: t('base.crew') },
        { width: 1, column: 'ranks.scores.overall', title: t('rank_names.datascore'), reverse: true },
        {
            width: 1, column: 'q_bits', title: t('base.quipment'),
            customCompare: (a: PlayerCrew, b: PlayerCrew) => {
                let [aprog, agoal] = qbProgressToNext(a.q_bits);
                let [bprog, bgoal] = qbProgressToNext(b.q_bits);
                return agoal - bgoal || aprog - bprog || b.ranks.scores.overall - a.ranks.scores.overall;
            }
        },
    ] as ITableConfigRow[];

    const workData = React.useMemo(() => {
        if (!ephemeral || !playerData?.player?.character?.crew?.length) return [] as PlayerCrew[];
        return playerData?.player?.character?.crew.filter(c => {
            if (!c.immortal || c.immortal > 0) return false;
            if (c.q_bits >= 1300) return false;
            if (filters.length) {
                if (filters.includes(0) && c.ranks.voyRank > 50) return false;
                if (filters.includes(1) && c.ranks.gauntletRank > 50) return false;
                if (filters.includes(2) && c.ranks.shuttleRank > 50) return false;
            }
            if (ephemeral && ephemeral.activeCrew.some(ac => ac.id === c.id)) return false;
            if (rarities.length && !rarities.includes(c.max_rarity)) return false;
            return true;
        })
            .sort((a, b) => {
                let [aprog, agoal] = qbProgressToNext(a.q_bits);
                let [bprog, bgoal] = qbProgressToNext(b.q_bits);
                return agoal - bgoal || aprog - bprog || b.ranks.scores.overall - a.ranks.scores.overall;
            });
    }, [playerData, ephemeral, data, filters, rarities]);


    if (!workData?.length) {
        return globalContext.core.spin(t('spinners.default'));
    }

    const flexRow = OptionsPanelFlexRow;

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
            <div style={{ ...flexRow, margin: 0, padding: 0, justifyContent: 'center' }}>
                <RarityFilter selection={false} rarityFilter={rarities} setRarityFilter={setRarities} />
                <Button active={filters.includes(0)} style={{ width: '32px', padding: 4 }} onClick={() => toggleFilter(0)}>
                    <img src={`/media/voyage.png`} style={{ height: '24px', alignSelf: 'flex-end' }} />
                </Button>
                <Button active={filters.includes(1)} style={{ width: '32px', padding: 4 }} onClick={() => toggleFilter(1)}>
                    <img src={`/media/gauntlet.png`} style={{ height: '24px', alignSelf: 'flex-end' }} />
                </Button>
                <Button active={filters.includes(2)} style={{ width: '32px', padding: 4 }} onClick={() => toggleFilter(2)}>
                    <img src={`/media/faction.png`} style={{ height: '24px', alignSelf: 'flex-end' }} />
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
                    <div style={{ ...flexRow, gap: '1em', alignItems: 'center' }}>
                        <AvatarView
                            mode='crew'
                            item={row}
                            size={32}
                        />
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
                {crew.immortal === -1 &&
                    <div style={{ fontSize: "0.8em", minWidth: '4em' }}>
                        ({qbslots === 1 && t('base.one_slot')}{qbslots !== 1 && t('base.n_slots', { n: qbitsToSlots(crew.q_bits).toString() })})
                    </div>}
                {crew.immortal === -1 && qbslots < 4 &&
                    <div style={{ fontSize: "0.8em", minWidth: '6em' }}>
                        ({t('base.n_to_next', { n: qbProgressToNext(crew.q_bits)[0].toString() })})
                    </div>}
            </React.Fragment>
        )
    }

    function toggleFilter(filter: number) {
        if (filters.includes(filter)) {
            setFilters(filters.filter(f => f !== filter));
        }
        else {
            setFilters([...filters, filter]);
        }
    }
}