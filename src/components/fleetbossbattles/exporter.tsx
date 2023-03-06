import React from 'react';
import { Header, Button, Popup, Message, Accordion, Icon, Form, Select, Checkbox } from 'semantic-ui-react';

import { getOptimalCombos, isCrewOptimal, filterAlphaExceptions, getComboIndex } from './fbbutils';
import { useStateWithStorage } from '../../utils/storage';

import allTraits from '../../../static/structured/translation_en.json';

const ALPHA_FLAG = '\u03B1';
const OPTIMAL_FLAG = '\u03B9';

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

const exportDefaults = {
	header: 'always',
	traits: 'all',
	bullet: 'simple',
	delimiter: ',',
	alpha: 'flag',
	optimal: 'hide'
};

type ExportCrewListsProps = {
	dbid: string;
	combo: any;
	openNodes: any[];
	allMatchingCrew: any[];
};

export const ExportCrewLists = (props: ExportCrewListsProps) => {
	const { dbid, combo, openNodes, allMatchingCrew } = props;

	const [exportPrefs, setExportPrefs] = useStateWithStorage(dbid+'/fbb/exporting', exportDefaults, { rememberForever: true });

	const sortedTraits = (traits, alphaTest = '') => {
		const traitName = (trait) => {
			let name = allTraits.trait_names[trait];
			if (exportPrefs.alpha === 'flag' && alphaTest !== '' && trait.localeCompare(alphaTest) < 0)
				name += `-${ALPHA_FLAG}`;
			return name;
		};
		return traits.map(t => traitName(t)).sort((a, b) => a.localeCompare(b)).join(', ');
	};

	const formatCrewName = (crew) => {
		let name = exportPrefs.delimiter === ',' ? crew.name.replace(/[,\.\(\)\[\]"“”]/g, '') : crew.name;
		if (crew.nodes_rarity > 1) name = `*${name}*`;
		return name;
	};

	const copyPossible = () => {
		let crewList = JSON.parse(JSON.stringify(allMatchingCrew));
		if (exportPrefs.alpha === 'hide') crewList = filterAlphaExceptions(crewList);
		const optimalCombos = getOptimalCombos(crewList);
		if (exportPrefs.optimal === 'hide') crewList = crewList.filter(crew => isCrewOptimal(crew, optimalCombos));
		let output = '';
		if (exportPrefs.header === 'always' || (exportPrefs.header === 'initial' && combo.nodes.length-openNodes.length === 0)) {
			output += `${combo.chain} (${combo.nodes.length-openNodes.length}/${combo.nodes.length})`;
		}
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
				}).map(crew => formatCrewName(crew)).join(`${exportPrefs.delimiter} `);
				if (nodeList !== '') nodeList += '\n';
				if (exportPrefs.bullet === 'full') nodeList += `${node.index+1}.`;
				if (exportPrefs.bullet === 'full' || exportPrefs.bullet === 'number')
					nodeList += `${idx+1}`;
				else
					nodeList += `-`;
				if (exportPrefs.alpha === 'flag') {
					let exceptions = 0;
					combo.forEach(trait => { if (trait.localeCompare(node.alphaTest) < 0) exceptions++; });
					if (combo.length - exceptions < node.hiddenLeft) nodeList += ALPHA_FLAG;
				}
				if (exportPrefs.optimal === 'flag') {
					const nodeOptimalCombos = optimalCombos.filter(combos => combos.nodes.includes(node.index)).map(combos => combos.traits);
					if (getComboIndex(nodeOptimalCombos, combo) === -1) nodeList += OPTIMAL_FLAG;
				}
				nodeList += ' '+crewList;
				if (exportPrefs.traits === 'all')
					nodeList += ` (${sortedTraits(combo, node.alphaTest)})`;
			});
			if (nodeList !== '') {
				if (output !== '') output += '\n\n';
				output += `Node ${node.index+1}`;
				if (exportPrefs.traits === 'all' || exportPrefs.traits === 'nodes')
					output += ` (${sortedTraits(node.traitsKnown)}, ${Array(node.hiddenLeft).fill('?').join(', ')})`;
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
				<CustomExport prefs={exportPrefs} updatePrefs={setExportPrefs} />
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

type CustomExportProps = {
	prefs: any;
	updatePrefs: (prefs: any) => void;
};

const CustomExport = (props: CustomExportProps) => {
	const [isActive, setIsActive] = React.useState(false);
	const [headerPref, setHeaderPref] = React.useState(props.prefs.header ?? exportDefaults.header);
	const [traitsPref, setTraitsPref] = React.useState(props.prefs.traits ?? exportDefaults.traits);
	const [bulletPref, setBulletPref] = React.useState(props.prefs.bullet ?? exportDefaults.bullet);
	const [delimiterPref, setDelimiterPref] = React.useState(props.prefs.delimiter ?? exportDefaults.delimiter);
	const [alphaPref, setAlphaPref] = React.useState(props.prefs.alpha ?? exportDefaults.alpha);
	const [optimalPref, setOptimalPref] = React.useState(props.prefs.optimal ?? exportDefaults.optimal);

	React.useEffect(() => {
		props.updatePrefs({
			header: headerPref,
			traits: traitsPref,
			bullet: bulletPref,
			delimiter: delimiterPref,
			alpha: alphaPref,
			optimal: optimalPref
		});
	}, [headerPref, traitsPref, bulletPref, delimiterPref, alphaPref, optimalPref]);

	const headerOptions = [
		{ key: 'always', text: 'Always show boss chain', value: 'always' },
		{ key: 'initial', text: 'Show on new chains only', value: 'initial' },
		{ key: 'hide', text: 'Do not show', value: 'hide' }
	];

	const traitsOptions = [
		{ key: 'all', text: 'Show on node and crew', value: 'all' },
		{ key: 'nodes', text: 'Show on nodes only', value: 'nodes' },
		{ key: 'hide', text: 'Do not show', value: 'hide' }
	];

	const bulletOptions = [
		{ key: 'simple', text: 'Dash', value: 'simple', example: '- Spock' },
		{ key: 'number', text: 'Number', value: 'number', example: '1 Spock' },
		{ key: 'full', text: 'Node and number', value: 'full', example: '2.1 Spock' }
	];

	const delimiterOptions = [
		{ key: 'comma', text: 'Comma', value: ',', example: 'Spock, Lt Uhura' },
		{ key: 'semicolon', text: 'Semicolon', value: ';', example: 'Spock; Lt. Uhura' }
	];

	const alphaOptions = [
		{ key: 'flag', text: `Flag exceptions [${ALPHA_FLAG}]`, value: 'flag' },
		{ key: 'hide', text: 'Hide exceptions', value: 'hide' },
		{ key: 'ignore', text: 'Ignore', value: 'ignore' }
	];

	const optimalOptions = [
		{ key: 'flag', text: `Flag non-optimals [${OPTIMAL_FLAG}]`, value: 'flag' },
		{ key: 'hide', text: 'Hide non-optimals', value: 'hide' },
		{ key: 'ignore', text: 'Ignore', value: 'ignore' }
	];

	return (
		<div style={{ margin: '1em 0' }}>
			<Accordion>
				<Accordion.Panel
					active={isActive}
					index={1}
					onTitleClick={() => setIsActive(!isActive)}
					title={{ content: 'Customize Export', icon: `caret ${isActive ? 'down' : 'right'}` }}
					content={renderPrefsForm}
				/>
			</Accordion>
		</div>
	);

	function renderPrefsForm(): JSX.Element {
		if (!isActive) return (<></>);
		return (
			<div style={{ marginBottom: '2em', padding: '0 1.5em' }}>
				<div>
					You can customize the details that are included in the export. All preferences here will be remembered.
				</div>
				<Form style={{ marginTop: '1em' }}>
					<Form.Group grouped>
						<Form.Group inline>
							<Form.Field>
								<label>Header</label>
								<Select
									options={headerOptions}
									value={headerPref}
									onChange={(e, { value }) => setHeaderPref(value)}
								/>
							</Form.Field>
							<Form.Field>
								<label>Traits</label>
								<Select
									options={traitsOptions}
									value={traitsPref}
									onChange={(e, { value }) => setTraitsPref(value)}
								/>
							</Form.Field>
							<Form.Field>
								<label>Bullet style, e.g. <i>{bulletOptions.find(b => b.value === bulletPref).example}</i></label>
								<Select
									options={bulletOptions}
									value={bulletPref}
									onChange={(e, { value }) => setBulletPref(value)}
								/>
							</Form.Field>
							<Form.Field>
								<label>Crew delimiter, e.g. <i>{delimiterOptions.find(b => b.value === delimiterPref).example}</i></label>
								<Select
									options={delimiterOptions}
									value={delimiterPref}
									onChange={(e, { value }) => setDelimiterPref(value)}
								/>
							</Form.Field>
						</Form.Group>
						<Form.Group inline>
							<Form.Field>
								<label>Alpha rule</label>
								<Select
									options={alphaOptions}
									value={alphaPref}
									onChange={(e, { value }) => setAlphaPref(value)}
								/>
							</Form.Field>
							<Form.Field>
								<label>Optimal crew</label>
								<Select
									options={optimalOptions}
									value={optimalPref}
									onChange={(e, { value }) => setOptimalPref(value)}
								/>
							</Form.Field>
						</Form.Group>
						<Button compact onClick={resetToDefaults}>
							Reset to defaults
						</Button>
					</Form.Group>
				</Form>
			</div>
		);
	}

	function resetToDefaults(): void {
		setHeaderPref(exportDefaults.header);
		setTraitsPref(exportDefaults.traits);
		setBulletPref(exportDefaults.bullet);
		setDelimiterPref(exportDefaults.delimiter);
		setAlphaPref(exportDefaults.alpha);
		setOptimalPref(exportDefaults.optimal);
	}
};