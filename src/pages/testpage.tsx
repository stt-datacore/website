import React from 'react';
import DataPageLayout from '../components/page/datapagelayout';
import { GlobalContext } from '../context/globalcontext';
import { AvatarView, AvatarViewMode, BasicItem } from '../components/item_presenters/avatarview';
import { CrewHoverStat } from '../components/hovering/crewhoverstat';
import { ShipHoverStat } from '../components/hovering/shiphoverstat';
import { ItemHoverStat } from '../components/hovering/itemhoverstat';
import { Button, Checkbox } from 'semantic-ui-react';


const TestPage = () => {
    return <>
        <DataPageLayout
            pageTitle='test'
            demands={['items', 'crew', 'all_ships', 'ship_schematics']}>
            <TestComponent />
        </DataPageLayout>
    </>
}

const TestComponent = () => {
    const globalContext = React.useContext(GlobalContext);

    const { items, crew, all_ships } = globalContext.core;

    const [custVis, setCustVis] = React.useState(undefined as BasicItem | undefined);
    const [nav, setNav] = React.useState(false);
    const [navCustom, setNavCustom] = React.useState(false);
    const [hover, setHover] = React.useState(true);
    const [itemIdx, setItemIdx] = React.useState(0);
    const [crewIdx, setCrewIdx] = React.useState(0);
    const [shipIdx, setShipIdx] = React.useState(0);
    const [fresh, setFresh] = React.useState(0);

    let stuff = [] as any;
    let c = 0;

    React.useEffect(() => {
        let itemidx = Math.floor(Math.random() * (items.length - 1));
        let crewidx = Math.floor(Math.random() * (crew.length - 1));
        let shipidx = Math.floor(Math.random() * (all_ships.length - 1));
        setItemIdx(itemidx);
        setCrewIdx(crewidx);
        setShipIdx(shipidx);
    }, [fresh, items, all_ships, crew]);

    if (itemIdx < 0 || shipIdx < 0 || crewIdx < 0) return <></>

    const item = items[itemIdx];
    const crewmember = crew[crewIdx];
    const ship = all_ships[shipIdx];

    stuff = [item, crewmember, ship];
    let groups = ['test_item', 'test_crew', 'test_ship'];
    let modes = ['item', 'crew', 'ship'] as AvatarViewMode[];

    return <>
        <CrewHoverStat targetGroup='test_crew' />
        <ShipHoverStat targetGroup='test_ship' />
        <ItemHoverStat targetGroup='test_item' />
        <div style={{display: 'flex', gap: '2em'}}>
            <Checkbox checked={nav} label='Click to Navigate' onClick={(e, { checked }) => setNav(checked as boolean)} />
            <Checkbox checked={navCustom} label='Click to Navigate Custom' onClick={(e, { checked }) => setNavCustom(checked as boolean)} />
            <Checkbox checked={hover} label='Click to enable hover' onClick={(e, { checked }) => setHover(checked as boolean)} />
        </div>
        <div style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-evenly'
        }}>

        <Button icon='refresh' onClick={() => setFresh(fresh+1)} />

        {stuff.map((item, idx) => {
            let group = groups[idx]
            return <AvatarView
                        link={nav}
                        crewBackground='rich'
                        key={`testItem_${idx}`}
                        useSchematicsIcon={true}
                        mode={modes[idx]}
                        symbol={item.symbol}
                        size={96}
                        targetGroup={hover ? group : undefined}
                        onClick={navCustom ? (item) => clickItem(item) : undefined}
                    />
        })}

        </div>
        {!!custVis && <div>{custVis.symbol} clicked!</div>}
    </>

    function clickItem(item: BasicItem) {
        setCustVis(item);
    }
}


export default TestPage;