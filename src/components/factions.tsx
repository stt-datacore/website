import React, { PureComponent } from 'react';
import { Table, Image, Dropdown } from 'semantic-ui-react'
import { Faction } from '../model/player';
import { GlobalContext } from '../context/globalcontext';
import { IConfigSortData, IResultSortDataBy, sortDataBy } from '../utils/datasort';

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

const oddsValues = [14].concat(Array.from({length: 9}, (_, i) => (i+3)*5));

type ShuttleInfoProps =  {
};

type ShuttleInfoState = {
  column: string | null;
  direction?: 'ascending' | 'descending';
  data: Faction[];
  originals: Faction[];
  successOdds: number;
  shuttleBays: number;
};

class FactionInfo extends PureComponent<ShuttleInfoProps, ShuttleInfoState> {
  static contextType = GlobalContext;
  declare context: React.ContextType<typeof GlobalContext>;
  inited: boolean = false;

  constructor(props) {
    super(props);

    this.state = {
      column: null,
      direction: undefined,
      data: [],
      originals: [],
      successOdds: oddsValues[0],
      shuttleBays: 0
    };
  }

  componentDidMount() {
    this.initData();
  }

  componentDidUpdate(prevProps: Readonly<ShuttleInfoProps>, prevState: Readonly<ShuttleInfoState>, snapshot?: any): void {
    this.initData();
  }

  initData() {
    if (this.inited) return;

    if (!this.context.player.playerData) return;
    const { factions, shuttle_bays } = this.context.player.playerData.player.character;

    this.inited = true;
    this.setState({
      data: factions,
      originals: factions,
      shuttleBays: shuttle_bays
    });
  }

  _reputations(score) {
    if (score >= 980)
      return 'Honoured';
    else if (score >= 140)
      return 'Allied';
    else if (score >= -450)
      return 'Friendly';
    else if (score >= -790)
      return 'Neutral';
    else if (score >= -950)
      return 'Hostile';
    else
      return 'Despised';
  }

  _shuttlesToHonouredStatus(currentRep) {
    let reputation = currentRep;
    let shuttles = 0;

    while (reputation <= 38) {
      if (reputation >= 32)
        reputation += 8;
      else
        reputation += 5;

      ++shuttles;
    }

    return Math.max(0, shuttles + Math.ceil((980-reputation)/10));
  }

  _formatTime(hours) {
    let retVal = hours >= 24 ? `${Math.floor(hours/24)} days ` : ''
    return retVal + `${hours%24} hours`
  }

  _expectedCSA(odds) {
    return (1-odds)*3 - odds*2;
  }

  _nextSort(currentValue) {
    const values : ('descending' | 'ascending' | undefined)[] = ['ascending', 'descending', undefined];
    const currentIndex = values.indexOf(currentValue);
    const nextIndex = (currentIndex + 1) % values.length;
    return values[nextIndex];
  }

  _handleSort(clickedColumn, field) {
    const { column, direction } = this.state;
    const clickedDirection = this._nextSort(clickedColumn === column ? direction : undefined);

    let data;
    if (clickedDirection == null) {
      data = this.state.originals;
    } else {
      const sortDirection = clickedColumn.startsWith('-') ?
        (clickedDirection === "ascending" ? "descending" : "ascending") : clickedDirection;

      data = sortDataBy([...this.state.data], {
        field: field,
        direction: sortDirection
      }).result;
    }

    this.setState({
      column: clickedColumn,
      direction: clickedDirection,
      data: data
    });
  }

  render() {
    if (!this.inited) return <></>;

    const { column, direction, data, shuttleBays, successOdds } = this.state;
    const updateSuccessOdds = (odds: number) => this.setState({successOdds: odds});

    return (
      <>
        <p><span>Running shuttles at average odds of </span>
          <Dropdown text={`${successOdds}%`}>
            <Dropdown.Menu>
              {oddsValues.map(val => (<Dropdown.Item onClick={(e, { value }) => updateSuccessOdds(value as number)} text={`${val}%`} value={val} />))}
            </Dropdown.Menu>
          </Dropdown>
        </p>
        <p>(Note: Shuttles cannot be run with a probability of success less than 14%. Shuttles need a probability of less than 60% to be tanked.)</p>
        <Table sortable striped>
          <Table.Header>
          <Table.Row>
            <Table.HeaderCell
              sorted={column === 'faction' ? direction : undefined}
              onClick={() => this._handleSort('faction', 'name')}
            >
              Faction
            </Table.HeaderCell>
            <Table.HeaderCell
              sorted={column === 'reputation' ? direction : undefined}
              onClick={() => this._handleSort('reputation', 'reputation')}
            >Reputation</Table.HeaderCell>
            <Table.HeaderCell
              sorted={column === 'honor_shuttles' ? direction : undefined}
              onClick={() => this._handleSort('honor_shuttles', 'reputation')}
            >Shuttles to honored</Table.HeaderCell>
            <Table.HeaderCell
              sorted={column === 'honor_time' ? direction : undefined}
              onClick={() => this._handleSort('honor_time', 'reputation')}
            >Time needed</Table.HeaderCell>
            <Table.HeaderCell
              sorted={column === '-tank_shuttles' ? direction : undefined}
              onClick={() => this._handleSort('-tank_shuttles', 'completed_shuttle_adventures')}
            >Shuttles to tank</Table.HeaderCell>
            <Table.HeaderCell
              sorted={column === '-tank_time' ? direction : undefined}
              onClick={() => this._handleSort('-tank_time', 'completed_shuttle_adventures')}
            >Time needed</Table.HeaderCell>
          </Table.Row>
          </Table.Header>
          <Table.Body>
          {data.map((faction, index) => {
            let shuttlesNeededToMaxRep = this._shuttlesToHonouredStatus(faction.reputation);
            let hoursNeededToMaxRep = Math.ceil(shuttlesNeededToMaxRep/shuttleBays)*3;
            let shuttlesNeededToTank = Math.ceil(faction.completed_shuttle_adventures/this._expectedCSA(successOdds/100));
            let hoursNeededToTank = Math.ceil(shuttlesNeededToTank/shuttleBays)*3;

            return (
              <Table.Row key={index}>
                <Table.Cell><span><Image floated='left' size='mini' src={`${process.env.GATSBY_ASSETS_URL}icons_icon_faction_${factionImageLocations[faction.id]}.png`} />{faction.name}</span></Table.Cell>
                <Table.Cell>{this._reputations(faction.reputation)}</Table.Cell>
                <Table.Cell>
                  {faction.reputation < 980 && <p>{shuttlesNeededToMaxRep} successful missions</p>}
                </Table.Cell>
                <Table.Cell>
                  {faction.reputation < 980 && <p>{this._formatTime(hoursNeededToMaxRep)}</p>}
                </Table.Cell>
                <Table.Cell>
                  {shuttlesNeededToTank > 0 && <p>{shuttlesNeededToTank} shuttles to tank</p>}
                  {shuttlesNeededToTank == 0 && <p>Already tanked</p>}
                </Table.Cell>
                <Table.Cell>
                  {shuttlesNeededToTank > 0 && <p>{this._formatTime(hoursNeededToTank)}</p>}
                </Table.Cell>
              </Table.Row>
            );
          })}
          </Table.Body>
        </Table>
        <p>Note: <a href="https://www.reddit.com/r/StarTrekTimelines/comments/aq5qzg/guide_tanked_shuttles_why_and_how/">Tanking</a> shuttles is the process of deliberately failing shuttles so that the difficulty and duration of shuttle missions go down.</p>
      </>
    );
  }
}

export default FactionInfo;
