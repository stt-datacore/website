import React from 'react';
import { Icon } from 'semantic-ui-react';

import { Action, ItemTranslation, ShipTraitNames, TraitNames, TranslationSet } from '../model/traits';
import { PlayerContext } from './playercontext';

import { useStateWithStorage } from '../utils/storage';
import CONFIG from '../components/CONFIG';
import { DataContext, ICoreContext } from './datacontext';
import { CrewMember } from '../model/crew';
import { EquipmentItem } from '../model/equipment';
import { Schematics, Ship } from '../model/ship';
import { Collection } from '../model/game-elements';
import { mergeShips } from '../utils/shiputils';

interface LocalizedProviderProps {
	children?: JSX.Element;
};

export type SupportedLanguage = 'en' | 'sp' | 'de' | 'fr';

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
		[id: string]: {
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

interface TranslatedCore {
	crew?: CrewMember[];
	ship_schematics?: Schematics[];
	ships?: Ship[];
	collections?: Collection[];
	items?: EquipmentItem[];
}

export const LocalizedProvider = (props: LocalizedProviderProps) => {
	const player = React.useContext(PlayerContext);
	const coreData = React.useContext(DataContext);

	const { children } = props;

	// Stored user preference
	const [preferredLanguage, setPreferredLanguage] = useStateWithStorage<SupportedLanguage | undefined>(
		'preferredLanguage',
		undefined,
		{
			rememberForever: true,
			onInitialize: () => initLanguage()
		}
	);

	const [language, setLanguage] = useStateWithStorage<SupportedLanguage | undefined>('localized/language', undefined);
	const [gameStrings, setGameStrings] = useStateWithStorage<IGameStrings>('localized/gamestrings', defaultGameStrings);
	const [translated, setTranslated] = React.useState<TranslatedCore>({});	
	
	// Fetch and process game translation/items files on language change
	
	React.useEffect(() => {
		processGameStrings();
	}, [language, coreData]);

	// Override preferred language with language set in-game (Or should preferred override in-game?)
	React.useEffect(() => {
		if (player.playerData?.player?.lang) {
			setLanguage(player.playerData.player.lang as SupportedLanguage);
		}
	}, [player]);

	if (!language)
		return <span><Icon loading name='spinner' /> Loading translations...</span>;

	const localizedData: ILocalizedData = {
		...gameStrings,
		language,
		setPreferredLanguage
	};

	if (translated && Object.keys(translated)?.length && player.playerData) {
		player.playerData.player.character.crew = postProcessCrewTranslations(player.playerData.player.character.crew, gameStrings)!
		player.playerShips = mergeShips(translated.ship_schematics!, player.playerData.player.character.ships);
	}

	const newCoreData: ICoreContext = {
		...coreData,
		...translated
	};

	return (		
		<DataContext.Provider value={newCoreData}>
			<PlayerContext.Provider value={player}>
				<LocalizedContext.Provider value={localizedData}>		
					{children}
				</LocalizedContext.Provider>
			</PlayerContext.Provider>
		</DataContext.Provider>
	);

	// Set initial language from preference; if no preference exists, use browser language
	function initLanguage(): void {
		if (preferredLanguage) {
			setLanguage(preferredLanguage);
		}
		else {
			setLanguage(getBrowserLanguage);
		}
	}

	// Convert translation arrays to objects, as needed
	async function processGameStrings(): Promise<void> {
		if (!language) return;
		
		// TODO: Rework CONFIG translations
		CONFIG.setLanguage(language);

		const translationResponse: Response = await fetch(`/structured/translation_${language}.json`);
		const translationJson: TranslationSet = await translationResponse.json();

		const crewArchetypes = {};
		translationJson.crew_archetypes.forEach(crew => {
			crewArchetypes[crew.symbol] = {
				name: crew.name,
				short_name: crew.short_name
			};
		});

		const shipArchetypes = {};
		translationJson.ship_archetypes.forEach(ship => {
			shipArchetypes[ship.symbol] = {
				name: ship.name,
				flavor: ship.flavor,
				actions: ship.actions
			};
		});

		const collections = {};
		translationJson.collections.forEach(collection => {
			collections[`${collection.id}`] = {
				name: collection.name,
				description: collection.description
			}
		});

		const itemArchetypes = {};
		if (language !== 'en') {
			const itemsResponse: Response = await fetch(`/structured/items_${language}.json`);
			const itemsJson: ItemTranslation[] = await itemsResponse.json();
			itemsJson.forEach(item => {
				itemArchetypes[item.symbol] = {
					name: item.name,
					flavor: item.flavor
				};
			});
		}
		else {
			const itemsJson: EquipmentItem[] = coreData.items;
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

		if (coreData?.crew?.length) {
			let newCrew = postProcessCrewTranslations(coreData.crew, translatedGameStrings);
			let [newSchematics, newShips] = postProcessShipTranslations(coreData.ship_schematics, coreData.ships, translatedGameStrings)
			let newCollections = postProcessCollectionTranslations(coreData.collections, newCrew!, translatedGameStrings);
			let newItems = postProcessItemTranslations(coreData.items, translatedGameStrings);
			setTranslated({ crew: newCrew, ship_schematics: newSchematics, ships: newShips, collections: newCollections, items: newItems });
		}

		setGameStrings({...translatedGameStrings});
	}
	
	function postProcessCollectionTranslations(collections: Collection[], mapped_crew: CrewMember[], translation: IGameStrings): Collection[] | undefined {
		const colmap = {} as {[key:string]:string};
		if (mapped_crew.length && collections.length && translation.COLLECTIONS) {
			let result = collections.map((col) => {
				col = { ...col };
				let arch = translation.COLLECTIONS[col.id];
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
