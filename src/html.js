import React from 'react';
import PropTypes from 'prop-types';

export default function HTML(props) {
	return (
		<html {...props.htmlAttributes}>
			<head>
        <title>DataCore</title>
				<meta charSet='utf-8' />
				<meta httpEquiv='x-ua-compatible' content='ie=edge' />
				<meta name='description' content='Star Trek Timelines DataCore' />
				<meta name='keywords' content='datacore,stt,star trek,tool' />
				<meta name='viewport' content='width=device-width, initial-scale=1, shrink-to-fit=no' />
				<script
					src='https://cdnjs.cloudflare.com/ajax/libs/js-cookie/2.2.0/js.cookie.min.js'
					integrity='sha256-9Nt2r+tJnSd2A2CRUvnjgsD+ES1ExvjbjBNqidm9doI='
					crossOrigin='anonymous'
				/>
				<link id='themeCSS' rel='stylesheet' href='/styles/semantic.slate.css' />
				{props.headComponents}

				<script
					dangerouslySetInnerHTML={{
						__html: `
    const g_defaultTheme = '/styles/semantic.css';
    const g_darkTheme = '/styles/semantic.slate.css';

    function swapThemeCss() {
      let sheet = document.querySelector('#themeCSS');
      if (!sheet) {
        return;
      }

      if (sheet.getAttribute('href') === g_defaultTheme) {
        sheet.setAttribute('href', g_darkTheme);
        Cookies.set('theme', "dark", { expires: 365 });
      } else {
        sheet.setAttribute('href', g_defaultTheme);
        Cookies.set('theme', "lite", { expires: 365 });
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
      setThemeCss(theme === "dark");
    }
        `
					}}
				/>
			</head>
			<body {...props.bodyAttributes}>
				{props.preBodyComponents}
				<noscript key='noscript' id='gatsby-noscript'>
					This app works best with JavaScript enabled.
				</noscript>
				<div key={`body`} id='___gatsby' dangerouslySetInnerHTML={{ __html: props.body }} />
				{props.postBodyComponents}
			</body>
		</html>
	);
}

HTML.propTypes = {
	htmlAttributes: PropTypes.object,
	headComponents: PropTypes.array,
	bodyAttributes: PropTypes.object,
	preBodyComponents: PropTypes.array,
	body: PropTypes.string,
	postBodyComponents: PropTypes.array
};
