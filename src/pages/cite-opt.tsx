import React from 'react';
import DataPageLayout from '../components/page/datapagelayout';
import CiteOptimizer from '../components/optimizer/citeoptimizer_old';
import { CiteOptComponent } from '../components/optimizer/citeopt';


const CiteOptimizerPage = () => {

    return <DataPageLayout playerPromptType='require' pageTitle='Citation Optimizer' demands={['collections']}>
        <CiteOptComponent />
    </DataPageLayout>
}

export default CiteOptimizerPage;

