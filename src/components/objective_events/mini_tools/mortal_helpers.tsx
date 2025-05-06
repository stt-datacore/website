import { navigate } from "gatsby"
import React from "react"
import { Button, Rating, Table } from "semantic-ui-react"
import { GlobalContext } from "../../../context/globalcontext"
import { Filter } from "../../../model/game-elements"
import { ObjectiveArchetype, PlayerCrew } from "../../../model/player"
import { crewMatchesSearchFilter } from "../../../utils/crewsearch"
import { useStateWithStorage } from "../../../utils/storage"
import { RarityFilter } from "../../crewtables/commonoptions"
import { renderMainDataScore } from "../../crewtables/views/base"
import { AvatarView } from "../../item_presenters/avatarview"
import { ITableConfigRow, SearchableTable } from "../../searchabletable"
import { OptionsPanelFlexRow } from "../../stats/utils"

interface FuseHelperProps {
    data: ObjectiveArchetype,
    allow_ff?: boolean;
    no_max?: boolean;
}

export const ImmortalHelperMiniTool = (props: { data: ObjectiveArchetype }) => {
    return <FuseHelperMiniTool allow_ff={true} data={props.data} />
}

export const LevelHelperMiniTool = (props: { data: ObjectiveArchetype }) => {
    return <FuseHelperMiniTool allow_ff={true} no_max={true} data={props.data} />
}

export const FuseHelperMiniTool = (props: FuseHelperProps) => {
    const globalContext = React.useContext(GlobalContext);
    const { t } = globalContext.localized;
    const { ephemeral, playerData } = globalContext.player;
    const { data, allow_ff, no_max } = props;
    const [filters, setFilters] = useStateWithStorage(`oe_mini/fuse_helper/filters`, [] as number[], { rememberForever: true });
    const [rarities, setRarities] = useStateWithStorage(`oe_mini/fuse_helper/rarities`, [] as number[], { rememberForever: true });

    const tableConfig = [
        { width: 3, column: 'name', title: t('base.crew') },
        {
            width: 1, column: 'rarity', title: t('base.rarity'),
            reverse: true,
            customCompare: (a: PlayerCrew, b: PlayerCrew) => {
                let acount = (playerData?.player?.character?.crew.filter(f => f.symbol === a.symbol))?.length ?? 0;
                let bcount = (playerData?.player?.character?.crew.filter(f => f.symbol === a.symbol))?.length ?? 0;
                return a.max_rarity - b.max_rarity || a.rarity - b.rarity || acount - bcount || a.level - b.level || a.ranks.scores.overall - b.ranks.scores.overall;
            }
        },
        {
            width: 1, column: 'level', title: t('base.level'),
            customCompare: (a: PlayerCrew, b: PlayerCrew) => {
                let acount = (playerData?.player?.character?.crew.filter(f => f.symbol === a.symbol))?.length ?? 0;
                let bcount = (playerData?.player?.character?.crew.filter(f => f.symbol === a.symbol))?.length ?? 0;
                return a.level - b.level || a.max_rarity - b.max_rarity || a.rarity - b.rarity || acount - bcount || a.ranks.scores.overall - b.ranks.scores.overall;
            }
        },
        { width: 1, column: 'ranks.scores.overall', title: t('rank_names.datascore'), reverse: true },
    ] as ITableConfigRow[];

    const workData = React.useMemo(() => {
        if (!ephemeral || !playerData?.player?.character?.crew?.length) return [] as PlayerCrew[];
        return playerData?.player?.character?.crew.filter(c => {
                if (c.immortal) return false;
                if (c.rarity === c.max_rarity && !allow_ff) return false;
                if (no_max && c.level === 100) return false;
                if (filters.length) {
                    let v = (filters.includes(0) && c.ranks.voyRank <= 50);
                    let g = (filters.includes(1) && c.ranks.gauntletRank <= 50);
                    let b = (filters.includes(2) && c.ranks.shuttleRank <= 50);
                    if (!(v || g || b)) return false;
                }
                if (ephemeral && ephemeral.activeCrew.some(ac => ac.id === c.id)) return false;
                if (rarities.length && !rarities.includes(c.max_rarity)) return false;
                return true;
            })
            .sort((a, b) => {
                let acount = (playerData?.player?.character?.crew.filter(f => f.symbol === a.symbol)).length;
                let bcount = (playerData?.player?.character?.crew.filter(f => f.symbol === a.symbol)).length;
                return a.max_rarity - b.max_rarity || a.rarity - b.rarity || acount - bcount || a.level - b.level || a.ranks.scores.overall - b.ranks.scores.overall;
            })
            .reverse();
    }, [playerData, ephemeral, data, filters, rarities]);


    if (!workData) {
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
                        column: 'rarity',
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
                <Button
                    active={filters.includes(0)}
                    style={{ width: '32px', padding: 4 }}
                    onClick={() => toggleFilter(0)}
                    color={filters.includes(0) ? 'blue' : undefined}
                    >
                    <img src={`/media/voyage.png`} style={{ height: '24px', alignSelf: 'flex-end' }} />
                </Button>
                <Button
                    active={filters.includes(1)}
                    style={{ width: '32px', padding: 4 }}
                    onClick={() => toggleFilter(1)}
                    color={filters.includes(1) ? 'blue' : undefined}
                    >
                    <img src={`/media/gauntlet.png`} style={{ height: '24px', alignSelf: 'flex-end' }} />
                </Button>
                <Button
                    active={filters.includes(2)}
                    style={{ width: '32px', padding: 4 }}
                    onClick={() => toggleFilter(2)}
                    color={filters.includes(2) ? 'blue' : undefined}
                    >
                    <img src={`/media/faction.png`} style={{ height: '24px', alignSelf: 'flex-end' }} />
                </Button>
                <Button
                    style={{ width: '32px', padding: 4 }}
                    onClick={() => navigate('/cite-opt')}
                    >
                        <img src={`${process.env.GATSBY_ASSETS_URL}atlas/star_reward.png`} style={{ height: '24px', alignSelf: 'flex-end' }} />
                </Button>
                <Button
                    style={{ width: '32px', padding: 4 }}
                    onClick={() => navigate('/retrieval')}
                    >
                        <img src={`/media/retrieval.png`} style={{ height: '24px', alignSelf: 'flex-end' }} />
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
                            targetGroup="event_info"
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
                    <Rating icon='star' maxRating={row.max_rarity} rating={row.rarity} />
                </Table.Cell>
                <Table.Cell>
                    {row.level}
                </Table.Cell>
                <Table.Cell>
                    {renderMainDataScore(row, true)}
                </Table.Cell>
            </Table.Row>
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