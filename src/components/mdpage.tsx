import { marked } from "marked";
import React from "react";
import { Divider, Header, Message } from "semantic-ui-react";
import { MarkdownEntry } from "../model/mdpages";
import { stripFrontMatter } from "../utils/mdpageutils";
import DataPageLayout from "./page/datapagelayout";

const MarkdownPage = (props: { node: MarkdownEntry, prefix: string, excerpt?: boolean, fullpage?: boolean, no_cache?: boolean }) => {
	const { node, prefix, excerpt, fullpage, no_cache } = props;
	const [html, setHtml] = React.useState<string>(node.content || '');

	const datePosted = new Date(node.date ?? new Date());

	React.useEffect(() => {
		if (!no_cache && node.content) {
			if (!html) setHtml(node.content);
			return;
		}
		fetch(`/${prefix}/${node.file}`)
			.then(res => res.text())
			.then(text => marked.parse(stripFrontMatter(text, excerpt)))
			.then(html => {
				if (!no_cache) node.content = html;
				setHtml(html);
			});
	}, [props]);

	if (excerpt) {
		return (
			<div key={`${node}_${prefix}___${node.file}`} style={{fontSize: '1.2rem'}}>
				<div dangerouslySetInnerHTML={{ __html: html }} />
			</div>
		)
	}
	if (fullpage) {
		return (
			<DataPageLayout pageTitle={node.title}>
				<div key={`${node}_${prefix}___${node.file}`} style={{fontSize: '1.2rem'}}>
					<div dangerouslySetInnerHTML={{ __html: html }} />
				</div>
			</DataPageLayout>
		);
	}
	return (
		<div key={`${node}_${prefix}___${node.file}`}>
			<Message>
				<Message.Header>
					<Header>{node.title}</Header>
				</Message.Header>
				<Message.Content>
					<p>{datePosted.toLocaleDateString()}</p>
				</Message.Content>
			</Message>
			<div dangerouslySetInnerHTML={{ __html: html }} />
			<Divider />
		</div>
	);
}

export default MarkdownPage;