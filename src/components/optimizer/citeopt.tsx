import React from 'react';
import { CitationOptimizerConfigProvider } from './context';
import { EngineRunner } from './engines';
import { CitationProspects } from './prospects';
import { CiteConfigPanel } from './citeconfig';
import { CitationOptimizerTabs } from './citetabs';
import { CiteOptExplainer } from './explainer';
import { WorkerProvider } from '../../context/workercontext';

export const CiteOptComponent = () => {

    const pageId = 'citation_optimizer';


    return <React.Fragment>

        <CitationOptimizerConfigProvider pageId={pageId}>
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


}