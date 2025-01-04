import React from "react";
import { GlobalContext } from "../../../context/globalcontext";
import { mergeItems } from "../../../utils/itemutils";

export interface PrettyCostProps {
    cost: number;
    index: number;
}

export const PrettyCost = (props: PrettyCostProps) => {

    const { cost, index: idx } = props;

    const globalContext = React.useContext(GlobalContext);
    const { t } = globalContext.localized;

		if (globalContext.player.playerData && cost) {
			const { t } = globalContext.localized;
			let revivals = globalContext.player.playerData.player.character.items.find(f => f.symbol === 'voyage_revival');

			if (revivals && revivals.quantity && revivals.quantity >= idx) {
				let globalItem = globalContext.core.items.find(f => f.symbol === 'voyage_revival');
				if (globalItem) {
					revivals = mergeItems([revivals], [globalItem])[0];
					return <div style={{
						display: "flex",
						flexDirection: "row",
						alignItems: "center",
						justifyContent: "left"
					}}>
						<div style={{width: "32px"}}>
						<img style={{height:"24px", margin:"0.5em"}} src={`${process.env.GATSBY_ASSETS_URL}${revivals.imageUrl}`} />
						</div>
						<span>{idx} / {revivals.quantity} {t('global.item_types.voyage_consumable')}</span>
					</div>
				}
			}
			else {
				return <div style={{
					display: "flex",
					flexDirection: "row",
					alignItems: "center",
					justifyContent: "left"
				}}>
					<div style={{width: "32px"}}>
					<img style={{height:"24px", margin:"0.5em"}} src={`${process.env.GATSBY_ASSETS_URL}atlas/pp_currency_icon.png`} />
					</div>
					<span>{cost} {t('global.item_types.dilithium')}</span>
				</div>
			}
		}


		return <>{cost == 0 || 'Costing ' + cost + ' dilithium'}</>


}