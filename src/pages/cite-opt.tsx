import React from 'react';
import DataPageLayout from '../components/page/datapagelayout';
import FleetBossBattles from '../components/fleetbossbattles';
import CiteOptimizer from '../components/citeoptimizer';


const CiteOptimizerPage = () => {

    return <DataPageLayout pageTitle='Citation Optimizer'>
        <CiteOptimizer />
    </DataPageLayout>
}

export default CiteOptimizerPage;

