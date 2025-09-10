import React from 'react';
import {
	Button,
	Dropdown,
	DropdownItemProps,
	Form,
	Grid,
	Header,
	Icon,
	Label,
	Message,
	Popup,
	Table
} from 'semantic-ui-react';

import { Solve, SolveStatus, Solver, SolverNode, SolverTrait, Spotter } from '../../model/boss';
import { GlobalContext } from '../../context/globalcontext';

import { UserContext, SolverContext } from './context';

type ChainTraitsProps = {
	solver: Solver;
	spotter: Spotter;
	updateSpotter: (spotter: Spotter) => void;
};

const ChainTraits = (props: ChainTraitsProps) => {
	const { collaboration } = React.useContext(SolverContext);
	const { solver, spotter, updateSpotter } = props;

	return (
		<React.Fragment>
			<TraitsProgress solver={solver} solveNode={onNodeSolved} />
			<TraitsPossible solver={solver} />
			{!collaboration && <TraitsChecklist solver={solver} spotter={spotter} updateSpotter={updateSpotter} />}
			<TraitsExporter solver={solver} />
		</React.Fragment>
	);

	function onNodeSolved(nodeIndex: number, traits: string[]): void {
		const solves: Solve[] = structuredClone(spotter.solves);
		const solve: Solve | undefined = solves.find(solve => solve.node === nodeIndex);
		if (solve) {
			solve.traits = traits;
			solve.crew = [];
		}
		else {
			solves.push({ node: nodeIndex, traits, crew: [] });
		}
		updateSpotter({...spotter, solves});
	}
};

const traitNameInstance = (trait: SolverTrait) => {
	if (trait.poolCount > 1) return `${trait.name} (${trait.instance})`;
	return trait.name;
};

type TraitsProgressProps = {
	solver: Solver;
	solveNode: (nodeIndex: number, traits: string[]) => void;
};

const TraitsProgress = (props: TraitsProgressProps) => {
	const { t, tfmt } = React.useContext(GlobalContext).localized;
	const { spotterPrefs } = React.useContext(UserContext);
	const { solver } = props;

	const traitPool: SolverTrait[] = solver.traits.filter(t => t.source === 'pool');

	return (
		<div style={{ margin: '2em 0' }}>
			<Header as='h4'>{t('fbb.current_solutions.title')}</Header>
			<p>{t('fbb.current_solutions.heading')}</p>
			<Table celled selectable striped unstackable compact='very'>
				<Table.Header>
					<Table.Row>
						<Table.HeaderCell>{t('fbb.columns.given_traits')}</Table.HeaderCell>
						<Table.HeaderCell>{t('fbb.columns.mystery_traits')}</Table.HeaderCell>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{solver.nodes.map((node, nodeIndex) => renderRow(node, nodeIndex))}
				</Table.Body>
			</Table>
		</div>
	);

	function renderRow(node: SolverNode, nodeIndex: number): JSX.Element {
		const { givenTraitIds, solve } = node;
		let checkIcon: JSX.Element | undefined = undefined;
		if (node.solveStatus === SolveStatus.Infallible)
			checkIcon = <Icon name='check' />;
		else if (node.solveStatus === SolveStatus.Confirmed || (!spotterPrefs.confirmSolves && node.solveStatus === SolveStatus.Unconfirmed))
			checkIcon = <Icon name='check' color='green' />;
		else if (node.solveStatus === SolveStatus.Unconfirmed)
			checkIcon = <Icon name='check circle' color='green' />;
		return (
			<Table.Row key={nodeIndex}>
				<Table.Cell>
					{checkIcon}
					{givenTraitIds.map(traitId => traitNameInstance(solver.traits[traitId])).join(' + ')}
				</Table.Cell>
				<Table.Cell>
					<Form>
						<Form.Group inline>
							{solve.map((trait, traitIndex) =>
								<TraitPicker key={`${solver.id}-${nodeIndex}-${traitIndex}`}
									nodeIndex={nodeIndex} traitIndex={traitIndex}
									traitPool={traitPool} readonly={node.solveStatus === SolveStatus.Infallible}
									trait={trait} setTrait={onTraitSolve}
								/>
							)}
						</Form.Group>
					</Form>
				</Table.Cell>
			</Table.Row>
		);
	}

	function onTraitSolve(nodeIndex: number, traitIndex: number, newTrait: string): void {
		const solve: string[] = solver.nodes[nodeIndex].solve.slice();
		solve[traitIndex] = newTrait !== '' ? newTrait : '?';
		props.solveNode(nodeIndex, solve);
	}
};

type TraitPickerProps = {
	nodeIndex: number;
	traitIndex: number;
	traitPool: SolverTrait[];
	readonly: boolean;
	trait: string;
	setTrait: (nodeIndex: number, traitIndex: number, newTrait: string) => void;
};

const TraitPicker = (props: TraitPickerProps) => {
	const [activeTrait, setActiveTrait] = React.useState<string>('?');

	React.useEffect(() => {
		setActiveTrait(props.trait);
	}, [props.trait]);

	const traitOptions: DropdownItemProps[] = props.traitPool.filter(t => t.trait === activeTrait || (!props.readonly && !t.consumed))
		.map(t => {
			return {
				key: t.id,
				value: t.trait,
				text: t.name
			};
		}).sort((a, b) => a.text.localeCompare(b.text));

	// Add ? as an option for unsolved nodes
	if (traitOptions.length > 1) {
		traitOptions.unshift({
			key: '?',
			value: '?',
			text: '?'
		});
	}

	return (
		<Form.Field>
			<Dropdown
				placeholder='?'
				clearable
				search
				selection
				options={traitOptions}
				value={activeTrait}
				onChange={(e, { value }) => onTraitChange(value as string)}
				closeOnChange
			/>
		</Form.Field>
	);
	function onTraitChange(newTrait: string): void {
		if (props.readonly) return;
		setActiveTrait(newTrait);
		props.setTrait(props.nodeIndex, props.traitIndex, newTrait);
	}
};

type TraitsPossibleProps = {
	solver: Solver;
};

const TraitsPossible = (props: TraitsPossibleProps) => {
	const { t } = React.useContext(GlobalContext).localized;
	const { solver } = props;

	return (
		<div style={{ margin: '2em 0' }}>
			<Header as='h4'>{t('fbb.possible_traits.title')}</Header>
			<p>{t('fbb.possible_traits.heading')}</p>
			<Grid doubling columns={6} style={{ margin: '1em 0' }}>
				{solver.traits.filter(t => t.source === 'pool').map(t =>
					<Grid.Column key={t.id} style={{ textAlign: 'center', padding: '1px' }}>
						<Label size='large'>
							{t.consumed && <Icon name='check' color='green' />}
							{traitNameInstance(t)}
						</Label>
					</Grid.Column>
				)}
			</Grid>
		</div>
	);
};

type TraitsChecklistProps = {
	solver: Solver;
	spotter: Spotter;
	updateSpotter: (spotter: Spotter) => void;
};

const TraitsChecklist = (props: TraitsChecklistProps) => {
	const globalContext = React.useContext(GlobalContext);
	const { t, tfmt, TRAIT_NAMES } = globalContext.localized;
	const { solver, spotter, updateSpotter } = props;

	const traits: string[] = [];
	solver.traits.forEach(t => {
		if (!traits.includes(t.trait)) traits.push(t.trait);
	});
	const traitOptions: DropdownItemProps[] = traits.map(trait => {
			return {
				key: trait,
				value: trait,
				text: TRAIT_NAMES[trait]
			};
		}).sort((a, b) => a.text.localeCompare(b.text));

	return (
		<div style={{ margin: '2em 0' }}>
			{t('fbb.possible_traits.manual_exclusion')}
			<Form.Field
				placeholder={t('fbb.possible_traits.hint')}
				control={Dropdown}
				clearable
				fluid
				multiple
				search
				selection
				options={traitOptions}
				value={spotter.ignoredTraits}
				onChange={(e, { value }) => updateSpotter({...spotter, ignoredTraits: value as string[]})}
			/>
		</div>
	);
};

type TraitsExporterProps = {
	solver: Solver;
};

const TraitsExporter = (props: TraitsExporterProps) => {
	const globalContext = React.useContext(GlobalContext);
	const { t, tfmt } = globalContext.localized;
	const { solver } = props;
	const { nodes, traits } = solver;

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
				if (m < node.givenTraitIds.length)
					output += traits[node.givenTraitIds[m]].name;
				if (m == 0) output += '\n';
			}
			output += '\t\t' + node.solve.length + '\n';
		}
		output += '\n';
		traits.filter(t => t.source === 'pool').forEach(t => {
			output += t.name + '\n';
		});
		navigator.clipboard.writeText(output);
	};

	return (
		<Message style={{ margin: '2em 0' }}>
			<Message.Content>
				<Message.Header>{t('fbb.cab.title')}</Message.Header>
				<p>
					{tfmt('fbb.cab.header', {
						link: <b><a href={CABLink} target='_blank'>{t('fbb.cab.name')}</a></b>
					})}
				</p>
				<Popup
					content={t('clipboard.copied_exclaim')}
					on='click'
					position='right center'
					size='tiny'
					trigger={
						<Button icon='clipboard' content={t('fbb.possible_traits.clipboard')} onClick={() => copyTraits()} />
					}
				/>
			</Message.Content>
		</Message>
	);
};

export default ChainTraits;
