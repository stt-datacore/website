import React from 'react';
import { graphql, StaticQuery, Link } from 'gatsby';
import { Message, Icon } from 'semantic-ui-react';

import { useStateWithStorage } from '../utils/storage';

const DAYS_TO_EXPIRE = 7;

const Announcement = () => {
	const [readyToAnnounce, setReadyToAnnounce] = React.useState(false);
	const [dateNow, setDateNow] = React.useState(new Date());
	const [dismissAnnouncement, setDismissAnnouncement] = useStateWithStorage(
		'dismissAnnouncement',	/* cookie name */
		undefined, /* initial value */
		{
			rememberForever: true,
			onInitialize: () => setReadyToAnnounce(true)
		} /* storage options */
	);

	// To avoid rendering and then hiding an announcement that was previously dismissed,
	//	wait for cookie retrieval before rendering the message in the first place
	if (!readyToAnnounce) return (<></>);

	const query = graphql`
		query AnnouncementQuery {
		  allMarkdownRemark(
			limit: 1
			sort: {fields: [frontmatter___date], order: [DESC]}
			filter: {fields: {source: {eq: "announcements"}}}
		  ) {
			edges {
			  node {
				html
				frontmatter {
				  title
				  class
				  icon
				  date
				}
				excerpt(format:HTML)
			  }
			}
		  }
		}
	`;

	const render = ({ allMarkdownRemark }) => {
		const announcements = allMarkdownRemark.edges;
		if (announcements.length === 0) return (<></>);

		const announcement = announcements[0].node;
		const datePosted = new Date(announcement.frontmatter.date);
		if (dismissAnnouncement) {
			const dateDismissed = new Date(dismissAnnouncement);
			if (dateDismissed > datePosted) return (<></>);
		}

		const dateExpires = new Date();
		dateExpires.setDate(datePosted.getDate()+DAYS_TO_EXPIRE);
		if (dateExpires < dateNow) return (<></>);

		const isExcerpt = announcement.html !== announcement.excerpt;

		return (
			<Message icon className={announcement.frontmatter.class ?? ''} onDismiss={() => setDismissAnnouncement(new Date())}>
				<Icon name={announcement.frontmatter.icon ?? 'info'} />
				<Message.Content>
					<Message.Header>{announcement.frontmatter.title ?? 'Message from the DataCore Team'}</Message.Header>
					<div dangerouslySetInnerHTML={{ __html: announcement.excerpt }} />
					{isExcerpt && (<Link to='/announcements/'>See details...</Link>)}
				</Message.Content>
			</Message>
		);
	};

	return (
		<StaticQuery query={query} render={render} />
	);
};

export default Announcement;
