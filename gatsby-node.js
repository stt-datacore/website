const write = require('write');
const path = require('path');
const { introspectionQuery, graphql, printSchema } = require('gatsby/graphql');
const { createFilePath } = require('gatsby-source-filesystem');

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
	} else if (node.internal.type === `EpisodesJson`) {
		createNodeField({
			node,
			name: `slug`,
			value: `/${node.symbol}/`
		});
	}
};

exports.createPages = ({ graphql, actions }) => {
	const { createPage } = actions;
	return graphql(`
		{
			allMarkdownRemark {
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
			allEpisodesJson {
				edges {
					node {
						fields {
							slug
						}
						symbol
						name
					}
				}
			}
		}
	`).then((result) => {
		result.data.allMarkdownRemark.edges.forEach(({ node }) => {
			if (/(\/static\/crew\/).*\.md$/.test(node.fileAbsolutePath)) {
				createPage({
					path: `crew${node.fields.slug}`,
					component: path.resolve(`./src/templates/crewpage.tsx`),
					context: { slug: node.fields.slug, symbol: node.fields.slug.replace(/\//g, '') }
				});
			} else {
				if (node.fields.source === 'announcements') {
					// Announcements are rendered inline on announcements page, not as separate pages
				}
				else if (node.frontmatter && node.frontmatter.bigbook_section && node.frontmatter.bigbook_section > 0) {
					// Sections of the big book just get rendered inline with the bigbook page, not as separate pages
				}
				else {
					createPage({
						path: node.fields.slug,
						component: path.resolve(`./src/templates/page.tsx`),
						context: { slug: node.fields.slug }
					});
				}
			}
		});

		result.data.allEpisodesJson.edges.forEach(({ node }) => {
			createPage({
				path: `episode${node.fields.slug}`,
				component: path.resolve(`./src/templates/episodepage.tsx`),
				context: { slug: `${node.fields.slug}`, symbol: node.symbol }
			});
		});
	});
};

exports.onCreateWebpackConfig = ({ stage, loaders, actions, getConfig }) => {
	if (stage === 'build-html') {
		actions.setWebpackConfig({			
			module: {				
				rules: [
					{
						test: /unifiedWorker\.js$/,
						use: { loader: 'worker-loader' }
					},
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
