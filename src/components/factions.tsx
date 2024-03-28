import React, { PureComponent } from 'react';
import { Table, Image, Dropdown } from 'semantic-ui-react'
import { Faction } from '../model/player';
import { GlobalContext } from '../context/globalcontext';

const factionImageLocations = [
  'federation',
  'klingon',
  'bajoran',
  'cardassian',
  'maquis',
  'ferengialliance',
  'ferengitraditionalist',
  'augments',
  'romulan',
  'terran',
  'klingoncardassian',
  'section31',
  'hirogen',
  'dominion',
  'borg'
];

const oddsValues = [14].concat(Array.from({length: 9}, (_, i) => (i+3)*5));

type ShuttleInfoProps =  {
};

type ShuttleInfoState = {
  successOdds: number;
};

class FactionInfo extends PureComponent<ShuttleInfoProps, ShuttleInfoState> {
  static contextType = GlobalContext;
  context!: React.ContextType<typeof GlobalContext>;

  constructor(props) {
    super(props);

    this.state = {
      successOdds: 14
    };
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

  render() {
    if (!this.context.player.playerData) return <></>;
    const { factions: factionInfo, shuttle_bays: shuttleBays } = this.context.player.playerData.player.character;
    const { successOdds } = this.state;
    const updateSuccessOdds = (odds: number) => this.setState({successOdds: odds});

    return (
      <>
        <p><span>Running shuttles at average odds of </span>
          <Dropdown text={`${successOdds}%`}>
            <Dropdown.Menu>
              {oddsValues.map(val => (<Dropdown.Item onClick={(e, { value }) => updateSuccessOdds(value as number)} text={`${val}%`} value={val} />))}
            </Dropdown.Menu>
          </Dropdown>
          <p>(Note: Shuttles cannot be run with a probability of success less than 14%. Shuttles need a probability of less than 60% to be tanked.)</p>
        </p>
        <Table>
          <Table.Header>
          <Table.Row>
            <Table.HeaderCell>Faction</Table.HeaderCell>
            <Table.HeaderCell>Reputation</Table.HeaderCell>
            <Table.HeaderCell>Shuttles needed</Table.HeaderCell>
            <Table.HeaderCell>Time needed</Table.HeaderCell>
          </Table.Row>
          </Table.Header>
          <Table.Body>
          {factionInfo.map((faction, index) => {
            let shuttlesNeededToMaxRep = this._shuttlesToHonouredStatus(faction.reputation);
            let hoursNeededToMaxRep = Math.ceil(shuttlesNeededToMaxRep/shuttleBays)*3;
            let shuttlesNeededToTank = Math.ceil(faction.completed_shuttle_adventures/this._expectedCSA(successOdds/100));
            let hoursNeededToTank = Math.ceil(shuttlesNeededToTank/shuttleBays)*3;

            return (
              <Table.Row key={index}>
                <Table.Cell><span><Image floated='left' size='mini' src={`${process.env.GATSBY_ASSETS_URL}icons_icon_faction_${factionImageLocations[index]}.png`} />{faction.name}</span></Table.Cell>
                <Table.Cell>{this._reputations(faction.reputation)}</Table.Cell>
                <Table.Cell>
                  {faction.reputation < 980 && <p>You need {shuttlesNeededToMaxRep} successful shuttle missions to achieve honored status.</p>}
                  {shuttlesNeededToTank > 0 && <p>To tank your shuttles you need to run {shuttlesNeededToTank} shuttles.</p>}
                  {shuttlesNeededToTank == 0 && <p>Already tanked</p>}
                </Table.Cell>
                <Table.Cell>
                  {faction.reputation < 980 && <p>{this._formatTime(hoursNeededToMaxRep)}</p>}
                  <p>{this._formatTime(hoursNeededToTank)}</p>
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
