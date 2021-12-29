import React from 'react';
import { Divider, Dropdown, Form, Header, Icon, Popup, Rating, Table } from 'semantic-ui-react';
import { isMobile } from 'react-device-detect';

import CONFIG from '../components/CONFIG';
import ItemDisplay from '../components/itemdisplay';
import Layout from '../components/layout';
import PagedTable from '../components/pagedtable';
import { demandsPerSlot } from '../utils/equipment';
import { getStoredItem } from '../utils//storage'
import Worker from 'worker-loader!../workers/unifiedWorker';

const rarityOptions = Array.from({ length: 5 }, (_, i) => ({key: i+1, value: i+1, text: `${i+1}`}));
const RARITIES = [ 'Basic', 'Common', 'Uncommon', 'Rare', 'Super Rare', 'Legendary' ];

const tableConfig: ITableConfigRow[] = [
	{ width: 3, column: 'name', title: 'Crew', pseudocolumns: ['name', 'bigbook_tier', 'events'] },
	{ width: 1, column: 'max_rarity', title: 'Rarity', reverse: true, tiebreakers: ['rarity'] },
	{ width: 1, column: 'cab_ov', title: <span>CAB <CABExplanation /></span>, reverse: true, tiebreakers: ['cab_ov_rank'] },
	{ width: 1, column: 'ranks.voyRank', title: 'Voyage' },
	{ width: 1, column: 'command_skill.core', title: <img alt="Command" src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_command_skill.png`} style={{ height: '1.1em' }} />, reverse: true },
	{ width: 1, column: 'science_skill.core', title: <img alt="Science" src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_science_skill.png`} style={{ height: '1.1em' }} />, reverse: true },
	{ width: 1, column: 'security_skill.core', title: <img alt="Security" src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_security_skill.png`} style={{ height: '1.1em' }} />, reverse: true },
	{ width: 1, column: 'engineering_skill.core', title: <img alt="Engineering" src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_engineering_skill.png`} style={{ height: '1.1em' }} />, reverse: true },
	{ width: 1, column: 'diplomacy_skill.core', title: <img alt="Diplomacy" src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_diplomacy_skill.png`} style={{ height: '1.1em' }} />, reverse: true },
	{ width: 1, column: 'medicine_skill.core', title: <img alt="Medicine" src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_medicine_skill.png`} style={{ height: '1.1em' }} />, reverse: true }
];

type MuleHunterState = {
  itemList: Dropdown.Item[];
  currentSelectedItems: string[];
  allcrew: object[];
  maxRarity: number;
  entries: object[];
  roster: object[];
  allitems: object[];
  loaded: boolean;
};

class MuleHunter extends React.Component<MuleHunterState> {
  constructor(props) {
    super(props);

    this.state = {
      itemList: [],
      currentSelectedItems: [],
      allcrew: [],
      maxRarity: 4,
      entries: [],
      roster: [],
      allitems: [],
      loaded: false
    };
  }

  async componentDidMount() {
    const playerData = getStoredItem('tools/playerData', undefined);
    const allitems = (await (await fetch('/structured/items.json')).json());
    let crewItemUse = Object.fromEntries(allitems.map(item => [item.symbol, []]));
    // TODO: move to script
    const allcrew = (await (await fetch('/structured/crew.json')).json()).map(crew => {
      let crewEquipment = new Set();

      const itemsPerUpgrade = Array.from({length: 10}, (l, i) => i).map(i => {
        const offset = i*4;
        let demands = [];
        crew.equipment_slots.slice(offset, offset+4)
                            .forEach(slot => {
          const item = allitems.find(item => item.symbol === slot.symbol);

          if (!item.recipe)
            crewEquipment.add(item.symbol);
          else
            item.recipe.list.forEach(item => crewEquipment.add(item.symbol));

        });


        return {
          items: Array.from(crewEquipment),
          level: (i+1)*10
        };
      });

      try {
        itemsPerUpgrade.forEach(ipu => ipu.items.forEach(item => crewItemUse[item].push(ipu)));
      } catch (err) {
        console.log(`WARNING: Item not found`);
        console.log(err);
      }
      return {
        ...crew,
        itemsPerUpgrade
      }
    });

    const itemList = allitems
      // .filter(item => !item.recipe)
      // .filter(item => item.rarity < 5)
      // .filter(item => [2, 3].includes(item.type))
      // .filter(item => !item.imageUrl.startsWith('crew'))
      .filter(item => crewItemUse[item.symbol].length > 0 )
      .map(item => this._createDropdownItem(item));

		this.setState({ allcrew, allitems, itemList }, () => {
			let urlParams = new URLSearchParams(window.location.search);
			if (urlParams.has('item')) {
				this._selectionChanged(urlParams.getAll('item'));
			}
		});

		if (playerData) {
			let roster = playerData.player.character.crew;
			roster = roster.concat(playerData.player.character.stored_immortals);
			roster = roster.map(c1 => allcrew.find(c2 => c1.symbol == c2.symbol))
										 .filter(c => c != undefined);
			this.setState({ roster });
		}

    this.setState({loaded : true });
  }

  _selectionChanged(value: string[]) {
    const { allcrew, allitems } = this.state;
		let params = new URLSearchParams();

    const entries = allcrew.reduce((targets, crew) =>
      targets.concat(crew.itemsPerUpgrade
        .map(ipu => ({
          crew,
          items: ipu.items.filter(item => value.includes(item))
                          .map(symbol => allitems.find(item => item.symbol == symbol)),
          level: ipu.level
        })))
        .filter(ipu => ipu.items.length > 0), []);

		this.setState({ entries, currentSelectedItems: value });

		let newurl = window.location.protocol + '//' + window.location.host + window.location.pathname + '?' + params.toString();
		window.history.pushState({ path: newurl }, '', newurl);
	}

  _createDropdownItem(item) {
    const rarity = Array.from({length: item.rarity}, _ => '\u2605').join('');
    return {
      value: item.symbol,
      image: `${process.env.GATSBY_ASSETS_URL}${item.imageUrl}`,
      text: `${rarity} ${item.name}`
    };
  }

  render() {
    const { allitems, entries, itemList, loaded } = this.state;

    if (!loaded)
      return <div><Icon loading />Loading...</div>;

    return <Layout title='Mule hunter'>
      <Header as='h4'>Mule hunter</Header>
      <p>Find your ideal crew to sit on your roster providing items via the replicator</p>
      <Form>
        <div>
        <Dropdown
          clearable
          fluid
          multiple
          search
          selection
          closeOnChange
          options={itemList}
          placeholder='Select or search for items'
          label='Required items'
          value={this.state.currentSelectedItems}
          onChange={(e, { value }) => this._selectionChanged(value)}
        />
        </div>
        <div>
        <span>Crew filter:</span>
        <Dropdown
          compact
          placeholder={this.state.maxRarity ? `Max rarity: ${this.state.mxnRarity}` : `Maximum rarity`}
          selection
          options={rarityOptions}
          value={this.state.maxRarity}
          onChange={(e, { value }) => this.setState({ maxRarity: value })}
        />
        </div>
      </Form>

      <Divider horizontal hidden />

      {entries.length == 0 && <p>No mules available</p>}

      {entries.length > 0 &&
      <PagedTable sortable striped>
        <PagedTable.Header>
            <PagedTable.Row>
              <PagedTable.HeaderCell>Crew</PagedTable.HeaderCell>
              <PagedTable.HeaderCell>Rarity</PagedTable.HeaderCell>
              <PagedTable.HeaderCell>Level</PagedTable.HeaderCell>
              <PagedTable.HeaderCell>Items</PagedTable.HeaderCell>
            </PagedTable.Row>
          </PagedTable.Header>
          <PagedTable.Body>
            {entries.map(entry =>
              <PagedTable.Row>
                <PagedTable.Cell>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '60px auto',
                    gridTemplateAreas: `'icon stats' 'icon description'`,
                    gridGap: '1px'
                  }}>
                  <div style={{ gridArea: 'icon' }}>
                    <img width={48} src={`${process.env.GATSBY_ASSETS_URL}${entry.crew.imageUrlPortrait}`} />
                  </div>
                  <div style={{ gridArea: 'stats' }}>
                    <span style={{ fontWeight: 'bolder', fontSize: '1.25em' }}>{entry.crew.name}</span>
                  </div>
                </div>
                </PagedTable.Cell>
                <PagedTable.Cell>
                  <Rating icon='star' rating={entry.crew.max_rarity} maxRating={entry.crew.max_rarity} size='large' disabled />
                </PagedTable.Cell>
                <PagedTable.Cell>
                  {entry.level == 10 ? 6 : entry.level}
                </PagedTable.Cell>
                <PagedTable.Cell>
                  <Dropdown text={entry.items.length.toString()} options={entry.items.filter(i => i).map(this._createDropdownItem)} />
                </PagedTable.Cell>
              </PagedTable.Row>
            )}
          </PagedTable.Body>
        </PagedTable>
      }
    </Layout>
  }
}

export default MuleHunter;
