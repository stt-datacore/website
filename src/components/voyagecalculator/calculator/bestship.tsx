import React from 'react';
import {
	Card,
	Image
} from 'semantic-ui-react';

import { IBestVoyageShip, IVoyageInputConfig } from '../../../model/voyage';
import { GlobalContext } from '../../../context/globalcontext';

export type BestShipCardProps = {
	voyageConfig: IVoyageInputConfig;
	bestShip: IBestVoyageShip | undefined;
};

// BestShipCard to be deprecated. The game should automatically select the best ship for your voyage
export const BestShipCard = (props: BestShipCardProps) => {
	const globalContext = React.useContext(GlobalContext);
	const { SHIP_TRAIT_NAMES } = globalContext.localized;
	const { voyageConfig, bestShip } = props;

	if (!bestShip) return (<></>);

	// const direction = bestShip.ship.index ? (bestShip.ship.index.right < bestShip.ship.index.left ? 'right' : 'left') : '';
	// const index = bestShip.ship.index ? bestShip.ship.index[direction] : 0;

	return (
		<Card fluid>
			<Card.Content>
				<Image floated='left' src={`${process.env.GATSBY_ASSETS_URL}${bestShip.ship.icon?.file.slice(1).replace('/', '_')}.png`} style={{ height: '4em' }} />
				<Card.Header>{bestShip.ship.name}</Card.Header>
				<p>best ship{bestShip.traited && (<span style={{ marginLeft: '1em' }}>{` +`}{SHIP_TRAIT_NAMES[voyageConfig.ship_trait]}</span>)}</p>
				{bestShip.ship.index && (
					<p style={{ marginTop: '.5em' }}>
						The game should automatically select {bestShip.ship.name} for your voyage.
						{/* Tap <Icon name={`arrow ${direction}` as SemanticICONS} />{index} time{index !== 1 ? 's' : ''} on your voyage ship selection screen to select {bestShip.ship.name}. */}
					</p>
				)}
			</Card.Content>
		</Card>
	);
};
