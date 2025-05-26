import React from "react"
import { GlobalContext } from "../../context/globalcontext";
import { Achiever, CapAchiever, CapAchievers, CrewMember } from "../../model/crew";
import { Button, Checkbox, Icon, Message, Popup, Table } from "semantic-ui-react";
import { ITableConfigRow, SearchableTable } from "../searchabletable";
import { ProfileData } from "../../model/fleet";
import { OptionsPanelFlexColumn, OptionsPanelFlexRow } from "../stats/utils";
import { AvatarView } from "../item_presenters/avatarview";
import { CrewHoverStat } from "../hovering/crewhoverstat";
import { getIconPath } from "../../utils/assets";
import { Filter } from "../../model/game-elements";
import { omniSearchFilter } from "../../utils/omnisearch";
import { useStateWithStorage } from "../../utils/storage";
import { DEFAULT_MOBILE_WIDTH } from "../hovering/hoverstat";

type AchieverDetails = Achiever & {
    dbid?: string,
    total?: number;
    crew?: CrewMember;
    avatar?: string;
}

type AchieverStat = {
    player_name: string;
    dbid?: string;
    total: number;
    date: Date;
    avatar?: string;
    ftms: CrewMember[];
}

export const FTMHof = () => {
    const flexCol = OptionsPanelFlexColumn;
    const flexRow = OptionsPanelFlexRow;

    const globalContext = React.useContext(GlobalContext);
    const { t } = globalContext.localized;
    const { crew, ftm_log } = globalContext.core;
    const cached_log = ftm_log as AchieverDetails[];

    const [refreshInc, setRefreshInc] = React.useState(0);
    const [data, setData] = React.useState([] as AchieverDetails[]);
    const [error, setError] = React.useState('');
    const [groupBy, setGroupBy] = useStateWithStorage<string>(`ftm_hof/group_by`, '', { rememberForever: true });

    const [initSearch, setInitSearch] = React.useState<string | undefined>(undefined);

    React.useEffect(() => {
        if (typeof window !== 'undefined' && !!data?.length && !!document.location.search) {
            let parms = new URLSearchParams(document.location.search);
            let player = parms.get('player');
            let crew = parms.get('crew');
            if (player) {
                if (Number.isNaN(Number(player))) {
                    player = decodeURIComponent(player);
                    setInitSearch(player);
                    setGroupBy('');
                }
                else {
                    let info = data.find(f => f.dbid == player);
                    if (info?.player_name) {
                        setInitSearch(info.player_name);
                        setGroupBy('');
                    }
                    else {
                        player = null;
                    }
                }
            }
            else if (crew) {
                if (Number.isNaN(Number(crew))) {
                    crew = decodeURIComponent(crew);
                    setInitSearch(crew);
                    setGroupBy('');
                }
                else {
                    let info = data.find(f => f.crew_archetype_id == Number(crew));
                    if (info?.player_name) {
                        setInitSearch(info.player_name);
                        setGroupBy('');
                    }
                    else {
                        crew = null;
                    }
                }
            }
            if (player || crew) {
                window.history.replaceState({}, document.title, "/ftmhof");
            }
        }
    }, [data]);

    React.useEffect(() => {
        let ach_res: AchieverDetails[] | null = null;
        fetch(`${process.env.GATSBY_DATACORE_URL}api/cap-achievers`)
            .then(response => response.json())
            .then((input: Achiever[] | null) => {
                if (!input?.length) input = cached_log;
                const players = [...new Set(input.map(d => d.player_name))];
                ach_res = input;
                return fetch(`${process.env.GATSBY_DATACORE_URL}api/players-by-name`, {
                    method: 'POST',
                    headers: {
                        "Content-type": "application/json"
                    },
                    body: JSON.stringify({ players })
                });
            })
            .then((result) => result.json())
            .then((players: ProfileData[]) => {
                const counts = {} as any;
                const newftms = !ach_res ? [] : ach_res.map((ftm) => {
                    let c = crew.find(f => f.archetype_id === ftm.crew_archetype_id);
                    if (c) {
                        ftm = {
                            ...ftm,
                            crew_name: c.name,
                            crew_rarity: c.max_rarity,
                            crew_symbol: c.symbol,
                            crew_url: c.imageUrlPortrait,
                            crew: c
                        }
                    }
                    ftm.date = new Date(ftm.date);
                    let p = players.find(player => player.captainName.toLowerCase() == ftm.player_name.toLowerCase());
                    if (p) {
                        ftm.dbid = p.dbid;
                        if (p.metadata.crew_avatar?.icon) {
                            if (typeof p.metadata.crew_avatar.icon === 'string') {
                                ftm.avatar = p.metadata.crew_avatar.icon;
                            }
                            else {
                                ftm.avatar = getIconPath(p.metadata.crew_avatar.icon, true);
                            }
                        }
                        else if (p.metadata.crew_avatar?.full_body) {
                            if (typeof p.metadata.crew_avatar.full_body === 'string') {
                                ftm.avatar = p.metadata.crew_avatar.full_body;
                            }
                            else {
                                ftm.avatar = getIconPath(p.metadata.crew_avatar.full_body, true);
                            }
                        }
                        else if (p.metadata.crew_avatar?.portrait) {
                            if (typeof p.metadata.crew_avatar.portrait === 'string') {
                                ftm.avatar = p.metadata.crew_avatar.portrait;
                            }
                            else {
                                ftm.avatar = getIconPath(p.metadata.crew_avatar.portrait, true);
                            }
                        }
                    }
                    counts[ftm.player_name] ??= 0;
                    counts[ftm.player_name]++;
                    return ftm;
                });
                for (let ftm of newftms) {
                    ftm.total = counts[ftm.player_name];
                }
                newftms.sort((a, b) => b.date.getTime() - a.date.getTime());
                setData(newftms);
            })
            .catch((e: any) => {
                setError((e?.toString()))
            });
    }, [cached_log, refreshInc]);

    if (error) {
        return (
            <Message negative>
                <Message.Header>
                    {t('global.error')}
                </Message.Header>
                <Message.Content>
                    {error}
                </Message.Content>
            </Message>
        )
    }

    const tableConfig = React.useMemo(() => {
        if (groupBy === 'player') {
            return [
                { width: 1, column: 'player_name', title: t('ftm.columns.player') },
                {
                    width: 1, column: 'crew', title: t('ftm.columns.crew'),
                    customCompare: (a: AchieverStat, b: AchieverStat) => {
                        let r = 0;
                        if (!r) r = a.ftms[0].date_added.getTime() - b.ftms[0].date_added.getTime();
                        if (!r) r = a.ftms.length - b.ftms.length;
                        return r;
                    },
                    reverse: true
                },
                { width: 1, column: 'date', title: t('ftm.columns.date'), reverse: true },
                { width: 1, column: 'total', title: t('ftm.columns.total'), reverse: true },
            ] as ITableConfigRow[];
        }
        else {
            return [
                { width: 1, column: 'player_name', title: t('ftm.columns.player') },
                { width: 1, column: 'crew_name', title: t('ftm.columns.crew') },
                { width: 1, column: 'date', title: t('ftm.columns.date'), reverse: true },
                { width: 1, column: 'total', title: t('ftm.columns.total'), reverse: true },
            ] as ITableConfigRow[];
        }
    }, [groupBy]);

    const dataSet = React.useMemo(() => {
        if (!data?.length) return [];
        if (!groupBy) return data;
        else return createAchieverStats(data);
    }, [data, groupBy]);

    if (!dataSet?.length) {
        return <div style={{ ...flexCol }}>
            <h4>{globalContext.core.spin(t('spinners.default'))}</h4>
        </div>
    }
    const isMobile = typeof window !== 'undefined' && window.innerWidth < DEFAULT_MOBILE_WIDTH;

    return (<React.Fragment>
        <SearchableTable
            data={dataSet}
            config={tableConfig}
            filterRow={filterRow}
            renderTableRow={renderTableRow}
            initOptions={{
                search: initSearch
            }}
            extraSearchContent={
                <div style={{ ...flexRow, flexGrow: 1, justifyContent: isMobile ? 'flex-start' : 'flex-end', gap: '0.5em' }}>
                    <Popup
                        openOnTriggerClick={true}
                        openOnTriggerFocus={false}
                        openOnTriggerMouseEnter={false}
                        trigger={
                            <Button icon='clipboard' onClick={() => copyFTMCells(data)} />
                        }
                        content={t('clipboard.copied_exclaim')}
                    />

                    <Button icon='refresh' onClick={refreshFTM} />
                    <Checkbox label={t('ftm.group_by_player')}
                        checked={groupBy === 'player'}
                        onChange={(e, { checked }) => {
                            if (checked) {
                                setGroupBy('player');
                            }
                            else {
                                setGroupBy('');
                            }
                        }}
                    />
                </div>}
        />
        <CrewHoverStat targetGroup="ftm_hof" />
    </React.Fragment>)

    function filterRow(row: AchieverDetails | AchieverStat, filter: Filter[], filterType?: string) {
        if (!groupBy) {
            return omniSearchFilter(row, filter, filterType,
                [
                    'crew_name',
                    'player_name',
                    {
                        field: 'crew',
                        customMatch: (crew: CrewMember | undefined, text) => {
                            if (!crew) return false;
                            text = text.toLowerCase();
                            return crewMatches(crew, text);
                        }
                    }
                ]
            );
        }
        else {
            return omniSearchFilter(row, filter, filterType,
                [
                    'player_name',
                    {
                        field: 'ftms',
                        customMatch: (data: CrewMember[], text) => {
                            text = text.toLowerCase();
                            return data.some(c => crewMatches(c, text));
                        }
                    }
                ]);
        }
    }

    function renderTableRow(row: AchieverDetails | AchieverStat, idx?: number) {

        if ("ftms" in row) {
            return (<Table.Row>
                <Table.Cell>
                    <div style={{ ...flexRow, justifyContent: 'flex-start', gap: '1em', fontWeight: 'bold', fontSize: '1.2em' }}>
                        {!!row.avatar && <img style={{ height: '48px' }} src={`${process.env.GATSBY_ASSETS_URL}${row.avatar}`} />}
                        {!!row.dbid && <a href={`/profile?dbid=${row.dbid}`}>{row.player_name}</a>}
                        {!row.dbid && <>{row.player_name}</>}
                    </div>
                </Table.Cell>
                <Table.Cell>
                    <div style={{ ...flexRow, gap: '0.5em' }}>
                        <div>
                            <Popup
                                openOnTriggerClick={true}
                                openOnTriggerFocus={false}
                                openOnTriggerMouseEnter={false}
                                trigger={
                                    <Button style={{ padding: '1em' }} onClick={() => copyPlayerCells(row)}><Icon name='clipboard' style={{ margin: 0 }} /></Button>
                                }
                                content={t('clipboard.copied_exclaim')}
                            />
                        </div>
                        <div style={{ maxHeight: '7em', overflowY: 'auto', flexGrow: 1 }}>
                            <Table striped compact>
                                {row.ftms.map(ftm => {
                                    return (
                                        <Table.Row key={`${row.player_name}_${ftm.symbol}`}>
                                            <Table.Cell width={1}>
                                                <AvatarView
                                                    targetGroup="ftm_hof"
                                                    mode='crew'
                                                    item={ftm}
                                                    size={32}
                                                />
                                            </Table.Cell>
                                            <Table.Cell style={{ textAlign: 'left' }}>
                                                {ftm.name}
                                            </Table.Cell>
                                        </Table.Row>
                                    )
                                })}
                            </Table>
                        </div>

                    </div>
                </Table.Cell>
                <Table.Cell>
                    {row.date.toLocaleString()}
                </Table.Cell>
                <Table.Cell>
                    {row.total?.toLocaleString()}
                </Table.Cell>
            </Table.Row>)
        }
        else {
            return (<Table.Row>
                <Table.Cell>
                    <div style={{ ...flexRow, justifyContent: 'flex-start', gap: '1em', fontWeight: 'bold', fontSize: '1.2em' }}>
                        {!!row.avatar && <img style={{ height: '48px' }} src={`${process.env.GATSBY_ASSETS_URL}${row.avatar}`} />}
                        {!!row.dbid && <a href={`/profile?dbid=${row.dbid}`}>{row.player_name}</a>}
                        {!row.dbid && <>{row.player_name}</>}
                    </div>
                </Table.Cell>
                <Table.Cell>
                    <div style={{ ...flexRow, justifyContent: 'flex-start', gap: '0.5em', margin: '0.5em' }}>
                        <AvatarView
                            targetGroup="ftm_hof"
                            mode='crew'
                            item={row.crew}
                            size={48}
                        />
                        {row.crew_name}
                    </div>
                </Table.Cell>
                <Table.Cell>
                    {row.date.toLocaleString()}
                </Table.Cell>
                <Table.Cell>
                    {row.total?.toLocaleString()}
                </Table.Cell>
            </Table.Row>)
        }
    }

    function createAchieverStats(data: AchieverDetails[]) {
        const statidx = {} as { [key: string]: AchieverStat }
        for (let d of data) {
            if (!d.player_name || !d.total || !d.crew) continue;
            statidx[d.player_name] ??= {
                dbid: d.dbid,
                avatar: d.avatar,
                ftms: [],
                total: d.total!,
                player_name: d.player_name,
                date: d.date
            }
            statidx[d.player_name].ftms.push(d.crew);
            d.crew.cap_achiever = {
                name: d.player_name,
                date: Math.ceil(d.date.getTime() / 1000)
            }
            if (d.date.getTime() > statidx[d.player_name].date.getTime()) {
                statidx[d.player_name].date = d.date;
            }
        }
        return Object.values(statidx).map(ftm => {
            ftm.ftms.sort((a, b) => b.date_added.getTime() - a.date_added.getTime())
            return ftm;
        });
    }

    function generatePlayerAchievements(data: AchieverStat) {
        let d = [] as string[];
        d.push('<table>');
        d.push('<thead><tr><td>Image</td><td>Name</td><td>FTM Date</td></thead>');
        d.push('<tbody>');

        data.ftms.forEach((crew) => {
            d.push(`<tr>
                <td>
                <img src="${process.env.GATSBY_ASSETS_URL}${crew.imageUrlPortrait}" height=48 style="height: 48px">
                </td>
                <td>
                ${crew.name}
                </td>
                <td>
                ${(new Date(crew.cap_achiever!.date * 1000)).toLocaleString()}
                </td>
                </tr>`)
        })
        d.push('</tbody></table>');
        return d.join("");
    }

    function generateFTMTable(data: AchieverDetails[]) {
        let d = [] as string[];
        d.push('<table>');
        d.push('<thead><tr><td>Player Avatar</td><td>Player</td><td>Image</td><td>Name</td><td>FTM Date</td></thead>');
        d.push('<tbody>')

        data.forEach(row => {
            let atext = '';
            if (row.avatar) {
                atext = `<img style="height: 48px" height=48 src="${process.env.GATSBY_ASSETS_URL}${row.avatar}" />`;
            }
            if (!row.crew) {
                row.crew = globalContext.core.crew.find(f => f.archetype_id === row.crew_archetype_id);
                if (!row.crew) return;
            }
            d.push(`<tr>
                    <td>${atext}</td>
                    <td>${row.player_name}</td>
                    <td>
                        <img style="height: 48px" height=48 src="${process.env.GATSBY_ASSETS_URL}${row.crew!.imageUrlPortrait}" />
                    </td>
                    <td>${row.crew!.name}</td>
                    <td>${row.date.toLocaleString()}</td>
                </tr>`);
        });
        d.push('</tbody></table>');
        return d.join("");
    }

    function copyPlayerCells(data: AchieverStat) {
        if (typeof navigator !== 'undefined' && typeof document !== 'undefined') {
            const blob = new Blob([generatePlayerAchievements(data)], { type: 'text/html' });
            navigator.clipboard.write([
                new ClipboardItem({
                    [blob.type]: blob
                })
            ]);
        }
    }


    function copyFTMCells(data: AchieverDetails[]) {
        if (typeof navigator !== 'undefined' && typeof document !== 'undefined') {
            const blob = new Blob([generateFTMTable(data)], { type: 'text/html' });
            navigator.clipboard.write([
                new ClipboardItem({
                    [blob.type]: blob
                })
            ]);
        }
    }

    function refreshFTM() {
        setRefreshInc(refreshInc + 1);
    }

    function crewMatches(c: CrewMember, text: string) {
        return c.name.toLowerCase().includes(text) ||
            c.flavor.toLowerCase().includes(text) ||
            c.name_english?.toLowerCase().includes(text) ||
            c.traits_named?.some(t => t.toLowerCase().includes(text))
    }
}