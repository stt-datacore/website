module.exports = {
	siteMetadata: {
		title: `Star Trek Timelines Data Core`
	},
	plugins: [
		`gatsby-transformer-remark`,
		`gatsby-transformer-json`,
		`gatsby-plugin-typescript`,
		`gatsby-plugin-netlify-cms`,
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
		{
			resolve: 'gatsby-source-filesystem',
			options: {
				name: 'structured',
				path: `${__dirname}/static/structured/`
			}
		}
	],
	mapping: {
		"CollectionsJson.crew": `CrewJson.symbol`,
		"CrewJson.equipment_slots.symbol": `ItemsJson.symbol`,
		"ItemsJson.item_sources.id": `QuestsJson.id`,
		"ItemsJson.recipe.list.symbol": `ItemsJson.symbol`,
	  }
};
