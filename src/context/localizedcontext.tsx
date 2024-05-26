import React from 'react';
import { Icon } from 'semantic-ui-react';

import { Action, ItemTranslation, ShipTraitNames, TraitNames, TranslationSet } from '../model/traits';
import { PlayerContext } from './playercontext';

import { useStateWithStorage } from '../utils/storage';

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

export const LocalizedProvider = (props: LocalizedProviderProps) => {
	const player = React.useContext(PlayerContext);
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

	// Fetch and process game translation/items files on language change
	React.useEffect(() => {
		processGameStrings();
	}, [language]);

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

	return (
		<LocalizedContext.Provider value={localizedData}>
			{children}
		</LocalizedContext.Provider>
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

		const translatedGameStrings: IGameStrings = {
			TRAIT_NAMES: translationJson.trait_names,
			SHIP_TRAIT_NAMES: translationJson.ship_trait_names,
			CREW_ARCHETYPES: crewArchetypes,
			SHIP_ARCHETYPES: shipArchetypes,
			COLLECTIONS: collections,
			ITEM_ARCHETYPES: itemArchetypes
		};
		setGameStrings({...translatedGameStrings});
	}
};
