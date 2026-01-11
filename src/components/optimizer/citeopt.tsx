import React from 'react';
import { CitationOptimizerConfigProvider } from './context';
import { EngineRunner } from './engines';
import { CitationProspects } from './prospects';
import { CiteConfigPanel } from './citeconfig';
import { CitationOptimizerTabs } from './citetabs';
import { CiteOptExplainer } from './explainer';
import { WorkerProvider } from '../../context/workercontext';
import { GlobalContext } from '../../context/globalcontext';
import { getEventData } from '../../utils/events';
import { GameEvent } from '../../model/player';
import { IEventData } from '../../model/events';

export const CiteOptComponent = () => {
    const globalContext = React.useContext(GlobalContext);
    const { event_instances } = globalContext.core;
    const { playerData } = globalContext.player;
    const pageId = 'citation_optimizer';
    const [eventData, setEventData] = React.useState<IEventData | undefined>();

    React.useEffect(() => {
        setTimeout(() => {
            fetchLatestEvent();
        });
    }, [playerData]);

    return (
        <React.Fragment>

            <CitationOptimizerConfigProvider eventData={eventData} pageId={pageId}>
                <WorkerProvider>
                    <React.Fragment>
                        <CiteOptExplainer />
                        <EngineRunner pageId={pageId} />
                        <CitationProspects pageId={pageId} />
                        <CiteConfigPanel pageId={pageId} />
                        <CitationOptimizerTabs pageId={pageId} />
                    </React.Fragment>
                </WorkerProvider>
            </CitationOptimizerConfigProvider>
        </React.Fragment>
    );

    function fetchLatestEvent() {
        let s = `structured/events/${event_instances[event_instances.length - 1].instance_id}.json`;
        fetch(s).then((result) => result.json()).then(event => {
            let eventData = getEventData(event as GameEvent, globalContext.core.crew, globalContext.core.ships);
            setEventData(eventData);
        })
        .catch((e) => console.log(e));
    }
}