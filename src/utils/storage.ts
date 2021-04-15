import React from 'react';
import * as localForage from 'localforage';

interface StorageOptions {
	rememberForever?: boolean;	// We store in session unless told to remember forever
	useDefault?: boolean;	// Set to true to use default value as initial value instead of any stored value
	useAndStoreDefault?: boolean;	// Set to true to use default and store it immediately to avoid render loops
};

const StorageDefaultOptions: StorageOptions = {
	rememberForever: false,
	useDefault: false,
	useAndStoreDefault: false
};

export const useStateWithStorage = (itemKey: string, itemDefault: any, options?: StorageOptions) => {
	if (!options) options = StorageDefaultOptions;

	const ref = React.useRef();

	// Start with default value in state
	const [value, setValue] = React.useState(itemDefault);

	// Update stored value when value changed in state
	//	Remove from store (or ignore) if non-initial value is undefined or default
	React.useEffect(() => {
		if (value === undefined || value == itemDefault) {
			if (ref.current != undefined) {
				removeStoredItem(itemKey, options.rememberForever);
			}
		}
		else {
			storeItem(itemKey, value, options.rememberForever);
		}
		ref.current = value;
	}, [value]);

	React.useEffect(() => {
		// On component mount: override stored value if requested
		if (options.useAndStoreDefault) {
			setValue(itemDefault);
		}
		// Otherwise update value with stored value
		else if (!options.useDefault) {
			getStoredItem(itemKey, itemDefault, options.rememberForever).then((storedValue) => {
				setValue(storedValue);
			});
		}
	}, []);

	return [value, setValue];
};

// Use JSON.stringify and JSON.parse to preserve item types when storing, getting
const storeItem = (itemKey: string, itemValue: any, useLocalStorage: boolean) => {
	if (useLocalStorage) {
		localForage.setItem(itemKey, JSON.stringify(itemValue));
	}
	else {
		sessionStorage.setItem(itemKey, JSON.stringify(itemValue));
	}
};
const getStoredItem = (itemKey: string, itemDefault: any, useLocalStorage: boolean) => {
	return new Promise((resolve, reject) => {
		if (useLocalStorage) {
			localForage.getItem(itemKey).then((localValue) => {
				if (!localValue) {
					resolve(itemDefault);
				}
				else {
					resolve(JSON.parse(localValue));
				}
			});
		}
		else {
			let sessionValue = sessionStorage.getItem(itemKey);
			if (!sessionValue) {
				resolve(itemDefault);
			}
			else {
				resolve(JSON.parse(sessionValue));
			}
		}
	});
};
const removeStoredItem = (itemKey: string, useLocalStorage: boolean) => {
	if (useLocalStorage) {
		localForage.removeItem(itemKey);
	}
	else {
		sessionStorage.removeItem(itemKey);
	}
};