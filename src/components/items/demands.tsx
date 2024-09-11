import React from 'react';
import { useStateWithStorage } from '../../utils/storage';
import { GlobalContext } from '../../context/globalcontext';

export interface DemandsViewProps {
    pageId: string
}

type GroupByOption = 'items' | 'demands';

export const DemandsView = (props: DemandsViewProps) => {
    const globalContext = React.useContext(GlobalContext);
    const { pageId } = props;

    const [groupBy, setGroupBy] = useStateWithStorage<GroupByOption>(`${pageId}/demands/group_by`, 'demands', { rememberForever: true });
    



}


interface DemandsTableProps {

}


export const DemandsTable = (props: DemandsTableProps) => {




    function renderHeader() {

    }

    function renderRow(row) {

    }

}