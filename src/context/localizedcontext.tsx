import React from 'react';
import { Icon } from 'semantic-ui-react';

import { Action, ItemTranslation, ShipTraitNames, TraitNames, TranslationSet } from '../model/traits';
import { CrewMember } from '../model/crew';
import { EquipmentItem } from '../model/equipment';
import { Schematics, Ship } from '../model/ship';
import { Collection } from '../model/game-elements';
import { DataContext, ICoreContext } from './datacontext';
import { PlayerContext, PlayerContextData } from './playercontext';
import CONFIG from '../components/CONFIG';
import { useStateWithStorage } from '../utils/storage';
//import { useTranslation } from 'react-i18next';

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
			flavor: string;
			action: {
				name: string;
			}
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
	setPreferredLanguage: (value: SupportedLanguage | undefined) => void;
	translateCore: () => TranslatedCore;
	translatePlayer: (localizedCore: ICoreContext) => PlayerContextData;
	t: (value: string, options?: { [key: string]: string }) => string,
	tfmt(v: string, opts?: { [key: string]: string | JSX.Element }): JSX.Element
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
	translateCore: () => { return {}; },
	translatePlayer: () => { return {} as PlayerContextData; },
	t: () => '',
	tfmt: () => <></>
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
	//const { t, i18n } = useTranslation();
	const core = React.useContext(DataContext);
	const player = React.useContext(PlayerContext);
	const { children } = props;
	const collectionMap = {} as {[key:string]:string};

	// Stored user preference for language
	const [preferredLanguage, setPreferredLanguage] = useStateWithStorage<SupportedLanguage | undefined>(
		'preferredLanguage',
		undefined,
		{
			rememberForever: true,
			onInitialize: (_storageKey: string, language: SupportedLanguage | undefined)  => {
				// If no language preference, use browser language
				if (!language) fetchStrings(getBrowserLanguage());
				setPreferenceLoaded(true);
			}
		}
	);
	const [preferenceLoaded, setPreferenceLoaded] = React.useState<boolean>(false);

	const [language, setLanguage] = useStateWithStorage<SupportedLanguage | undefined>('localized/language', undefined);

	// Localized strings sent to UI
	const [webStringMap, setWebStringMap] = useStateWithStorage<{[key: string]: string}>('localized/webstrings', {});
	const [gameStrings, setGameStrings] = useStateWithStorage<IGameStrings>('localized/gamestrings', defaultGameStrings);

	// Update language on user preference change
	React.useEffect(() => {
		if (preferredLanguage) {
			fetchStrings(preferredLanguage);
		}
		else if (preferenceLoaded) {
			fetchStrings(getBrowserLanguage());
		}
	}, [preferredLanguage]);

	// Update language on player data import (or revert to browser language on player data clear)
	React.useEffect(() => {
		if (!preferredLanguage) {
			if (player.playerData) {
				fetchStrings(player.playerData.player.lang as SupportedLanguage);
			}
			else {
				fetchStrings(getBrowserLanguage());
			}
		}
	}, [player]);

	if (!language)
		return <span><Icon loading name='spinner' /> Loading translations...</span>;

	const localizedData: ILocalizedData = {
		...gameStrings,
		language,
		setPreferredLanguage,
		translateCore,
		translatePlayer,
		t,
		tfmt
	};

	return (
		<LocalizedContext.Provider key={language} value={localizedData}>
			{children}
		</LocalizedContext.Provider>
	);

	// Fetch translation and convert arrays to objects, as needed
	async function fetchStrings(newLanguage: SupportedLanguage): Promise<void> {
		if (language === newLanguage)
			return;

		const webStringsResponse: Response =
			await fetch(`/structured/locales/${newLanguage}/translation.json`)
				.catch((e) => fetch(`/structured/locales/en/translation.json`));

		const webStringsJson: any = await webStringsResponse.json();
	
		// TODO: Rework CONFIG translations
		CONFIG.setLanguage(newLanguage);

		const translationResponse: Response = await fetch(`/structured/translation_${newLanguage}.json`);
		const translationJson: TranslationSet = await translationResponse.json();

		// Only process game strings for non-English locales
		//	Remember to fall back to default values when directly accessing archetypes
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

		setWebStringMap(makeWebstringMap(webStringsJson));
		setGameStrings({...translatedGameStrings});

		setLanguage(newLanguage);
	}

	function translateCore(): TranslatedCore {
		// No need to translate core for English
		if (core.crew.length === 0 || language === 'en')
			return {};

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

	function translatePlayer(localizedCore: ICoreContext): PlayerContextData {
		const localizedPlayer: PlayerContextData = {...player};
		const { playerData } = player;

		if (!playerData) return localizedPlayer;

		if (playerData && Object.keys(collectionMap).length) {
			playerData.player.character.cryo_collections.forEach((col) => {
				if (gameStrings.COLLECTIONS[`cc-${col.type_id}`]) {
					let trcol = gameStrings.COLLECTIONS[`cc-${col.type_id}`];
					col.name = trcol.name;
					col.description = trcol.description;
				}
			});

			playerData.player.character.crew = postProcessCrewTranslations(playerData.player.character.crew, gameStrings)!;
			playerData.player.character.crew.forEach((crew) => {
				let coreCrew = localizedCore.crew.find(f => f.symbol === crew.symbol);
				if (coreCrew) crew.collections = coreCrew.collections.map(col => collectionMap[col]);
			});
			if (playerData.player.character.unOwnedCrew) {
				playerData.player.character.unOwnedCrew = postProcessCrewTranslations(playerData.player.character.unOwnedCrew, gameStrings)!;
				playerData.player.character.unOwnedCrew.forEach((crew) => {
					let coreCrew = localizedCore.crew.find(f => f.symbol === crew.symbol);
					if (coreCrew) crew.collections = coreCrew.collections.map(col => collectionMap[col]);
				});
			}
		}
		if (localizedPlayer.playerShips) {
			[,localizedPlayer.playerShips] = postProcessShipTranslations([], localizedPlayer.playerShips, gameStrings, true);
		}
		return localizedPlayer;
	}

	function postProcessCollectionTranslations(collections: Collection[], mapped_crew: CrewMember[], translation: IGameStrings): Collection[] | undefined {
		if (mapped_crew.length && collections.length && translation.COLLECTIONS) {
			let result = collections.map((col) => {
				col = { ...col };
				collectionMap[col.name] = col.name;
				let arch = translation.COLLECTIONS[`cc-${col.id}`];
				if (arch) {
					collectionMap[col.name] = arch.name;
					col.name = arch.name;
					col.description = arch.description;

				}
				return col;
			});
			mapped_crew.forEach((crew) => {
				crew.collections = crew.collections.map(col => collectionMap[col]);
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
				
				if (arch.flavor !== undefined) crew.flavor = arch.flavor;
				if (arch.action?.name !== undefined) {
					crew.action.name = arch.action.name;
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

	function postProcessShipTranslations(ship_schematics: Schematics[], ships: Ship[], translation: IGameStrings, ignoreSchematics?: boolean): [Schematics[], Ship[]] | [undefined, undefined] {
		if ((ship_schematics.length || ignoreSchematics) && translation.SHIP_ARCHETYPES) {
			let result1 = ignoreSchematics ? [] : ship_schematics.map((ship) => {
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
				arch?.actions?.forEach((action) => {
					let act = ship.actions?.find(f => f.symbol === action.symbol);
					if (act) {
						act.name = action.name;
					}
				});
				return ship;
			});
			return [result1, result2];
		}
		else {
			return [undefined, undefined];
		}
	}

	function makeWebstringMap(translations: Object, current?: { [key: string]: string }, currentName?: string): { [key: string]: string } {
		current ??= {};
		currentName ??= '';

		let keys = Object.keys(translations);
		for (let key of keys) {
			let fullkey = `${currentName ? currentName + '.' : ''}${key}`;
			if (typeof translations[key] === 'string' || typeof translations[key] === 'number' || typeof translations[key] === 'boolean') {
				current[fullkey] = translations[key] ? `${translations[key]}` : '';
			}
			else if (translations[key]) {
				makeWebstringMap(translations[key], current, fullkey);
			}
		}
		return current;
	}
	
	function t(v: string, opts?: { [key: string]: string }) {
		opts ??= {};
		try {
			let obj = webStringMap[v];
			if (opts && typeof obj === 'string') {
				let parts = getParts(obj);
				let finals = [] as string[];

				for (let part of parts) {
					if (part.startsWith("{{") && part.endsWith("}}")) {
						let key = part.slice(2, part.length - 2);
						if (key in opts) {
							finals.push(opts[key]);
						}
						else if (key in webStringMap) {
							finals.push(webStringMap[key]);
						}
					}
					else {
						finals.push(part);
					}
				}
				return finals.reduce((p, n) => p ? p + n : n);				
			}
			return obj;
		}
		catch {
			return v;
		}
	}

	function tfmt(v: string, opts?: { [key: string]: string | JSX.Element }): JSX.Element {
		opts ??= {};
		try {
			if (!webStringMap) return <>{v}</>;
			let obj = webStringMap[v];
			if (opts && typeof obj === 'string') {				
				let parts = getParts(obj);
				let finals = [] as JSX.Element[];

				for (let part of parts) {
					if (part.startsWith("{{") && part.endsWith("}}")) {
						let key = part.slice(2, part.length - 2);
						if (key in opts) {
							finals.push(<>{opts[key]}</>);
						}
						else if (key in webStringMap) {
							finals.push(<>{webStringMap[key]}</>);
						}
					}
					else {
						finals.push(<>{part}</>);
					}
				}
				return finals.reduce((p, n) => p ? <>{p}{n}</> : <>{n}</>);				
			}
			else {
				return <>{obj}</>
			}
		}
		catch {
			return <>{v}</>;
		}
	}


	function getParts(str: string) {
		let output = [] as string[];
		let c = str.length;
		let inthing = false;
		let csp = "";

		for (let i = 0; i < c; i++) {
			if (!inthing) {
				if (str[i] === '{' && i < c - 1 && str[i + 1] === '{') {
					if (csp) output.push(csp);
					csp = '';
					inthing = true;
					i++;
				}
				else {
					csp += str[i];
				}
			}			
			else {
				if (str[i] === '}' && i < c - 1 && str[i + 1] === '}') {
					if (csp) output.push(`{{${csp}}}`);
					csp = '';
					inthing = false;
					i++;
				}
				else {
					csp += str[i];
				}
			}			
		}
		if (csp) output.push(csp);
		return output;
	}

};
