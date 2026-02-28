import React from 'react';
import { Table, Image, Dropdown, Input, Button } from 'semantic-ui-react'
import { Faction } from '../model/player';
import { GlobalContext } from '../context/globalcontext';
import { ITableConfigRow, SearchableTable } from './searchabletable';
import { Filter } from '../model/game-elements';
import { formatTime } from '../utils/itemutils';
import { omniSearchFilter } from '../utils/omnisearch';
import { useStateWithStorage } from '../utils/storage';
import { OptionsPanelFlexRow } from './stats/utils';

type TankingFaction = Faction & { honor_shuttles: number, honor_time: number, tank_shuttles: number, tank_time: number };

export const factionImageLocations = {
    12: 'federation',
    1: 'klingon',
    8: 'bajoran',
    4: 'cardassian',
    5: 'maquis',
    3: 'ferengialliance',
    7: 'ferengitraditionalist',
    2: 'augments',
    13: 'romulan',
    11: 'terran',
    14: 'klingoncardassian',
    9: 'section31',
    10: 'hirogen',
    6: 'dominion',
    20: 'borg'
};

const oddsValues = [14].concat(Array.from({ length: 9 }, (_, i) => (i + 3) * 5));

type ShuttleInfoProps = {
};

const FactionInfo = (props: ShuttleInfoProps) => {

    const globalContext = React.useContext(GlobalContext);
    const { useT } = globalContext.localized;
    const { t, tfmt } = useT('factions');
    const { t: tg } = globalContext.localized;

    const { playerData } = globalContext.player;
    const shuttleBays = playerData?.player.character.shuttle_bays || 1;
    const dbidPrefix = (() => {
        if (playerData?.player.dbid) return `${playerData.player.dbid}/`;
        else return '';
    })();

    const [successOdds, setSuccessOdds] = useStateWithStorage(`${dbidPrefix}factions/success_odds`, 14, { rememberForever: true });
    const [shuttles, setShuttles] = useStateWithStorage<string | number | undefined>(`${dbidPrefix}factions/shuttles_per_day`, shuttleBays * 8, { rememberForever: true });

    const { data } = React.useMemo(() => {
        if (!playerData) return { data: [], shuttleBays: 0 };
        let data = structuredClone(playerData.player.character.factions) as TankingFaction[];
        data.forEach(faction => {
            let maxDaily = 8 * shuttleBays;
            let askDaily = maxDaily;
            if (shuttles && !Number.isNaN(Number(shuttles))) askDaily = Number(shuttles);
            if (!askDaily) askDaily = maxDaily;

            let shuttlesNeededToMaxRep = shuttlesToHonouredStatus(faction.reputation);
            let hoursNeededToMaxRep = Math.ceil(shuttlesNeededToMaxRep / shuttleBays) * 3;
            let shuttlesNeededToTank = Math.ceil(faction.completed_shuttle_adventures / expectedCSA(successOdds / 100));
            let hoursNeededToTank = (Math.ceil(shuttlesNeededToTank / shuttleBays) * 3);
            faction.honor_shuttles = shuttlesNeededToMaxRep;
            faction.tank_shuttles = shuttlesNeededToTank;
            if (askDaily !== maxDaily && shuttlesNeededToMaxRep > askDaily) {
                hoursNeededToMaxRep = Math.min(hoursNeededToMaxRep * (maxDaily / askDaily), shuttlesNeededToMaxRep * askDaily * 3);
            }
            faction.honor_time = hoursNeededToMaxRep * (60 * 60 * 1000);
            if (askDaily !== maxDaily && shuttlesNeededToTank > askDaily) {
                hoursNeededToTank = Math.min(hoursNeededToTank * (maxDaily / askDaily), shuttlesNeededToTank * askDaily * 3);
            }
            faction.tank_time = hoursNeededToTank * (60 * 60 * 1000);
        });
        return { data };
    }, [playerData, successOdds, shuttles]);

    React.useEffect(() => {
        if (shuttleBays && !shuttles) {
            setShuttles(shuttleBays * 8);
        }
    }, [shuttleBays]);

    const tableConfig = [
        { width: 2, title: t('columns.faction'), column: 'faction' },
        { width: 1, title: t('columns.reputation'), column: 'reputation', tiebreakers: ['reputation'] },
        { width: 1, title: t('columns.shuttles_to_honored'), column: 'honor_shuttles', tiebreakers: ['reputation'] },
        { width: 1, title: t('columns.time_needed'), column: 'honor_time', tiebreakers: ['reputation'] },
        { width: 1, title: t('columns.shuttles_to_tank'), column: 'tank_shuttles', reverse: true, tiebreakers: ['reputation'] },
        { width: 1, title: t('columns.time_needed'), column: 'tank_time', reverse: true, tiebreakers: ['reputation'] },
    ] as ITableConfigRow[];

    if (!playerData) {
        return <></>;
    }

    return (
        <>
            <p>
                <span>
                    {tfmt('average_odds_dropdown', {
                        dropdown: (
                            <Dropdown text={`${successOdds}%`}>
                                <Dropdown.Menu>
                                    {oddsValues.map(val => (<Dropdown.Item onClick={(e, { value }) => setSuccessOdds(value as number)} text={`${val}%`} value={val} />))}
                                </Dropdown.Menu>
                            </Dropdown>
                        )
                    })}
                </span>
            </p>
            <p>
                <span>
                    {tfmt('n_shuttles_per_day', {
                        n: (<>
                            <Input
                                style={{maxWidth: '6em', margin: '0 0.5em' }}
                                value={shuttles}
                                error={!shuttles || Number.isNaN(Number(shuttles)) || !Number(shuttles)}
                                onChange={(e) => {
                                    setShuttles(e.target.value as string | number);
                                }}
                            />

                            </>
                        )
                    })}
                </span>
                &nbsp;&nbsp;
                <Button
                    onClick={() => setShuttles(shuttleBays * 8)}
                    size='tiny'>{tg('global.reset')}</Button>
            </p>
            <p>{t('odds_note')}</p>
            <SearchableTable
                config={tableConfig}
                data={data}
                renderTableRow={renderTableRow}
                filterRow={filterRow}
                />
            <p>
                {tfmt('tanking_explain', {
                    tanking: (
                        <a href="https://www.reddit.com/r/StarTrekTimelines/comments/aq5qzg/guide_tanked_shuttles_why_and_how/">{t('tanking')}</a>
                    )
                })}
            </p>
        </>
    )

    function filterRow(faction: Faction, filter: Filter[], filterType?: string) {
        return omniSearchFilter(faction, filter, filterType, [
            'name',
            {
                field: 'reputation',
                customMatch: (value: number, text) => {
                    let f = getReputationText(value);
                    return f.toLowerCase().includes(text.toLowerCase());
                }
            }
        ]);
    }

    function renderTableRow(faction: TankingFaction, index?: number) {
        return (
            <Table.Row key={index}>
                <Table.Cell>
                    <div style={{...OptionsPanelFlexRow, justifyContent: 'flex-start', gap: '0.5em'}}>
                        <Image floated='left' size='mini' src={`${process.env.GATSBY_ASSETS_URL}icons_icon_faction_${factionImageLocations[faction.id]}.png`} />
                        {faction.name}
                    </div>
                </Table.Cell>
                <Table.Cell>{getReputationText(faction.reputation)}</Table.Cell>
                <Table.Cell>
                    {faction.reputation < 980 && <p>{t('n_successful_missions', { n: faction.honor_shuttles })}</p>}
                    {faction.reputation >= 980 && <p>{t('already_honored')}</p>}
                </Table.Cell>
                <Table.Cell>
                    {faction.reputation < 980 && <p>{formatTime(faction.honor_time, tg)}</p>}
                    {faction.reputation >= 980 && <p>{tg('global.na')}</p>}
                </Table.Cell>
                <Table.Cell>
                    {faction.tank_shuttles > 0 && <p>{t('n_shuttles_to_tank', { n: faction.tank_shuttles })}</p>}
                    {faction.tank_shuttles == 0 && <p>{t('already_tanked')}</p>}
                </Table.Cell>
                <Table.Cell>
                    {faction.tank_shuttles > 0 && <p>{formatTime(faction.tank_time, tg)}</p>}
                    {faction.tank_shuttles == 0 && <p>{tg('global.na')}</p>}
                </Table.Cell>
            </Table.Row>
        );
    }

    function getReputationText(score: number) {
        if (score >= 980)
            return t('reputation.honored');
        else if (score >= 140)
            return t('reputation.allied');
        else if (score >= -450)
            return t('reputation.friendly');
        else if (score >= -790)
            return t('reputation.neutral');
        else if (score >= -950)
            return t('reputation.hostile');
        else
            return t('reputation.despised');
    }

    function shuttlesToHonouredStatus(currentRep: number) {
        let reputation = currentRep;
        let shuttles = 0;

        while (reputation <= 38) {
            if (reputation >= 32)
                reputation += 8;
            else
                reputation += 5;

            ++shuttles;
        }

        return Math.max(0, shuttles + Math.ceil((980 - reputation) / 10));
    }

    function expectedCSA(odds) {
        return (1 - odds) * 3 - odds * 2;
    }
}

export default FactionInfo;
