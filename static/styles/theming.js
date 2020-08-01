const g_defaultTheme = '/styles/semantic.css';
const g_darkTheme = '/styles/semantic.slate.css';

function swapThemeCss() {
	let sheet = document.querySelector('#themeCSS');
	if (!sheet) {
		return;
	}

	if (sheet.getAttribute('href') === g_defaultTheme) {
		sheet.setAttribute('href', g_darkTheme);
		window.localStorage.setItem('theme', 'dark');
	} else {
		sheet.setAttribute('href', g_defaultTheme);
		window.localStorage.setItem('theme', 'lite');
	}
}

function setThemeCss(dark) {
	let sheet = document.querySelector('#themeCSS');
	if (!sheet) {
		return;
	}

	sheet.setAttribute('href', dark ? g_darkTheme : g_defaultTheme);
}

let theme = (windowGlobal && window.localStorage && window.localStorage.getItem('theme')) ? window.localStorage.getItem('theme') : 'lite';
if (theme) {
	setThemeCss(theme === 'dark');
}
