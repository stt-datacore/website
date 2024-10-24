import React from "react"
import { Container, Image, Tab } from "semantic-ui-react"
import { CrewHoverStat } from "../hovering/crewhoverstat"
import { ItemHoverStat } from "../hovering/itemhoverstat"
import { ShipHoverStat } from "../hovering/shiphoverstat"
import { PlayerCollection } from "../../model/player"
import { CollectionCrew } from "./overview_panes/collectioncrew"
import { CollectionTiers } from "./overview_panes/collectiontiers"

export interface CollectionDetailsProps {
	collection: PlayerCollection;
}

export const CollectionDetails = (props: CollectionDetailsProps) => {
	const { collection } = props;
	const image = collection.image;

	const panes = [
		{
			menuItem: 'Crew',
			render: () => (
				<Tab.Pane attached={false}>
					<CollectionCrew collection={collection} />
				</Tab.Pane>
			),
		},
		{
			menuItem: 'Tiers',
			render: () => (
				<Tab.Pane attached={false}>
					<CollectionTiers collection={collection} />
				</Tab.Pane>
			),
		},
	];

	return <Container style={{ padding: '1em' }}>
		<div className="ui segment" >
			<Image
				src={`${process.env.GATSBY_ASSETS_URL}${image}`}
				fluid
			/>
		</div>
		<Tab
			style={{ marginTop: '1em' }}
			menu={{ secondary: true, pointing: true }}
			panes={panes}
			renderActiveOnly
		/>
		<CrewHoverStat targetGroup='col_overview_crew' modalPositioning={true} />
		<ItemHoverStat targetGroup='col_overview_items' modalPositioning={true} />
		<ShipHoverStat targetGroup='col_overview_ships' modalPositioning={true} />
	</Container>
}