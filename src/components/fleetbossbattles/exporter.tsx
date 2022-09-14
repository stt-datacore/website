import React from 'react';
import { Header, Button, Popup, Message, Form, Checkbox } from 'semantic-ui-react';

import { getOptimalCombos, isCrewOptimal } from './fbbutils';

import allTraits from '../../../static/structured/translation_en.json';

type ExportTraitsProps = {
	nodes: any[];
	traits: string[];
};

export const ExportTraits = (props: ExportTraitsProps) => {
	const { nodes, traits } = props;

	const CABLink = 'https://docs.google.com/spreadsheets/d/1aGdAhgDJqknJKz-im4jxASxcE-cmVL8w2FQEKxpK4Uw/edit#gid=631453914';
	const CABVer = '3.02';

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
		<Message style={{ margin: '2em 0' }}>
			<Message.Content>
				<Message.Header>CAB's FBB Combo Chain Helper</Message.Header>
				<p>The <b><a href={CABLink} target='_blank'>FBB Combo Chain Helper</a></b> is another tool that can help you and your fleet coordinate attacks in a Fleet Boss Battle. Click the button below to copy the known traits and the list of possible traits for use with this Google Sheet (currently v{CABVer}).</p>
				<Popup
					content='Copied!'
					on='click'
					position='right center'
					size='tiny'
					trigger={
						<Button icon='clipboard' content='Copy traits to clipboard' onClick={() => copyTraits()} />
					}
				/>
			</Message.Content>
		</Message>
	);
};

type ExportCrewListsProps = {
	openNodes: any[];
	allMatchingCrew: any[];
};

export const ExportCrewLists = (props: ExportCrewListsProps) => {
	const { openNodes, allMatchingCrew } = props;

	const [showOptimalsOnly, setShowOptimalsOnly] = React.useState(true);

	const sortedTraits = (traits) => {
		return traits.map(t => allTraits.trait_names[t]).sort((a, b) => a.localeCompare(b)).join(', ');
	};

	const formatCrewName = (crew) => {
		let name = crew.name.replace(/[,\.\(\)\[\]"“”]/g, '');
		if (crew.coverage_rarity > 1) name = `*${name}*`;
		return name;
	};

	const copyPossible = () => {
		let crewList = allMatchingCrew.slice();
		if (showOptimalsOnly) {
			const optimalCombos = getOptimalCombos(crewList);
			crewList = crewList.filter(crew => isCrewOptimal(crew, optimalCombos));
		}
		let output = '';
		openNodes.forEach(node => {
			const possibleCombos = [];
			const crewByNode = crewList.filter(crew => !!crew.node_matches[`node-${node.index}`]);
			crewByNode.forEach(crew => {
				const crewNodeTraits = crew.node_matches[`node-${node.index}`].traits;
				const exists = !!possibleCombos.find(combo =>
					combo.length === crewNodeTraits.length && combo.every(trait => crewNodeTraits.includes(trait))
				);
				if (!exists) possibleCombos.push(crewNodeTraits);
			});
			let nodeList = '';
			possibleCombos.sort((a, b) => b.length - a.length).forEach(combo => {
				const crewList = crewByNode.filter(crew =>
					combo.length === crew.node_matches[`node-${node.index}`].traits.length
					&& combo.every(trait => crew.node_matches[`node-${node.index}`].traits.includes(trait))
				).sort((a, b) => {
					if (a.coverage_rarity !== b.coverage_rarity)
						return b.coverage_rarity - a.coverage_rarity;
					return a.name.localeCompare(b.name);
				}).map(crew => formatCrewName(crew)).join(', ');
				if (nodeList !== '') nodeList += '\n';
				nodeList += `- ${crewList} (${sortedTraits(combo)})`;
			});
			if (nodeList !== '') {
				if (output !== '') output += '\n\n';
				output += `Node ${node.index+1} (${sortedTraits(node.traitsKnown)})\n`;
				output += nodeList;
			}
		});
		navigator.clipboard.writeText(output);
	};

	return (
		<Message style={{ margin: '2em 0' }}>
			<Message.Content>
				<Message.Header>Export Crew Lists</Message.Header>
				<p>Copy the list of possible crew, grouped by nodes and traits, for easier sharing on Discord or other forums. Asterisked crew are possible solutions to multiple nodes.</p>
				<Form>
					<Form.Group inline>
						<Form.Field
							control={Checkbox}
							label={<label>Only list optimal crew</label>}
							checked={showOptimalsOnly}
							onChange={(e, { checked }) => setShowOptimalsOnly(checked) }
						/>
					</Form.Group>
				</Form>
				<Popup
					content='Copied!'
					on='click'
					position='right center'
					size='tiny'
					trigger={
						<Button icon='clipboard' content='Copy possible crew to clipboard' onClick={() => copyPossible()} />
					}
				/>
			</Message.Content>
		</Message>
	);
};