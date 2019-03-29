import React, { Component } from 'react';
import { Header, Popup, Modal, Grid, Icon } from 'semantic-ui-react';

import ItemDisplay from '../components/itemdisplay';
import ItemSources from '../components/itemsources';

import CONFIG from '../components/CONFIG';

type CrewFullEquipTreeProps = {
	visible: boolean;
	crew: any;
	onClosed: any;
	items: any[];
};

class CrewFullEquipTree extends Component<CrewFullEquipTreeProps> {
	render() {
		const { crew, items } = this.props;

		if (!crew || !this.props.visible) {
			return <span />;
		}

		let craftCost = 0;
		let demands = [];
		let dupeChecker = new Set();
		crew.equipment_slots.forEach(es => {
			let equipment = items.find(item => item.symbol === es.symbol);
			if (!equipment.recipe) {
				return;
			}

			for (let iter of equipment.recipe.list) {
				let recipeEquipment = items.find(item => item.symbol === iter.symbol);
				if (dupeChecker.has(iter.symbol)) {
					demands.find(d => d.symbol === iter.symbol).count += iter.count;
					continue;
				}

				if (recipeEquipment.item_sources.length === 0) {
					console.error(`Oops: equipment with no recipe and no sources: `, recipeEquipment);
				}

				dupeChecker.add(iter.symbol);

				demands.push({
					count: iter.count,
					symbol: iter.symbol,
					equipment: recipeEquipment,
					factionOnly: iter.factionOnly
				});
			}

			craftCost += equipment.recipe.craftCost;
		});

		const reducer = (accumulator, currentValue) => accumulator + currentValue.count;
		let factionOnlyTotal = demands.filter(d => d.factionOnly).reduce(reducer, 0);
		let totalChronCost = Math.floor(demands.reduce((a, c) => a + this._estimateChronitonCost(c.equipment), 0));

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
							<img src={`/media/icons/energy_icon.png`} height={14} />
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
							<img src={`/media/icons/images_currency_sc_currency_0.png`} height={16} />
						</span>{' '}
						<b>{craftCost}</b>
					</p>
					<Grid columns={3} centered padded>
						{demands.map((entry, idx) => (
							<Grid.Column key={idx}>
								<Popup
									trigger={
										<Header
											style={{ display: 'flex', cursor: 'zoom-in' }}
											icon={
												<ItemDisplay
													src={`/media/assets/${entry.equipment.imageUrl}`}
													size={48}
													maxRarity={entry.equipment.rarity}
													rarity={entry.equipment.rarity}
												/>
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
			</Modal>
		);
	}

	_estimateChronitonCost(equipment) {
		let sources = equipment.item_sources.filter(e => e.type === 0 || e.type === 2);

		// If faction only
		if (sources.length === 0) {
			return 0;
		}

		// TODO: figure out a better way to calculate these
		const RNGESUS = 1.8;

		let costCalc = [];
		for (let source of sources) {
			if (!source.cost) {
				//console.log("Mission information not available!", source);
				continue;
			}

			costCalc.push((6 - source.chance_grade) * RNGESUS * source.cost);
		}

		if (costCalc.length === 0) {
			console.warn('Couldnt calculate cost for equipment', equipment);
			return 0;
		}

		return costCalc.sort()[0];
	}
}

export default CrewFullEquipTree;
