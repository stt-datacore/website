import React from 'react';
import { Header, Button, Popup, Message, Accordion, Icon, Form, Select, Checkbox } from 'semantic-ui-react';

import { getOptimalCombos, isCrewOptimal, filterCrewByAlphaRule } from './fbbutils';
import { useStateWithStorage } from '../../utils/storage';

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

const formattingDefaults = {
	show_chain: 'always',
	show_traits: 'always',
	bullet_style: 'simple',
	crew_delimiter: ','
};

type ExportCrewListsProps = {
	dbid: string;
	combo: any;
	openNodes: any[];
	allMatchingCrew: any[];
};

export const ExportCrewLists = (props: ExportCrewListsProps) => {
	const { dbid, combo, openNodes, allMatchingCrew } = props;

	const [showOptimalsOnly, setShowOptimalsOnly] = React.useState(true);
	const [enableAlphaRule, setEnableAlphaRule] = React.useState(false);
	const [formattingOptions, setFormattingOptions] = useStateWithStorage(dbid+'/fbb/formatting', formattingDefaults, { rememberForever: true });

	const sortedTraits = (traits) => {
		return traits.map(t => allTraits.trait_names[t]).sort((a, b) => a.localeCompare(b)).join(', ');
	};

	const formatCrewName = (crew) => {
		let name = formattingOptions.crew_delimiter === ',' ? crew.name.replace(/[,\.\(\)\[\]"“”]/g, '') : crew.name;
		if (crew.nodes_rarity > 1) name = `*${name}*`;
		return name;
	};

	const copyPossible = () => {
		let crewList = JSON.parse(JSON.stringify(allMatchingCrew));
		if (enableAlphaRule) {
			const finalTraits = [];
			openNodes.forEach(node => {
				const finalTrait = node.traitsKnown.sort((a, b) => b.localeCompare(a))[0];
				finalTraits.push({ index: node.index, trait: finalTrait });
			});
			crewList = filterCrewByAlphaRule(crewList, finalTraits);
		}
		if (showOptimalsOnly) {
			const optimalCombos = getOptimalCombos(crewList);
			crewList = crewList.filter(crew => isCrewOptimal(crew, optimalCombos));
		}
		let output = '';
		if (formattingOptions.show_chain === 'always' || formattingOptions.show_chain === 'header')
			output += combo.status;
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
			possibleCombos.sort((a, b) => b.length - a.length).forEach((combo, idx) => {
				const crewList = crewByNode.filter(crew =>
					combo.length === crew.node_matches[`node-${node.index}`].traits.length
					&& combo.every(trait => crew.node_matches[`node-${node.index}`].traits.includes(trait))
				).sort((a, b) => {
					if (a.nodes_rarity !== b.nodes_rarity)
						return b.nodes_rarity - a.nodes_rarity;
					return a.name.localeCompare(b.name);
				}).map(crew => formatCrewName(crew)).join(`${formattingOptions.crew_delimiter} `);
				if (nodeList !== '') nodeList += '\n';
				if (formattingOptions.bullet_style === 'full') nodeList += `${node.index+1}.`;
				if (formattingOptions.bullet_style === 'full' || formattingOptions.bullet_style === 'number')
					nodeList += `${idx+1} `;
				else
					nodeList += `- `;
				nodeList += crewList;
				if (formattingOptions.show_traits === 'always')
					nodeList += ` (${sortedTraits(combo)})`;
			});
			if (nodeList !== '') {
				if (output !== '') output += '\n\n';
				output += `Node ${node.index+1}`;
				if (formattingOptions.show_traits === 'always' || formattingOptions.show_traits === 'nodes')
					output += ` (${sortedTraits(node.traitsKnown)})`;
				output += '\n' + nodeList;
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
							label={<label>Apply alpha rule</label>}
							checked={enableAlphaRule}
							onChange={(e, { checked }) => setEnableAlphaRule(checked) }
						/>
						<Form.Field
							control={Checkbox}
							label={<label>Only list optimal crew</label>}
							checked={showOptimalsOnly}
							onChange={(e, { checked }) => setShowOptimalsOnly(checked) }
						/>
					</Form.Group>
				</Form>
				<CustomFormatting options={formattingOptions} updateOptions={setFormattingOptions} />
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

type CustomFormattingProps = {
	options: any;
	updateOptions: (options: any) => void;
};

const CustomFormatting = (props: CustomFormattingProps) => {
	const [isActive, setIsActive] = React.useState(false);
	const [showChain, setShowChain] = React.useState(props.options.show_chain ?? formattingDefaults.show_chain);
	const [showTraits, setShowTraits] = React.useState(props.options.show_traits ?? formattingDefaults.show_traits);
	const [bulletStyle, setBulletStyle] = React.useState(props.options.bullet_style ?? formattingDefaults.bullet_style);
	const [crewDelimiter, setCrewDelimiter] = React.useState(props.options.crew_delimiter ?? formattingDefaults.crew_delimiter);

	React.useEffect(() => {
		props.updateOptions({
			show_chain: showChain,
			show_traits: showTraits,
			bullet_style: bulletStyle,
			crew_delimiter: crewDelimiter
		});
	}, [showChain, showTraits, bulletStyle, crewDelimiter]);

	const chainOptions = [
		{ key: 'always', text: 'Always', value: 'always' },
		{ key: 'never', text: 'Never', value: 'never' }
	];

	const traitsOptions = [
		{ key: 'always', text: 'Always', value: 'always' },
		{ key: 'nodes', text: 'Nodes only', value: 'nodes' },
		{ key: 'never', text: 'Never', value: 'never' }
	];

	const bulletOptions = [
		{ key: 'simple', text: 'Simple', value: 'simple', example: '- Spock' },
		{ key: 'number', text: 'Number', value: 'number', example: '1 Spock' },
		{ key: 'full', text: 'Node and number', value: 'full', example: '2.1 Spock' }
	];

	const delimiterOptions = [
		{ key: 'comma', text: ',', value: ',', example: 'Spock, Lt Uhura' },
		{ key: 'semicolon', text: ';', value: ';', example: 'Spock; Lt. Uhura' }
	];

	return (
		<div style={{ margin: '1em 0' }}>
			<Accordion>
				<Accordion.Panel
					active={isActive}
					index={1}
					onTitleClick={() => setIsActive(!isActive)}
					title={{ content: 'Customize Formatting', icon: `caret ${isActive ? 'down' : 'right'}` }}
					content={renderOptions}
				/>
			</Accordion>
		</div>
	);

	function renderOptions(): JSX.Element {
		if (!isActive) return (<></>);
		return (
			<div style={{ marginBottom: '2em', padding: '0 1.5em' }}>
				<div>
					You can customize the appearance of and the details included in the export. The following settings are saved.
				</div>
				<Form style={{ marginTop: '1em' }}>
					<Form.Group>
						<Form.Field
							control={Select}
							label={<label>Show boss chain</label>}
							options={chainOptions}
							value={showChain}
							onChange={(e, { value }) => setShowChain(value)}
						/>
						<Form.Field
							control={Select}
							label={<label>Show traits</label>}
							options={traitsOptions}
							value={showTraits}
							onChange={(e, { value }) => setShowTraits(value)}
						/>
						<Form.Field
							control={Select}
							label={<label>Bullet style, e.g. <i>{bulletOptions.find(b => b.value === bulletStyle).example}</i></label>}
							options={bulletOptions}
							value={bulletStyle}
							onChange={(e, { value }) => setBulletStyle(value)}
						/>
						<Form.Field
							control={Select}
							label={<label>Delimiter, e.g. <i>{delimiterOptions.find(b => b.value === crewDelimiter).example}</i></label>}
							options={delimiterOptions}
							value={crewDelimiter}
							onChange={(e, { value }) => setCrewDelimiter(value)}
						/>
					</Form.Group>
				</Form>
				<Button compact onClick={resetToDefaults}>
					Reset to defaults
				</Button>
			</div>
		);
	}

	function resetToDefaults(): void {
		setShowChain(formattingDefaults.show_chain);
		setShowTraits(formattingDefaults.show_traits);
		setBulletStyle(formattingDefaults.bullet_style);
		setCrewDelimiter(formattingDefaults.crew_delimiter);
	}
};