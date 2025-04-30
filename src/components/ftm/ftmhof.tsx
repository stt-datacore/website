import React from "react"
import { GlobalContext } from "../../context/globalcontext";
import { Achiever, CapAchiever, CapAchievers, CrewMember } from "../../model/crew";
import { Message, Table } from "semantic-ui-react";
import { ITableConfigRow, SearchableTable } from "../searchabletable";
import { ProfileData } from "../../model/fleet";
import { OptionsPanelFlexColumn, OptionsPanelFlexRow } from "../stats/utils";
import { AvatarView } from "../item_presenters/avatarview";
import { CrewHoverStat } from "../hovering/crewhoverstat";
import { getIconPath } from "../../utils/assets";
import { Filter } from "../../model/game-elements";
import { omniSearchFilter } from "../../utils/omnisearch";

type AchieverDetails = Achiever & {
    dbid?: string,
    total?: number;
    crew?: CrewMember;
    avatar?: string;
}

export const FTMHof = () => {
    const flexCol = OptionsPanelFlexColumn;
    const flexRow = OptionsPanelFlexRow;

    const globalContext = React.useContext(GlobalContext);
    const { t } = globalContext.localized;
    const { crew, ftm_log } = globalContext.core;
    const input = ftm_log as AchieverDetails[];

    const [refreshCounter, setRefreshCounter] = React.useState(0);
    const [data, setData] = React.useState([] as AchieverDetails[]);
    const [error, setError] = React.useState('');

    React.useEffect(() => {
        if (!input) return;
        const players = [...new Set(input.map(d => d.player_name)) ];
        fetch(`${process.env.GATSBY_DATACORE_URL}api/players-by-name`, {
            method: 'POST',
            headers: {
                "Content-type": "application/json"
            },
            body: JSON.stringify({ players })
        })
        .then((result) => result.json())
        .then((players: ProfileData[]) => {
            const counts = {} as any;
            const newftms = input.map((ftm) => {
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
            setData(newftms);
        })
        .catch((e: any) => {
            setError((e?.toString()))
        });
    }, [input]);

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

    const tableConfig = [
        { width: 1, column: 'player_name', title: t('ftm.columns.player') },
        { width: 1, column: 'crew_name', title: t('ftm.columns.crew') },
        { width: 1, column: 'date', title: t('ftm.columns.date'), reverse: true },
        { width: 1, column: 'total', title: t('ftm.columns.total'), reverse: true },
    ] as ITableConfigRow[];

    if (!data?.length) {
        return <div style={{...flexCol}}>
            <h4>{globalContext.core.spin(t('spinners.default'))}</h4>
        </div>
    }

    return (<React.Fragment>
        <SearchableTable
            data={data}
            config={tableConfig}
            filterRow={filterRow}
            renderTableRow={renderTableRow}
            />
            <CrewHoverStat targetGroup="ftm_hof" />
    </React.Fragment>)

    function filterRow(row: AchieverDetails, filter: Filter[], filterType?: string) {

        return omniSearchFilter(row, filter, filterType, ['crew_name', 'player_name']);
    }

    function renderTableRow(row: AchieverDetails, idx?: number) {

        return (<Table.Row>
            <Table.Cell>
                <div style={{...flexRow, justifyContent: 'flex-start', gap: '1em', fontWeight: 'bold', fontSize: '1.2em'}}>
                    {!!row.avatar && <img style={{height: '48px'}} src={`${process.env.GATSBY_ASSETS_URL}${row.avatar}`} />}
                    {!!row.dbid && <a href={`/profile?dbid=${row.dbid}`}>{row.player_name}</a>}
                    {!row.dbid && <>{row.player_name}</>}
                </div>
            </Table.Cell>
            <Table.Cell>
                <div style={{...flexRow, justifyContent: 'flex-start', gap: '0.5em', margin: '0.5em'}}>
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

    function refresh() {
        setError('');
        setRefreshCounter(refreshCounter + 1);
    }

    function avatarPortrait(symbol: string) {
        if (symbol.includes("avatar")) {
            return `crew_icons_cm_${symbol.replace("avatar_", "").replace("_crew", "")}_avatar_icon.png`;
        }
        else {
            return `crew_icons_cm_${symbol.replace("_crew", "")}_icon.png`;
        }
    }
}