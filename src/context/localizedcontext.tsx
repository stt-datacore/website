import React from 'react';
import { Icon } from 'semantic-ui-react';

import { Action, ItemTranslation, ShipTraitNames, TraitNames, TranslationSet } from '../model/traits';
import { CrewMember } from '../model/crew';
import { EquipmentItem } from '../model/equipment';
import { Schematics, Ship } from '../model/ship';
import { Collection } from '../model/game-elements';
import { DataContext } from './datacontext';
import { PlayerContext } from './playercontext';
import CONFIG from '../components/CONFIG';
import { useStateWithStorage } from '../utils/storage';

interface LocalizedProviderProps {
	children?: JSX.Element;
};

export type SupportedLanguage = 'en' | 'sp' | 'de' | 'fr';

export interface TranslatedCore {
	crew?: CrewMember[];
	ship_schematics?: Schematics[];
	ships?: Ship[];
	collections?: Collection[];
	items?: EquipmentItem[];
};

interface IGameStrings {
	TRAIT_NAMES: TraitNames;
	SHIP_TRAIT_NAMES: ShipTraitNames;
	CREW_ARCHETYPES: {
		[symbol: string]: {
			name: string;
			short_name: string;
		};
	};
	SHIP_ARCHETYPES: {
		[symbol: string]: {
			name: string;
			flavor: string;
			actions: Action[];
		};
	};
	COLLECTIONS: {
		[fakeSymbol: string]: {
			name: string;
			description: string;
		};
	};
	ITEM_ARCHETYPES: {
		[symbol: string]: {
			name: string;
			flavor: string;
		};
	};
};

export interface ILocalizedData extends IGameStrings {
	language: SupportedLanguage;
	setPreferredLanguage: (value: SupportedLanguage) => void;
	translateCore: () => TranslatedCore;
};

const defaultGameStrings: IGameStrings = {
	TRAIT_NAMES: {} as TraitNames,
	SHIP_TRAIT_NAMES: {} as ShipTraitNames,
	CREW_ARCHETYPES: {},
	SHIP_ARCHETYPES: {},
	COLLECTIONS: {},
	ITEM_ARCHETYPES: {}
};

export const DefaultLocalizedData: ILocalizedData = {
	language: 'en',
	...defaultGameStrings,
	setPreferredLanguage: () => false,
	translateCore: () => { return {}; }
};

export const LocalizedContext = React.createContext(DefaultLocalizedData);

function getBrowserLanguage(): SupportedLanguage {
    if (typeof window === 'undefined') return 'en';
    let lang = navigator.language.slice(0, 2).toLowerCase();
    switch (lang) {
        case 'en':
        case 'fr':
        case 'de':
            return lang;
        case 'es':
            return 'sp';
        default:
            return 'en';
    }
}

export const LocalizedProvider = (props: LocalizedProviderProps) => {
	const core = React.useContext(DataContext);
	const player = React.useContext(PlayerContext);
	const { children } = props;

	// Stored user preference
	const [preferredLanguage, setPreferredLanguage] = useStateWithStorage<SupportedLanguage | undefined>(
		'preferredLanguage',
		undefined,
		{
			rememberForever: true,
			onInitialize: (_storageKey: string, language: SupportedLanguage | undefined)  => {
				// If no language preference, use browser language
				if (!language) fetchGameStrings(getBrowserLanguage());
			}
		}
	);

	// Language and strings sent to UI
	const [language, setLanguage] = useStateWithStorage<SupportedLanguage | undefined>('localized/language', undefined);
	const [gameStrings, setGameStrings] = useStateWithStorage<IGameStrings>('localized/gamestrings', defaultGameStrings);

	// Update language on user preference change
	React.useEffect(() => {
		if (preferredLanguage) fetchGameStrings(preferredLanguage);
	}, [preferredLanguage]);

	// Update language on player data import (or revert to browser language on player data clear)
	//	Ignore player data change if user preferred language already set
	React.useEffect(() => {
		if (preferredLanguage) return;
		const playerLanguage: SupportedLanguage = (player.playerData?.player?.lang ?? getBrowserLanguage()) as SupportedLanguage;
		fetchGameStrings(playerLanguage);
	}, [player]);

	if (!language)
		return <span><Icon loading name='spinner' /> Loading translations...</span>;

	const localizedData: ILocalizedData = {
		...gameStrings,
		language,
		setPreferredLanguage,
		translateCore
	};

	return (
		<LocalizedContext.Provider key={language} value={localizedData}>
			{children}
		</LocalizedContext.Provider>
	);

	// Fetch translation and convert arrays to objects, as needed
	async function fetchGameStrings(newLanguage: SupportedLanguage): Promise<void> {
		if (language === newLanguage) return;

		// TODO: Rework CONFIG translations
		CONFIG.setLanguage(newLanguage);

		const translationResponse: Response = await fetch(`/structured/translation_${newLanguage}.json`);
		const translationJson: TranslationSet = await translationResponse.json();

		// Never assume symbols exist within archetypes
		//	Fall back to defaults (i.e. English) if they don't exist
		const crewArchetypes = {}, shipArchetypes = {}, collections = {}, itemArchetypes = {};
		if (newLanguage !== 'en') {
			translationJson.crew_archetypes.forEach(crew => {
				crewArchetypes[crew.symbol] = {
					name: crew.name,
					short_name: crew.short_name
				};
			});

			translationJson.ship_archetypes.forEach(ship => {
				shipArchetypes[ship.symbol] = {
					name: ship.name,
					flavor: ship.flavor,
					actions: ship.actions
				};
			});

			// Create a fake symbol for collections using collection id
			translationJson.collections.forEach(collection => {
				collections[`cc-${collection.id}`] = {
					name: collection.name,
					description: collection.description
				}
			});

			const itemsResponse: Response = await fetch(`/structured/items_${newLanguage}.json`);
			const itemsJson: ItemTranslation[] = await itemsResponse.json();
			itemsJson.forEach(item => {
				itemArchetypes[item.symbol] = {
					name: item.name,
					flavor: item.flavor
				};
			});
		}

		const translatedGameStrings: IGameStrings = {
			TRAIT_NAMES: translationJson.trait_names,
			SHIP_TRAIT_NAMES: translationJson.ship_trait_names,
			CREW_ARCHETYPES: crewArchetypes,
			SHIP_ARCHETYPES: shipArchetypes,
			COLLECTIONS: collections,
			ITEM_ARCHETYPES: itemArchetypes
		};
		setGameStrings({...translatedGameStrings});

		setLanguage(newLanguage);
	}

	function translateCore(): TranslatedCore {
		if (core.crew.length === 0) return {};
		const newCrew = postProcessCrewTranslations(core.crew, gameStrings);
		const [newSchematics, newShips] = postProcessShipTranslations(core.ship_schematics, core.ships, gameStrings)
		const newCollections = postProcessCollectionTranslations(core.collections, newCrew!, gameStrings);
		const newItems = postProcessItemTranslations(core.items,gameStrings);
		return {
			crew: newCrew,
			ship_schematics: newSchematics,
			ships: newShips,
			collections: newCollections,
			items: newItems
		};
	}

	function postProcessCollectionTranslations(collections: Collection[], mapped_crew: CrewMember[], translation: IGameStrings): Collection[] | undefined {
		const colmap = {} as {[key:string]:string};
		if (mapped_crew.length && collections.length && translation.COLLECTIONS) {
			let result = collections.map((col) => {
				col = { ...col };
				colmap[col.name] = col.name;
				let arch = translation.COLLECTIONS[`cc-${col.id}`];
				if (arch) {
					colmap[col.name] = arch.name;
					col.name = arch.name;
					col.description = arch.description;

				}
				return col;
			});
			mapped_crew.forEach((crew) => {
				crew.collections = crew.collections.map(col => colmap[col]);
			});
			return result;
		}
		else {
			return undefined;
		}
	}

	function postProcessCrewTranslations<T extends CrewMember>(crew: T[], translation: IGameStrings): T[] | undefined {
		if (crew.length && translation.CREW_ARCHETYPES) {
			return crew.map((crew) => {
				crew = { ... crew };
				let arch = translation.CREW_ARCHETYPES[crew.symbol];

				crew.traits_named = crew.traits.map(t => translation.TRAIT_NAMES[t]);

				let oldName = crew.name;
				crew.name = arch?.name ?? crew.name;
				if (!crew.name_english) {
					crew.name_english = oldName;
				}

				oldName = crew.short_name;
				crew.short_name = arch?.short_name ?? crew.short_name;
				if (!crew.short_name_english) {
					crew.short_name_english = oldName;
				}

				crew.events ??= 0;
				return crew;
			});
		}
		else {
			return undefined;
		}
	}

	function postProcessItemTranslations(items: EquipmentItem[], translation: IGameStrings): EquipmentItem[] | undefined {
		if (items.length && translation.ITEM_ARCHETYPES) {
			return items.map((item) => {
				item = { ... item };
				let arch = translation.ITEM_ARCHETYPES[item.symbol];
				let oldName = item.name;
				if (!item.name_english) item.name_english = oldName;
				if (arch) {
					item.name = arch.name;
					item.flavor = arch.flavor;
				}
				return item;
			})
		}
		else {
			return undefined;
		}
	}

	function postProcessShipTranslations(ship_schematics: Schematics[], ships: Ship[], translation: IGameStrings): [Schematics[], Ship[]] | [undefined, undefined] {
		if (ship_schematics.length && translation.SHIP_ARCHETYPES) {
			let result1 = ship_schematics.map((ship) => {
				ship = { ... ship, ship: { ... ship.ship, actions: ship.ship.actions ? JSON.parse(JSON.stringify(ship.ship.actions)) : undefined }};
				let arch = translation.SHIP_ARCHETYPES[ship.ship.symbol];
				ship.ship.flavor = arch?.flavor ?? ship.ship.flavor;
				ship.ship.traits_named = ship.ship.traits?.map(t => translation.SHIP_TRAIT_NAMES[t]);
				ship.ship.name = arch?.name ?? ship.ship.name;
				arch?.actions?.forEach((action) => {
					let act = ship.ship.actions?.find(f => f.symbol === action.symbol);
					if (act) {
						act.name = action.name;
					}
				});
				return ship;
			});
			let result2 = ships.map((ship) => {
				ship = { ... ship, actions: ship.actions ? JSON.parse(JSON.stringify(ship.actions)): undefined };
				let arch = translation.SHIP_ARCHETYPES[ship.symbol];
				ship.flavor = arch?.flavor ?? ship.flavor;
				ship.traits_named = ship.traits?.map(t => translation.SHIP_TRAIT_NAMES[t]);
				ship.name = arch?.name ?? ship.name;
				return ship;
			});
			return [result1, result2];
		}
		else {
			return [undefined, undefined];
		}
	}
};
