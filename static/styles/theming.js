const g_defaultTheme = '/styles/semantic.css';
const g_darkTheme = '/styles/semantic.slate.css';

var themeLink;

function setThemeCss(dark) {
	let theme = dark ? 'dark' : 'lite';
	if (window && window.localStorage) {
		window.localStorage.setItem('theme', theme);
	}

	let themeUrl = dark ? g_darkTheme : g_defaultTheme;

	if (!themeLink) {
		themeLink = document.createElement('link');

		themeLink.type = 'text/css';
		themeLink.rel = 'stylesheet';
		themeLink.href = themeUrl;

		document.head.appendChild(themeLink);
	} else {
		themeLink.href = themeUrl;
	}
}

function getPreferredColorScheme() {
	if (window && window.matchMedia) {
		if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
			return 'dark';
		} else {
			return 'lite';
		}
	}
	return 'dark';
}

function swapThemeCss(reverse) {
	let theme = window && window.localStorage ? window.localStorage.getItem('theme') : 'dark';

	if (!theme) {
		// First time visiting the website, use preferred color scheme
		theme = 'dark';
	}

	setThemeCss(reverse ? theme === 'dark' : theme !== 'dark');
}

function aprilFools() {
	let now = new Date();
	if (now.getMonth() == 3 && now.getDate() == 1) {
		if (typeof localStorage !== undefined) {
			let b = localStorage.getItem("hahaDone");
			if (b && b === '1') return;
		}
		let style = document.createElement('style');
		style.innerHTML = 'img { transform: rotate(180deg); }';
		document.head.appendChild(style);
	}
	else {
		if (typeof localStorage !== undefined) {
			localStorage.removeItem("hahaDone");
		}	
	}
}

swapThemeCss(true);
aprilFools();