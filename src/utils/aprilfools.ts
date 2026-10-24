const DISABLED_KEY = 'hahaDone';
const STYLE_ID = 'april-fools';

export function isAprilFools(): boolean {
	const now = new Date();
	return now.getMonth() === 3 && now.getDate() === 1;
}

export function isAprilFoolsDisabled(): boolean {
	return localStorage.getItem(DISABLED_KEY) === '1';
}

/** Flips the user's opt-out; immediately applies the change */
export function toggleAprilFools(): void {
	if (isAprilFoolsDisabled()) {
		localStorage.removeItem(DISABLED_KEY);
	}
	else {
		localStorage.setItem(DISABLED_KEY, '1');
	}

	applyAprilFools();
}

/** Safe to call repeatedly; the style is only added once */
export function applyAprilFools(): void {
	if (!isAprilFools()) {
		// Reset the opt-out so it doesn't carry over to next year
		localStorage.removeItem(DISABLED_KEY);
		return;
	}

	const existing = document.getElementById(STYLE_ID);
	if (isAprilFoolsDisabled()) {
		existing?.remove();
		return;
	}
	if (existing) return;

	const style = document.createElement('style');
	style.id = STYLE_ID;
	style.innerHTML = 'img { transform: rotate(180deg); }';
	document.head.appendChild(style);
}
