import React from 'react';
import { Icon } from 'semantic-ui-react';

import { Action, ItemTranslation, ShipTraitNames, TraitNames, TranslationSet } from '../model/traits';
import { PlayerContext } from './playercontext';

import CONFIG from '../components/CONFIG';
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

	// Language and strings sent to UI
	const [language, setLanguage] = useStateWithStorage<SupportedLanguage | undefined>('localized/language', undefined);
	const [gameStrings, setGameStrings] = useStateWithStorage<IGameStrings>('localized/gamestrings', defaultGameStrings);

	// Update language on user preference change
	React.useEffect(() => {
		if (preferredLanguage) processGameStrings(preferredLanguage);
	}, [preferredLanguage]);

	// Update language on player data import (or revert to browser language on player data clear)
	//	Ignore player data change if user preferred language already set
	React.useEffect(() => {
		if (preferredLanguage) return;
		const playerLanguage: SupportedLanguage = (player.playerData?.player?.lang ?? getBrowserLanguage()) as SupportedLanguage;
		processGameStrings(playerLanguage);
	}, [player]);

	if (!language)
		return <span><Icon loading name='spinner' /> Loading translations...</span>;

	const localizedData: ILocalizedData = {
		...gameStrings,
		language,
		setPreferredLanguage
	};

	return (
		<LocalizedContext.Provider key={language} value={localizedData}>
			{children}
		</LocalizedContext.Provider>
	);

	// Set initial language from preference; if no preference exists, use browser language
	function initLanguage(): void {
		if (preferredLanguage) {
			processGameStrings(preferredLanguage);
		}
		else {
			processGameStrings(getBrowserLanguage());
		}
	}

	// Fetch translation and convert arrays to objects, as needed
	async function processGameStrings(newLanguage: SupportedLanguage): Promise<void> {
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
};
