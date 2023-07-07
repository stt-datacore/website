import React from 'react';
import { Modal, Button, Icon, Form, Checkbox, Table, Segment, Header, Rating, Statistic, Divider } from 'semantic-ui-react';

import CONFIG from '../../components/CONFIG';

import { useStateWithStorage } from '../../utils/storage';
import { PlayerCrew, PlayerUtilityRanks } from '../../model/player';

const defaultPrefs = {
	thresholds: {
		core: 10,
		shuttle: 10,
		gauntlet: 10,
		voyage: 10
	},
	prefer_versatile: true,
	show_breakdowns: false
};

const WizardContext = React.createContext<UtilityWizardProps>({} as UtilityWizardProps);

type UtilityWizardProps = {
	myCrew: PlayerCrew[];
	handleWizard: (wizardOutput: any) => void;
	dbid: string;
};

const UtilityWizard = (props: UtilityWizardProps) => {
	const contextData = {
		myCrew: props.myCrew,
		handleWizard: props.handleWizard,
		dbid: props.dbid
	};
	return (
		<WizardContext.Provider value={contextData}>
			<UtilityWizardModal />
		</WizardContext.Provider>
	);
};

type ColumnTitle = string | JSX.Element;

const UtilityWizardModal = () => {
	const wizardInput = React.useContext(WizardContext);
	const [modalIsOpen, setModalIsOpen] = React.useState(false);

	const [enabled, setEnabled] = React.useState(false);
	const [userPrefs, setUserPrefs] = useStateWithStorage(wizardInput.dbid+'/utility', defaultPrefs, { rememberForever: true });

	React.useEffect(() => {
		if (enabled) scoreUtility();
	}, [wizardInput.myCrew]);

	React.useEffect(() => {
		if (enabled) {
			scoreUtility();
			const columns = [
				{ width: 1, column: 'utility.thresholds.length', title: <Icon name='cogs' color='green' /> as ColumnTitle, reverse: true, tiebreakers: ['max_rarity'] }
			];
			if (userPrefs.show_breakdowns ?? defaultPrefs.show_breakdowns) {
				if (getThreshold('core') + getThreshold('shuttle') > 0)
					columns.push({ width: 1, column: 'utility.counts.shuttle', title: 'S', reverse: true, tiebreakers: ['max_rarity'] });
				if (getThreshold('gauntlet') > 0)
					columns.push({ width: 1, column: 'utility.counts.gauntlet', title: 'G', reverse: true, tiebreakers: ['max_rarity'] });
				if (getThreshold('voyage') > 0)
					columns.push({ width: 1, column: 'utility.counts.voyage', title: 'V', reverse: true, tiebreakers: ['max_rarity'] });
			}
			wizardInput.handleWizard(
				{
					wizard: 'utility',
					view: 'base',
					columns,
					renderCells
				}
			);
		}
		else {
			wizardInput.handleWizard(undefined);
		}
	}, [enabled, userPrefs]);

	const isImmortal = c => c.level === 100 && c.rarity === c.max_rarity && c.equipment?.length === 4;

	return (
		<Modal
			open={modalIsOpen}
			onClose={() => setModalIsOpen(false)}
			onOpen={() => setModalIsOpen(true)}
			trigger={renderTrigger()}
			centered={false}
			size='tiny'
		>
			<Modal.Header>
				Crew Utility
			</Modal.Header>
			<Modal.Content>
				<p>Add a "Utility" column to the crew table, which shows the number of useful skill sets each crew has, relative to others on your roster with similar skill sets.</p>
				<p>You can measure utility for different areas of the game. A higher number will consider more crew as useful in that area of gameplay.</p>
				<Form>
					<Table collapsing style={{ margin: '0 auto' }}>
						<Table.Body>
							<Table.Row>
								<Table.Cell>Core:</Table.Cell>
								<Table.Cell>
									<Button.Group size='tiny'>
										{[0, 1, 2, 3, 4, 5, 10, 20].map(t =>
											<Button key={t} content={t} color={getThreshold('core') === t ? 'blue' : undefined}
												onClick={() => setThreshold('core', t)}
											/>
										)}
									</Button.Group>
								</Table.Cell>
							</Table.Row>
							<Table.Row>
								<Table.Cell>Shuttle Pairs:</Table.Cell>
								<Table.Cell>
									<Button.Group size='tiny'>
										{[0, 1, 2, 3, 4, 5, 10, 20].map(t =>
											<Button key={t} content={t} color={getThreshold('shuttle') === t ? 'blue' : undefined}
												onClick={() => setThreshold('shuttle', t)}
											/>
										)}
									</Button.Group>
								</Table.Cell>
							</Table.Row>
							<Table.Row>
								<Table.Cell>Voyage:</Table.Cell>
								<Table.Cell>
									<Button.Group size='tiny'>
										{[0, 1, 2, 3, 4, 5, 10, 20].map(t =>
											<Button key={t} content={t} color={getThreshold('voyage') === t ? 'blue' : undefined}
												onClick={() => setThreshold('voyage', t)}
											/>
										)}
									</Button.Group>
								</Table.Cell>
							</Table.Row>
							<Table.Row>
								<Table.Cell>Gauntlet:</Table.Cell>
								<Table.Cell>
									<Button.Group size='tiny'>
										{[0, 1, 2, 3, 4, 5, 10, 20].map(t =>
											<Button key={t} content={t} color={getThreshold('gauntlet') === t ? 'blue' : undefined}
												onClick={() => setThreshold('gauntlet', t)}
											/>
										)}
									</Button.Group>
								</Table.Cell>
							</Table.Row>
						</Table.Body>
					</Table>
					<div style={{ marginTop: '1em' }}>
						<Form.Field
							control={Checkbox}
							label={<label>Only consider 3-skill crew for voyages and gauntlet</label>}
							checked={userPrefs.prefer_versatile ?? defaultPrefs.prefer_versatile}
							onChange={(e, { checked }) => setUserPrefs({...userPrefs, prefer_versatile: checked})}
						/>
						<Form.Field
							control={Checkbox}
							label={<label>Show breakdowns in crew table</label>}
							checked={userPrefs.show_breakdowns ?? defaultPrefs.show_breakdowns}
							onChange={(e, { checked }) => setUserPrefs({...userPrefs, show_breakdowns: checked})}
						/>
					</div>
				</Form>
			</Modal.Content>
			<Modal.Actions>
				{!enabled && <Button content='Enable' color='green' onClick={() => { setEnabled(true); setModalIsOpen(false); }} />}
				{enabled && <Button content='Disable' color='red' onClick={() => { setEnabled(false); setModalIsOpen(false); }} />}
				<Button content='Close' onClick={() => setModalIsOpen(false)} />
			</Modal.Actions>
		</Modal>
	);

	function renderTrigger(): JSX.Element {
		return (
			<Button icon='cogs' content='Crew Utility' size='large' color={enabled ? 'green' : undefined} />
		)
	}

	function getThreshold(area: string): number {
		return userPrefs.thresholds[area] ?? defaultPrefs.thresholds[area];
	}

	function setThreshold(area: string, value: number): void {
		const thresholds = userPrefs.thresholds ?? defaultPrefs.thresholds;
		thresholds[area] = value;
		setUserPrefs({...userPrefs, thresholds});
	}

	function scoreUtility(): void {
		const myCrew = [...wizardInput.myCrew];
		myCrew.forEach((crew, idx) => crew.id = idx);

		const crewScore = (crew: any, skill: string) => {
			if (crew[skill].core === 0) return { core: 0, min: 0, max: 0 };
			return crew[skill];
		};
		const rankCore = (skill: string) => {
			return myCrew.sort((a, b) => crewScore(b, skill).core - crewScore(a, skill).core)
				.map(crew => crew.id);
		};
		const rankGauntlet = (skills: string[]) => {
			const gauntletScore = (crew) => {
				if ((userPrefs.prefer_versatile ?? defaultPrefs.prefer_versatile) && Object.keys(crew.base_skills).length < 3) return 0;
				const scores = skills.map(skill => crewScore(crew, skill));
				return scores.reduce((prev, curr) => prev + curr.max, 0)/scores.length;
			};
			return myCrew.filter(crew => gauntletScore(crew) > 0)
				.sort((a, b) => gauntletScore(b) - gauntletScore(a))
				.map(crew => crew.id);
		};
		const rankVoyage = (skills: string[]) => {
			const voyageScore = (crew) => {
				if ((userPrefs.prefer_versatile ?? defaultPrefs.prefer_versatile) && Object.keys(crew.base_skills).length < 3) return 0;
				const scores = skills.map(skill => crewScore(crew, skill));
				return scores.reduce((prev, curr) => prev + curr.core+(curr.min+curr.max)/2, 0);
			};
			return myCrew.filter(crew => voyageScore(crew) > 0)
				.sort((a, b) => voyageScore(b) - voyageScore(a))
				.map(crew => crew.id);
		};
		const rankShuttle = (skills: string[]) => {
			const shuttleScore = (crew) => {
				if (crewScore(crew, skills[0]).core > crewScore(crew, skills[1]).core)
					return crewScore(crew, skills[0]).core+(crewScore(crew, skills[1]).core/4);
				return crewScore(crew, skills[1]).core+(crewScore(crew, skills[0]).core/4);
			};
			return myCrew.filter(crew => shuttleScore(crew) > 0)
				.sort((a, b) => shuttleScore(b) - shuttleScore(a))
				.map(crew => crew.id);
		};

		const ranks = {} as PlayerUtilityRanks;
		for (let first = 0; first < CONFIG.SKILLS_SHORT.length; first++) {
			let firstSkill = CONFIG.SKILLS_SHORT[first].name;
			ranks[`B_${CONFIG.SKILLS_SHORT[first].short}`] = rankCore(firstSkill);
			ranks[`G_${CONFIG.SKILLS_SHORT[first].short}`] = rankGauntlet([firstSkill]);
			for (let second = first+1; second < CONFIG.SKILLS_SHORT.length; second++) {
				let secondSkill = CONFIG.SKILLS_SHORT[second].name;
				ranks[`S_${CONFIG.SKILLS_SHORT[first].short}_${CONFIG.SKILLS_SHORT[second].short}`] = rankShuttle([firstSkill, secondSkill]);
				ranks[`G_${CONFIG.SKILLS_SHORT[first].short}_${CONFIG.SKILLS_SHORT[second].short}`] = rankGauntlet([firstSkill, secondSkill]);
				ranks[`V_${CONFIG.SKILLS_SHORT[first].short}_${CONFIG.SKILLS_SHORT[second].short}`] = rankVoyage([firstSkill, secondSkill]);
			}
		}

		myCrew.forEach(crew => {
			const myRanks = {};
			const thresholds = [] as string[];
			Object.keys(ranks).forEach(key => {
				const myRank = ranks[key].indexOf(crew.id) + 1;
				myRanks[key] = myRank;
				let threshold = 0;
				switch (key.substr(0, 2)) {
					case 'B_': threshold = getThreshold('core'); break;
					case 'S_': threshold = getThreshold('shuttle'); break;
					case 'G_': threshold = getThreshold('gauntlet'); break;
					case 'V_': threshold = getThreshold('voyage'); break;
				}
				if (myRank > 0 && myRank <= threshold) thresholds.push(key);
			});
			wizardInput.myCrew[crew.id].utility = {
				ranks: myRanks,
				thresholds,
				counts: {
					shuttle: thresholds.filter(key => ['B', 'S'].includes(key.substr(0, 1))).length,
					gauntlet: thresholds.filter(key => key.slice(0, 1) === 'G').length,
					voyage: thresholds.filter(key => key.slice(0, 1) === 'V').length
				}
			};
		});
	}

	function renderCells(crew: any): JSX.Element {
		return (
			<React.Fragment>
				<Table.Cell textAlign='center' onClick={(e) => e.stopPropagation()}>
					<RanksModal crew={crew} utilityThresholds={userPrefs.thresholds} />
				</Table.Cell>
				{(userPrefs.show_breakdowns ?? defaultPrefs.show_breakdowns) &&
					<React.Fragment>
						{getThreshold('core') + getThreshold('shuttle') > 0 &&
							<Table.Cell textAlign='center'>
								{renderUtilities(crew, ['B', 'S'])}
							</Table.Cell>
						}
						{getThreshold('voyage') > 0 &&
							<Table.Cell textAlign='center'>
								{renderUtilities(crew, ['V'])}
							</Table.Cell>
						}
						{getThreshold('gauntlet') > 0 &&
							<Table.Cell textAlign='center'>
								{renderUtilities(crew, ['G'])}
							</Table.Cell>
						}
					</React.Fragment>
				}
			</React.Fragment>
		);
	}

	function renderUtilities(crew: any, options: string[]): JSX.Element {
		if (!crew.utility) return (<></>);
		const utilities = crew.utility.thresholds.filter(key => options.includes(key.substr(0, 1)))
			.map(key => {
				const shorts = key.substr(2).split('_');
				return ({
					key,
					rank: crew.utility.ranks[key],
					skills: shorts.map(short => CONFIG.SKILLS_SHORT.find(s => s.short === short)?.name)
				});
			})
			.sort((a, b) => { if (a.skills.length === b.skills.length) return a.key.localeCompare(b.key); return a.skills.length - b.skills.length; });
		if (utilities.length === 0) return (<></>);
		return (
			<Table size='small' compact='very'>
				<Table.Body>
					{utilities.map(utility =>
						<Table.Row key={utility.key}>
							<Table.Cell textAlign='center' style={{ whiteSpace: 'nowrap' }}>
								<div style={{ display: 'flex', justifyContent: 'center', gap: '3px' }}>
								{utility.skills.map(skill =>
									<span key={skill}>
										<img key={skill} alt={skill} src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${skill}.png`} style={{ height: '1em' }} />
									</span>
								)}
								</div>
							</Table.Cell>
							<Table.Cell textAlign='right'>{utility.rank}</Table.Cell>
						</Table.Row>
					)}
				</Table.Body>
			</Table>
		);
	}
};

type RanksModalProps = {
	crew: any;
	utilityThresholds: any;
};

const RanksModal = (props: RanksModalProps) => {
	const { crew, utilityThresholds } = props;

	const [modalIsOpen, setModalIsOpen] = React.useState(false);

	if (!crew.utility) return (<></>);

	return (
		<Modal
			open={modalIsOpen}
			onClose={() => setModalIsOpen(false)}
			onOpen={() => setModalIsOpen(true)}
			trigger={<Button content={crew.utility.thresholds.length} />}
			size='tiny'
		>
			<Modal.Header>
				{crew.name}
				<Rating icon='star' rating={crew.rarity} maxRating={crew.max_rarity} disabled style={{ marginLeft: '1em' }} />
			</Modal.Header>
			<Modal.Content scrolling>
				{modalIsOpen && renderRanks()}
			</Modal.Content>
			<Modal.Actions>
				<Button content='Close' onClick={() => setModalIsOpen(false)} />
			</Modal.Actions>
		</Modal>
	);

	function getThreshold(area: string): number {
		return utilityThresholds[area] ?? defaultPrefs.thresholds[area];
	}

	// Adaptation of renderOtherRanks from commoncrewdata.tsx
	function renderRanks(): JSX.Element {
		const v = [] as JSX.Element[];
		const g = [] as JSX.Element[], g1 = [] as JSX.Element[];
		const b = [] as JSX.Element[];
		const s = [] as JSX.Element[];

		const skillName = short => {
			
			let conf = CONFIG.SKILLS_SHORT.find(c => c.short === short)?.name;
			if (conf) {
				return CONFIG.SKILLS[conf];
			}
			return ""
		} 

		for (let rank in crew.utility.ranks) {
			const utility = crew.utility.ranks[rank];
			if (rank.startsWith('V_')) {
				v.push(
					<Statistic key={rank} color={(utility > 0 && utility <= getThreshold('voyage')) ? 'green' : undefined}>
						<Statistic.Label>{rank.substr(2).replace('_', ' / ')}</Statistic.Label>
						<Statistic.Value>{utility > 0 ? utility : ''}</Statistic.Value>
					</Statistic>
				);
			} else if (rank.startsWith('G_')) {
				if (rank.includes('_', 2)) {
					g.push(
						<Statistic key={rank} color={utility > 0 && utility <= getThreshold('gauntlet') ? 'green' : undefined}>
							<Statistic.Label>{rank.substr(2).replace('_', ' / ')}</Statistic.Label>
							<Statistic.Value>{utility > 0 ? utility : ''}</Statistic.Value>
						</Statistic>
					);
				}
				else if (utility > 0) {
					g1.push(
						<Statistic key={rank} color={utility > 0 && utility <= getThreshold('gauntlet') ? 'green' : undefined}>
							<Statistic.Label>{skillName(rank.substr(2))}</Statistic.Label>
							<Statistic.Value>{utility > 0 ? utility : ''}</Statistic.Value>
						</Statistic>
					);
				}
			} else if (rank.startsWith('B_') && crew.ranks[rank]) {
				b.push(
					<Statistic key={rank} color={utility > 0 && utility <= getThreshold('core') ? 'green' : undefined}>
						<Statistic.Label>{skillName(rank.substr(2))}</Statistic.Label>
						<Statistic.Value>{utility > 0 ? utility : ''}</Statistic.Value>
					</Statistic>
				);
			} else if (rank.startsWith('S_')) {
				s.push(
					<Statistic key={rank} color={utility > 0 && utility <= getThreshold('shuttle') ? 'green' : undefined}>
						<Statistic.Label>{rank.substr(2).replace('_', ' / ')}</Statistic.Label>
						<Statistic.Value>{utility > 0 ? utility : ''}</Statistic.Value>
					</Statistic>
				);
			}
		}

		return (
			<React.Fragment>
				<Segment>
					<Header as='h5'>Core / shuttle pair ranks on your roster</Header>
					<Statistic.Group widths='three' size={'mini'} style={{ paddingBottom: '0.5em' }}>
						{b}
					</Statistic.Group>
					<Divider />
					<Statistic.Group widths='three' size={'mini'} style={{ paddingBottom: '0.5em' }}>
						{s}
					</Statistic.Group>
				</Segment>
				<Segment>
					<Header as='h5'>Voyage ranks on your roster</Header>
					<Statistic.Group widths='three' size={'mini'} style={{ paddingBottom: '0.5em' }}>
						{v}
					</Statistic.Group>
				</Segment>
				<Segment>
					<Header as='h5'>Gauntlet ranks on your roster</Header>
					<Statistic.Group widths='three' size={'mini'} style={{ paddingBottom: '0.5em' }}>
						{g1}
					</Statistic.Group>
					<Divider />
					<Statistic.Group widths='three' size={'mini'} style={{ paddingBottom: '0.5em' }}>
						{g}
					</Statistic.Group>
				</Segment>
			</React.Fragment>
		);
	}
};

export default UtilityWizard;