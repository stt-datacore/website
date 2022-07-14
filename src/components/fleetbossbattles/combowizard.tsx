import React from 'react';
import { Modal, Button, Dropdown, Message, Popup } from 'semantic-ui-react';

import { useStateWithStorage } from '../../utils/storage';

import allTraits from '../../../static/structured/translation_en.json';

const DIFFICULTY_NAME = {
	1: 'Easy',
	2: 'Normal',
	3: 'Hard',
	4: 'Brutal',
	5: 'Nightmare',
	6: 'Ultra-Nightmare'
};
const MAX_RARITY_BY_DIFFICULTY = {
	1: 2,
	2: 3,
	3: 4,
	4: 4,
	5: 5,
	6: 5
};

const WizardContext = React.createContext();

type ComboWizardProps = {
	handleWizard: (wizardOutput: any) => void;
};

const ComboWizard = (props: ComboWizardProps) => {
	const [fleetbossData, ] = useStateWithStorage('tools/fleetbossData', undefined);
	const contextData = {
		data: fleetbossData,
		handler: props.handleWizard
	};
	return (
		<WizardContext.Provider value={contextData}>
			<ComboWizardModal />
		</WizardContext.Provider>
	);
};

const ComboWizardModal = (props: ComboWizardModalProps) => {
	const wizardInput = React.useContext(WizardContext);
	const [modalIsOpen, setModalIsOpen] = React.useState(false);
	const [activeBoss, setActiveBoss] = React.useState(undefined);

	return (
		<Modal
			open={modalIsOpen}
			onClose={() => setModalIsOpen(false)}
			onOpen={() => setModalIsOpen(true)}
			trigger={renderTrigger()}
			size='tiny'
		>
			<Modal.Header>
				Fleet Boss Battles Combo Wizard
			</Modal.Header>
			<Modal.Content>
				{modalIsOpen && renderContent()}
			</Modal.Content>
			<Modal.Actions>
				<Button content='Close' onClick={() => setModalIsOpen(false)} />
			</Modal.Actions>
		</Modal>
	);

	function renderTrigger(): JSX.Element {
		return (
			<Button compact color='red'>
				<img src={`${process.env.GATSBY_ASSETS_URL}atlas/sb_phaser_attack.png`} style={{ height: '16px' }} />
			</Button>
		);
	}

	function renderContent(): JSX.Element {
		if (!wizardInput.data) {
			const PLAYERLINK = 'https://stt.disruptorbeam.com/player?client_api=19';
			return (
				<React.Fragment>
					<Message error>This feature requires a higher version of your player data!</Message>
					<p>Please re-upload your player data to DataCore, using this URL:{` `}
						<a href={PLAYERLINK} target='_blank'>{PLAYERLINK}</a>
					</p>
					<p>In the future, ensure that your player data URL ends with "client_api=19" before uploading to DataCore.</p>
				</React.Fragment>
			);
		}
		const bossOptions = [];
		wizardInput.data.forEach(boss => {
			if (boss.ends_in) {
				const unlockedNodes = boss.combo.nodes.filter(node => node.unlocked_character);
				if (boss.combo.nodes.length - unlockedNodes.length > 0) {
					bossOptions.push(
						{
							key: boss.id,
							value: boss.id,
							text: `${DIFFICULTY_NAME[boss.difficulty_id]} (${boss.combo.nodes.length-unlockedNodes.length})`
						}
					);
				}
			}
		});
		return (
			<React.Fragment>
				<div style={{ marginBottom: '1em' }}>
					Use this wizard to help find crew that match the required traits of a fleet boss battle. Warning: this feature is still in early development and should be considered very experimental!
				</div>
				{bossOptions.length > 0 &&
					<Dropdown selection clearable
						placeholder='Select a difficulty'
						options={bossOptions}
						value={activeBoss}
						onChange={(e, { value }) => setActiveBoss(value)}
					/>
				}
				{bossOptions.length === 0 && <>You currently have no fleet boss battles with any open nodes.</>}
				{activeBoss && renderBoss()}
			</React.Fragment>
		);
	}

	function renderBoss(): JSX.Element {
		const boss = wizardInput.data.find(b => b.id === activeBoss);

		let open = [], found = [], current = false;
		boss.combo.nodes.forEach(node => {
			if (node.unlocked_character) {
				found = found.concat(node.open_traits, node.hidden_traits);
				if (node.unlocked_character.is_current) current = true;
			}
			else {
				open = open.concat(node.open_traits);
			}
		});
		const traitPool = [];
		boss.combo.traits.forEach(trait => {
			if (!found.includes(trait) && !traitPool.includes(trait))
				traitPool.push(trait);
		});
		const rarityPool = [];
		for (let i = 1; i <= MAX_RARITY_BY_DIFFICULTY[boss.difficulty_id]; i++) {
			rarityPool.push(i);
		}

		const buttonName = (trait: string) => {
			const node = boss.combo.nodes.find(n => n.open_traits.includes(trait));
			const post = node.hidden_traits.length > 1 ? ` (${node.hidden_traits.length})`: '';
			return `${allTraits.trait_names[trait]}${post}`;
		};

		return (
			<React.Fragment>
				<div style={{ marginTop: '1em' }}>
					{current && <div style={{ marginBottom: '1em' }}>You may have already cleared a node for the current chain of this difficulty.</div>}
					<div>
						Select an open node:{` `}
						{open.map((nodeTrait, idx) =>
							<Button key={idx} color='blue'
								content={buttonName(nodeTrait)}
								onClick={() => {
									wizardInput.handler({
										nodeTrait: `"${allTraits.trait_names[nodeTrait]}"`,
										traitPool: traitPool.filter(trait => trait !== nodeTrait),
										rarityPool
									});
									setModalIsOpen(false);
								}}
							/>
						).reduce((prev, curr) => [prev, ' ', curr], [])}
					</div>
				</div>
			</React.Fragment>
		);
	}
};

export default ComboWizard;
