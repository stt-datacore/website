require('dotenv').config();
module.exports = {
	siteMetadata: {
		title: 'Star Trek Timelines DataCore',
		titleTemplate: `%s - Star Trek Timelines DataCore`,
		description: `DataCore is a companion resource to Tilting Point's Star Trek Timelines game. It's designed as a compendium of data, statistics and assets, both extracted from the game as well as user generated.`,
		baseUrl: 'https://datacore.app',
		siteUrl: 'https://datacore.app'
	},
	plugins: [
		{
			resolve: "@sentry/gatsby",
			options: {
			  dsn: "https://eb3773c69377443b98fa857cde350722@o1362387.ingest.sentry.io/6653811",
			  sampleRate: 1.0,
			},
		},
		`gatsby-transformer-json`,
		`gatsby-plugin-react-helmet`,
		`gatsby-plugin-remove-fingerprints`,
		{
			resolve: `gatsby-plugin-typescript`,
			options: {
				allowDeclareFields: true
			}
		},
		`gatsby-plugin-sitemap`,
		{
			resolve: 'gatsby-transformer-remark',
			options: {
				excerpt_separator: `<!-- end -->`,
			}
		},
		{
			resolve: 'gatsby-plugin-purge-cloudflare-cache',
			options: {
				token: process.env.CLOUDFLARE_TOKEN,
				zoneId: process.env.CLOUDFLARE_ZONE_ID,
				condition: (api, options) => process.env.GITHUB_REF === 'refs/heads/master' || process.env.GITHUB_REF === 'refs/heads/beta',
			}
		},
		{
			resolve: 'gatsby-source-filesystem',
			options: {
				name: 'pages',
				path: `${__dirname}/static/pages/`
			}
		},
		{
			resolve: 'gatsby-source-filesystem',
			options: {
				name: 'crew',
				path: `${__dirname}/static/crew/`
			}
		},
		// {
		// 	resolve: 'gatsby-source-filesystem',
		// 	options: {
		// 		name: 'structured',
		// 		path: `${__dirname}/static/structured/`,
		// 		ignore: [
		// 			'**/events/*',
		// 			'**/eventlogs/*',
		// 			'**/collections.json',
		// 			'**/dilemmas.json',
		// 			'**/disputes.json',
		// 			'**/event_instances.json',
		// 			'**/event_leaderboards.json',
		// 			'**/factions.json',
		// 			'**/items.json',
		// 			'**/keystones.json',
		// 			'**/misc_stats.json',
		// 			'**/missions.json',
		// 			'**/missionsfull.json',
		// 			'**/quests.json',
		// 			'**/ship_schematics.json',
		// 			'**/upcomingevents.json'
		// 		]
		// 	}
		// },
		{
			resolve: 'gatsby-source-filesystem',
			options: {
				name: 'announcements',
				path: `${__dirname}/static/announcements/`
			}
		},
		{
			resolve: `gatsby-plugin-manifest`,
			options: {
				name: `Star Trek Timelines DataCore`,
				short_name: `DataCore`,
				start_url: `/`,
				background_color: `#3A3F44`,
				theme_color: `#272B30`,
				display: `standalone`,
				icon: `src/images/logo.svg`,
				include_favicon: true
			}
		}
	]
};
