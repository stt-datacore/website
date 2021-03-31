import React from 'react';
import * as localForage from 'localforage';

interface StorageOptions {
	rememberForever?: boolean;	// We store in session unless told to remember forever
	useDefault?: boolean;	// Use default value as initial value instead of any stored value
	useAndStoreDefault?: boolean;	// Use default and store it immediately to avoid render loops
}

const StorageDefaultOptions: StorageOptions = {
	rememberForever: false,
	useDefault: false,
	useAndStoreDefault: false
}

export const useStateWithStorage = (itemKey: string, itemDefault: any, options?: StorageOptions) => {
	if (!options) options = StorageDefaultOptions;

	// Set initial value (either from storage or default value) in state
	const [value, setValue] = React.useState(() => {
			if (options.useAndStoreDefault) {
				storeItem(itemKey, itemDefault, options.rememberForever);
				return itemDefault;
			}
			if (options.useDefault) return itemDefault;
			return getItem(itemKey, itemDefault, options.rememberForever);
		}
	);

	// Update stored value when value changed in state
	React.useEffect(() => { storeItem(itemKey, value, options.rememberForever); }, [value]);

	return [value, setValue];
};

// Use JSON.stringify and JSON.parse to preserve item types when storing, getting
const storeItem = (itemKey: string, itemValue: any, rememberForever: boolean) => {
	if (rememberForever)
		localForage.setItem(itemKey, JSON.stringify(itemValue));
	else
		sessionStorage.setItem(itemKey, JSON.stringify(itemValue));
};
const getItem = (itemKey: string, itemDefault: any, rememberForever: boolean) => {
	let storedValue = rememberForever ? localForage.getItem(itemKey) : sessionStorage.getItem(itemKey);
	if (!storedValue) return itemDefault;
	return JSON.parse(storedValue);
};