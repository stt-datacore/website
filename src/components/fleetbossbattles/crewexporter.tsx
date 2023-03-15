import React from 'react';
import { Header, Button, Popup, Message, Accordion, Form, Select, Input, Icon } from 'semantic-ui-react';

import allTraits from '../../../static/structured/translation_en.json';

const FLAG_ALPHA = '\u03B1';
const FLAG_UNIQUE = '\u00B5';
const FLAG_NONOPTIMAL = '\u03B9';

export const exportDefaults = {
	header: 'always',
	traits: 'all',
	bullet: 'simple',
	delimiter: ',',
	flag_alpha: FLAG_ALPHA,
	flag_unique: FLAG_UNIQUE,
	flag_nonoptimal: FLAG_NONOPTIMAL
};

type CrewFullExporterProps = {
	solver: any;
	openNodes: any[];
	matchingGroups: any;
	exportPrefs: any;
	setExportPrefs: (prefs: any) => void;
};

export const CrewFullExporter = (props: CrewFullExporterProps) => {
	const { solver, matchingGroups, exportPrefs } = props;

	const copyFull = () => {
		const openNodes = solver.nodes.filter(node => node.open);
		let header = '';
		if (exportPrefs.header === 'always' || (exportPrefs.header === 'initial' && solver.nodes.length-openNodes.length === 0)) {
			header += `${solver.description} (${solver.nodes.length-openNodes.length}/${solver.nodes.length})`;
			header += '\n\n';
		}
		let output = '';
		openNodes.forEach(node => {
			const nodeList = exportNodeGroups(node, matchingGroups[`node-${node.index}`], exportPrefs);
			if (nodeList !== '') {
				if (output !== '') output += '\n\n';
				output += nodeList;
			}
		});
		navigator.clipboard.writeText(header + output);
	};

	return (
		<Message style={{ margin: '2em 0' }}>
			<Message.Content>
				<Message.Header>Export Crew Lists</Message.Header>
				<p>Copy the lists of possible crew shown above to share on Discord or other forums. Asterisked crew are possible solutions to multiple nodes.</p>
				<ExportOptions prefs={exportPrefs} updatePrefs={props.setExportPrefs} />
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
	const [alphaPref, setAlphaPref] = React.useState(props.prefs.flag_alpha ?? exportDefaults.flag_alpha);
	const [uniquePref, setUniquePref] = React.useState(props.prefs.flag_unique ?? exportDefaults.flag_unique);
	const [optimalPref, setOptimalPref] = React.useState(props.prefs.flag_nonoptimal ?? exportDefaults.flag_nonoptimal);

	React.useEffect(() => {
		props.updatePrefs({
			header: headerPref,
			traits: traitsPref,
			bullet: bulletPref,
			delimiter: delimiterPref,
			flag_alpha: alphaPref,
			flag_unique: uniquePref,
			flag_nonoptimal: optimalPref
		});
	}, [headerPref, traitsPref, bulletPref, delimiterPref, alphaPref, uniquePref, optimalPref]);

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
		{ key: 'alpha', text: `Alpha [${FLAG_ALPHA}]`, value: FLAG_ALPHA },
		{ key: 'a', text: 'Letter a', value: 'a' },
		{ key: 'x', text: 'Letter x', value: 'x' },
		{ key: 'none', text: 'None', value: '' }
	];

	const uniqueOptions = [
		{ key: 'alpha', text: `Uniqueness [${FLAG_UNIQUE}]`, value: FLAG_UNIQUE },
		{ key: 'u', text: 'Letter u', value: 'u' },
		{ key: 'x', text: 'Letter x', value: 'x' },
		{ key: 'none', text: 'None', value: '' }
	];

	const optimalOptions = [
		{ key: 'iota', text: `Subset [${FLAG_NONOPTIMAL}]`, value: FLAG_NONOPTIMAL },
		{ key: 'n', text: 'Letter n', value: 'n' },
		{ key: 'dash', text: 'Double dash', value: '--' },
		{ key: 'none', text: 'None', value: '' }
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
					You can customize the appearance of the export. The following preferences will be remembered on all subsequent exports.
				</div>
				<Form style={{ marginTop: '1em' }}>
					<Form.Group grouped>
						<Form.Group inline>
							<Form.Field>
								<label>Header (full export only)</label>
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
						</Form.Group>
						<Form.Group inline>
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
						<div>
							<Header as='h5'>Flags (when not hidden by filters)</Header>
						</div>
						<Form.Group inline>
							<Form.Field>
								<label>Non-optimal</label>
								<Input style={{ width: '5em' }}
									value={optimalPref}
									onChange={(e, { value }) => setOptimalPref(value)}
								/>
							</Form.Field>
							<Form.Field>
								<label>Unique</label>
								<Input style={{ width: '5em' }}
									value={uniquePref}
									onChange={(e, { value }) => setUniquePref(value)}
								/>
							</Form.Field>
							<Form.Field>
								<label>Alpha exception</label>
								<Input style={{ width: '5em' }}
									value={alphaPref}
									onChange={(e, { value }) => setAlphaPref(value)}
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
		setAlphaPref(exportDefaults.flag_alpha);
		setUniquePref(exportDefaults.flag_unique);
		setOptimalPref(exportDefaults.flag_nonoptimal);
	}
};

type CrewNodeExporterProps = {
	node: any;
	matchingGroups: any;
	exportPrefs: any;
};

export const CrewNodeExporter = (props: CrewNodeExporterProps) => {
	const { node, matchingGroups, exportPrefs } = props;

	const copyNode = () => {
		const output = exportNodeGroups(node, matchingGroups, exportPrefs);
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

const exportNodeGroups = (node: any, nodeGroup: any, exportPrefs: any) => {
	const compareTraits = (a, b) => b.traits.length - a.traits.length;
	const compareCrew = (a, b) => b.crewList.length - a.crewList.length;
	const compareScore = (a, b) => b.score - a.score;
	const compareNotesAsc = (a, b) => {
		return Object.values(a.notes).filter(note => !!note).length - Object.values(b.notes).filter(note => !!note).length;
	};
	const sortGroups = (a, b) => {
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
			if (alphaTest !== '' && trait.localeCompare(alphaTest) < 0)
				name += `-${exportPrefs.flag_alpha}`;
			return name;
		};
		return traits.map(t => traitName(t)).sort((a, b) => a.localeCompare(b)).join(', ');
	};

	const formatCrewName = (crew) => {
		let name = exportPrefs.delimiter === ',' ? crew.name.replace(/[,\.\(\)\[\]"“”]/g, '') : crew.name;
		if (crew.nodes_rarity > 1) name = `*${name}*`;
		return name;
	};

	let output = '';
	let nodeList = '';
	nodeGroup.sort((a, b) => sortGroups(a, b))
		.forEach((row, idx) => {
			if (nodeList !== '') nodeList += '\n';
			if (exportPrefs.bullet === 'full') nodeList += `${node.index+1}.`;
			if (exportPrefs.bullet === 'full' || exportPrefs.bullet === 'number')
				nodeList += `${idx+1}`;
			else
				nodeList += `-`;
			if (row.notes.nonOptimal) nodeList += exportPrefs.flag_nonoptimal;
			if (row.notes.alphaException) nodeList += exportPrefs.flag_alpha;
			if (row.notes.uniqueCrew) nodeList += exportPrefs.flag_unique;
			const matchingCrew = row.crewList.sort((a, b) => a.name.localeCompare(b.name))
				.map(crew => formatCrewName(crew))
				.join(`${exportPrefs.delimiter} `);
			nodeList += ' '+matchingCrew;
			if (exportPrefs.traits === 'all')
				nodeList += ` (${sortedTraits(row.traits, node.alphaTest)})`;
		});
	if (nodeList !== '') {
		if (output !== '') output += '\n\n';
		output += `Node ${node.index+1}`;
		if (exportPrefs.traits === 'all' || exportPrefs.traits === 'nodes')
			output += ` (${sortedTraits(node.traitsKnown)}, ${Array(node.hiddenLeft).fill('?').join(', ')})`;
		output += '\n' + nodeList;
	}

	return output;
};
