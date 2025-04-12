import React from 'react';
import { Icon } from 'semantic-ui-react';

import { Action, ItemTranslation, ShipTraitNames, TraitNames, TranslationSet } from '../model/traits';
import { CrewMember } from '../model/crew';
import { EquipmentItem } from '../model/equipment';
import { ReferenceShip, Schematics, Ship } from '../model/ship';
import { Collection } from '../model/game-elements';
import { CryoCollection, PlayerCrew, TranslateMethod } from '../model/player';
import { DataContext } from './datacontext';
import { PlayerContext, PlayerContextData } from './playercontext';
import CONFIG from '../components/CONFIG';
import { useStateWithStorage } from '../utils/storage';
import { allLevelsToLevelStats } from '../utils/shiputils';
//import { useTranslation } from 'react-i18next';

interface LocalizedProviderProps {
	children?: JSX.Element;
};

export type SupportedLanguage = 'en' | 'sp' | 'de' | 'fr';

export type JSXTranslateMethod = (key: string, options?: { [key: string]: string | JSX.Element }) => JSX.Element;

export type UseTMethod = (prefix: string) => { t: TranslateMethod, tfmt: JSXTranslateMethod };

export interface TranslatedCore {
	crew?: CrewMember[];
	ship_schematics?: Schematics[];
	ships?: Ship[];
	all_ships?: ReferenceShip[];
	collections?: Collection[];
	items?: EquipmentItem[];
};

interface ICrewArchetype {
	name: string;
	short_name: string;
	flavor?: string;
	action?: {
		name: string;
	};
};

export interface TranslationData {
	name: string;
}

export interface FlavorTranslationData extends TranslationData {
	flavor: string;
}

export interface CollectionTranslationData extends TranslationData {
	description: string;
}

export interface ShipTranslationData extends FlavorTranslationData {
	actions: Action[];
}


export type GameStringHash<T extends TranslationData> = { [symbol: string]: T }

interface ITraitStrings {
	TRAIT_NAMES: TraitNames;
	SHIP_TRAIT_NAMES: ShipTraitNames;
};


interface IGameStrings extends ITraitStrings {
	TRAIT_NAMES: TraitNames;
	SHIP_TRAIT_NAMES: ShipTraitNames;
	CREW_ARCHETYPES: {
		[symbol: string]: ICrewArchetype;
	};
	SHIP_ARCHETYPES: GameStringHash<ShipTranslationData>;
	COLLECTIONS: GameStringHash<CollectionTranslationData>;
	ITEM_ARCHETYPES: GameStringHash<FlavorTranslationData>;
};

export interface ILocalizedData extends IGameStrings {
	english: ITraitStrings;
	language: SupportedLanguage;
	setPreferredLanguage: (value: SupportedLanguage | undefined) => void;
	translateCore: () => TranslatedCore;
	translatePlayer: () => PlayerContextData;
	t: TranslateMethod,
	tfmt: JSXTranslateMethod,
	useT: UseTMethod
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
	english: defaultGameStrings,
	setPreferredLanguage: () => false,
	translateCore: () => { return {}; },
	translatePlayer: () => { return {} as PlayerContextData; },
	t: () => '',
	tfmt: () => <></>,
	useT: () => ({ t: () => '', tfmt: () => <></> })
};

export const LocalizedContext = React.createContext(DefaultLocalizedData);

export function getBrowserLanguage(): SupportedLanguage {
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
	const [webStringMap, setWebStringMap] = React.useState<{[key: string]: string}>({});
	const [fallbackMap, setFallbackMap] = React.useState<{[key: string]: string}>({});

	const [gameStrings, setGameStrings] = React.useState<IGameStrings>(defaultGameStrings);
	const [englishStrings, setEnglishStrings] = React.useState<ITraitStrings>(defaultGameStrings);

	// // Localized strings sent to UI
	// const [webStringMap, setWebStringMap] = useStateWithStorage<{[key: string]: string}>('localized/webstrings', {});
	// const [fallbackMap, setFallbackMap] = useStateWithStorage<{[key: string]: string}>('localized/fallback', {});

	// const [gameStrings, setGameStrings] = useStateWithStorage<IGameStrings>('localized/gamestrings', defaultGameStrings);


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
		if (!preferenceLoaded) return;
		if (!preferredLanguage) {
			if (player.playerData) {
				fetchStrings(player.playerData.player.lang as SupportedLanguage);
			}
			else {
				fetchStrings(getBrowserLanguage());
			}
		}
	}, [player]);

	// Don't render any text while localizations are still loading
	//if (!language) return <span><Icon loading name='spinner' /> Loading translations...</span>;
	if (!language) return <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'}}>&nbsp;<Icon name='500px' /></div>;

	const localizedData: ILocalizedData = {
		...gameStrings,
		english: englishStrings,
		language,
		setPreferredLanguage,
		translateCore,
		translatePlayer,
		t,
		tfmt,
		useT
	};

	return (
		<LocalizedContext.Provider key={language} value={localizedData}>
			{children}
		</LocalizedContext.Provider>
	);

	// Fetch translation and convert arrays to objects, as needed
	async function fetchStrings(newLanguage: SupportedLanguage): Promise<void> {
		// TODO: Rework CONFIG translations
		CONFIG.setLanguage(newLanguage);

		if (language === newLanguage && Object.keys(webStringMap).length)
			return;

		const webStringsResponse: Response =
			await fetch(`/structured/locales/${newLanguage}/translation.json`)
				.catch((e) => fetch(`/structured/locales/en/translation.json`));

		const webStringsJson: any = await webStringsResponse.json();

		const translationResponse: Response = await fetch(`/structured/translation_${newLanguage}.json`);
		const translationJson: TranslationSet = await translationResponse.json();

		const englishResponse = newLanguage == 'en' ? undefined : await fetch(`/structured/translation_en.json`);
		const englishJson: TranslationSet = englishResponse ? await englishResponse.json() : translationJson;

		let newFallbackMap = null as any;

		// if (!Object.keys(fallbackMap).length) {
		// 	if (newLanguage !== 'en') {
		// 		const fallbackResponse: Response = await fetch(`/structured/locales/en/translation.json`);
		// 		const fallbackJson: TranslationSet = await fallbackResponse.json();
		// 		newFallbackMap = fallbackJson;
		// 	}
		// 	else {
		// 		newFallbackMap = webStringsJson;
		// 	}
		// }

		// Only process game strings for non-English locales
		//	Remember to fall back to default values when directly accessing archetypes
		const crewArchetypes = {}, shipArchetypes = {}, collections = {}, itemArchetypes = {};
		if (newLanguage !== 'en') {
			translationJson.crew_archetypes.forEach(crew => {
				crewArchetypes[crew.symbol] = {
					name: crew.name,
					short_name: crew.short_name,
					flavor: crew.flavor,
					action: { ... crew.action }
				};
			});

			translationJson.ship_archetypes.forEach(ship => {
				shipArchetypes[ship.symbol] = {
					name: ship.name,
					flavor: ship.flavor,
					actions: ship.actions
				};
			});

			// Create a fake collection symbol based on id
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

		const englishStrings: ITraitStrings = {
			TRAIT_NAMES: englishJson.trait_names,
			SHIP_TRAIT_NAMES: englishJson.ship_trait_names
		};

		if (newFallbackMap) {
			setFallbackMap(makeWebstringMap(newFallbackMap));
		}

		setWebStringMap(makeWebstringMap(webStringsJson));
		setGameStrings({...translatedGameStrings});
		setEnglishStrings({...englishStrings});
		setLanguage(newLanguage);
	}

	function translateCore(): TranslatedCore {
		// No need to translate core for English
		if (core.crew.length === 0 || language === 'en')
			return {};

		const newCrew: CrewMember[] | undefined = postProcessCrewTranslations(core.crew, gameStrings);
		const [newSchematics, newShips, allShips] = postProcessShipTranslations(core.ship_schematics, core.ships, core.all_ships, gameStrings);
		const newCollections: Collection[] | undefined = postProcessCollectionTranslations(core.collections, newCrew!, gameStrings);
		const newItems: EquipmentItem[] | undefined = postProcessItemTranslations(core.items, gameStrings);
		return {
			crew: newCrew,
			ship_schematics: newSchematics,
			ships: newShips,
			all_ships: allShips,
			collections: newCollections,
			items: newItems
		};
	}

	function translatePlayer(): PlayerContextData {
		const { playerData } = player;
		if (!playerData) return player;

		// If COLLECTIONS is empty (i.e. language = English), collections may coalesce to values in player language
		const localizedCryo: CryoCollection[] = playerData.player.character.cryo_collections.map(collection => {
			const trcol = gameStrings.COLLECTIONS[`cc-${collection.type_id}`];
			return {
				...collection,
				name: trcol?.name ?? collection.name,
				description: trcol?.description ?? collection.description
			};
		});

		const localizedOwned: PlayerCrew[] = postProcessCrewTranslations(playerData.player.character.crew, gameStrings)!

		let localizedUnOwned: PlayerCrew[] | undefined = undefined;
		if (playerData.player.character.unOwnedCrew) {
			localizedUnOwned = postProcessCrewTranslations(playerData.player.character.unOwnedCrew, gameStrings)!;
		}

		let localizedShips: (Ship | ReferenceShip)[] | undefined = undefined;
		if (player.playerShips) {
			[,localizedShips,] = postProcessShipTranslations([], player.playerShips, [], gameStrings, true);
		}

		return {
			...player,
			playerData: {
				...playerData,
				player: {
					...playerData.player,
					character: {
						...playerData.player.character,
						cryo_collections: localizedCryo,
						crew: localizedOwned,
						unOwnedCrew: localizedUnOwned
					}
				}
			},
			playerShips: localizedShips as Ship[]
		};
	}

	function postProcessCollectionTranslations(collections: Collection[], mapped_crew: CrewMember[], translation: IGameStrings): Collection[] | undefined {
		if (mapped_crew.length && collections.length && translation.COLLECTIONS) {
			let result = collections.map((collection) => {
				collection = { ...collection };
				let trcol = translation.COLLECTIONS[`cc-${collection.id}`];
				if (trcol) {
					collection.name = trcol.name;
					collection.description = trcol.description;

				}
				return collection;
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

				const arch: ICrewArchetype | undefined = translation.CREW_ARCHETYPES[crew.symbol];
				if (arch) {
					let oldName: string = crew.name;
					crew.name = arch.name ?? crew.name;
					if (!crew.name_english) {
						crew.name_english = oldName;
					}

					oldName = crew.short_name;
					crew.short_name = arch.short_name ?? crew.short_name;
					if (!crew.short_name_english) {
						crew.short_name_english = oldName;
					}

					if (arch.flavor !== undefined) crew.flavor = arch.flavor;

					if (arch.action?.name !== undefined) {
						crew.action.name = arch.action.name;
					}
				}

				// What scenarios would coalesce to unknown names here?
				crew.traits_named = crew.traits.map(t => translation.TRAIT_NAMES[t] ?? `Unknown trait name ${t}`);
				crew.events ??= 0;
				if (crew.collection_ids.every(id => !!translation.COLLECTIONS[`cc-${id}`])) {
					crew.collections = crew.collection_ids.map(id => translation.COLLECTIONS[`cc-${id}`]?.name ?? `Unknown collection name ${id}`);
				}
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

	function postProcessShipTranslations(ship_schematics: Schematics[], ships: Ship[], all_ships: ReferenceShip[], translation: IGameStrings, ignoreSchematics?: boolean): [Schematics[], Ship[], ReferenceShip[]] | [undefined, undefined, undefined] {
		if ((ship_schematics.length || all_ships.length || ignoreSchematics) && translation.SHIP_ARCHETYPES) {
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
			let result3 = ignoreSchematics ? [] : all_ships.map((ship) => {
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
			return [result1, result2, result3];
		}
		else {
			return [undefined, undefined, undefined];
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

	function t(v: string, opts?: { [key: string]: string | number }) {
		opts ??= {};
		if ("__gender" in opts && !!opts["__gender"] && typeof opts["__gender"] === 'string') {
			let newkey = `${v}_${opts["__gender"]}`;
			if (newkey in webStringMap || newkey in fallbackMap) {
				v = newkey;
			}
		}
		try {
			let obj = webStringMap[v] ?? fallbackMap[v];
			if (opts && typeof obj === 'string') {
				let parts = getParts(obj);
				let finals = [] as string[];

				for (let part of parts) {
					if (part.startsWith("{{") && part.endsWith("}}")) {
						let key = part.slice(2, part.length - 2);
						if (key in opts) {
							finals.push(`${opts[key]}`);
						}
						else if (key in webStringMap) {
							finals.push(webStringMap[key]);
						}
						else if (key in fallbackMap) {
							finals.push(fallbackMap[key]);
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

	function tfmt(v: string, opts?: { [key: string]: string | JSX.Element | number }): JSX.Element {
		opts ??= {};
		if ("__gender" in opts && !!opts["__gender"] && typeof opts["__gender"] === 'string') {
			let newkey = `${v}_${opts["__gender"]}`;
			if (newkey in webStringMap || newkey in fallbackMap) {
				v = newkey;
			}
		}
		try {
			if (!webStringMap && !fallbackMap) return <>{v}</>;
			let obj = webStringMap[v] ?? fallbackMap[v];
			if (opts && typeof obj === 'string') {
				let parts = getParts(obj);
				let finals = [] as JSX.Element[];

				for (let part of parts) {
					if (part === '\n') {
						finals.push(<br />);
					}
					else if (part.startsWith("{{") && part.endsWith("}}")) {
						let key = part.slice(2, part.length - 2);
						if (key in opts) {
							finals.push(<>{opts[key]}</>);
						}
						else if (key in webStringMap) {
							finals.push(<>{webStringMap[key]}</>);
						}
						else if (key in fallbackMap) {
							finals.push(<>{fallbackMap[key]}</>);
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
				if (str[i] === '\n') {
					if (csp) {
						output.push(csp);
						output.push('\n');
					}
					csp = '';
				}
				else if (str[i] === '{' && i < c - 1 && str[i + 1] === '{') {
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
					if (csp === ':') output.push('{{global.colon}}')
					else if (csp) output.push(`{{${csp}}}`);
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

	function useT(prefix: string) {
		prefix = prefix.replace(/\.\./g, '.');
		if (prefix.endsWith(".")) prefix = prefix.slice(0, prefix.length - 1);
		if (prefix.startsWith(".")) prefix = prefix.slice(1);

		const usePrefix = prefix;

		const newFunc = (key: string, options?: {[key:string]: string | number }) => {
			return t(`${usePrefix}.${key}`, options);
		}

		const newFmtFnc = (key: string, options?: {[key:string]: string | JSX.Element | number }) => {
			return tfmt(`${usePrefix}.${key}`, options);
		}

		return {
			t: newFunc,
			tfmt: newFmtFnc
		};
	}
};
