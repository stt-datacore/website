import React from "react";
import { Header, Form, TextArea, Accordion, Button } from "semantic-ui-react";
import { GlobalContext } from "../../context/globalcontext";
import { Quest } from "../../model/missions";
import { JsonInputForm } from "../base/jsoninputform";

export interface QuestImporterProps {
    quest?: Quest;
	questId?: number;
    setQuest: (value?: Quest) => void;
    setError: (value: string) => void;
	clearQuest: () => void;
	defaultCollapsed?: boolean;
}

export const QuestImportComponent = (props: QuestImporterProps) => {

    const { defaultCollapsed, questId, quest, setQuest, setError } = props;
    const context = React.useContext(GlobalContext);
    const { playerData} = context.player;

    const hasPlayer = !!playerData;
    
	const validateMission = (json: Quest) => {
        if (!json) {
            return ("No data");                        
        }		
		return true;
	}

	function renderCopyPaste(): JSX.Element {
		return (
			<React.Fragment>
				{hasPlayer && questId !== undefined && 
				
				<JsonInputForm
					config={{
						dataUrl: `https://app.startrektimelines.com/quest/conflict_info?id=${questId}&client_api=22&continuum=true`,
						dataName: 'quest',
						jsonHint: '{"id":',
						androidFileHint: 'conflict_info.json',
						iOSFileHint: 'conflict_info?id'
					}}
					title={`Quest: ${quest?.name}`}
					validateInput={validateMission}
					setValidInput={setQuest}
					
				/>}
			</React.Fragment>
		);
	}

    return <>
    
    <div className='ui segment'>        
        {renderCopyPaste()}       
    </div>

    </>
}