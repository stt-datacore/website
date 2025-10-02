import React from 'react';
import { Header, Button, Popup, Message, Accordion, Form, Select, Input } from 'semantic-ui-react';

import { BossCrew, ExportPreferences, FilteredGroup, Optimizer, ShowHideValue, SolveStatus, Solver, SolverNode, SolverTrait } from '../../model/boss';
import { GlobalContext } from '../../context/globalcontext';

import { UserContext, SolverContext } from './context';
import { exportDefaults } from './fbbdefaults';
import { isNodeOpen, suppressDuplicateTraits } from './fbbutils';
import { TraitNames } from '../../model/traits';

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
	flag_onehand: '',
	flag_alpha: '',
	flag_unique: '',
	flag_nonoptimal: ''
} as ExportPreferences;

const exportNodeGroups = (node: SolverNode, nodeGroups: FilteredGroup[], traitData: SolverTrait[], exportPrefs: ExportPreferences, TRAIT_NAMES: TraitNames) => {
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
			let shtest = comps.shift();
			test = shtest ? shtest(a, b) : 0;
		}
		return test;
	};

	const sortedTraits = (traits: string[], alphaTest: string = '') => {
		const traitNameInstance = (trait: string) => {
			let name = TRAIT_NAMES[trait];
			if (prefValue(exportPrefs, 'duplicates') === 'number') {
				const instances = traitData.filter(t => t.trait === trait);
				if (instances.length > 1) {
					const needed = instances.length - instances.filter(t => t.consumed).length;
					name += ` ${needed}`;
				}
			}
			if (alphaTest !== '' && trait.localeCompare(alphaTest, 'en') < 0)
				name += `-${prefValue(exportPrefs, 'flag_alpha')}`;
			return name;
		};
		return traits.map(t => traitNameInstance(t)).sort((a, b) => a.localeCompare(b)).join(', ');
	};

	const formatCrewName = (crew: BossCrew) => {
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
			if (row.notes.oneHandException) groupList += prefValue(exportPrefs, 'flag_onehand');
			if (row.notes.alphaException) groupList += prefValue(exportPrefs, 'flag_alpha');
			if (row.notes.uniqueCrew) groupList += prefValue(exportPrefs, 'flag_unique');
			if (groupList !== '') groupList += ' ';
			const matchingCrew = row.crewList.sort((a, b) => a.name.localeCompare(b.name))
				.map(crew => formatCrewName(crew))
				.join(`${prefValue(exportPrefs, 'delimiter')} `);
			groupList += matchingCrew;
			if (prefValue(exportPrefs, 'crew_traits') === 'show' && node.solveStatus !== SolveStatus.Unconfirmed)
				groupList += ` (${sortedTraits(row.traits, node.alphaTest)})`;
			nodeList += groupList;
		});

	if (nodeList === '')
		nodeList = 'No possible solutions found for this node. You may need to change your filters, double-check your solved traits, or reset the list of attempted crew.';

	if (output !== '') output += '\n\n';

	let nodeHeader = `Node ${node.index+1}`;
	if (prefValue(exportPrefs, 'node_traits') === 'show')
		nodeHeader += ` (${nodeTraits(node, TRAIT_NAMES)})`;

	output += formatValue(prefValue(exportPrefs, 'node_format'), nodeHeader) + '\n' + nodeList;

	return output;
};

const prefValue = (prefs: ExportPreferences, field: string) => {
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

const nodeTraits = (node: SolverNode, TRAIT_NAMES: TraitNames): string => {
	const traitName = (trait: string, index: number) => {
		let name: string = TRAIT_NAMES[trait];
		if (node.solveStatus !== SolveStatus.Infallible && index >= node.givenTraitIds.length)
			name = `[${name}]`;
		return name;
	};
	const solved: string[] = node.traitsKnown.map((t, idx) => traitName(t, idx));
	const unsolved: string[] = Array(node.hiddenLeft).fill('?');
	return solved.concat(unsolved).join(', ');
};

type CrewNodeExporterProps = {
	node: SolverNode;
	nodeGroups: FilteredGroup[];
	traits: SolverTrait[];
};

export const CrewNodeExporter = (props: CrewNodeExporterProps) => {
	const userContext = React.useContext(UserContext);
	const { t, TRAIT_NAMES } = React.useContext(GlobalContext).localized;
	const { exportPrefs } = userContext;
	const { node, nodeGroups, traits } = props;

	const copyNode = () => {
		// When solve is unconfirmed, rewrite traitData to ignore duplicates
		const traitData: SolverTrait[] = suppressDuplicateTraits(traits, node.solve);
		const output = exportNodeGroups(node, nodeGroups, traitData, exportPrefs, TRAIT_NAMES);
		navigator.clipboard.writeText(output);
	};

	return (
		<Popup
			content={t('clipboard.copied_exclaim')}
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
	solver: Solver;
	optimizer: Optimizer;
};

export const CrewFullExporter = (props: CrewFullExporterProps) => {
	const { TRAIT_NAMES, t, tfmt } = React.useContext(GlobalContext).localized;
	const { exportPrefs, setExportPrefs } = React.useContext(UserContext);
	const { bossBattle: { description, chainIndex } } = React.useContext(SolverContext);
	const { solver, optimizer } = props;

	const copyFull = () => {
		const unsolvedNodes: number = solver.nodes.filter(node => isNodeOpen(node)).length;
		const unconfirmedNodes: number = solver.nodes.filter(node => node.solveStatus === SolveStatus.Unconfirmed).length;

		let solvedNodes: number = solver.nodes.length - unsolvedNodes;
		if (prefValue(exportPrefs, 'solve') === 'spot') solvedNodes -= unconfirmedNodes;

		let header: string = '';
		if (prefValue(exportPrefs, 'header') === 'always' || (prefValue(exportPrefs, 'header') === 'initial' && solvedNodes === 0)) {
			header += `${description}, Chain #${chainIndex+1} (${solvedNodes}/${solver.nodes.length} ${prefValue(exportPrefs, 'solve') === 'spot' ? 'confirmed ' : ''}solved)`;
			header += '\n\n';
		}
		let output: string = '';
		solver.nodes.forEach(node => {
			let nodeList: string = '';
			if (isNodeOpen(node)) {
				nodeList = exportNodeGroups(node, optimizer.groups[`node-${node.index}`], solver.traits, exportPrefs, TRAIT_NAMES);
			}
			else if (node.solveStatus === SolveStatus.Unconfirmed && (prefValue(exportPrefs, 'solve') === 'always' || prefValue(exportPrefs, 'solve') === 'spot')) {
				// When solve is unconfirmed, rewrite traitData to ignore duplicates
				const traitData: SolverTrait[] = suppressDuplicateTraits(solver.traits, node.solve);
				nodeList = exportNodeGroups(node, optimizer.groups[`node-${node.index}`], traitData, exportPrefs, TRAIT_NAMES);
			}
			else if ((node.solveStatus === SolveStatus.Infallible || node.solveStatus === SolveStatus.Confirmed) && prefValue(exportPrefs, 'solve') === 'always') {
				nodeList = `Node ${node.index+1} (${nodeTraits(node, TRAIT_NAMES)})`;
			}
			if (nodeList !== '') {
				if (output !== '') output += '\n\n';
				output += nodeList;
			}
		});
		navigator.clipboard.writeText(header + output);
	};

	// const copyFullPermalink = () => {
	// 	const { solver } = props;


	// 	let json = JSON.stringify(solver);
	// 	let b64 = lz.compressToBase64(json);

	// }

	return (
		<Message style={{ margin: '2em 0' }}>
			<Message.Content>
				<Message.Header>{t('fbb.crew_lists.title')}</Message.Header>
				<p>{t('fbb.crew_lists.heading')}</p>
				<ExportOptions prefs={exportPrefs} updatePrefs={setExportPrefs} />
				<Popup
					content={t('clipboard.copied_exclaim')}
					on='click'
					position='right center'
					size='tiny'
					trigger={
						<Button icon='clipboard' content={t('fbb.crew_lists.clipboard')} onClick={() => copyFull()} />
					}
				/>
				{/* <Popup
					content='Copied!'
					on='click'
					position='right center'
					size='tiny'
					trigger={
						<Button icon='link' content='Copy permalink' onClick={() => copyFullPermalink()} />
					}
				/> */}

			</Message.Content>
		</Message>
	);
};

type ExportOptionsProps = {
	prefs: ExportPreferences;
	updatePrefs: (prefs: ExportPreferences) => void;
};

const ExportOptions = (props: ExportOptionsProps) => {
	const { prefs, updatePrefs } = props;
	const { t, tfmt } = React.useContext(GlobalContext).localized;
	const [isActive, setIsActive] = React.useState(false);

	const headerOptions = [
		{ key: 'always', text: t('fbb.crew_lists.customize.options.dropdowns.header.always'), value: 'always' },
		{ key: 'initial', text: t('fbb.crew_lists.customize.options.dropdowns.header.initial'), value: 'initial' },
		{ key: 'hide', text: t('fbb.crew_lists.customize.options.dropdowns.header.hide'), value: 'hide' }
	];

	const solveOptions = [
		{ key: 'always', text: t('fbb.crew_lists.customize.options.dropdowns.solve.always'), value: 'always' },
		{ key: 'spot', text: t('fbb.crew_lists.customize.options.dropdowns.solve.spot'), value: 'spot' },
		{ key: 'hide', text: t('fbb.crew_lists.customize.options.dropdowns.solve.hide'), value: 'hide' }
	];

	const formatOptions = [
		{ key: 'italic', text: t('fbb.crew_lists.customize.options.dropdowns.format.italic'), value: 'italic' },
		{ key: 'bold', text: t('fbb.crew_lists.customize.options.dropdowns.format.bold'), value: 'bold' },
		{ key: 'bolditalic', text: t('fbb.crew_lists.customize.options.dropdowns.format.bolditalic'), value: 'bolditalic' },
		{ key: 'underline', text: t('fbb.crew_lists.customize.options.dropdowns.format.underline'), value: 'underline' },
		{ key: 'italicunderline', text: t('fbb.crew_lists.customize.options.dropdowns.format.italicunderline'), value: 'italicunderline' },
		{ key: 'boldunderline', text: t('fbb.crew_lists.customize.options.dropdowns.format.boldunderline'), value: 'boldunderline' },
		{ key: 'bolditalicunderline', text: t('fbb.crew_lists.customize.options.dropdowns.format.bolditalicunderline'), value: 'bolditalicunderline' },
		{ key: 'none', text: t('fbb.crew_lists.customize.options.dropdowns.format.none'), value: 'none' }
	];

	const showOptions = [
		{ key: 'show', text: t('fbb.crew_lists.customize.options.dropdowns.show.show'), value: 'show' },
		{ key: 'hide', text: t('fbb.crew_lists.customize.options.dropdowns.show.hide'), value: 'hide' }
	];

	const bulletOptions = [
		{ key: 'simple', text: t('fbb.crew_lists.customize.options.dropdowns.bullet.simple'), value: 'simple', example: '- Spock' },
		{ key: 'number', text: t('fbb.crew_lists.customize.options.dropdowns.bullet.number'), value: 'number', example: '1 Spock' },
		{ key: 'full', text: t('fbb.crew_lists.customize.options.dropdowns.bullet.full'), value: 'full', example: '2.1 Spock' },
		{ key: 'none', text: t('fbb.crew_lists.customize.options.dropdowns.bullet.none'), value: 'none', example: 'Spock' }
	];

	const delimiterOptions = [
		{ key: 'comma', text: t('fbb.crew_lists.customize.options.dropdowns.delimiter.comma'), value: ',', example: 'Spock, Lt Uhura' },
		{ key: 'semicolon', text: t('fbb.crew_lists.customize.options.dropdowns.delimiter.semicolon'), value: ';', example: 'Spock; Lt. Uhura' }
	];

	const duplicatesOptions = [
		{ key: 'number', text: t('fbb.crew_lists.customize.options.dropdowns.duplicates.number'), value: 'number' },
		{ key: 'ignore', text: t('fbb.crew_lists.customize.options.dropdowns.duplicates.ignore'), value: 'ignore' }
	];


	// const headerOptions = [
	// 	{ key: 'always', text: 'Always show boss chain', value: 'always' },
	// 	{ key: 'initial', text: 'Show on new chains only', value: 'initial' },
	// 	{ key: 'hide', text: 'Do not show', value: 'hide' }
	// ];

	// const solveOptions = [
	// 	{ key: 'always', text: 'Always show solutions', value: 'always' },
	// 	{ key: 'spot', text: 'Show unconfirmed solutions only', value: 'spot' },
	// 	{ key: 'hide', text: 'Do not show', value: 'hide' }
	// ];

	// const formatOptions = [
	// 	{ key: 'italic', text: 'Italic (*)', value: 'italic' },
	// 	{ key: 'bold', text: 'Bold (**)', value: 'bold' },
	// 	{ key: 'bolditalic', text: 'Bold italic (***)', value: 'bolditalic' },
	// 	{ key: 'underline', text: 'Underline (__)', value: 'underline' },
	// 	{ key: 'italicunderline', text: 'Italic underline (*__)', value: 'italicunderline' },
	// 	{ key: 'boldunderline', text: 'Bold underline (**__)', value: 'boldunderline' },
	// 	{ key: 'bolditalicunderline', text: 'Bold italic underline (***__)', value: 'bolditalicunderline' },
	// 	{ key: 'none', text: 'No formatting', value: 'none' }
	// ];

	// const showOptions = [
	// 	{ key: 'show', text: 'Show', value: 'show' },
	// 	{ key: 'hide', text: 'Do not show', value: 'hide' }
	// ];

	// const bulletOptions = [
	// 	{ key: 'simple', text: 'Dash', value: 'simple', example: '- Spock' },
	// 	{ key: 'number', text: 'Number', value: 'number', example: '1 Spock' },
	// 	{ key: 'full', text: 'Node and number', value: 'full', example: '2.1 Spock' },
	// 	{ key: 'none', text: 'None', value: 'none', example: 'Spock' }
	// ];

	// const delimiterOptions = [
	// 	{ key: 'comma', text: 'Comma', value: ',', example: 'Spock, Lt Uhura' },
	// 	{ key: 'semicolon', text: 'Semicolon', value: ';', example: 'Spock; Lt. Uhura' }
	// ];

	// const duplicatesOptions = [
	// 	{ key: 'number', text: 'Show number needed', value: 'number' },
	// 	{ key: 'ignore', text: 'Do not number', value: 'ignore' }
	// ];

	return (
		<div style={{ margin: '1em 0' }}>
			<Accordion>
				<Accordion.Panel
					active={isActive}
					index={1}
					onTitleClick={() => setIsActive(!isActive)}
					title={{ content: t('fbb.crew_lists.customize.title'), icon: `caret ${isActive ? 'down' : 'right'}` }}
					content={{ children: () => renderPrefsForm() }}
				/>
			</Accordion>
		</div>
	);

	function renderPrefsForm(): React.JSX.Element {
		if (!isActive) return (<></>);
		return (
			<div style={{ marginBottom: '2em', padding: '0 1.5em' }}>
				<div>
					{t('fbb.crew_lists.customize.heading')}
				</div>
				<Form style={{ marginTop: '1em' }}>
					<Form.Group grouped>
						<Header as='h5'>{t('fbb.crew_lists.customize.options.node_header')}</Header>
						<Form.Group inline>
							<Form.Field>
								<label>{t('fbb.crew_lists.customize.options.formatting')}</label>
								<Select
									options={formatOptions}
									value={prefs.node_format ?? exportDefaults.node_format}
									onChange={(e, { value }) => updatePrefs({...prefs, node_format: value as string})}
								/>
							</Form.Field>
							<Form.Field>
								<label>{t('fbb.crew_lists.customize.options.traits')}</label>
								<Select
									options={showOptions}
									value={prefs.node_traits ?? exportDefaults.node_traits}
									onChange={(e, { value }) => updatePrefs({...prefs, node_traits: value as ShowHideValue})}
								/>
							</Form.Field>
						</Form.Group>
						<Header as='h5' style={{ marginTop: '1.5em' }}>{t('fbb.crew_lists.customize.options.possible_solutions')}</Header>
						<Form.Group inline>
							<Form.Field>
								<label>{t('fbb.crew_lists.customize.options.bullet')}</label>
								<Select
									options={bulletOptions}
									value={prefs.bullet ?? exportDefaults.bullet}
									onChange={(e, { value }) => updatePrefs({...prefs, bullet: value as string})}
								/>
							</Form.Field>
							<Form.Field>
								<label>{t('fbb.crew_lists.customize.options.non_optimal')}</label>
								<Input style={{ width: '5em' }}
									value={prefs.flag_nonoptimal ?? exportDefaults.flag_nonoptimal}
									onChange={(e, { value }) => updatePrefs({...prefs, flag_nonoptimal: value as string})}
								/>
							</Form.Field>
							<Form.Field>
								<label>{t('fbb.crew_lists.customize.options.one_hand_exception')}</label>
								<Input style={{ width: '5em' }}
									value={prefs.flag_onehand ?? exportDefaults.flag_onehand}
									onChange={(e, { value }) => updatePrefs({...prefs, flag_onehand: value as string})}
								/>
							</Form.Field>
							<Form.Field>
								<label>{t('fbb.crew_lists.customize.options.alpha_exception')}</label>
								<Input style={{ width: '5em' }}
									value={prefs.flag_alpha ?? exportDefaults.flag_alpha}
									onChange={(e, { value }) => updatePrefs({...prefs, flag_alpha: value as string})}
								/>
							</Form.Field>
						</Form.Group>
						<Form.Group inline>
							<Form.Field>
								<label>{t('fbb.crew_lists.customize.options.crew_delimiter')}</label>
								<Select
									options={delimiterOptions}
									value={prefs.delimiter ?? exportDefaults.delimiter}
									onChange={(e, { value }) => updatePrefs({...prefs, delimiter: value as string})}
								/>
							</Form.Field>
							<Form.Field>
								<label>{t('fbb.crew_lists.customize.options.coverage_potential')}</label>
								<Select
									options={formatOptions}
									value={prefs.coverage_format ?? exportDefaults.coverage_format}
									onChange={(e, { value }) => updatePrefs({...prefs, coverage_format: value as string})}
								/>
							</Form.Field>
						</Form.Group>
						<Form.Group inline>
							<Form.Field>
								<label>{t('fbb.crew_lists.customize.options.traits')}</label>
								<Select
									options={showOptions}
									value={prefs.crew_traits ?? exportDefaults.crew_traits}
									onChange={(e, { value }) => updatePrefs({...prefs, crew_traits: value as ShowHideValue})}
								/>
							</Form.Field>
							<Form.Field>
								<label>{t('fbb.crew_lists.customize.options.duplicate_traits')}</label>
								<Select
									options={duplicatesOptions}
									value={prefs.duplicates ?? exportDefaults.duplicates}
									onChange={(e, { value }) => updatePrefs({...prefs, duplicates: value as string})}
								/>
							</Form.Field>
						</Form.Group>
						<Header as='h5' style={{ marginTop: '1.5em' }}>{t('fbb.crew_lists.customize.options.full_exports_only')}</Header>
						<Form.Group inline>
							<Form.Field>
								<label>{t('fbb.crew_lists.customize.options.export_header')}</label>
								<Select
									options={headerOptions}
									value={prefs.header ?? exportDefaults.header}
									onChange={(e, { value }) => updatePrefs({...prefs, header: value as string})}
								/>
							</Form.Field>
							<Form.Field>
								<label>{t('fbb.crew_lists.customize.options.solved_nodes')}</label>
								<Select
									options={solveOptions}
									value={prefs.solve ?? exportDefaults.solve}
									onChange={(e, { value }) => updatePrefs({...prefs, solve: value as string})}
								/>
							</Form.Field>
						</Form.Group>
						<Form.Group inline style={{ marginTop: '1.5em' }}>
							<Header as='h5' style={{ marginRight: '1em' }}>{t('fbb.crew_lists.customize.options.load_preset_values')}:</Header>
							<Button compact onClick={() => setPresets(exportDefaults)}>
								{t('fbb.crew_lists.customize.options.defaults')}
							</Button>
							<Button compact onClick={() => setPresets(exportCompact)}>
								{t('fbb.crew_lists.customize.options.compact')}
							</Button>
						</Form.Group>
					</Form.Group>
				</Form>
			</div>
		);
	}

	function setPresets(presetPrefs: ExportPreferences): void {
		updatePrefs({...presetPrefs});
	}
};
