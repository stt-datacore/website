import React from 'react';
import * as localForage from 'localforage';
import * as lz from 'lz-string';

const COMPRESSION_SUFFIX = "___Lz";

const windowGlobal = typeof window !== 'undefined' && window;

interface StorageOptions {

	/** We always store in session; we can also store in local storage if told to remember forever */
	rememberForever?: boolean;

	/** Avoid session storage. Must be used in conjuction with rememberForever */
	avoidSessionStorage?: boolean;

	/** Set to true to use default value as initial value instead of any stored value */
	useDefault?: boolean;

	/** Set to true to use default and store it immediately to avoid render loops */
	useAndStoreDefault?: boolean;

	/** Callback after value is initialized */
	onInitialize?: (itemKey: string, itemValue: any) => void;

	/** True to compress */
	compress?: boolean;
};

/**
 * Create a React state based on localForage (indexDB) or sessionStorage
 * @param itemKey The item's storage key
 * @param itemDefault The item's default value
 * @param options StorageOptions
 * @returns {[T, React.Dispatch<React.SetStateAction<T>>]} stateful value and setter method
 */
export function useStateWithStorage<T>(itemKey: string, itemDefault: T, options?: StorageOptions): [T, React.Dispatch<React.SetStateAction<T>>] {
	const [initialized, setInitialized] = React.useState(false);

	// Set initial value in state
	const [value, setValue] = React.useState<T>(() => {
		// Use default value if requested
		if (options?.useAndStoreDefault) {
			storeItem(itemKey, itemDefault, options?.rememberForever, options?.compress, options?.avoidSessionStorage);
			return itemDefault;
		}
		if (options?.useDefault) return itemDefault;
		if (options?.rememberForever) {
			// Always use session value if set, even if set to remember forever
			const sessionValue = getStoredItem(itemKey, undefined);
			if (sessionValue !== undefined) {
				return sessionValue;
			}
			// Otherwise use default value with the intent to update from local storage when ready
			else {
				return itemDefault;
			}
		}
		return getStoredItem(itemKey, itemDefault);
	});

	// On component mount, update from local storage if necessary
	React.useEffect(() => {
		const sessionValue = getStoredItem(itemKey, undefined);
		if (options?.rememberForever && sessionValue === undefined)  {
			getStoredItemPromise(itemKey, itemDefault).then((storedValue) => {
				setValue(storedValue as T);
				setInitialized(true);
			});
		}
		else {
			setInitialized(true);
		}
	}, []);

	// Send message that value is done initializing and what the value is
	React.useEffect(() => {
		if (initialized && options?.onInitialize) options.onInitialize(itemKey, value);
	}, [initialized]);

	// Update stored value when value changed in state
	React.useEffect(() => {
		// Remove from store (or ignore) if new value is undefined or default
		if (value === undefined || value === itemDefault) {
			if (initialized) removeStoredItem(itemKey);
		}
		else {
			storeItem(itemKey, value, options?.rememberForever, options?.compress, options?.avoidSessionStorage);
		}
	}, [value]);

	return [value, setValue];
};

// Use JSON.stringify and JSON.parse to preserve item types when storing, getting
const storeItem = (itemKey: string, itemValue: any, useLocalStorage: boolean = false, compress: boolean = false, avoidSessionStorage = false) => {
	if (windowGlobal && windowGlobal.sessionStorage && !avoidSessionStorage) {
		if (compress) {
			windowGlobal.sessionStorage.setItem(itemKey + COMPRESSION_SUFFIX, lz.compressToBase64(JSON.stringify(itemValue)));
		}
		else {
			windowGlobal.sessionStorage.setItem(itemKey, JSON.stringify(itemValue));
		}
	}

	if (useLocalStorage) {
		if (compress) {
			localForage.setItem(itemKey + COMPRESSION_SUFFIX, lz.compressToBase64(JSON.stringify(itemValue)));
		}
		else {
			localForage.setItem(itemKey, JSON.stringify(itemValue));
		}
	}
	// Remove locally stored item if local storage no longer needed, but item currently saved there
	else {
		localForage.removeItem(itemKey);
		localForage.removeItem(itemKey + COMPRESSION_SUFFIX);
	}
};

export const getStoredItem = (itemKey: string, itemDefault: any) => {
	try {
		if (windowGlobal && windowGlobal.sessionStorage) {
			let sessionValue = windowGlobal.sessionStorage.getItem(itemKey);
			if (!sessionValue) {
				sessionValue = windowGlobal.sessionStorage.getItem(itemKey + COMPRESSION_SUFFIX);
				if (sessionValue) {
					sessionValue = lz.decompressFromBase64(sessionValue);
				}
			}
			if (sessionValue) {
				return JSON.parse(sessionValue);
			}
		}
	}
	catch {
	}

	return itemDefault;
};

const getStoredItemPromise = (itemKey: string, itemDefault: any) => {
	return new Promise(async (resolve, reject) => {
		let localValue = await localForage.getItem<string>(itemKey);
		if (!localValue) {
			localValue = await localForage.getItem<string>(itemKey + COMPRESSION_SUFFIX);
			if (localValue) {
				localValue = lz.decompressFromBase64(localValue);
			}
		}
		if (localValue) {
			resolve(JSON.parse(localValue as string));
		}
		else {
			resolve(itemDefault);
		}
	});
};

const removeStoredItem = (itemKey: string) => {
	if (windowGlobal && windowGlobal.sessionStorage)
		windowGlobal.sessionStorage.removeItem(itemKey);
	localForage.removeItem(itemKey);
	localForage.removeItem(itemKey + COMPRESSION_SUFFIX);
};
