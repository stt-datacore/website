import { IPolestar } from './model';

export function filterTraits(polestar: IPolestar, trait: string): boolean {
	if (polestar.filter.type === 'trait')
		return polestar.filter.trait === trait;
	if (polestar.filter.type === 'rarity')
		return `crew_max_rarity_${polestar.filter.rarity}` === trait;
	if (polestar.filter.type === 'skill')
		return polestar.filter.skill === trait;
	return false;
};
