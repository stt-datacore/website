import React from 'react';
import { Header, Button, Popup, Message, Accordion, Form, Select, Input, Icon } from 'semantic-ui-react';

import allTraits from '../../../static/structured/translation_en.json';

const FLAG_ALPHA = '\u03B1';
const FLAG_UNIQUE = '\u00B5';
const FLAG_NONOPTIMAL = '\u03B9';

export const exportDefaults = {
	header: 'always',
	solve: 'hide',
	node_format: 'bold',
	node_traits: 'show',
	bullet: 'simple',
	delimiter: ',',
	coverage_format: 'italic',
	crew_traits: 'show',
	duplicates: 'number',
	flag_alpha: FLAG_ALPHA,
	flag_unique: FLAG_UNIQUE,
	flag_nonoptimal: FLAG_NONOPTIMAL
};

const exportCompact = {
	header: 'hide',
	solve: 'hide',
	node_format: 'none',
	node_traits: 'hide',
	bullet: 'none',
	delimiter: ',',
	coverage_format: 'none',
	crew_traits: 'hide',
	duplicates: 'ignore',
	flag_alpha: '',
	flag_unique: '',
	flag_nonoptimal: ''
};

const exportNodeGroups = (node: any, nodeGroups: any, traitData: any[], exportPrefs: any) => {
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

	const sortedTraits = (traits: string[], alphaTest: string = '') => {
		const traitNameInstance = (trait: string) => {
			let name = allTraits.trait_names[trait];
			if (prefValue(exportPrefs, 'duplicates') === 'number') {
				const instances = traitData.filter(t => t.trait === trait);
				if (instances.length > 1) {
					const needed = instances.length - instances.filter(t => t.consumed).length;
					name += ` ${needed}`;
				}
			}
			if (alphaTest !== '' && trait.localeCompare(alphaTest) < 0)
				name += `-${prefValue(exportPrefs, 'flag_alpha')}`;
			return name;
		};
		return traits.map(t => traitNameInstance(t)).sort((a, b) => a.localeCompare(b)).join(', ');
	};

	const formatCrewName = (crew: any) => {
		let name = prefValue(exportPrefs, 'delimiter') === ',' ? crew.name.replace(/[,\.\(\)\[\]"“”]/g, '') : crew.name;
		if (crew.nodes_rarity > 1) name = formatValue(prefValue(exportPrefs, 'coverage_format'), name);
		return name;
	};

	let output = '';
	let nodeList = '';
	nodeGroups.sort((a, b) => sortGroups(a, b))
		.forEach((row, idx) => {
			if (nodeList !== '') nodeList += '\n';
			let groupList = '';
			if (prefValue(exportPrefs, 'bullet') === 'full') groupList += `${node.index+1}.`;
			if (prefValue(exportPrefs, 'bullet') === 'full' || prefValue(exportPrefs, 'bullet') === 'number')
				groupList += `${idx+1}`;
			else if (prefValue(exportPrefs, 'bullet') === 'simple')
				groupList += `-`;
			if (row.notes.nonOptimal) groupList += prefValue(exportPrefs, 'flag_nonoptimal');
			if (row.notes.alphaException) groupList += prefValue(exportPrefs, 'flag_alpha');
			if (row.notes.uniqueCrew) groupList += prefValue(exportPrefs, 'flag_unique');
			if (groupList !== '') groupList += ' ';
			const matchingCrew = row.crewList.sort((a, b) => a.name.localeCompare(b.name))
				.map(crew => formatCrewName(crew))
				.join(`${prefValue(exportPrefs, 'delimiter')} `);
			groupList += matchingCrew;
			if (prefValue(exportPrefs, 'crew_traits') === 'show')
				groupList += ` (${sortedTraits(row.traits, node.alphaTest)})`;
			nodeList += groupList;
		});

	if (nodeList === '')
		nodeList = 'No possible solutions found for this node. You may need to change your filters, double-check your solved traits, or reset the list of attempted crew.';

	if (output !== '') output += '\n\n';

	let nodeHeader = `Node ${node.index+1}`;
	if (prefValue(exportPrefs, 'node_traits') === 'show')
		nodeHeader += ` (${nodeTraits(node)})`;

	output += formatValue(prefValue(exportPrefs, 'node_format'), nodeHeader) + '\n' + nodeList;

	return output;
};

const prefValue = (prefs: any, field: string) => {
	return prefs[field] ?? exportDefaults[field];
};

const formatValue = (format: string, value: string) => {
	let formattedValue = value;
	if (format.indexOf('underline') >= 0) formattedValue = `__${formattedValue}__`;
	if (format.indexOf('bolditalic') >= 0) formattedValue = `***${formattedValue}***`;
	else if (format.indexOf('bold') >= 0) formattedValue = `**${formattedValue}**`;
	else if (format.indexOf('italic') >= 0) formattedValue = `*${formattedValue}*`;
	return formattedValue;
};

const nodeTraits = (node: any) => {
	const traitName = (trait: string, index: number) => {
		let name = allTraits.trait_names[trait];
		if (node.spotSolve && index >= node.givenTraitIds.length)
			name = `[${name}]`;
		return name;
	};
	const solved = node.traitsKnown.map((t, idx) => traitName(t, idx));
	const unsolved = Array(node.hiddenLeft).fill('?');
	return solved.concat(unsolved).join(', ');
};

type CrewNodeExporterProps = {
	node: any;
	nodeGroups: any;
	traits: any[];
	exportPrefs: any;
};

export const CrewNodeExporter = (props: CrewNodeExporterProps) => {
	const { node, nodeGroups, traits, exportPrefs } = props;

	const copyNode = () => {
		const output = exportNodeGroups(node, nodeGroups, traits, exportPrefs);
		navigator.clipboard.writeText(output);
	};

	return (
		<Popup
			content='Copied!'
			on='click'
			position='bottom center'
			size='tiny'
			trigger={
				<Button icon='clipboard' onClick={() => copyNode()} />
			}
		/>
	);
};

type CrewFullExporterProps = {
	solver: any;
	resolver: any;
	exportPrefs: any;
	setExportPrefs: (prefs: any) => void;
};

export const CrewFullExporter = (props: CrewFullExporterProps) => {
	const { solver, resolver, exportPrefs } = props;

	const copyFull = () => {
		const openNodes = solver.nodes.filter(node => node.open);
		let header = '';
		if (prefValue(exportPrefs, 'header') === 'always' || (prefValue(exportPrefs, 'header') === 'initial' && solver.nodes.length-openNodes.length === 0)) {
			header += `${solver.description} (${solver.nodes.length-openNodes.length}/${solver.nodes.length})`;
			header += '\n\n';
		}
		let output = '';
		solver.nodes.forEach(node => {
			let nodeList = '';
			if (node.open) {
				nodeList = exportNodeGroups(node, resolver.filtered.groups[`node-${node.index}`], solver.traits, exportPrefs);
			}
			else {
				if (prefValue(exportPrefs, 'solve') === 'always' || (prefValue(exportPrefs, 'solve') === 'spot' && node.spotSolve)) {
					nodeList = `Node ${node.index+1} (${nodeTraits(node)})`;
				}
			}
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
				<p>Copy the lists of possible crew, grouped by nodes and traits, for easier sharing on Discord or other forums.</p>
				<ExportOptions prefs={exportPrefs} updatePrefs={props.setExportPrefs} />
				<Popup
					content='Copied!'
					on='click'
					position='right center'
					size='tiny'
					trigger={
						<Button icon='clipboard' content='Copy possible crew to clipboard' onClick={() => copyFull()} />
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
	const { prefs, updatePrefs } = props;

	const [isActive, setIsActive] = React.useState(false);

	const headerOptions = [
		{ key: 'always', text: 'Always show boss chain', value: 'always' },
		{ key: 'initial', text: 'Show on new chains only', value: 'initial' },
		{ key: 'hide', text: 'Do not show', value: 'hide' }
	];

	const solveOptions = [
		{ key: 'always', text: 'Always show solutions', value: 'always' },
		{ key: 'spot', text: 'Show unconfirmed solutions only', value: 'spot' },
		{ key: 'hide', text: 'Do not show', value: 'hide' }
	];

	const formatOptions = [
		{ key: 'italic', text: 'Italic (*)', value: 'italic' },
		{ key: 'bold', text: 'Bold (**)', value: 'bold' },
		{ key: 'bolditalic', text: 'Bold italic (***)', value: 'bolditalic' },
		{ key: 'underline', text: 'Underline (__)', value: 'underline' },
		{ key: 'italicunderline', text: 'Italic underline (*__)', value: 'italicunderline' },
		{ key: 'boldunderline', text: 'Bold underline (**__)', value: 'boldunderline' },
		{ key: 'bolditalicunderline', text: 'Bold italic underline (***__)', value: 'bolditalicunderline' },
		{ key: 'none', text: 'No formatting', value: 'none' }
	];

	const showOptions = [
		{ key: 'show', text: 'Show', value: 'show' },
		{ key: 'hide', text: 'Do not show', value: 'hide' }
	];

	const bulletOptions = [
		{ key: 'simple', text: 'Dash', value: 'simple', example: '- Spock' },
		{ key: 'number', text: 'Number', value: 'number', example: '1 Spock' },
		{ key: 'full', text: 'Node and number', value: 'full', example: '2.1 Spock' },
		{ key: 'none', text: 'None', value: 'none', example: 'Spock' }
	];

	const delimiterOptions = [
		{ key: 'comma', text: 'Comma', value: ',', example: 'Spock, Lt Uhura' },
		{ key: 'semicolon', text: 'Semicolon', value: ';', example: 'Spock; Lt. Uhura' }
	];

	const duplicatesOptions = [
		{ key: 'number', text: 'Show number needed', value: 'number' },
		{ key: 'ignore', text: 'Do not number', value: 'ignore' }
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
						<Header as='h5'>Node header</Header>
						<Form.Group inline>
							<Form.Field>
								<label>Formatting</label>
								<Select
									options={formatOptions}
									value={prefs.node_format ?? exportDefaults.node_format}
									onChange={(e, { value }) => updatePrefs({...prefs, node_format: value})}
								/>
							</Form.Field>
							<Form.Field>
								<label>Traits</label>
								<Select
									options={showOptions}
									value={prefs.node_traits ?? exportDefaults.node_traits}
									onChange={(e, { value }) => updatePrefs({...prefs, node_traits: value})}
								/>
							</Form.Field>
						</Form.Group>
						<Header as='h5' style={{ marginTop: '1.5em' }}>Possible solutions</Header>
						<Form.Group inline>
							<Form.Field>
								<label>Bullet</label>
								<Select
									options={bulletOptions}
									value={prefs.bullet ?? exportDefaults.bullet}
									onChange={(e, { value }) => updatePrefs({...prefs, bullet: value})}
								/>
							</Form.Field>
							<Form.Field>
								<label>Non-optimal</label>
								<Input style={{ width: '5em' }}
									value={prefs.flag_nonoptimal ?? exportDefaults.flag_nonoptimal}
									onChange={(e, { value }) => updatePrefs({...prefs, flag_nonoptimal: value})}
								/>
							</Form.Field>
							<Form.Field>
								<label>Unique</label>
								<Input style={{ width: '5em' }}
									value={prefs.flag_unique ?? exportDefaults.flag_unique}
									onChange={(e, { value }) => updatePrefs({...prefs, flag_unique: value})}
								/>
							</Form.Field>
							<Form.Field>
								<label>Alpha exception</label>
								<Input style={{ width: '5em' }}
									value={prefs.flag_alpha ?? exportDefaults.flag_alpha}
									onChange={(e, { value }) => updatePrefs({...prefs, flag_alpha: value})}
								/>
							</Form.Field>
						</Form.Group>
						<Form.Group inline>
							<Form.Field>
								<label>Crew delimiter</label>
								<Select
									options={delimiterOptions}
									value={prefs.delimiter ?? exportDefaults.delimiter}
									onChange={(e, { value }) => updatePrefs({...prefs, delimiter: value})}
								/>
							</Form.Field>
							<Form.Field>
								<label>Coverage potential</label>
								<Select
									options={formatOptions}
									value={prefs.coverage_format ?? exportDefaults.coverage_format}
									onChange={(e, { value }) => updatePrefs({...prefs, coverage_format: value})}
								/>
							</Form.Field>
						</Form.Group>
						<Form.Group inline>
							<Form.Field>
								<label>Traits</label>
								<Select
									options={showOptions}
									value={prefs.crew_traits ?? exportDefaults.crew_traits}
									onChange={(e, { value }) => updatePrefs({...prefs, crew_traits: value})}
								/>
							</Form.Field>
							<Form.Field>
								<label>Duplicate traits</label>
								<Select
									options={duplicatesOptions}
									value={prefs.duplicates ?? exportDefaults.duplicates}
									onChange={(e, { value }) => updatePrefs({...prefs, duplicates: value})}
								/>
							</Form.Field>
						</Form.Group>
						<Header as='h5' style={{ marginTop: '1.5em' }}>Full exports only</Header>
						<Form.Group inline>
							<Form.Field>
								<label>Export header</label>
								<Select
									options={headerOptions}
									value={prefs.header ?? exportDefaults.header}
									onChange={(e, { value }) => updatePrefs({...prefs, header: value})}
								/>
							</Form.Field>
							<Form.Field>
								<label>Solved nodes</label>
								<Select
									options={solveOptions}
									value={prefs.solve ?? exportDefaults.solve}
									onChange={(e, { value }) => updatePrefs({...prefs, solve: value})}
								/>
							</Form.Field>
						</Form.Group>
						<Form.Group inline style={{ marginTop: '1.5em' }}>
							<Header as='h5' style={{ marginRight: '1em' }}>Load preset values:</Header>
							<Button compact onClick={() => setPresets(exportDefaults)}>
								Defaults
							</Button>
							<Button compact onClick={() => setPresets(exportCompact)}>
								Compact
							</Button>
						</Form.Group>
					</Form.Group>
				</Form>
			</div>
		);
	}

	function setPresets(presetPrefs: any): void {
		updatePrefs({...presetPrefs});
	}
};
