import React from 'react';
import { Checkbox, Divider, Dropdown, Form, Grid, Header, Icon, Popup, Rating, Table } from 'semantic-ui-react';
import { isMobile } from 'react-device-detect';

import CONFIG from '../components/CONFIG';
import ItemDisplay from '../components/itemdisplay';
import Layout from '../components/layout';
import PagedTable from '../components/pagedtable';
import { demandsPerSlot } from '../utils/equipment';
import { getStoredItem } from '../utils//storage'
import Worker from 'worker-loader!../workers/unifiedWorker';

const RARITIES = [
	'',
	'\u2605',
	'\u2605\u2605',
	'\u2605\u2605\u2605',
	'\u2605\u2605\u2605\u2605',
	'\u2605\u2605\u2605\u2605\u2605'
];


type MuleHunterState = {
  itemList: Dropdown.Item[];
  currentSelectedItems: string[];
  allcrew: object[];
  maxRarity: number;
	inPortal: boolean;
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
			inPortal: true,
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
				this._updateTable({...this.state, currentSelectedItems: urlParams.getAll('item') });
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

  _updateTable(newState: object) {
    const { allcrew, allitems, currentSelectedItems, maxRarity, inPortal } = newState;
		let params = new URLSearchParams();
		currentSelectedItems.forEach(item => params.append('item', item));

    const entries = allcrew
			.filter(crew => crew.max_rarity <= maxRarity)
			.filter(crew => !inPortal || crew.in_portal)
			.reduce((targets, crew) => {
	      return targets.concat(crew
					.itemsPerUpgrade
	        .map(ipu => ({
	          crew,
	          items: ipu.items.filter(item => currentSelectedItems.includes(item))
	                          .map(symbol => allitems.find(item => item.symbol == symbol)),
	          level: ipu.level
	        }))
					.filter(ipu => ipu.items.length > 0)
	        .reduce((best, ipu) => best.items && ipu.items.length <= best.items.length ?  best : ipu, []));
			}, []);

		this.setState({ entries, currentSelectedItems, inPortal, maxRarity });

		let newurl = window.location.protocol + '//' + window.location.host + window.location.pathname + '?' + params.toString();
		window.history.pushState({ path: newurl }, '', newurl);
	}

  _createDropdownItem(item) {
    return {
      value: item.symbol,
      image: `${process.env.GATSBY_ASSETS_URL}${item.imageUrl}`,
      text: `${RARITIES[item.rarity]} ${item.name}`
    };
  }

  render() {
    const { allitems, currentSelectedItems, entries, inPortal, itemList, loaded, maxRarity, updateTable } = this.state;
		const rarityOptions = Array.from(RARITIES.slice(1), (text, i) => ({key: i+1, value: i+1, text }))
		const updateState = newState => this._updateTable({...this.state, ...newState });

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
          onChange={(e, { value }) => updateState({currentSelectedItems: value})}
        />
        </div>
				<Grid columns={2}>
        	<Grid.Column>
		        <span>Max crew rarity: </span>
		        <Dropdown
		          compact
		          placeholder={maxRarity ? `Max rarity: ${maxRarity}` : `Maximum rarity`}
		          selection
		          options={rarityOptions}
		          value={maxRarity}
		          onChange={(e, { value }) => updateState({ maxRarity: value })}
		        />
					</Grid.Column>
					<Grid.Column>
						<Checkbox checked={inPortal} label='In Portal' onChange={(e, { checked }) => updateState({inPortal: checked})} />
					</Grid.Column>
				</Grid>

      </Form>

      <Divider horizontal hidden />

      {entries.length == 0 && <p>No mules available</p>}

      {entries.length > 0 &&
      <PagedTable striped>
        <PagedTable.Header>
            <PagedTable.Row>
              <PagedTable.HeaderCell>Crew</PagedTable.HeaderCell>
              <PagedTable.HeaderCell>Rarity</PagedTable.HeaderCell>
              <PagedTable.HeaderCell>Level</PagedTable.HeaderCell>
              <PagedTable.HeaderCell>Items</PagedTable.HeaderCell>
            </PagedTable.Row>
          </PagedTable.Header>
          <PagedTable.Body>
            {entries.sort((e1, e2) => e2.items.length - e1.items.length).map(entry =>
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
