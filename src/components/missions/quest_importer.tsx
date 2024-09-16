import React from "react";

import { GlobalContext } from "../../context/globalcontext";
import { Quest } from "../../model/missions";
import { JsonInputForm } from "../base/jsoninputform";
import { Notification } from "../page/notification";

export interface QuestImporterProps {
    quest?: Quest;
	questId?: number;
    setQuest: (value?: Quest) => void;
    setError: (value: string) => void;
	clearQuest: () => void;
	currentHasRemote?: boolean;

}

export const QuestImportComponent = (props: QuestImporterProps) => {

    const { currentHasRemote, questId, quest, setQuest, setError, clearQuest } = props;
    const context = React.useContext(GlobalContext);
    const { playerData} = context.player;
	const { t } = context.localized;

	const [collapsed, setCollapsed] = React.useState<boolean | undefined>(undefined);

    const hasPlayer = !!playerData;

    React.useEffect(() => {
        if (collapsed === undefined) setCollapsed(true);
    }, [currentHasRemote]);

	const validateMission = (json: Quest) => {
        if (!json) {
            return ("No data");
        }
		return true;
	}

	function renderCopyPaste(): JSX.Element {
		if (!quest) return <></>
		return (
			<React.Fragment>
                {!currentHasRemote && <Notification
                    color={'orange'}
                    header={`Quest Data Required for '${quest?.name}'`}
                    content={
                        <>
                        <p>
                            You need to paste your data from each quest, individually, in order to run the crew finder on a particular quest.
                        </p>
                        <p>
                            You can paste your data using the box, below.
                        </p>
                        <p>
                            Current Quest Data: <b><a target='_blank' href={`https://app.startrektimelines.com/quest/conflict_info?id=${quest?.id}&client_api=24&continuum=true`}>{quest?.name}</a></b>
                        </p>
                        </>
                    }
                    icon="database"
                />}

                {currentHasRemote && <Notification
                    color={'green'}
                    header="Quest Data Present"
                    content={
                        <div style={{cursor: 'pointer'}} onClick={(e) => setCollapsed(false)}>
                        <p>
                            You have already uploaded quest data for this quest.
                        </p>
						<p>
							Click here to update your data if you wish to refresh your claimed rewards, or use data from another account.
						</p>
                        <p>
                            Current Quest Data: <b><a onClick={() => setCollapsed(false)} target='_blank' href={`https://app.startrektimelines.com/quest/conflict_info?id=${quest?.id}&client_api=24&continuum=true`}>{quest?.name}</a></b>
                        </p>
                        <p style={{textAlign: "right"}}>
							<b style={{fontSize:"0.8em"}}>(To clear all quest data, <a title={'Clear All Quest Data'} onClick={() => clearQuest()}>Click Here</a>)</b>
                        </p>

                        </div>
                    }
                    icon="database"
                />}

				{hasPlayer && questId !== undefined && (!collapsed || !currentHasRemote) &&

				<JsonInputForm
					requestDismiss={() => setCollapsed(!collapsed && !!currentHasRemote)}
					config={{
						dataUrl: `https://app.startrektimelines.com/quest/conflict_info?id=${questId}&client_api=24&continuum=true`,
                        dataName: t('json_types.quest_data'),
					    jsonHint: '{"id":',
						androidFileHint: 'conflict_info.json',
						iOSFileHint: 'conflict_info?id'
					}}
					title={`Quest Input Form: ${quest?.name}`}
					validateInput={validateMission}
					setValidInput={(quest) => {
						if (quest) setCollapsed(true);
						setQuest(quest);
					}}

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