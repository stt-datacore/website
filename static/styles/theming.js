function setThemeCss(dark) {
	let theme = dark ? 'dark' : 'lite';
	if (window && window.localStorage) {
		window.localStorage.setItem('theme', theme);
	}

	let links = document.head.getElementsByTagName('link');
	for (let link of links) {
		if (link.title) {
			link.disabled = true;
			if (link.title === theme) {
				link.disabled = false;
			}
		}
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
		theme = getPreferredColorScheme();
	}

	setThemeCss(reverse ? theme === 'dark' : theme !== 'dark');
}

swapThemeCss(true);
