import React from 'react';
import { Segment, Header, Dropdown, Button, Grid, Label, Popup } from 'semantic-ui-react';

import { CrewMember } from '../../model/crew';
import { GlobalContext } from '../../context/globalcontext';
import CONFIG from '../../components/CONFIG';
import ItemDisplay from '../../components/itemdisplay';
import ItemSources from '../../components/itemsources';
import { ItemHoverStat } from '../../components/hovering/itemhoverstat';

import CrewFullEquipTree from './crewfullequiptree';
import { AvatarView } from '../item_presenters/avatarview';

interface IEquipmentOptions {
	key: string;
	text: string;
	value: string;
	content: JSX.Element;
};

type EquipmentBuildsProps = {
	crew: CrewMember;
};

export const EquipmentBuilds = (props: EquipmentBuildsProps) => {
	const globalContext = React.useContext(GlobalContext);
	const { crew } = props;

	const [selectedEquipment, setSelectedEquipment] = React.useState('');
	const [modalVisible, setModalVisible] = React.useState(false);

	return (
		<React.Fragment>
			<Segment>
				<Header as='h4'>Equipment Builds</Header>
				{renderEquipment(crew)}
				{renderEquipmentDetails(crew)}
				<Button
					onClick={() => setModalVisible(true)}
					style={{ marginTop: '1em' }}
					content='Full equipment tree'
					icon='right arrow'
					labelPosition='right'
				/>
			</Segment>
			<CrewFullEquipTree
				visible={modalVisible}
				items={globalContext.core.items}
				crew={crew}
				onClosed={() => setModalVisible(false)}
			/>
		</React.Fragment>
	);

	function renderEquipment(crew: CrewMember): JSX.Element {
		let options = [] as IEquipmentOptions[];
		crew.equipment_slots.forEach(es => {
			const equipment = globalContext.core.items.find(item => item.symbol === es.symbol);
			if (!equipment) {
				console.warn(`Could not find item ${es.symbol}`);
				return;
			}

			options.push({
				key: es.symbol + '_' + es.level,
				text: `${equipment.name} (level ${es.level})`,
				value: es.symbol,
				content: (
					<Header
						icon={
							<AvatarView
								mode='item'
								size={48}
								useDirect={true}
								item={equipment}
								/>
							// <ItemDisplay
							// 	src={`${process.env.GATSBY_ASSETS_URL}${equipment.imageUrl}`}
							// 	size={48}
							// 	maxRarity={equipment.rarity}
							// 	rarity={equipment.rarity}
							// />
						}
						content={equipment.name}
						subheader={`Level ${es.level}`}
					/>
				)
			});
		});

		return (
			<Dropdown
				selection
				fluid
				options={options}
				placeholder='Choose an equipment to see its details'
				onChange={(ev, { value }) => setSelectedEquipment(value as string)}
			/>
		);
	}

	function renderEquipmentDetails(crew: CrewMember): JSX.Element {
		if (selectedEquipment === '') return <></>;

		let es = crew.equipment_slots.find(es => es.symbol === selectedEquipment);
		let equipment = globalContext.core.items.find(item => item.symbol === es?.symbol);
		if (!equipment) {
			console.error('Could not find equipment for slot', es);
			return <span />;
		}

		if (!equipment.recipe) {
			return (
				<div>
					<br />
					<p>This item is not craftable, you can find it in these sources:</p>
					<ItemSources item_sources={equipment.item_sources} />
				</div>
			);
		}

		return (
			<div>
				<Grid columns={4} centered padded>
					{equipment.recipe.list.map(entry => {
						let recipeEntry = globalContext.core.items.find(item => item.symbol === entry.symbol);
						if (!recipeEntry) return <></>
						return (
							<Grid.Column key={recipeEntry.name + recipeEntry.rarity} textAlign='center'>
								<Popup
									trigger={
										<Label as='a' style={{ background: CONFIG.RARITIES[recipeEntry.rarity].color }} image size='big'>
											<img src={`${process.env.GATSBY_ASSETS_URL}${recipeEntry.imageUrl}`} />x{entry.count}
										</Label>
									}
									header={CONFIG.RARITIES[recipeEntry.rarity].name + ' ' + recipeEntry.name}
									content={<ItemSources item_sources={recipeEntry.item_sources} />}
									wide
								/>
							</Grid.Column>
						);
					})}
				</Grid>
			</div>
		);
	}
};
