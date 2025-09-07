import React, { PureComponent } from 'react';
import { Table, Image, Dropdown } from 'semantic-ui-react'
import { Faction } from '../model/player';
import { GlobalContext } from '../context/globalcontext';
//import { IConfigSortData, IResultSortDataBy, sortDataBy } from '../utils/datasort';
import { ITableConfigRow, SearchableTable } from './searchabletable';
import { Filter } from '../model/game-elements';
import { formatTime } from '../utils/itemutils';
import { omniSearchFilter } from '../utils/omnisearch';

type TankingFaction = Faction & { honor_shuttles: number, honor_time: number, tank_shuttles: number, tank_time: number };

const factionImageLocations = {
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
    const { playerData } = globalContext.player;
    const [successOdds, setSuccessOdds] = React.useState(14);

    const { data, shuttleBays } = React.useMemo(() => {
        if (!playerData) return { data: [], shuttleBays: 1 };
        let data = JSON.parse(JSON.stringify(playerData.player.character.factions)) as TankingFaction[];
        let shuttleBays = playerData?.player.character.shuttle_bays || 1;
        data.forEach(faction => {
            let shuttlesNeededToMaxRep = shuttlesToHonouredStatus(faction.reputation);
            let hoursNeededToMaxRep = Math.ceil(shuttlesNeededToMaxRep / shuttleBays) * 3;
            let shuttlesNeededToTank = Math.ceil(faction.completed_shuttle_adventures / expectedCSA(successOdds / 100));
            let hoursNeededToTank = Math.ceil(shuttlesNeededToTank / shuttleBays) * 3;
            faction.honor_shuttles = shuttlesNeededToMaxRep;
            faction.tank_shuttles = shuttlesNeededToTank;
            faction.honor_time = hoursNeededToMaxRep * (60 * 60 * 1000);
            faction.tank_time = hoursNeededToTank * (60 * 60 * 1000);
        });
        return { data, shuttleBays };
    }, [playerData, successOdds]);

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
                    let f = reputation(value);
                    return f.toLowerCase().includes(text.toLowerCase());
                }
            }
        ]);
        //return true;
    }

    function renderTableRow(faction: TankingFaction, index?: number) {

        return (
            <Table.Row key={index}>
                <Table.Cell><span><Image floated='left' size='mini' src={`${process.env.GATSBY_ASSETS_URL}icons_icon_faction_${factionImageLocations[faction.id]}.png`} />{faction.name}</span></Table.Cell>
                <Table.Cell>{reputation(faction.reputation)}</Table.Cell>
                <Table.Cell>
                    {faction.reputation < 980 && <p>{t('n_successful_missions', { n: faction.honor_shuttles })}</p>}
                    {faction.reputation >= 980 && <p>{t('already_honored')}</p>}
                </Table.Cell>
                <Table.Cell>
                    {faction.reputation < 980 && <p>{formatTime(faction.honor_time, globalContext.localized.t)}</p>}
                    {faction.reputation >= 980 && <p>{globalContext.localized.t('global.na')}</p>}
                </Table.Cell>
                <Table.Cell>
                    {faction.tank_shuttles > 0 && <p>{t('n_shuttles_to_tank', { n: faction.tank_shuttles })}</p>}
                    {faction.tank_shuttles == 0 && <p>{t('already_tanked')}</p>}
                </Table.Cell>
                <Table.Cell>
                    {faction.tank_shuttles > 0 && <p>{formatTime(faction.tank_time, globalContext.localized.t)}</p>}
                    {faction.tank_shuttles == 0 && <p>{globalContext.localized.t('global.na')}</p>}
                </Table.Cell>
            </Table.Row>
        );
    }


    function reputation(score: number) {
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

// type ShuttleInfoState = {
//     column: string | null;
//     direction?: 'ascending' | 'descending';
//     data: Faction[];
//     originals: Faction[];
//     successOdds: number;
//     shuttleBays: number;
// };

// class FactionInfoOld extends PureComponent<ShuttleInfoProps, ShuttleInfoState> {
//     static contextType = GlobalContext;
//     declare context: React.ContextType<typeof GlobalContext>;
//     inited: boolean = false;

//     constructor(props) {
//         super(props);

//         this.state = {
//             column: null,
//             direction: undefined,
//             data: [],
//             originals: [],
//             successOdds: oddsValues[0],
//             shuttleBays: 0
//         };
//     }

//     componentDidMount() {
//         this.initData();
//     }

//     componentDidUpdate(prevProps: Readonly<ShuttleInfoProps>, prevState: Readonly<ShuttleInfoState>, snapshot?: any): void {
//         this.initData();
//     }

//     initData() {
//         //if (this.inited) return;

//         if (!this.context.player.playerData) return;
//         const { factions, shuttle_bays } = this.context.player.playerData.player.character;

//         this.inited = true;
//         this.setState({
//             data: factions,
//             originals: factions,
//             shuttleBays: shuttle_bays
//         });
//     }

//     _reputations(score) {
//         if (score >= 980)
//             return 'Honoured';
//         else if (score >= 140)
//             return 'Allied';
//         else if (score >= -450)
//             return 'Friendly';
//         else if (score >= -790)
//             return 'Neutral';
//         else if (score >= -950)
//             return 'Hostile';
//         else
//             return 'Despised';
//     }

//     _shuttlesToHonouredStatus(currentRep: number) {
//         let reputation = currentRep;
//         let shuttles = 0;

//         while (reputation <= 38) {
//             if (reputation >= 32)
//                 reputation += 8;
//             else
//                 reputation += 5;

//             ++shuttles;
//         }

//         return Math.max(0, shuttles + Math.ceil((980 - reputation) / 10));
//     }

//     _formatTime(hours) {
//         let retVal = hours >= 24 ? `${Math.floor(hours / 24)} days ` : ''
//         return retVal + `${hours % 24} hours`
//     }

//     _expectedCSA(odds) {
//         return (1 - odds) * 3 - odds * 2;
//     }

//     _nextSort(currentValue) {
//         const values: ('descending' | 'ascending' | undefined)[] = ['ascending', 'descending', undefined];
//         const currentIndex = values.indexOf(currentValue);
//         const nextIndex = (currentIndex + 1) % values.length;
//         return values[nextIndex];
//     }

//     _handleSort(clickedColumn, field) {
//         const { column, direction } = this.state;
//         const clickedDirection = this._nextSort(clickedColumn === column ? direction : undefined);

//         let data;
//         if (clickedDirection == null) {
//             data = this.state.originals;
//         } else {
//             const sortDirection = clickedColumn.startsWith('-') ?
//                 (clickedDirection === "ascending" ? "descending" : "ascending") : clickedDirection;

//             data = sortDataBy([...this.state.data], {
//                 field: field,
//                 direction: sortDirection
//             }).result;
//         }

//         this.setState({
//             column: clickedColumn,
//             direction: clickedDirection,
//             data: data
//         });
//     }

//     render() {
//         if (!this.inited) return <></>;

//         const { column, direction, data, shuttleBays, successOdds } = this.state;
//         const updateSuccessOdds = (odds: number) => this.setState({ successOdds: odds });

//         return (
//             <>
//                 <p><span>Running shuttles at average odds of </span>
//                     <Dropdown text={`${successOdds}%`}>
//                         <Dropdown.Menu>
//                             {oddsValues.map(val => (<Dropdown.Item onClick={(e, { value }) => updateSuccessOdds(value as number)} text={`${val}%`} value={val} />))}
//                         </Dropdown.Menu>
//                     </Dropdown>
//                 </p>
//                 <p>(Note: Shuttles cannot be run with a probability of success less than 14%. Shuttles need a probability of less than 60% to be tanked.)</p>
//                 <Table sortable striped>
//                     <Table.Header>
//                         <Table.Row>
//                             <Table.HeaderCell
//                                 sorted={column === 'faction' ? direction : undefined}
//                                 onClick={() => this._handleSort('faction', 'name')}
//                             >
//                                 Faction
//                             </Table.HeaderCell>
//                             <Table.HeaderCell
//                                 sorted={column === 'reputation' ? direction : undefined}
//                                 onClick={() => this._handleSort('reputation', 'reputation')}
//                             >Reputation</Table.HeaderCell>
//                             <Table.HeaderCell
//                                 sorted={column === 'honor_shuttles' ? direction : undefined}
//                                 onClick={() => this._handleSort('honor_shuttles', 'reputation')}
//                             >Shuttles to honored</Table.HeaderCell>
//                             <Table.HeaderCell
//                                 sorted={column === 'honor_time' ? direction : undefined}
//                                 onClick={() => this._handleSort('honor_time', 'reputation')}
//                             >Time needed</Table.HeaderCell>
//                             <Table.HeaderCell
//                                 sorted={column === '-tank_shuttles' ? direction : undefined}
//                                 onClick={() => this._handleSort('-tank_shuttles', 'completed_shuttle_adventures')}
//                             >Shuttles to tank</Table.HeaderCell>
//                             <Table.HeaderCell
//                                 sorted={column === '-tank_time' ? direction : undefined}
//                                 onClick={() => this._handleSort('-tank_time', 'completed_shuttle_adventures')}
//                             >Time needed</Table.HeaderCell>
//                         </Table.Row>
//                     </Table.Header>
//                     <Table.Body>
//                         {data.map((faction, index) => {
//                             let shuttlesNeededToMaxRep = this._shuttlesToHonouredStatus(faction.reputation);
//                             let hoursNeededToMaxRep = Math.ceil(shuttlesNeededToMaxRep / shuttleBays) * 3;
//                             let shuttlesNeededToTank = Math.ceil(faction.completed_shuttle_adventures / this._expectedCSA(successOdds / 100));
//                             let hoursNeededToTank = Math.ceil(shuttlesNeededToTank / shuttleBays) * 3;

//                             return (
//                                 <Table.Row key={index}>
//                                     <Table.Cell><span><Image floated='left' size='mini' src={`${process.env.GATSBY_ASSETS_URL}icons_icon_faction_${factionImageLocations[faction.id]}.png`} />{faction.name}</span></Table.Cell>
//                                     <Table.Cell>{this._reputations(faction.reputation)}</Table.Cell>
//                                     <Table.Cell>
//                                         {faction.reputation < 980 && <p>{shuttlesNeededToMaxRep} successful missions</p>}
//                                     </Table.Cell>
//                                     <Table.Cell>
//                                         {faction.reputation < 980 && <p>{this._formatTime(hoursNeededToMaxRep)}</p>}
//                                     </Table.Cell>
//                                     <Table.Cell>
//                                         {shuttlesNeededToTank > 0 && <p>{shuttlesNeededToTank} shuttles to tank</p>}
//                                         {shuttlesNeededToTank == 0 && <p>Already tanked</p>}
//                                     </Table.Cell>
//                                     <Table.Cell>
//                                         {shuttlesNeededToTank > 0 && <p>{this._formatTime(hoursNeededToTank)}</p>}
//                                     </Table.Cell>
//                                 </Table.Row>
//                             );
//                         })}
//                     </Table.Body>
//                 </Table>
//                 <p>Note: <a href="https://www.reddit.com/r/StarTrekTimelines/comments/aq5qzg/guide_tanked_shuttles_why_and_how/">Tanking</a> shuttles is the process of deliberately failing shuttles so that the difficulty and duration of shuttle missions go down.</p>
//             </>
//         );
//     }
// }

export default FactionInfo;
