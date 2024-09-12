import { PlayerCrew } from '../../model/player';
import { Ship } from '../../model/ship';
import { IVoyageEventContent, IVoyageInputConfig } from '../../model/voyage';

export function getShipTraitBonus(voyageConfig: IVoyageInputConfig, ship: Ship): number {
	let shipBonus: number = 0;
	if (voyageConfig.voyage_type === 'encounter') {
		const content: IVoyageEventContent | undefined = voyageConfig.event_content;
		if (content) {
			if (content.featured_ships.includes(ship.symbol)) {
				shipBonus = content.antimatter_bonus_for_featured_ship;
			}
			else {
				const traitFactor: number = content.antimatter_bonus_ship_traits.filter(bs => ship.traits?.includes(bs)).length;
				shipBonus = content.antimatter_bonus_per_ship_trait * traitFactor;
			}
		}
	}
	else {
		shipBonus = (ship.traits ?? []).includes(voyageConfig.ship_trait) ? 150 : 0;
	}
	return shipBonus;
}

export function getCrewTraitBonus(voyageConfig: IVoyageInputConfig, crew: PlayerCrew, trait?: string): number {
	let traitBonus: number = 0;
	if (voyageConfig.voyage_type === 'encounter') {
		const content: IVoyageEventContent | undefined = voyageConfig.event_content;
		if (content) {
			if (content.featured_crews.includes(crew.symbol)) {
				traitBonus = content.antimatter_bonus_for_featured_crew;
			}
			else {
				content.antimatter_bonus_crew_traits.forEach(bonusTrait => {
					if (crew.traits.includes(bonusTrait) || crew.traits_hidden.includes(bonusTrait)) {
						traitBonus += content.antimatter_bonus_per_crew_trait;
					}
				});
			}
		}
	}
	else if (trait) {
		if (crew.traits.includes(trait)) traitBonus = 25;
	}
	return traitBonus;
}

export function getCrewVP(voyageConfig: IVoyageInputConfig, crew: PlayerCrew): number {
	let crewVP: number = 0;
	if (voyageConfig.voyage_type === 'encounter') {
		const content: IVoyageEventContent | undefined = voyageConfig.event_content;
		if (content) {
			if (content.featured_crews.includes(crew.symbol)) {
				crewVP = 25;
			}
			else {
				if (content.antimatter_bonus_crew_traits.some(bonusTrait => {
					return crew.traits.includes(bonusTrait) || crew.traits_hidden.includes(bonusTrait);
				})) {
					crewVP = 10;
				}
			}
		}
	}
	return crewVP;
}
