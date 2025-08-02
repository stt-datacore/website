import React from "react";
import { Accordion, Icon, SemanticICONS, Segment } from "semantic-ui-react";
import { GlobalContext } from "../../../context/globalcontext";
import { PlayerCrew, Voyage } from "../../../model/player";
import { Ship } from "../../../model/ship";
import { IVoyageCalcConfig } from "../../../model/voyage";
import { LineupViewer } from "../lineupviewer/lineup_accordion";
import { DilemmaTable } from "./dilemmatable";
import { VoyageLogImportComponent } from "./voyage_log_importer";
import { useStateWithStorage } from "../../../utils/storage";
import { VoyageLogRoot } from "../../../model/voyagelog";
import { OptionsPanelFlexColumn } from "../../stats/utils";

type DilemmaHelperProps = {
	configSource?: 'player' | 'custom';
	voyage: Voyage;
	ship?: Ship;
	roster?: PlayerCrew[];
	rosterType?: 'allCrew' | 'myCrew';
	initialExpand?: boolean;
    targetGroup?: string;
	dbid?: number | string;
};

export const DilemmaHelperAccordion = (props: DilemmaHelperProps) => {
	const globalContext = React.useContext(GlobalContext);
    const { t } = globalContext.localized;

    const [isActive, setIsActive] = React.useState<boolean>(false);
	const { targetGroup, configSource, voyage, ship, roster, rosterType, initialExpand: externActive, dbid } = props;

	React.useEffect(() => {
		if (externActive !== undefined) {
			setIsActive(externActive);
		}
	}, [externActive]);

	return (
		<Accordion>
			<Accordion.Title
				active={isActive}
				onClick={() => setIsActive(!isActive)}
			>
				<Icon name={isActive ? 'caret down' : 'caret right' as SemanticICONS} />
				{t('voyage_log.title')}
			</Accordion.Title>
			<Accordion.Content active={isActive}>
				{isActive && (
					<Segment>
						<DilemmaHelper
                            targetGroup={targetGroup}
							configSource={configSource}
							voyage={voyage}
							ship={ship}
							dbid={dbid}
							roster={roster}
							rosterType={rosterType}
						/>
					</Segment>
				)}
			</Accordion.Content>
		</Accordion>
	);
};

export const DilemmaHelper = (props: DilemmaHelperProps) => {
    const { voyage, targetGroup, dbid } = props;
    const [voyageLog, setVoyageLog] = useStateWithStorage<VoyageLogRoot | undefined>(`${dbid ? dbid + "/" : ""}dilemma_helper/voyage_log`, undefined);
    const flexCol = OptionsPanelFlexColumn;

    const narrative = React.useMemo(() => {
        if (voyageLog) {
            return voyageLog[1];
        }
        return undefined;
    }, [voyageLog, dbid]);

    return (
        <React.Fragment>
            <div style={{...flexCol, gap: '1em', justifyContent: 'stretch', alignItems: 'stretch' }}>
                <VoyageLogImportComponent
                    setVoyageLog={setVoyageLog}
                    clearVoyageLog={() => setVoyageLog(undefined)}
                    voyageId={voyage.id}
                />
                <DilemmaTable
                    targetGroup={targetGroup}
                    voyageLog={narrative}
                />
            </div>
        </React.Fragment>
    )
}