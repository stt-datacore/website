import React from 'react';
import { Header, Button, Popup, Message, Accordion, Form, Select, Icon } from 'semantic-ui-react';

import { filterAlphaExceptions, getOptimalCombos, filterCombosByNode, getTraitCountsByNode } from './fbbutils';

import allTraits from '../../../static/structured/translation_en.json';

const ALPHA_FLAG = '\u03B1';
const OPTIMAL_FLAG = '\u03B9';

export const exportDefaults = {
	header: 'always',
	traits: 'all',
	bullet: 'simple',
	delimiter: ',',
	alpha: 'flag',
	optimal: 'hide'
};

type CrewFullExporterProps = {
	chain: any;
	openNodes: any[];
	allMatchingCrew: any[];
	exportPrefs: any;
	setExportPrefs: (prefs: any) => void;
};

export const CrewFullExporter = (props: CrewFullExporterProps) => {
	const { chain, openNodes, allMatchingCrew, exportPrefs, setExportPrefs } = props;

	const copyFull = () => {
		let header = '';
		if (exportPrefs.header === 'always' || (exportPrefs.header === 'initial' && chain.nodes.length-openNodes.length === 0)) {
			header += `${chain.description} (${chain.nodes.length-openNodes.length}/${chain.nodes.length})`;
			header += '\n\n';
		}
		const output = exportCrewByNodes(allMatchingCrew, openNodes, exportPrefs);
		navigator.clipboard.writeText(header + output);
	};

	return (
		<Message style={{ margin: '2em 0' }}>
			<Message.Content>
				<Message.Header>Export Crew Lists</Message.Header>
				<p>Copy the lists of possible crew for remaining unsolved nodes, for easier sharing on Discord or other forums. Asterisked crew are possible solutions to multiple nodes.</p>
				<ExportOptions prefs={exportPrefs} updatePrefs={setExportPrefs} />
				<Popup
					content='Copied!'
					on='click'
					position='right center'
					size='tiny'
					trigger={
						<Button icon='clipboard list' content='Copy possible crew to clipboard' onClick={() => copyFull()} />
					}
				/>
			</Message.Content>
		</Message>
	);
};

type ExportOptionsProps = {
	prefs: any;
	updatePrefs: (prefs: any) => void;
};

const ExportOptions = (props: ExportOptionsProps) => {
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
					You can customize the details that are included when exporting. Preferences here will be remembered on all subsequent exports.
				</div>
				<Form style={{ marginTop: '1em' }}>
					<Form.Group grouped>
						<Form.Group inline>
							<Form.Field>
								<label>Header (all nodes only)</label>
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

type CrewNodeExporterProps = {
	node: any;
	allMatchingCrew: any[];
	dbid: string;
	exportPrefs: any;
};

export const CrewNodeExporter = (props: CrewNodeExporterProps) => {
	const { node, allMatchingCrew, dbid, exportPrefs } = props;

	const copyNode = () => {
		const output = exportCrewByNodes(allMatchingCrew, [node], exportPrefs);
		navigator.clipboard.writeText(output);
	};

	return (
		<React.Fragment>
			<Popup
				content='Copied!'
				on='click'
				position='bottom center'
				size='tiny'
				trigger={
					<Button animated onClick={() => copyNode()}>
						<Button.Content visible>
							<Icon name='clipboard list' />
						</Button.Content>
						<Button.Content hidden>
							Copy
						</Button.Content>
					</Button>
				}
			/>
		</React.Fragment>
	);
};

const exportCrewByNodes = (allMatchingCrew: any[], nodes: any[], exportPrefs: any) => {
	const compareTraits = (a, b) => b.combo.length - a.combo.length;
	const compareCrew = (a, b) => b.crewList.length - a.crewList.length;
	const compareScore = (a, b) => b.score - a.score;
	const compareNotesAsc = (a, b) => {
		const aScore = a.alphaException || a.nonOptimal ? 1 : 0;
		const bScore = b.alphaException || b.nonOptimal ? 1 : 0;
		return aScore - bScore;
	};
	const sortCombos = (a, b) => {
		const comps = [compareTraits, compareNotesAsc, compareCrew, compareScore];
		let test = 0;
		while (comps.length > 0 && test === 0) {
			test = comps.shift()(a, b);
		}
		return test;
	};

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

	let matchingCrew = JSON.parse(JSON.stringify(allMatchingCrew));
	if (exportPrefs.alpha === 'hide') matchingCrew = filterAlphaExceptions(matchingCrew);

	const optimalCombos = getOptimalCombos(matchingCrew);

	const crewFilters = {
		hideNonOptimals: exportPrefs.optimal === 'hide',
		usableFilter: ''
	};

	let output = '';
	nodes.forEach(node => {
		let nodeList = '';
		const traitCounts = getTraitCountsByNode(node, matchingCrew);
		filterCombosByNode(node, matchingCrew, optimalCombos, traitCounts, crewFilters)
			.sort((a, b) => sortCombos(a, b))
			.forEach((row, idx) => {
				if (nodeList !== '') nodeList += '\n';
				if (exportPrefs.bullet === 'full') nodeList += `${node.index+1}.`;
				if (exportPrefs.bullet === 'full' || exportPrefs.bullet === 'number')
					nodeList += `${idx+1}`;
				else
					nodeList += `-`;
				if (exportPrefs.alpha === 'flag' && row.alphaException) nodeList += ALPHA_FLAG;
				if (exportPrefs.optimal === 'flag' && row.nonOptimal) nodeList += OPTIMAL_FLAG;
				const matchingCrew = row.crewList.sort((a, b) => a.name.localeCompare(b.name))
					.map(crew => formatCrewName(crew))
					.join(`${exportPrefs.delimiter} `);
				nodeList += ' '+matchingCrew;
				if (exportPrefs.traits === 'all')
					nodeList += ` (${sortedTraits(row.combo, node.alphaTest)})`;
			});
		if (nodeList !== '') {
			if (output !== '') output += '\n\n';
			output += `Node ${node.index+1}`;
			if (exportPrefs.traits === 'all' || exportPrefs.traits === 'nodes')
				output += ` (${sortedTraits(node.traitsKnown)}, ${Array(node.hiddenLeft).fill('?').join(', ')})`;
			output += '\n' + nodeList;
		}
	});

	return output;
};