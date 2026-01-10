import React from 'react';
import { Button, Checkbox, Form, Icon, Popup, Message } from 'semantic-ui-react';

import { ShuttleAdventure } from '../../model/shuttle';
import { IRosterCrew } from '../../components/eventplanner/model';
import { GlobalContext } from '../../context/globalcontext';
import CONFIG from '../CONFIG';
import { useStateWithStorage } from '../../utils/storage';

import { Shuttle, ShuttleSeat, CrewScores, ISeatAssignment, ICrewSkillSets, ICrewScore } from './model';
import { ShuttlersContext } from './context';
import { Missions } from './missions';
import { Assignments } from './assignments';
import { getSkillSetId } from './utils';
import { isQuipped } from '../../utils/crewutils';
import { CrewExcluder } from '../excluder/crewexcluder';
import { PlayerCrew } from '../../model/player';

export const Calculator = () => {
	const shuttlersContext = React.useContext(ShuttlersContext);
	const { helperId, groupId, activeShuttles, rosterType, rosterCrew, eventData, shuttlers, setShuttlers, assigned, setAssigned } = shuttlersContext;
	const globalContext = React.useContext(GlobalContext);
	const { t, tfmt } = globalContext.localized;
	const { playerData, ephemeral } = globalContext.player;

	const [considerActive, setConsiderActive] = useStateWithStorage<boolean>(helperId+'/considerActive', true);
	const [considerVoyage, setConsiderVoyage] = useStateWithStorage<boolean>(helperId+'/considerVoyage', false);
	const [considerFrozen, setConsiderFrozen] = useStateWithStorage<boolean>(helperId+'/considerFrozen', false);
	const [excludeQuipped, setExcludeQuipped] = useStateWithStorage<boolean>(helperId+'/excludeQuipped', false);
	const [considerShared, setConsiderShared] = useStateWithStorage<boolean>(helperId+'/considerShared', true);

	const [calcState, setCalcState] = React.useState<number>(0);
	const [crewScores, setCrewScores] = React.useState<CrewScores>(new CrewScores());

	const [preExcludedCrew, setPreExcludedCrew] = React.useState<PlayerCrew[]>([]);
	const [excludedIds, setExcludedIds] = React.useState<number[]>([]);
	const [activeStep, setActiveStep] = React.useState<'missions' | 'assignments'>(getInitialView());

	// Reset scores on roster, event, filter changes
	React.useEffect(() => {
		setCrewScores(new CrewScores());
		setPreExcludedCrew(rosterCrew.filter(crew => {
			if (rosterType === 'myCrew') {
				return crewPassesFilter(crew);
			}
			return true;
		}));
	}, [rosterCrew, eventData, considerActive, considerVoyage, considerFrozen, considerShared, excludeQuipped]);

	React.useEffect(() => {
		if (calcState === 1) updateAssignments();
	}, [calcState]);

	const canBorrow: boolean = eventData?.seconds_to_start === 0
		&& playerData?.player.squad.rank !== 'LEADER'
		&& !!ephemeral?.borrowedCrew?.length;

	const missionsSelected: number = shuttlers.shuttles.filter(shuttle => shuttle.groupId === groupId && shuttle.priority > 0).length;
	const groupMissionIds: string[] = shuttlers.shuttles.filter(shuttle => shuttle.groupId === groupId).map(shuttle => shuttle.id);
	const missionsRunning: number = activeShuttles.filter(adventure => groupMissionIds.includes(adventure.symbol) && adventure.shuttles[0].state > 0).length;

	// Scroll here when calculator finished
	const resultsAnchor = React.useRef<HTMLDivElement>(null);

	return (
		<React.Fragment>
			<div ref={resultsAnchor} />
			<div>
				{activeStep === 'missions' && (
					<React.Fragment>
						{missionsRunning > 0 && rosterType === 'myCrew' && (
							<Message>
								<p>
									{missionsRunning === 1 && t('shuttle_helper.calculator.you_have_one_running')}
									{missionsRunning !== 1 && t('shuttle_helper.calculator.you_have_n_running', { n: `${missionsRunning}`})}
								</p>
								<p>
									{tfmt('shuttle_helper.calculator.you_can_view_running', { link: <Button compact content={t('shuttle_helper.calculator.view_running')} onClick={() => importAssignments()} /> })}
									{assigned.length > 0 && t('shuttle_helper.calculator.warn_replace')}
									</p>
							</Message>
						)}
						<Missions />
					</React.Fragment>
				)}
				{activeStep === 'assignments' && (
					<React.Fragment>
						<Assignments
							crewScores={crewScores}
							updateCrewScores={updateCrewScores}
						/>
						<Button icon='backward' content={t('shuttle_helper.calculator.change_missions')} onClick={() => setActiveStep('missions')} />
					</React.Fragment>
				)}
			</div>
			<Form style={{ margin: '1em 0' }}>
				{rosterType === 'myCrew' && (
					<Form.Group grouped>
						<Form.Field
							control={Checkbox}
							label={t('consider_crew.active_shuttles')}
							checked={considerActive}
							onChange={(e, { checked }) => setConsiderActive(checked)}
						/>
						<Form.Field
							control={Checkbox}
							label={t('consider_crew.active_voyage')}
							checked={considerVoyage}
							onChange={(e, { checked }) => setConsiderVoyage(checked)}
						/>
						<Form.Field
							control={Checkbox}
							label={t('consider_crew.consider_frozen')}
							checked={considerFrozen}
							onChange={(e, { checked }) => setConsiderFrozen(checked)}
						/>

						{/* When the crew excluder is showing, this is redundant */}
						{!!shuttlersContext?.eventData && <Form.Field
							control={Checkbox}
							label={t('consider_crew.exclude_quipped')}
							checked={excludeQuipped}
							onChange={(e, { checked }) => setExcludeQuipped(checked)}
						/>}

						{canBorrow && (
							<Form.Field
								control={Checkbox}
								label={
									<label>
										{t('consider_crew.consider_shared')}
										<Popup content={t('consider_crew.shared_crew_popup')} trigger={<Icon name='info' />} />
									</label>
								}
								checked={considerShared}
								onChange={(e, { checked }) => setConsiderShared(checked)}
							/>
						)}
					</Form.Group>
				)}
				{!shuttlersContext?.eventData &&
				<CrewExcluder
					rosterCrew={rosterCrew}
					preExcludedCrew={preExcludedCrew}
					excludedCrewIds={excludedIds}
					updateExclusions={setExcludedIds}
					considerFrozen={considerFrozen}
					/>}
				<Form.Group>
					<Button fluid size='big' color='green' onClick={() => recommendShuttlers()} disabled={missionsSelected === 0}>
						{t('global.recommend_crew')}
					</Button>
				</Form.Group>
			</Form>
		</React.Fragment>
	);

	function getInitialView(): 'missions' | 'assignments' {
		if (assigned.length > 0 && shuttlers.shuttles.filter(shuttle => shuttle.groupId === groupId && shuttle.priority > 0).length > 0)
			return 'assignments';
		return 'missions';
	}

	function scrollToResults(): void {
		if (!resultsAnchor.current) return;
		resultsAnchor.current.scrollIntoView({
			behavior: 'smooth'
		});
	}

	function recommendShuttlers(): void {
		if (calcState > 0) return;

		const todo: ShuttleSeat[] = [], todoIds: string[] = [];
		shuttlers.shuttles.filter(shuttle => shuttle.groupId === groupId && shuttle.priority > 0).forEach(shuttle => {
			for (let seatNum = 0; seatNum < shuttle.seats.length; seatNum++) {
				const seat = shuttle.seats[seatNum];
				if (seat.skillA === '' && seat.skillB === '') continue;
				const ssId = getSkillSetId(seat);
				if (!crewScores.skillsets[ssId] && !todoIds.includes(ssId)) {
					todo.push(seat);
					todoIds.push(ssId);
				}
			}
		});
		if (todo.length > 0) {
			setCalcState(1);
			updateCrewScores(todo);
			return;
		}

		updateAssignments();
		scrollToResults();
	}

	function crewPassesFilter(crew: IRosterCrew) {
		if (!considerActive && crew.active_status === 2)
			return false;

		if (!considerVoyage && crew.active_status === 3)
			return false;

		if (!considerFrozen && crew.immortal > 0)
			return false;

		if ((!canBorrow || !considerShared) && crew.borrowed)
			return false;

		if (excludeQuipped && isQuipped(crew))
			return false;

		return true;
	}

	function updateCrewScores(todo: ShuttleSeat[] = []): void {
		const newSkills: ICrewSkillSets = {};
		const newScores: ICrewScore[] = [];

		for (let i = 0; i < rosterCrew.length; i++) {
			if (!shuttlersContext?.eventData && excludedIds.includes(rosterCrew[i].id)) continue;

			if (rosterType === 'myCrew') {
				if (!crewPassesFilter(rosterCrew[i])) continue;
			}

			todo.forEach(seat => {
				const ssId: string = getSkillSetId(seat);
				const currentIndex: number = crewScores.ranked.findIndex(score => score.id === rosterCrew[i].id && score.ssId === ssId);
				if (currentIndex >= 0) crewScores.ranked.splice(currentIndex, 1);

				const seatScore: number = getCrewSeatScore(rosterCrew[i], seat);
				if (seatScore > 0) {
					const crewScore: ICrewScore = {
						id: rosterCrew[i].id,
						symbol: rosterCrew[i].symbol,
						name: rosterCrew[i].name,
						score: seatScore,
						ssId
					};
					if (!newSkills[ssId]) newSkills[ssId] = [];
					newSkills[ssId].push(crewScore);
					newScores.push(crewScore);
				}
			});
		}

		todo.forEach(seat => {
			const ssId: string = getSkillSetId(seat);
			crewScores.skillsets[ssId] = newSkills[ssId].sort((a, b) => b.score - a.score);
		});
		crewScores.ranked = crewScores.ranked.concat(newScores);
		crewScores.ranked.sort((a, b) => b.score - a.score);
		setCrewScores({...crewScores});
	}

	function getCrewSeatScore(crew: IRosterCrew, seat: ShuttleSeat): number {
		const skillOperand: string = seat.operand;
		const primarySkill: string = seat.skillA;
		const secondarySkill: string = seat.skillB;

		let iHigherSkill = 0, iLowerSkill = 0;
		for (let skill in CONFIG.SKILLS) {
			if (skill !== primarySkill && skill !== secondarySkill) continue;
			if (crew[skill].core === 0) continue;

			let iMultiplier = 1;
			if (eventData) {
				if (eventData.featured.indexOf(crew.symbol) >= 0)
					iMultiplier = 3;
				else if (eventData.bonus.indexOf(crew.symbol) >= 0)
					iMultiplier = 2;
			}
			const iSkillScore = crew[skill].core*iMultiplier;

			if (iSkillScore > iHigherSkill) {
				iLowerSkill = iHigherSkill;
				iHigherSkill = iSkillScore;
			}
			else if (iSkillScore > iLowerSkill) {
				iLowerSkill = iSkillScore;
			}
		}

		let iSeatScore = 0;
		if (skillOperand === 'OR')
			iSeatScore = iHigherSkill;
		else
			iSeatScore = iHigherSkill+(iLowerSkill/4);

		return iSeatScore;
	}

	function updateAssignments(): void {
		const shuttles: Shuttle[] = shuttlers.shuttles.slice()
			.filter(shuttle => shuttle.groupId === groupId && shuttle.priority > 0)
			.sort((a, b) => a.priority - b.priority);

		const seats: ISeatAssignment[] = [];
		shuttles.forEach(shuttle => {
			for (let seatNum = 0; seatNum < shuttle.seats.length; seatNum++) {
				const ssId: string = getSkillSetId(shuttle.seats[seatNum]);
				const newSeat: ISeatAssignment = {
					shuttleId: shuttle.id,
					seatNum,
					ssId,
					assignedId: -1,
					assignedSymbol: '',
					seatScore: 0,
					locked: false
				};
				const seated: ISeatAssignment | undefined = assigned.find(seat =>
					seat.shuttleId === shuttle.id && seat.seatNum === seatNum
				);
				if (seated?.locked) {
					newSeat.assignedId = seated.assignedId;
					newSeat.assignedSymbol = seated.assignedSymbol;
					newSeat.seatScore = seated.seatScore;
					newSeat.locked = true;
				}
				seats.push(newSeat);
			}
		});
		if (seats.length === 0) return;

		const scores: ICrewScore[] = structuredClone(crewScores.ranked) as ICrewScore[];
		let iAssigned = 0;
		while (scores.length > 0 && iAssigned < seats.length) {
			const testScore: ICrewScore | undefined = scores.shift();
			if (!testScore) continue;

			const alreadyAssigned: ISeatAssignment | undefined = seats.find(seat => seat.assignedId === testScore.id);
			if (alreadyAssigned) continue;

			const openSeat: ISeatAssignment | undefined = seats.find(seat =>
				seat.ssId === testScore.ssId && seat.assignedId === -1
			);
			if (openSeat) {
				openSeat.assignedId = testScore.id;
				openSeat.assignedSymbol = testScore.symbol;
				openSeat.seatScore = testScore.score;
				iAssigned++;
			}
		}
		setAssigned([...seats]);
		setCalcState(0);
		setActiveStep('assignments');
		scrollToResults();
	}

	function importAssignments(): void {
		let running: number = 0;
		const assigned: ISeatAssignment[] = [];
		shuttlers.shuttles.filter(shuttle => shuttle.groupId === groupId).forEach(shuttle => {
			const runningAdventure: ShuttleAdventure | undefined = activeShuttles.find(adventure =>
				adventure.symbol === shuttle.id && adventure.shuttles[0].state > 0
			);
			if (runningAdventure) {
				const adventureShuttleId: number = runningAdventure.shuttles[0].id;
				runningAdventure.shuttles[0].slots.forEach((_slot, idx) => {
					const seat: ShuttleSeat = shuttle.seats[idx];
					const ssId: string = getSkillSetId(seat);
					// Add crew to assignment
					const assignedCrew: IRosterCrew | undefined = rosterCrew.find(crew =>
						crew.active_id === adventureShuttleId && crew.active_index === idx
					);
					if (assignedCrew) {
						assigned.push({
							shuttleId: runningAdventure.symbol,
							seatNum: idx,
							ssId,
							assignedId: assignedCrew.id,
							assignedSymbol: assignedCrew.symbol,
							seatScore: getCrewSeatScore(assignedCrew, seat),
							locked: false
						});
					}
				});
				shuttle.priority = ++running;
			}
			else {
				shuttle.priority = 0;
			}
		});
		setShuttlers({...shuttlers});
		setAssigned(assigned);
		setActiveStep('assignments');
		scrollToResults();
	}
};
