import React from 'react';
import { Header, Button, Popup } from 'semantic-ui-react';

import allTraits from '../../../static/structured/translation_en.json';

type ExporterProps = {
	nodes: any[];
	traits: string[];
};

const Exporter = (props: ExporterProps) => {
	const { nodes, traits } = props;

	const copyTraits = () => {
		let output = '';
		for (let n = 0; n < 6; n++) {
			if (n >= nodes.length) {
				output += '\n\n';
				continue;
			}
			const node = nodes[n];
			for (let m = 0; m < 2; m++) {
				if (m < node.open_traits.length)
					output += allTraits.trait_names[node.open_traits[m]];
				if (m == 0) output += '\n';
			}
			output += '\t\t' + node.hidden_traits.length + '\n';
		}
		output += '\n';
		traits.forEach(trait => {
			output += allTraits.trait_names[trait] + '\n';
		});
		navigator.clipboard.writeText(output);
	};

	return (
		<div style={{ margin: '2em 0' }}>
			<Header as='h4'>Export Data</Header>
			<Popup
				content='Copied!'
				on='click'
				position='right center'
				size='tiny'
				trigger={
					<Button icon='clipboard' content='Copy traits to clipboard' onClick={() => copyTraits()} />
				}
			/>
		</div>
	);
};

export default Exporter;
