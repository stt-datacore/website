import React, { PureComponent } from 'react';
import { Header, Popup, Modal, Grid, Icon, Button } from 'semantic-ui-react';

import ItemDisplay from '../../components/itemdisplay';
import ItemSources from '../../components/itemsources';

import { calculateCrewDemands } from '../../utils/equipment';
import CONFIG from '../../components/CONFIG';
import { GlobalContext } from '../../context/globalcontext';
import { ItemHoverStat } from '../hovering/itemhoverstat';
import { AvatarView } from '../item_presenters/avatarview';

type CrewFullEquipTreeProps = {
	visible: boolean;
	crew: any;
	onClosed: any;
	items: any[];
};

class CrewFullEquipTree extends PureComponent<CrewFullEquipTreeProps> {
	static contextType = GlobalContext;
	declare context: React.ContextType<typeof GlobalContext>;

	render() {
		const { crew, items } = this.props;
		const { playerData } = this.context.player;

		if (!crew || !this.props.visible) {
			return <span />;
		}

		let { craftCost, demands, factionOnlyTotal, totalChronCost } = calculateCrewDemands(crew, items);

		return (
			<Modal open={this.props.visible} onClose={() => this.props.onClosed()}>
				<Modal.Header>{crew.name}'s expanded equipment recipe trees</Modal.Header>
				<Modal.Content scrolling>
					<p>
						Faction-only items required <b>{factionOnlyTotal}</b>
					</p>
					<p>
						Estimated chroniton cost{' '}
						<span style={{ display: 'inline-block' }}>
							<img src={`${process.env.GATSBY_ASSETS_URL}atlas/energy_icon.png`} height={14} />
						</span>{' '}
						<b>{totalChronCost}</b>
						<Popup
							wide
							trigger={<Icon fitted name='help' />}
							header={'How is this calculated?'}
							content={
								<div>
									<p>This sums the estimated chroniton cost of each equipment and component in the tree.</p>
									<p>It estimates an item's cost by running the formula below for each mission and choosing the cheapest:</p>
									<p>
										<code>
											(6 - PIPS) * 1.8 * <i>mission cost</i>
										</code>
									</p>
									<p>See code for details. Feedback is welcome!</p>
								</div>
							}
						/>
					</p>
					<p>
						Build cost{' '}
						<span style={{ display: 'inline-block' }}>
							<img src={`${process.env.GATSBY_ASSETS_URL}currency_sc_currency_0.png`} height={16} />
						</span>{' '}
						<b>{craftCost}</b>
					</p>
					<Grid columns={3} centered padded>
					<ItemHoverStat targetGroup='crew_page_items' modalPositioning={true} />
						{demands.map((entry, idx) => (
							entry.equipment &&
							<Grid.Column key={idx}>
								<Popup
									trigger={
										<Header
											style={{ display: 'flex', cursor: 'zoom-in' }}
											icon={
												<AvatarView
													mode='item'
													item={entry.equipment}
													useDirect={true}
													targetGroup='crew_page_items'
													style={{marginRight: "0.5em"}}
													size={48}
													/>
												// <ItemDisplay
												// 	playerData={playerData}
												// 	allItems={items}
												// 	itemSymbol={entry.equipment.symbol}
												// 	targetGroup='crew_page_items'
												// 	style={{marginRight: "0.5em"}}
												// 	src={`${process.env.GATSBY_ASSETS_URL}${entry.equipment.imageUrl}`}
												// 	size={48}
												// 	maxRarity={entry.equipment.rarity}
												// 	rarity={entry.equipment.rarity}

											}
											content={entry.equipment.name}
											subheader={`Need ${entry.count} ${entry.factionOnly ? ' (FACTION)' : ''}`}
										/>
									}
									header={CONFIG.RARITIES[entry.equipment.rarity].name + ' ' + entry.equipment.name}
									content={<ItemSources item_sources={entry.equipment.item_sources} />}
									on='click'
									wide
								/>
							</Grid.Column>
						))}
					</Grid>
				</Modal.Content>
				<Modal.Actions>
					<Popup
						content='Copied!'
						on='click'
						position='left center'
						size='tiny'
						trigger={
							<Button icon='clipboard' content='Copy to clipboard' onClick={() => copyItems()} />
						}
					/>
					<Button onClick={() => this.props.onClosed()}>Close</Button>
				</Modal.Actions>
			</Modal>
		);

		function copyItems(): void {
			let output = 'Item,Rarity,Needed,Symbol';
			demands.sort((a, b) => {
				if (!a.equipment) return 1;
				else if (!b.equipment) return -1;
				if (a.equipment.name === b.equipment.name) return b.equipment.rarity - a.equipment.rarity;
				return a.equipment.name.localeCompare(b.equipment.name);
			}).forEach(entry => {
				if (!entry.equipment) return;
				if (output !== '') output += '\n';
				output += `${entry.equipment.name},${entry.equipment.rarity},${entry.count},${entry.equipment.symbol}`;
			});
			navigator.clipboard.writeText(output);
		}
	}
}

export default CrewFullEquipTree;
