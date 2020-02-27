const g_defaultTheme = '/styles/semantic.css';
const g_darkTheme = '/styles/semantic.slate.css';

function swapThemeCss() {
	let sheet = document.querySelector('#themeCSS');
	if (!sheet) {
		return;
	}

	if (sheet.getAttribute('href') === g_defaultTheme) {
		sheet.setAttribute('href', g_darkTheme);
		Cookies.set('theme', 'dark', { expires: 365 });
	} else {
		sheet.setAttribute('href', g_defaultTheme);
		Cookies.set('theme', 'lite', { expires: 365 });
	}
}

function setThemeCss(dark) {
	let sheet = document.querySelector('#themeCSS');
	if (!sheet) {
		return;
	}

	sheet.setAttribute('href', dark ? g_darkTheme : g_defaultTheme);
}

let theme = Cookies.get('theme');
if (theme) {
	setThemeCss(theme === 'dark');
}
