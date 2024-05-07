const path = require('path');
const { createFilePath } = require('gatsby-source-filesystem');

const episodes = require(`./static/structured/episodes.json`);

exports.onCreateNode = ({ node, getNode, actions }) => {
	const { createNodeField } = actions;
	if (node.internal.type === `MarkdownRemark`) {
		const slug = createFilePath({ node, getNode, basePath: `pages` });
		createNodeField({
			node,
			name: `slug`,
			value: slug
		});
		const parent = getNode(node.parent);
		let source = parent.sourceInstanceName;
		createNodeField({
			node,
			name: `source`,
			value: source,
		});
	}
};

exports.createPages = async ({ graphql, actions }) => {
	const { createPage } = actions;

	// Create crew pages from imported markdowns
	const crewResult = await graphql(`
		query {
			allMarkdownRemark (
				filter: { fields: { source: { eq: "crew" } } }
			) {
				edges {
					node {
						fileAbsolutePath
						fields {
							slug
							source
						}
						frontmatter {
							published
							bigbook_section
						}
					}
				}
			}
		}
	`);
	crewResult.data.allMarkdownRemark.edges.forEach(({ node }) => {
		if (/(\/static\/crew\/).*\.md$/.test(node.fileAbsolutePath)) {
			createPage({
				path: `crew${node.fields.slug}`,
				component: path.resolve(`./src/templates/crewpage.tsx`),
				context: { slug: node.fields.slug, symbol: node.fields.slug.replace(/\//g, '') }
			});
		}
	});

	// Create other pages from imported markdowns
	const pageResult = await graphql(`
		query {
			allMarkdownRemark (
				filter: { fields: { source: { eq: "pages" } } }
			) {
				edges {
					node {
						fields {
							slug
							source
						}
					}
				}
			}
		}
	`);
	pageResult.data.allMarkdownRemark.edges.forEach(({ node }) => {
		createPage({
			path: node.fields.slug,
			component: path.resolve(`./src/templates/page.tsx`),
			context: { slug: node.fields.slug }
		});
	});

	// Create episode pages from episodes.json
	episodes.forEach(episode => {
		createPage({
			path: `episode/${episode.symbol}`,
			component: path.resolve(`./src/templates/episodepage.tsx`),
			context: { symbol: episode.symbol }
		});
	});
};

exports.onCreateWebpackConfig = ({ stage, loaders, actions, getConfig }) => {
	if (stage === 'build-html') {
		actions.setWebpackConfig({
			module: {
				rules: [
					// {
					// 	test: /unifiedWorker\.js$/,
					// 	use: { loader: 'worker-loader' }
					// },
					{
						test: /exceljs/,
						use: loaders.null()
					}
				]
			}
		});
	}

	const config = getConfig();
	//TODO: more testing
	//config.output.globalObject = 'this';
	actions.replaceWebpackConfig(config);
};
