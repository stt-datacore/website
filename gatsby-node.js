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
						}
						frontmatter {
							published
							bigbook_section
						}
					}
				}
			}
		}
	`).then(result => {
		result.data.allMarkdownRemark.edges.forEach(({ node }) => {
			if (/(\/static\/crew\/).*\.md$/.test(node.fileAbsolutePath)) {
				createPage({
					path: `crew${node.fields.slug}`,
					component: path.resolve(`./src/templates/crewpage.tsx`),
					context: { slug: node.fields.slug, symbol: node.fields.slug.replace(/\//g, '') }
				});
			} else {
				if (node.frontmatter && node.frontmatter.bigbook_section && node.frontmatter.bigbook_section > 0) {
					// Sections of the big book just get rendered inline with the bigbook page, not as separate pages
				} else {
					createPage({
						path: node.fields.slug,
						component: path.resolve(`./src/templates/page.tsx`),
						context: { slug: node.fields.slug }
					});
				}
			}
		});
	});
};

/**
 * Generate GraphQL schema.json file to be read by tslint
 * Thanks: https://gist.github.com/kkemple/6169e8dc16369b7c01ad7408fc7917a9
 */
exports.onPostBootstrap = async ({ store }) => {
	try {
		const { schema } = store.getState();
		const jsonSchema = await graphql(schema, introspectionQuery);
		const sdlSchema = printSchema(schema);

		write.sync('schema.json', JSON.stringify(jsonSchema.data), {});
		write.sync('schema.graphql', sdlSchema, {});

		console.log('\n\n[gatsby-plugin-extract-schema] Wrote schema\n'); // eslint-disable-line
	} catch (error) {
		console.error('\n\n[gatsby-plugin-extract-schema] Failed to write schema: ', error, '\n');
	}
};

exports.onCreateWebpackConfig = ({ stage, loaders, actions, getConfig }) => {
	if (stage === 'build-html') {
		actions.setWebpackConfig({
			module: {
				rules: [
					{
						test: /wasmWorker\.js$/,
						use: { loader: 'worker-loader' }
					}
				]
			}
		});
	}

	const config = getConfig();
	config.output.globalObject = 'this';
	actions.replaceWebpackConfig(config);
};
