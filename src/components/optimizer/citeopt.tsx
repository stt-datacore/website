import React from 'react';
import { CitationOptimizerConfigProvider } from './context';
import { EngineRunner } from './engines';
import { CitationProspects } from './prospects';
import { CiteConfigPanel } from './citeconfig';
import { CitationOptimizerTabs } from './citetabs';
import { CiteOptExplainer } from './explainer';





export const CiteOptComponent = () => {

    const pageId = 'citation_optimizer';


    return <React.Fragment>

        <CitationOptimizerConfigProvider pageId={pageId}>
            <React.Fragment>
                <CiteOptExplainer />
                <EngineRunner pageId={pageId} />
                <CitationProspects pageId={pageId} />
                <CiteConfigPanel pageId={pageId} />
                <CitationOptimizerTabs pageId={pageId} />
            </React.Fragment>
        </CitationOptimizerConfigProvider>
    </React.Fragment>


}