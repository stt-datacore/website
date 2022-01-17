import React from 'react';
import { Checkbox, Divider, Dropdown, Form, Grid, Header, Icon, Label, Popup, Rating, Table } from 'semantic-ui-react';
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
	inPortal: boolean;
  maxLevel: number;
  maxRarity: number;
	ownedCrew: boolean;
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
			ownedCrew : false,
			inPortal: true,
			maxLevel: 100,
      maxRarity: 4,
      entries: [],
      roster: undefined,
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
      .filter(item => crewItemUse[item.symbol].length > 0 )
      .map(item => this._createDropdownItem(item));

		this.setState({ allcrew, allitems, itemList }, () => {
			let urlParams = new URLSearchParams(window.location.search);
			if (urlParams.has('item')) {
				this._updateTable({...this.state, currentSelectedItems: urlParams.getAll('item') });
			}
		});

		if (playerData) {
			const roster = playerData
										.player.character.crew
										.concat(playerData.player.character.stored_immortals)
										.map(c => ({ symbol: c.symbol, level: c.level }));
			this.setState({ roster });
		}

    this.setState({loaded : true });
  }

  _updateTable(newState: object) {
    const { allcrew, allitems, currentSelectedItems, inPortal, maxLevel, maxRarity, ownedCrew, roster } = newState;
		let params = new URLSearchParams();
		currentSelectedItems.forEach(item => params.append('item', item));

    const entries = allcrew
			.filter(crew => crew.max_rarity <= maxRarity)
			.filter(crew => !inPortal || crew.in_portal)
			.filter(crew => !ownedCrew || (roster.includes(crew.symbol) && crew.level <= roster.find(crew.symbol).level))
			.reduce((targets, crew) => {
				console.log(crew);
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
			}, [])
			.sort((e1, e2) => e1.level - e2.level)
			.sort((e1, e2) => e2.items.length - e1.items.length);

		this.setState({ ...newState, entries});

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
    const { allitems, currentSelectedItems, entries, inPortal, itemList, loaded, maxLevel, maxRarity, ownedCrew, roster, updateTable } = this.state;
		const rarityOptions = Array.from(RARITIES.slice(1), (text, i) => ({key: i+1, value: i+1, text }));
		const levelOptions = Array.from({length : 10}, (_, i) => ({key: i, value: (i+1)*10, text: ((i+1)*10).toString()}));
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
				<Grid columns={4} style={{marginTop: '0.5em'}}>
        	<Grid.Column>
						<Form.Field>
			        <Label>Max crew rarity</Label>
			        <Dropdown
			          compact
			          placeholder={maxRarity ? `Max rarity: ${maxRarity}` : `Maximum rarity`}
			          selection
								closeOnChange
			          options={rarityOptions}
			          value={maxRarity}
			          onChange={(e, { value }) => updateState({ maxRarity: value })}
			        />
						</Form.Field>
					</Grid.Column>
					<Grid.Column>
						<Form.Field>
							<Label>Max crew level</Label>
							<Dropdown
								compact
								placeholder={maxLevel ? `Max level: ${maxLevel}` : 'Maximum level'}
								selection
								closeOnChange
								options={levelOptions}
								value={maxLevel}
								onChange={(e, { value }) => updateState({ maxLevel: value})}
							/>
						</Form.Field>
					</Grid.Column>
					<Grid.Column>
						<Checkbox style={{position: 'absolute', top: '50%'}} checked={inPortal} label='In portal only' onChange={(e, { checked }) => updateState({inPortal: checked})} />
					</Grid.Column>
					{roster &&
						<Grid.Column>
							<Checkbox style={{position: 'absolute', top: '50%'}} checked={ownedCrew} label='Crew owned' onChange={(e, { checked }) => updateState({ownedCrew: checked})} />
						</Grid.Column>
					}
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
