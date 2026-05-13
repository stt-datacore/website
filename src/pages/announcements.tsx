import React from 'react';
import MarkdownPage from '../components/mdpage';
import DataPageLayout from '../components/page/datapagelayout';
import { MarkdownEntry } from '../model/mdpages';

const Announcements = (props: { announcements: MarkdownEntry[] }) => {
	const announcements = props.announcements;
	return (
		<DataPageLayout pageTitle='DataCore Announcements'>
			<React.Fragment>
			{announcements.map((node) =>
				<MarkdownPage node={node} prefix={'announcements'} />
			)}
			</React.Fragment>
		</DataPageLayout>
	);
};

export default Announcements;
