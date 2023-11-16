import React from "react";
import { ContinuumMission } from "../../model/continuum";
import { Header, Icon, Form, TextArea, Accordion, Button } from "semantic-ui-react";
import { GlobalContext } from "../../context/globalcontext";
import { Quest } from "../../model/missions";




export interface QuestImporterProps {
    quest?: Quest;
	questId?: number;
    setQuest: (value: Quest) => void;
    setError: (value: string) => void;
	defaultCollapsed?: boolean;
}

export const QuestImportComponent = (props: QuestImporterProps) => {

    const { defaultCollapsed, questId, quest, setQuest, setError } = props;
    const context = React.useContext(GlobalContext);
    const { playerData} = context.player;

    const hasPlayer = !!playerData;
    const [jsonString, setJsonString] = React.useState(undefined as string | undefined);
	const parseMission = (json?: string) => {
        json ??= jsonString;
        if (!json) {
            setError("No data");
            return;            
        }
		if (json === '') {
			setJsonString('');
			return;	
		}
        try {
            const quest = JSON.parse(json) as Quest;
            setQuest(quest);
			setError('');
        }
        catch (e: any) {
            setError(e.toString());
        }
		setJsonString(json);
	}

	function renderCopyPaste(): JSX.Element {
		const PLAYERLINK = `https://app.startrektimelines.com/quest/conflict_info?id=${questId}&client_api=22&continuum=true`;

		return (
			<React.Fragment>
				{hasPlayer && questId !== undefined && <Accordion
				defaultActiveIndex={!defaultCollapsed && questId !== undefined && hasPlayer ? 0 : -1}
				panels={[{
					index: 0, 
					key: 0,
					title: "Post, Update or Clear Live Continuum Quest Data (Click Here)",
					content: {
						content: <><Header as='h2'>Quest Data: {quest?.name}</Header>				
						<p>You can access the live continuum quest data for <b>{quest?.name}</b> in a similar way to how you access your player data, currently.</p>
						<ul>
							<li>
								Open this page in your browser:{' '}
								<a href={PLAYERLINK} target='_blank'>
									{PLAYERLINK}
								</a>
							</li>
							<li>
								Log in if asked, then wait for the page to finish loading. It should start with:{' '}
								<span style={{ fontFamily: 'monospace' }}>{'{"action":"update","character":'}</span> ...
							</li>
							<li>Select everything in the page (Ctrl+A) and copy it (Ctrl+C)</li>
							<li>Paste it (Ctrl+V) in the text box below. Note that DataCore will intentionally display less data here to speed up the process</li>
							<li>Click the 'Import data' button</li>
						</ul>
						<Form>
						<TextArea
							placeholder='Paste continuum quest data, here'
							id='__zzmm'							
							value={''}
							onChange={(e, { value }) => setJsonString(value as string)}
							onPaste={(e: ClipboardEvent) => parseMission(e.clipboardData?.getData('text') as string)}
						/>
		
						{jsonString?.startsWith("(**)") && <div style={{color: "tomato", fontWeight: "bold", fontStyle: "italic"}}>Invalid JSON detected. Please try again.</div>}
		
						<div style={{
							display:"flex",
							flexDirection:"row",
							justifyContent: "flex-start"					
						}}>
						<Button
							onClick={() => parseMission()}
							style={{ marginTop: '1em' }}
							content='Import data'
							icon='paste'
							labelPosition='right'
						/>
						{/* {liveGauntlet && <Button
							onClick={() => this.clearGauntlet()}
							style={{ marginTop: '1em' }}
							content='Clear live gauntlet'
							icon='delete'
							labelPosition='right'
						/>} */}
						</div>
						</Form></>
					}
				}]}
				/>}
			</React.Fragment>
		);
	}

    return <>
    
    <div className='ui segment'>
        <h3>Import Mission:</h3>
        {renderCopyPaste()}       
    </div>

    </>
}