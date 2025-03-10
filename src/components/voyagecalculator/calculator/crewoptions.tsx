import React from "react";
import { Grid, Message, Segment, Form, Checkbox } from "semantic-ui-react";
import { GlobalContext } from "../../../context/globalcontext";
import { QuippedPower } from "../../../model/crew";
import { PlayerCrew } from "../../../model/player";
import { IVoyageCrew } from "../../../model/voyage";
import { oneCrewCopy, qbitsToSlots } from "../../../utils/crewutils";
import { calcQLots } from "../../../utils/equipment";
import { getItemWithBonus, ItemWithBonus } from "../../../utils/itemutils";
import { OptionsPanelFlexColumn } from "../../stats/utils";
import { CalculatorContext } from "../context";
import { CrewExcluder } from "../crewexcluder";
import { CrewThemes } from "../crewthemes";
import { QuipmentProspectsOptions } from "../../qpconfig/options";
import { UserPrefsContext } from "./userprefs";

export type CrewOptionsProps = {
	updateConsideredCrew: (crew: IVoyageCrew[]) => void;
};

export const CrewOptions = (props: CrewOptionsProps) => {
	const flexCol = OptionsPanelFlexColumn;
	const globalContext = React.useContext(GlobalContext);
	const { t, tfmt } = globalContext.localized;
	const calculatorContext = React.useContext(CalculatorContext);
	const { rosterType, voyageConfig } = calculatorContext;
	const { qpConfig, setQPConfig, applyQp } = React.useContext(UserPrefsContext);

	const [preConsideredCrew, setPreConsideredCrew] = React.useState<IVoyageCrew[]>(calculatorContext.crew);
	const [considerVoyagers, setConsiderVoyagers] = React.useState<boolean>(false);
	const [considerShuttlers, setConsiderShuttlers] = React.useState<boolean>(false);
	const [considerFrozen, setConsiderFrozen] = React.useState<boolean>(false);
	const [preExcludedCrew, setPreExcludedCrew] = React.useState<IVoyageCrew[]>([]);
	const [excludedCrewIds, internalSetExcludedCrewIds] = React.useState<number[]>([]);
	const [consideredCount, setConsideredCount] = React.useState<number>(0);

	const setExcludedCrewIds = (ids: number[]) => {
		internalSetExcludedCrewIds([ ... new Set(ids) ]);
	};

	React.useEffect(() => {
		const crew = calculatorContext.crew.map(c => applyQp(c) as IVoyageCrew);
		setPreConsideredCrew(crew);
	}, [calculatorContext.crew, qpConfig]);

	React.useEffect(() => {
		const preExcludedCrew: IVoyageCrew[] = preExcludeCrew(preConsideredCrew);
		setPreExcludedCrew([...preExcludedCrew]);
		const consideredCrew: IVoyageCrew[] = preExcludedCrew.filter(crewman => {
			if (excludedCrewIds.includes(crewman.id))
				return false;
			return true;
		});
		setConsideredCount(consideredCrew.length);
		props.updateConsideredCrew(consideredCrew);
	}, [preConsideredCrew, considerVoyagers, considerShuttlers, considerFrozen, excludedCrewIds]);

	const activeVoyagers: number = calculatorContext.crew.filter(crew =>
		crew.active_status === 3
	).length;
	const activeShuttlers: number = calculatorContext.crew.filter(crew =>
		crew.active_status === 2
	).length;

	return (
		<Grid stackable columns={2} style={{ marginBottom: '1em' }}>
			<Grid.Row>
				<Grid.Column>
					<Message attached>
						<Message.Header>
							{t('voyage.picker_options.title')}
						</Message.Header>
						<p>
							{tfmt('voyage.picker_options.sub_title', {
								n: <b>{consideredCount} crew</b>
							})}
						</p>
					</Message>
					<Segment attached='bottom'>
						{rosterType === 'myCrew' && (
							<Form.Group grouped style={{ marginBottom: '1em' }}>
								<React.Fragment>
									{activeVoyagers > 0 && (
										<Form.Field
											control={Checkbox}
											label={t('voyage.picker_options.voyage')}
											checked={considerVoyagers}
											onChange={(e, { checked }) => setConsiderVoyagers(checked)}
										/>
									)}
									{activeShuttlers > 0 && (
										<Form.Field
											control={Checkbox}
											label={t('voyage.picker_options.shuttle')}
											checked={considerShuttlers}
											onChange={(e, { checked }) => setConsiderShuttlers(checked)}
										/>
									)}
									<Form.Field
										control={Checkbox}
										label={t('voyage.picker_options.frozen')}
										checked={considerFrozen}
										onChange={(e, { checked }) => setConsiderFrozen(checked)}
									/>
								</React.Fragment>
							</Form.Group>
						)}
						<div style={{...flexCol, alignItems: 'flex-start', gap: '1em'}}>
							<CrewThemes
								rosterType={rosterType}
								rosterCrew={calculatorContext.crew}
								preExcludeCrew={preExcludeCrew}
								considerActive={considerShuttlers}
								considerFrozen={considerFrozen}
								setPreConsideredCrew={setPreConsideredCrew}
							/>

							<QuipmentProspectsOptions
								config={qpConfig}
								setConfig={setQPConfig}
								/>
						</div>
					</Segment>
				</Grid.Column>
				<Grid.Column>
					<CrewExcluder
						considerFrozen={considerFrozen}
						rosterCrew={calculatorContext.crew}
						preExcludedCrew={preExcludedCrew}
						excludedCrewIds={excludedCrewIds}
						updateExclusions={setExcludedCrewIds}
					/>
				</Grid.Column>
			</Grid.Row>
		</Grid>
	);

	function preExcludeCrew(preConsideredCrew: IVoyageCrew[]): IVoyageCrew[] {
		const preExcluded = preConsideredCrew.filter(crewman => {
			if (crewman.expires_in)
				return false;

			if (!considerVoyagers && crewman.active_status === 3)
				return false;

			if (!considerShuttlers && crewman.active_status === 2)
				return false;

			if (!considerFrozen && crewman.immortal > 0)
				return false;

			return true;
		});

		return preExcluded;
	}

};
