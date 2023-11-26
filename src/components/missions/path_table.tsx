import React from "react";
import { Quest } from "../../model/missions";
import { PathGroup } from "../../model/worker";
import { GlobalContext } from "../../context/globalcontext";
import { Pagination, Table } from "semantic-ui-react";
import { useStateWithStorage } from "../../utils/storage";
import { ITableConfigRow, SearchableTable } from "../searchabletable";
import { PathCrewDisplay } from "./path_crew_display";



export interface PathTableProps {
    pathGroups?: PathGroup[],
    quest?: Quest,
    targetGroup?: string;
    pageId: string;
}


export const PathTable = (props: PathTableProps) => {
    const context = React.useContext(GlobalContext);
    const { pageId, quest, targetGroup } = props;

    const pathGroups = props.pathGroups ?? [];
    
    const sizeChoices = [1, 5, 10, 20, 50, 100].map((n) => {
        return {
            key: "page" + n.toString(),
            value: n,
            text: n.toString()
        }
    });

    const rowConfig = [
        { width: 1, column: '', title: 'Paths' }
    ] as ITableConfigRow[]

    function renderRow(data: PathGroup, idx: number): JSX.Element {

        if (!quest) return <></>
        
		return (
			<Table.Row key={data.path + data.mastery.toString()}>
				<Table.Cell>
                    <PathCrewDisplay 
                        quest={quest}
                        compact={false}
                        pathGroup={data}
                        targetGroup={pageId + '_threeView_target'}
                        />
				</Table.Cell>
			</Table.Row>
		);
	}

    const filterRow = (data: PathGroup, filter: any) => {
        return true;
    }

    return (
        <React.Fragment>

            <SearchableTable
				id='collections/progress'
                pagingOptions={sizeChoices}
				data={pathGroups}
				config={rowConfig}
				renderTableRow={(data: any, idx?: number, isActive?: boolean) => renderRow(data, idx ?? -1)}
				filterRow={(collection, filter) => filterRow(collection, filter)}
				explanation={
					<div>
						<p>Search for solves by crew name, challenge name, or trait.</p>
					</div>
				}
			/>
        </React.Fragment>
    )
}