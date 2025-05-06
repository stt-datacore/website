import React from "react"
import { ObjectiveArchetype, PlayerCrew } from "../../../model/player"
import { GlobalContext } from "../../../context/globalcontext"
import { ITableConfigRow, SearchableTable } from "../../searchabletable"
import { Filter } from "../../../model/game-elements"
import { crewMatchesSearchFilter } from "../../../utils/crewsearch"
import { Button, Table } from "semantic-ui-react"
import { OptionsPanelFlexColumn, OptionsPanelFlexRow } from "../../stats/utils"
import { AvatarView } from "../../item_presenters/avatarview"
import { renderMainDataScore } from "../../crewtables/views/base"
import { qbitsToSlots, qbProgressToNext } from "../../../utils/crewutils"


interface SlotHelperProps {
    data: ObjectiveArchetype
}


export const SlotHelperMiniTool = (props: SlotHelperProps) => {
    const globalContext = React.useContext(GlobalContext);
    const { t } = globalContext.localized;
    const { ephemeral, playerData } = globalContext.player;
    const { data } = props;
    const [filters, setFilters] = React.useState([] as number[]);

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
            return true;
        })
        .sort((a, b) => {
            let [aprog, agoal] = qbProgressToNext(a.q_bits);
            let [bprog, bgoal] = qbProgressToNext(b.q_bits);
            return agoal - bgoal || aprog - bprog || b.ranks.scores.overall - a.ranks.scores.overall;
        });
    }, [playerData, ephemeral, data, filters]);


    if (!workData?.length) {
        return globalContext.core.spin(t('spinners.default'));
    }

    const flexRow = OptionsPanelFlexRow;
    const flexCol = OptionsPanelFlexColumn;

    return (
        <div style={{marginTop: '-8px'}}>
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
            <div style={{...flexRow, margin: 0, padding: 0, justifyContent: 'center'}}>
                <Button active={filters.includes(0)} style={{width: '32px', padding: 4}} onClick={() => toggleFilter(0)}>
                    <img src={`/media/voyage.png`} style={{height: '24px', alignSelf: 'flex-end'}} />
                </Button>
                <Button active={filters.includes(1)} style={{width: '32px', padding: 4}} onClick={() => toggleFilter(1)}>
                    <img src={`/media/gauntlet.png`} style={{height: '24px', alignSelf: 'flex-end'}} />
                </Button>
                <Button active={filters.includes(2)} style={{width: '32px', padding: 4}} onClick={() => toggleFilter(2)}>
                    <img src={`/media/faction.png`} style={{height: '24px', alignSelf: 'flex-end'}} />
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
                    <div style={{...flexRow, gap: '1em', alignItems: 'center'}}>
                        <AvatarView
                            mode='crew'
                            item={row}
                            size={32}
                            />
                        <div style={{flexGrow: 1}}>
                            {row.name}
                        </div>
                        {row.ranks.voyRank <= 50 && <img src={`/media/voyage.png`} style={{height: '24px', alignSelf: 'flex-end'}} />}
                        {row.ranks.gauntletRank <= 50 && <img src={`/media/gauntlet.png`} style={{height: '24px', alignSelf: 'flex-end'}} />}
                        {row.ranks.shuttleRank <= 50 && <img src={`/media/faction.png`} style={{height: '24px', alignSelf: 'flex-end'}} />}
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
                <div style={{fontSize:"0.8em", minWidth: '4em'}}>
                    ({qbslots === 1 && t('base.one_slot')}{qbslots !== 1 && t('base.n_slots', { n: qbitsToSlots(crew.q_bits).toString() })})
                </div>}
                {crew.immortal === -1 && qbslots < 4 &&
                <div style={{fontSize:"0.8em", minWidth: '6em'}}>
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