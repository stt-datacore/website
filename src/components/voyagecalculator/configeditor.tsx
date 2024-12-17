import React from 'react';
import { Modal, Form, Button, Dropdown, Table, DropdownItemProps } from 'semantic-ui-react';

import { VoyageSkills } from '../../model/player';
import { IVoyageInputConfig } from '../../model/voyage';
import { GlobalContext } from '../../context/globalcontext';
import CONFIG from '../CONFIG';
import { useStateWithStorage } from '../../utils/storage';
import { lookupAMTraitsBySeat } from '../../utils/voyageutils';

interface ISelectOption {
	key: string;
	value: string;
	text: string;
};

interface IEditOptions {
	skills: ISelectOption[];
	ships: ISelectOption[];
	traits: ISelectOption[];
	trait_seats: { [skill: string]: ISelectOption[] }
};

type ConfigEditorProps = {
	presetConfigs: IVoyageInputConfig[];
	updateConfig: (newVoyageConfig: IVoyageInputConfig) => void;
};

export const ConfigEditor = (props: ConfigEditorProps) => {
	const globalContext = React.useContext(GlobalContext);
	const { TRAIT_NAMES, SHIP_TRAIT_NAMES, t } = globalContext.localized;

	const defaultSlots = [
		{ symbol: 'captain_slot', name: t('voyage.seats.captain_slot'), skill: 'command_skill', trait: '' },
		{ symbol: 'first_officer', name: t('voyage.seats.first_officer'), skill: 'command_skill', trait: '' },
		{ symbol: 'chief_communications_officer', name: t('voyage.seats.chief_communications_officer'), skill: 'diplomacy_skill', trait: '' },
		{ symbol: 'communications_officer', name: t('voyage.seats.communications_officer'), skill: 'diplomacy_skill', trait: '' },
		{ symbol: 'chief_security_officer', name: t('voyage.seats.chief_security_officer'), skill: 'security_skill', trait: '' },
		{ symbol: 'security_officer', name: t('voyage.seats.security_officer'), skill: 'security_skill', trait: '' },
		{ symbol: 'chief_engineering_officer', name: t('voyage.seats.chief_engineering_officer'), skill: 'engineering_skill', trait: '' },
		{ symbol: 'engineering_officer', name: t('voyage.seats.engineering_officer'), skill: 'engineering_skill', trait: '' },
		{ symbol: 'chief_science_officer', name: t('voyage.seats.chief_science_officer'), skill: 'science_skill', trait: '' },
		{ symbol: 'science_officer', name: t('voyage.seats.science_officer'), skill: 'science_skill', trait: '' },
		{ symbol: 'chief_medical_officer', name: t('voyage.seats.chief_medical_officer'), skill: 'medicine_skill', trait: '' },
		{ symbol: 'medical_officer', name: t('voyage.seats.medical_officer'), skill: 'medicine_skill', trait: '' }
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

	const { presetConfigs, updateConfig } = props;

	const [voyageConfig, setVoyageConfig] = useStateWithStorage<IVoyageInputConfig>('voyage/customConfig', JSON.parse(JSON.stringify(defaultConfig)));

	const [modalIsOpen, setModalIsOpen] = React.useState<boolean>(false);
	const [options, setOptions] = React.useState<IEditOptions | undefined>(undefined);

	voyageConfig.crew_slots.sort((s1, s2) => CONFIG.VOYAGE_CREW_SLOTS.indexOf(s1.symbol) - CONFIG.VOYAGE_CREW_SLOTS.indexOf(s2.symbol));

	const presetOptions: DropdownItemProps[] = presetConfigs.map(config => {
		let key = config.voyage_type === 'encounter' ? 'encounter_voyage' : 'test_voyage_1';
		let text = t('voyage.current_voyage_x', {
			x: t(`voyage.type_names.${key}`)
		});
		return ({
			key: config.voyage_type,
			text,
			value: config.voyage_type
		});
	});
	presetOptions.push({
		key: 'default',
		text: t('global.reset'),
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
			<Modal.Header>{t('voyage.custom_voyage_editor')}</Modal.Header>
			<Modal.Content scrolling>
				{modalIsOpen && renderEditor()}
			</Modal.Content>
			<Modal.Actions>
				<Dropdown button
					text={t('global.presets')}
					options={presetOptions}
					onChange={(e, data) => loadPreset(data.value as string)}
				/>
				<Button onClick={() => closeAndApply()}>
					{t('global.create')}
				</Button>
			</Modal.Actions>
		</Modal>
	);

	function loadPreset(voyageType: string): void {
		if (voyageType === 'default') {
			setVoyageConfig(JSON.parse(JSON.stringify(defaultConfig)));
			return;
		}
		const config: IVoyageInputConfig | undefined = presetConfigs.find(preset => preset.voyage_type === voyageType);
		if (!config) return;
		setVoyageConfig(JSON.parse(JSON.stringify(config)));
	}

	function closeAndApply(): void {
		setModalIsOpen(false);
		updateConfig(voyageConfig);
	}

	function renderTrigger(): JSX.Element {
		return <Button color='blue' size='large' icon='pencil' content={t('voyage.custom_voyage_create')} />;
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
				text: `(${t('voyage.custom.no_trait')})`
			});
			shipTraitsList.sort((a, b) => a.text.localeCompare(b.text));

			const crewTraitLists = {} as { [skill: string]: ISelectOption[] }

			Object.keys(CONFIG.SKILLS).forEach((skill) => {
				crewTraitLists[skill] = lookupAMTraitsBySeat(skill).map(trait => {
					return {
						key: trait,
						value: trait,
						text: TRAIT_NAMES[trait]
					};
				});
				crewTraitLists[skill].push({
					key: 'none',
					value: '',
					text: `(${t('voyage.custom.no_trait')})`
				});
				crewTraitLists[skill].sort((a, b) => a.text.localeCompare(b.text));
			});

			// const crewTraitsList: ISelectOption[] = knownCrewTraits.map(trait => {
			// 	return {
			// 		key: trait,
			// 		value: trait,
			// 		text: TRAIT_NAMES[trait]
			// 	};
			// });
			// crewTraitsList.push({
			// 	key: 'none',
			// 	value: '',
			// 	text: `(${t('voyage.custom.no_trait')})`
			// });
			// crewTraitsList.sort((a, b) => a.text.localeCompare(b.text));

			const editOptions: IEditOptions = {
				skills: skillsList,
				ships: shipTraitsList,
				traits: [], // crewTraitsList,
				trait_seats: crewTraitLists
			};

			setOptions(editOptions);
			return <></>;
		}

		return (
			<div style={{ display: 'flex', flexDirection: 'column', flexWrap: 'wrap', alignItems: 'center' }}>
				<Form>
					<Form.Group>
						<Form.Select
							label={t('voyage.skills.primary.name')}
							options={options.skills}
							value={voyageConfig.skills.primary_skill}
							onChange={(e, { value }) => setSkill('primary_skill', value as string)}
							placeholder={t('voyage.skills.primary.placeholder')}
							required
						/>
						<Form.Select
							label={t('voyage.skills.secondary.name')}
							options={options.skills}
							value={voyageConfig.skills.secondary_skill}
							onChange={(e, { value }) => setSkill('secondary_skill', value as string)}
							placeholder={t('voyage.skills.secondary.placeholder')}
							required
						/>
						<Form.Select
							search clearable
							label={t('base.ship_trait')}
							options={options.ships}
							value={voyageConfig.ship_trait}
							onChange={(e, { value }) => setShipTrait(value as string)}
							placeholder={t('base.ship_trait')}
						/>
					</Form.Group>
				</Form>
				<Table striped relaxed='very' collapsing>
					<Table.Header>
						<Table.Row>
							<Table.HeaderCell textAlign='center'>{t('roster_summary.skills.columns.skills')}</Table.HeaderCell>
							<Table.HeaderCell>{t('shuttle_helper.missions.columns.seat')}</Table.HeaderCell>
							<Table.HeaderCell>{t('hints.trait')}</Table.HeaderCell>
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
								<Table.Cell>{t(`voyage.seats.${seat.symbol}`)}</Table.Cell>
								<Table.Cell>
									<Dropdown search selection clearable
										//options={options.traits}
										options={options.trait_seats[seat.skill]}
										value={seat.trait}
										onChange={(e, { value }) => setSeatTrait(seat.symbol, value as string)}
										placeholder={t('hints.trait')}
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
