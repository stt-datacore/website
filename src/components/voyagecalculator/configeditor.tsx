import React from 'react';
import { Modal, Form, Button, Dropdown, Table, DropdownItemProps } from 'semantic-ui-react';

import { VoyageSkills } from '../../model/player';
import { IVoyageInputConfig } from '../../model/voyage';
import { GlobalContext } from '../../context/globalcontext';
import CONFIG from '../CONFIG';

interface ISelectOption {
	key: string;
	value: string;
	text: string;
};

interface IEditOptions {
	skills: ISelectOption[];
	ships: ISelectOption[];
	traits: ISelectOption[];
};

const defaultSlots = [
	{ symbol: 'captain_slot', name: 'First Officer', skill: 'command_skill', trait: '' },
	{ symbol: 'first_officer', name: 'Helm Officer', skill: 'command_skill', trait: '' },
	{ symbol: 'chief_communications_officer', name: 'Communications Officer', skill: 'diplomacy_skill', trait: '' },
	{ symbol: 'communications_officer', name: 'Diplomat', skill: 'diplomacy_skill', trait: '' },
	{ symbol: 'chief_security_officer', name: 'Chief Security Officer', skill: 'security_skill', trait: '' },
	{ symbol: 'security_officer', name: 'Tactical Officer', skill: 'security_skill', trait: '' },
	{ symbol: 'chief_engineering_officer', name: 'Chief Engineer', skill: 'engineering_skill', trait: '' },
	{ symbol: 'engineering_officer', name: 'Engineer', skill: 'engineering_skill', trait: '' },
	{ symbol: 'chief_science_officer', name: 'Chief Science Officer', skill: 'science_skill', trait: '' },
	{ symbol: 'science_officer', name: 'Deputy Science Officer', skill: 'science_skill', trait: '' },
	{ symbol: 'chief_medical_officer', name: 'Chief Medical Officer', skill: 'medicine_skill', trait: '' },
	{ symbol: 'medical_officer', name: 'Ship\'s Counselor', skill: 'medicine_skill', trait: '' }
];

const defaultConfig: IVoyageInputConfig = {
	voyage_type: 'dilemma',
	skills: {
		primary_skill: '',
		secondary_skill: ''
	},
	ship_trait: '',
	crew_slots: defaultSlots,
};

type ConfigEditorProps = {
	presetConfigs: IVoyageInputConfig[];
	updateConfig: (newVoyageConfig: IVoyageInputConfig) => void;
};

export const ConfigEditor = (props: ConfigEditorProps) => {
	const globalContext = React.useContext(GlobalContext);
	const { TRAIT_NAMES, SHIP_TRAIT_NAMES } = globalContext.localized;
	const { presetConfigs, updateConfig } = props;

	const [voyageConfig, setVoyageConfig] = React.useState<IVoyageInputConfig>(defaultConfig);

	const [modalIsOpen, setModalIsOpen] = React.useState<boolean>(false);
	const [options, setOptions] = React.useState<IEditOptions | undefined>(undefined);

	React.useEffect(() => {
		if (presetConfigs.length === 0) return;
		setVoyageConfig({...presetConfigs[0]});
	}, [presetConfigs]);

	voyageConfig.crew_slots.sort((s1, s2) => CONFIG.VOYAGE_CREW_SLOTS.indexOf(s1.symbol) - CONFIG.VOYAGE_CREW_SLOTS.indexOf(s2.symbol));

	const presetOptions: DropdownItemProps[] = presetConfigs.map(config => {
		return ({
			key: config.voyage_type,
			text: config.voyage_type === 'encounter' ? 'Current Encounter Voyage' : 'Current Dilemma Voyage',
			value: config.voyage_type
		});
	});
	presetOptions.push({
		key: 'default',
		text: 'Reset',
		value: 'default'
	});

	return (
		<Modal
			size='small'
			open={modalIsOpen}
			onClose={() => setModalIsOpen(false)}
			onOpen={() => setModalIsOpen(true)}
			trigger={renderTrigger()}
		>
			<Modal.Header>Custom Voyage Editor</Modal.Header>
			<Modal.Content scrolling>
				{modalIsOpen && renderEditor()}
			</Modal.Content>
			<Modal.Actions>
				<Dropdown button
					text='Presets'
					options={presetOptions}
					onChange={(e, data) => loadPreset(data.value as string)}
				/>
				<Button onClick={() => closeAndApply()}>
					Create
				</Button>
			</Modal.Actions>
		</Modal>
	);

	function loadPreset(voyageType: string): void {
		if (voyageType === 'default') {
			setVoyageConfig({...defaultConfig});
			return;
		}
		const config: IVoyageInputConfig | undefined = presetConfigs.find(preset => preset.voyage_type === voyageType);
		if (!config) return;
		setVoyageConfig({...config});
	}

	function closeAndApply(): void {
		setModalIsOpen(false);
		updateConfig(voyageConfig);
	}

	function renderTrigger(): JSX.Element {
		return <Button color='blue' size='large' icon='pencil' content='Create custom voyage' />;
	}

	function renderEditor(): JSX.Element {
		if (!options) {
			// Renders a lot faster by using known voyage traits rather than calculate list from all possible traits
			const knownShipTraits: string[] = [
				'andorian','battle_cruiser','borg','breen','cardassian','cloaking_device',
				'dominion','emp','explorer','federation','ferengi','fighter','freighter','historic','hologram',
				'klingon','malon','maquis','orion_syndicate','pioneer','reman','romulan','ruthless',
				'scout','sikarian','spore_drive','terran','tholian','transwarp','vulcan','warship','war_veteran','xindi'
			];
			const knownCrewTraits: string[] = [
				'android','astrophysicist','bajoran','borg','brutal',
				'cardassian','caregiver','civilian','communicator','costumed','crafty','cultural_figure','cyberneticist',
				'desperate','diplomat','doctor','duelist','exobiology','explorer','federation','ferengi',
				'gambler','hero','hologram','human','hunter','innovator','inspiring','jury_rigger','klingon',
				'marksman','maverick','mirror_universe','nurse','pilot','prodigy','resourceful','romantic','romulan',
				'saboteur','scoundrel','starfleet','survivalist','tactician','telepath','undercover_operative',
				'veteran','villain','vulcan'
			];

			const skillsList: ISelectOption[] = [];
			for (let skill in CONFIG.SKILLS) {
				skillsList.push({
					key: skill,
					value: skill,
					text: CONFIG.SKILLS[skill]
				});
			}

			const shipTraitsList: ISelectOption[] = knownShipTraits.map(trait => {
				return {
					key: trait,
					value: trait,
					text: SHIP_TRAIT_NAMES[trait] ?? trait
				};
			});
			shipTraitsList.push({
				key: 'none',
				value: '',
				text: '(No trait)'
			});
			shipTraitsList.sort((a, b) => a.text.localeCompare(b.text));

			const crewTraitsList: ISelectOption[] = knownCrewTraits.map(trait => {
				return {
					key: trait,
					value: trait,
					text: TRAIT_NAMES[trait]
				};
			});
			crewTraitsList.push({
				key: 'none',
				value: '',
				text: '(No trait)'
			});
			crewTraitsList.sort((a, b) => a.text.localeCompare(b.text));

			const editOptions: IEditOptions = {
				skills: skillsList,
				ships: shipTraitsList,
				traits: crewTraitsList
			};

			setOptions(editOptions);
			return <></>;
		}

		return (
			<div style={{ display: 'flex', flexDirection: 'column', flexWrap: 'wrap', alignItems: 'center' }}>
				<Form>
					<Form.Group>
						<Form.Select
							label='Primary skill'
							options={options.skills}
							value={voyageConfig.skills.primary_skill}
							onChange={(e, { value }) => setSkill('primary_skill', value as string)}
							placeholder='Primary'
							required
						/>
						<Form.Select
							label='Secondary skill'
							options={options.skills}
							value={voyageConfig.skills.secondary_skill}
							onChange={(e, { value }) => setSkill('secondary_skill', value as string)}
							placeholder='Secondary'
							required
						/>
						<Form.Select
							search clearable
							label='Ship trait'
							options={options.ships}
							value={voyageConfig.ship_trait}
							onChange={(e, { value }) => setShipTrait(value as string)}
							placeholder='Ship trait'
						/>
					</Form.Group>
				</Form>
				<Table striped relaxed='very' collapsing>
					<Table.Header>
						<Table.Row>
							<Table.HeaderCell textAlign='center'>Skill</Table.HeaderCell>
							<Table.HeaderCell>Seat</Table.HeaderCell>
							<Table.HeaderCell>Trait</Table.HeaderCell>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{voyageConfig.crew_slots.map((seat, idx) => (
							<Table.Row key={seat.symbol}>
								{ idx % 2 === 0 ?
									(
										<Table.Cell rowSpan='2' textAlign='center'>
											<img alt={seat.skill} src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${seat.skill}.png`} style={{ height: '3em' }} />
										</Table.Cell>
									)
									: (<></>)
								}
								<Table.Cell>{seat.name}</Table.Cell>
								<Table.Cell>
									<Dropdown search selection clearable
										options={options.traits}
										value={seat.trait}
										onChange={(e, { value }) => setSeatTrait(seat.symbol, value as string)}
										placeholder='Trait'
									/>
								</Table.Cell>
							</Table.Row>
						))}
					</Table.Body>
				</Table>
			</div>
		);
	}

	function setSkill(prime: string, value: string): void {
		const skills = voyageConfig?.skills ?? { primary_skill: '', secondary_skill: '' } as VoyageSkills;
		// Flip skill values if changing to value that's currently set as the other prime
		if (prime === 'primary_skill' && value === skills.secondary_skill)
			skills.secondary_skill = skills.primary_skill;
		else if (prime === 'secondary_skill' && value === skills.primary_skill)
			skills.primary_skill = skills.secondary_skill;
		skills[prime] = value;
		setVoyageConfig({...voyageConfig, skills});
	}

	function setShipTrait(value: string): void {
		setVoyageConfig({...voyageConfig, ship_trait: value});
	}

	function setSeatTrait(seat: string, value: string): void {
		const crew_slots = voyageConfig.crew_slots;
		const crew_slot = crew_slots.find(s => s.symbol === seat);
		if (crew_slot) crew_slot.trait = value;
		setVoyageConfig({...voyageConfig, crew_slots});
	}
};
