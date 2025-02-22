import { Skill } from '../../model/crew';
import { PlayerCrew } from '../../model/player';
import { Ship } from '../../model/ship';
import { IVoyageEventContent, IVoyageInputConfig } from '../../model/voyage';

export const POPUP_DELAY = 500;

export const voySkillScore = (sk: Skill) => sk.core + (sk.range_min + sk.range_max) / 2;

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
				if (content.antimatter_bonus_crew_traits.some(bonusTrait => (crew.traits.includes(bonusTrait) || crew.traits_hidden.includes(bonusTrait)))) {
					traitBonus = content.antimatter_bonus_per_crew_trait;
				}
				// content.antimatter_bonus_crew_traits.forEach(bonusTrait => {
				// 	if (crew.traits.includes(bonusTrait) || crew.traits_hidden.includes(bonusTrait)) {
				// 		traitBonus += content.antimatter_bonus_per_crew_trait;
				// 	}
				// });
			}
		}
	}
	else if (trait) {
		if (crew.traits.includes(trait)) traitBonus = 25;
	}
	return traitBonus;
}

export function getCrewEventBonus(voyageConfig: IVoyageInputConfig, crew: PlayerCrew): number {
	let eventBonus: number = 0;
	if (voyageConfig.voyage_type === 'encounter') {
		const content: IVoyageEventContent | undefined = voyageConfig.event_content;
		if (content) {
			if (content.featured_crews.includes(crew.symbol)) {
				eventBonus = 0.3;
			}
			else {
				if (content.antimatter_bonus_crew_traits.some(bonusTrait => {
					return crew.traits.includes(bonusTrait) || crew.traits_hidden.includes(bonusTrait);
				})) {
					eventBonus = .15;
				}
			}
		}
	}
	return eventBonus;
}
