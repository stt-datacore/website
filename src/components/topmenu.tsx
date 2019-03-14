import React, { Component } from 'react';
import { Container, Dropdown, Image, Menu, Icon } from 'semantic-ui-react';
import { StaticQuery, navigate, graphql } from 'gatsby';

class TopMenu extends Component {
	constructor(props: any) {
		super(props);
	}

	render() {
		return (
			<StaticQuery
				query={graphql`
					query {
						allMarkdownRemark(
							filter: {
							  fileAbsolutePath: {
								  regex: "/(\/static\/pages)/.*\\.md$/"
							  }
							}
						  ) {
							totalCount
							edges {
								node {
									id
									frontmatter {
										title
									}
									fields {
										slug
									}
								}
							}
						}
						site {
							siteMetadata {
								title
							}
						}
					}
				`}
				render={data => (
					<Menu fixed='top' inverted>
						<Container>
							<Menu.Header onClick={() => navigate('/')}>
								<Image size='mini' src='/media/logo.png' style={{ marginTop: '0.3em', marginRight: '1.5em' }} />
							</Menu.Header>
							<Menu.Item onClick={() => navigate('/')}>Crew stats</Menu.Item>
							<Menu.Item onClick={() => navigate('/about')}>About</Menu.Item>
							<Menu.Item onClick={() => navigate('/bigbook')}>Big book</Menu.Item>

							<Dropdown item simple text='Pages'>
								<Dropdown.Menu>
									<Dropdown.Item onClick={() => window.open('/admin')}>Add or edit pages</Dropdown.Item>
									<Dropdown.Item onClick={() => navigate('/collections')}>Collections</Dropdown.Item>
									<Dropdown.Item disabled>Missions</Dropdown.Item>
									<Dropdown.Item disabled>Ships</Dropdown.Item>
									<Dropdown.Divider />
									<Dropdown.Header>All other pages</Dropdown.Header>
									{data.allMarkdownRemark.edges.map(({ node }, index) => (
										<Dropdown.Item as='a' key={index} onClick={() => navigate(node.fields.slug)}>
											{node.frontmatter.title}
										</Dropdown.Item>
									))}
								</Dropdown.Menu>
							</Dropdown>
						</Container>

						<Menu.Menu position='right'>
							<Menu.Item as='a' onClick={() => window.open('https://github.com/TemporalAgent7/datacore', '_blank')}>
								<Icon name='github' />
							</Menu.Item>
							<Menu.Item as='a' onClick={() => (window as any).swapThemeCss()}>
								<Icon name='adjust' />
							</Menu.Item>
						</Menu.Menu>
					</Menu>
				)}
			/>
		);
	}
}

export default TopMenu;
