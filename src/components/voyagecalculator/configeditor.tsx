import React from 'react';
import { Icon, Modal, Form, Button, Dropdown, Table, Message } from 'semantic-ui-react';

import CONFIG from '../CONFIG';
import allTraits from '../../../static/structured/translation_en.json';

type ConfigEditorProps = {
	voyageConfig: any;
	updateConfig: (newVoyageConfig: any) => void;
};

const ConfigEditor = (props: ConfigEditorProps) => {
	const { updateConfig } = props;

	const [voyageConfig, setVoyageConfig] = React.useState(props.voyageConfig);

	const [modalIsOpen, setModalIsOpen] = React.useState(false);
	const [updateOnClose, setUpdateOnClose] = React.useState(false);
	const [options, setOptions] = React.useState(undefined);

	React.useEffect(() => {
		if (!modalIsOpen && updateOnClose) {
			updateConfig(voyageConfig);
			setUpdateOnClose(false);
		}

	}, [modalIsOpen]);

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
	const crewSlots = voyageConfig.crew_slots ?? defaultSlots;
	crewSlots.sort((s1, s2) => CONFIG.VOYAGE_CREW_SLOTS.indexOf(s1.symbol) - CONFIG.VOYAGE_CREW_SLOTS.indexOf(s2.symbol));

	return (
		<Modal
			open={modalIsOpen}
			onClose={() => setModalIsOpen(false)}
			onOpen={() => setModalIsOpen(true)}
			trigger={<Button size='small'><Icon name='edit' />Edit</Button>}
		>
			<Modal.Header>Edit Voyage</Modal.Header>
			<Modal.Content scrolling>
				{renderContent()}
			</Modal.Content>
			<Modal.Actions>
				<Button positive onClick={() => setModalIsOpen(false)}>
					Close
				</Button>
			</Modal.Actions>
		</Modal>
	);

	function renderContent(): JSX.Element {
		if (!modalIsOpen) return (<></>);

		if (!options) {
			// Renders a lot faster by using known voyage traits rather than calculate list from all possible traits
			const knownShipTraits = ['andorian','battle_cruiser','borg','breen','cardassian','cloaking_device',
				'dominion','emp','explorer','federation','ferengi','fighter','freighter','historic','hologram',
				'klingon','malon','maquis','orion_syndicate','pioneer','reman','romulan','ruthless',
				'scout','sikarian','spore_drive','terran','tholian','transwarp','vulcan','warship','war_veteran','xindi'];
			const knownCrewTraits = ['android','astrophysicist','bajoran','borg','brutal',
				'cardassian','civilian','communicator','costumed','crafty','cultural_figure','cyberneticist',
				'desperate','diplomat','doctor','duelist','exobiology','explorer','federation','ferengi',
				'gambler','hero','hologram','human','hunter','innovator','inspiring','jury_rigger','klingon',
				'marksman','maverick','pilot','prodigy','resourceful','romantic','romulan',
				'saboteur','scoundrel','starfleet','survivalist','tactician','telepath','undercover_operative',
				'veteran','villain','vulcan'];

			const skillsList = [];
			for (let skill in CONFIG.SKILLS) {
				skillsList.push({
					key: skill,
					value: skill,
					text: CONFIG.SKILLS[skill]
				});
			}

			const shipTraitsList = knownShipTraits.map(trait => {
				return {
					key: trait,
					value: trait,
					text: allTraits.ship_trait_names[trait] ?? trait
				};
			});
			shipTraitsList.sort((a, b) => a.text.localeCompare(b.text));

			const crewTraitsList = knownCrewTraits.map(trait => {
				return {
					key: trait,
					value: trait,
					text: allTraits.trait_names[trait]
				};
			});
			crewTraitsList.sort((a, b) => a.text.localeCompare(b.text));

			setOptions({ skills: skillsList, ships: shipTraitsList, traits: crewTraitsList });
			return (<></>);
		}

		return (
			<React.Fragment>
				<Message>Editing this voyage will reset all existing recommendations and estimates.</Message>
				<Form>
					<Form.Group>
						<Form.Select
							label='Primary skill'
							options={options.skills}
							value={voyageConfig.skills.primary_skill ?? 'command_skill'}
							onChange={(e, { value }) => setSkill('primary_skill', value)}
							placeholder='Primary'
						/>
						<Form.Select
							label='Secondary skill'
							options={options.skills}
							value={voyageConfig.skills.secondary_skill ?? 'science_skill'}
							onChange={(e, { value }) => setSkill('secondary_skill', value)}
							placeholder='Secondary'
						/>
						<Form.Select
							search clearable
							label='Ship trait'
							options={options.ships}
							value={voyageConfig.ship_trait}
							onChange={(e, { value }) => setShipTrait(value)}
							placeholder='Ship trait'
						/>
					</Form.Group>
				</Form>
				<Table compact striped>
					<Table.Header>
						<Table.Row>
							<Table.HeaderCell textAlign='center'>Skill</Table.HeaderCell>
							<Table.HeaderCell>Seat</Table.HeaderCell>
							<Table.HeaderCell>Trait</Table.HeaderCell>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{crewSlots.map((seat, idx) => (
							<Table.Row key={seat.symbol}>
								{ idx % 2 === 0 ?
									(
										<Table.Cell rowSpan='2' textAlign='center'>
											<img alt={seat.skill} src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${seat.skill}.png`} style={{ height: '2em' }} />
										</Table.Cell>
									)
									: (<></>)
								}
								<Table.Cell>{seat.name}</Table.Cell>
								<Table.Cell>
									<Dropdown search selection clearable
										options={options.traits}
										value={seat.trait}
										onChange={(e, { value }) => setSeatTrait(seat.symbol, value)}
										placeholder='Trait'
									/>
								</Table.Cell>
							</Table.Row>
						))}
					</Table.Body>
				</Table>
			</React.Fragment>
		);
	}

	function setSkill(prime: string, value: string): void {
		// Flip skill values if changing to value that's currently set as the other prime
		if (prime === 'primary_skill' && value === voyageConfig.skills.secondary_skill)
			voyageConfig.skills.secondary_skill = voyageConfig.skills.primary_skill;
		else if (prime === 'secondary_skill' && value === voyageConfig.skills.primary_skill)
			voyageConfig.skills.primary_skill = voyageConfig.skills.secondary_skill;
		voyageConfig.skills[prime] = value;
		setVoyageConfig({...voyageConfig});
		setUpdateOnClose(true);
	}

	function setShipTrait(value: string): void {
		voyageConfig.ship_trait = value;
		setVoyageConfig({...voyageConfig});
		setUpdateOnClose(true);
	}

	function setSeatTrait(seat: symbol, value: string): void {
		voyageConfig.crew_slots.find(s => s.symbol === seat).trait = value;
		setVoyageConfig({...voyageConfig});
		setUpdateOnClose(true);
	}
};

export default ConfigEditor;
