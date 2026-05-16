import { marked } from "marked";
import React from "react";
import { Header, Divider } from "semantic-ui-react";
import { MarkdownEntry } from "../model/mdpages";
import { stripFrontMatter } from "../utils/mdpageutils";
import DataPageLayout from "./page/datapagelayout";
import { GlobalContext } from "../context/globalcontext";

const MarkdownPage = (props: { node: MarkdownEntry, prefix: string, excerpt?: boolean, fullpage?: boolean }) => {
	const { node, prefix, excerpt, fullpage } = props;
	const [html, setHtml] = React.useState<string>('');
	const globalContext = React.useContext(GlobalContext);
	const { t } = globalContext.localized;

	const datePosted = new Date(node.date ?? new Date());

	React.useEffect(() => {
		fetch(`/${prefix}/${node.file}`)
			.then(res => res.text())
			.then(text => marked.parse(stripFrontMatter(text, excerpt)))
			.then(html => setHtml(html));
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
			<Header>{node.title}</Header>
			<p>{datePosted.toLocaleDateString()}</p>
			<div dangerouslySetInnerHTML={{ __html: html }} />
			<Divider />
		</div>
	);
}

export default MarkdownPage;