const g_liteTheme = '/styles/semantic.css';
const g_darkTheme = '/styles/semantic.slate.css';

function setThemeCss(dark) {
	let sheet = document.getElementById('themeCSS');
	if (!sheet) {
		return;
	}

	window.localStorage.setItem('theme', dark ? 'dark' : 'lite');
	sheet.setAttribute('href', dark ? g_darkTheme : g_liteTheme);
}

function swapThemeCss() {
	let sheet = document.getElementById('themeCSS');
	if (!sheet) {
		return;
	}

	setThemeCss(sheet.getAttribute('href') === g_liteTheme);
}

if (window) {
	window.onload = function() {
		let theme = (window && window.localStorage) ? window.localStorage.getItem('theme') : 'dark';
		setThemeCss(theme === 'dark');
	};
}
