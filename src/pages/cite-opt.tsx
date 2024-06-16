import React from 'react';
import DataPageLayout from '../components/page/datapagelayout';
import CiteOptimizer from '../components/optimizer/citeoptimizer';


const CiteOptimizerPage = () => {

    return <DataPageLayout playerPromptType='require' pageTitle='Citation Optimizer' demands={['collections']}>
        <CiteOptimizer />
    </DataPageLayout>
}

export default CiteOptimizerPage;

