import React, { Component } from 'react';
import { Header, Popup, Modal, Grid, Icon } from 'semantic-ui-react'

import ItemDisplay from '../components/itemdisplay';
import ItemSources from '../components/itemsources';

import CONFIG from '../components/CONFIG';

type CrewFullEquipTreeProps = {
    visible: boolean;
    crew: any;
    onClosed: any;
};

class CrewFullEquipTree extends Component<CrewFullEquipTreeProps> {
    render() {
        const { crew } = this.props;

        if (!crew || !this.props.visible) {
            return <span />;
        }

        let craftCost = 0;
        let demands = [];
        let dupeChecker = new Set();
        crew.equipment_slots.forEach(es => {
            if (!es.symbol.recipe) {
                return;
            }

            for (let iter of es.symbol.recipe.list) {
                if (dupeChecker.has(iter.symbol.symbol)) {
                    demands.find(d=>d.symbol.symbol === iter.symbol.symbol).count += iter.count;
                    continue;
                }

                if (iter.symbol.item_sources.length === 0) {
					console.error(`Oops: equipment with no recipe and no sources: `, iter.symbol);
				}
        
                dupeChecker.add(iter.symbol.symbol);

                demands.push({
                    count: iter.count,
                    symbol: iter.symbol,
                    factionOnly: iter.factionOnly
                });
            }

            craftCost += es.symbol.recipe.craftCost;
        });

        const reducer = (accumulator, currentValue) => accumulator + currentValue.count;
        let factionOnlyTotal = demands.filter(d => d.factionOnly).reduce(reducer, 0);
        let totalChronCost = Math.floor(demands.reduce((a, c) => a + this._estimateChronitonCost(c.symbol), 0));

        return <Modal
            open={this.props.visible}
            onClose={() => this.props.onClosed()}
        >
            <Modal.Header>{crew.name}'s expanded equipment recipe trees</Modal.Header>
            <Modal.Content scrolling>
                <p>Faction-only items required <b>{factionOnlyTotal}</b></p>
                <p>Estimated chroniton cost <span style={{ display: 'inline-block' }}><img src={`/media/icons/energy_icon.png`} height={14} /></span> <b>{totalChronCost}</b>
                    <Popup wide
                        trigger={<Icon fitted name='help' />}
                        header={'How is this calculated?'}
                        content={<div>
                            <p>This sums the estimated chroniton cost of each equipment and component in the tree.</p>
                            <p>It estimates an item's cost by running the formula below for each mission and choosing the cheapest:</p>
                            <p><code>(6 - PIPS) * 1.8 * <i>mission cost</i></code></p>
                            <p>See code for details. Feedback is welcome!</p>
                        </div>}
                    />
                </p>
                <p>Build cost <span style={{ display: 'inline-block' }}><img src={`/media/icons/images_currency_sc_currency_0.png`} height={16} /></span> <b>{craftCost}</b></p>
                <Grid columns={3} centered padded>
                    {demands.map((entry, idx) =>
                        <Grid.Column key={idx}>
                            <Popup
                                trigger={<Header style={{ display: 'flex', cursor: 'zoom-in' }}
                                    icon={<ItemDisplay src={`/media/assets/${entry.symbol.imageUrl}`} size={48} maxRarity={entry.symbol.rarity} rarity={entry.symbol.rarity} />}
                                    content={entry.symbol.name}
                                    subheader={`Need ${entry.count} ${entry.factionOnly ? ' (FACTION)' : ''}`} />}
                                header={CONFIG.RARITIES[entry.symbol.rarity].name + ' ' + entry.symbol.name}
                                content={<ItemSources item_sources={entry.symbol.item_sources} />}
                                on='click'
                                wide
                            />
                        </Grid.Column>
                    )}
                </Grid>
            </Modal.Content>
        </Modal>;
    } 

    _estimateChronitonCost(equipment) {
        let sources = equipment.item_sources.filter(e => (e.type === 0) || (e.type === 2));
    
        // If faction only
        if (sources.length === 0) {
            return 0;
        }
    
        // TODO: figure out a better way to calculate these
        const RNGESUS = 1.8;
    
        let costCalc = [];
        for(let source of sources) {
            if (!source.id) {
                //console.log("Mission information not available!", source);
                continue;
            }

            let cost = source.id.mastery_levels[source.mastery].energy_cost;
    
            if (cost) {
                costCalc.push((6 - source.chance_grade) * RNGESUS * cost);
            }
        }
    
        if (costCalc.length === 0) {
            console.warn('Couldnt calculate cost for equipment', equipment);
            return 0;
        }
    
        return costCalc.sort()[0];
    }
}

export default CrewFullEquipTree;