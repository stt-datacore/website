import React from "react";
import { Quest } from "../../model/missions";
import { PathGroup } from "../../model/worker";
import { GlobalContext } from "../../context/globalcontext";
import { Pagination, Table } from "semantic-ui-react";
import { useStateWithStorage } from "../../utils/storage";



export interface PathTableProps {
    pathGroups: PathGroup[],
    quest: Quest,
    targetGroup?: string;
    pageId: string;
}


export const PathTable = (props: PathTableProps) => {
    const context = React.useContext(GlobalContext);
    const { pageId, pathGroups, quest, targetGroup } = props;

    const [page, setPage] = useStateWithStorage<number>(`${pageId}/pathTablePage`, 0);
    const [pageSize, setPageSize] = useStateWithStorage<number>(`${pageId}/pathTablePage`, 10);
    const [data, setData] = React.useState<PathGroup[]>([]);

    const [totalPages, setTotalPages] = React.useState(0);

    React.useEffect(() => {
        const tp = Math.ceil(pathGroups.length / pageSize);
        if (tp != totalPages) {
            setTotalPages(tp);
            setPage(1);
        }
    }, [pathGroups, pageSize])

    React.useEffect(() => {
        if (page === 0) {
            setData([]);
        }
        else {
            let idx = (page - 1) * pageSize;
            let newdata = pathGroups.slice(idx, idx + pageSize);
            setData(newdata);
        }
    }, [pathGroups, pageSize, page]);

    const sizeChoices = [1, 5, 10, 20, 50, 100].map((n) => {
        return {
            key: "page" + n.toString(),
            value: n,
            text: n.toString()
        }
    })

    return (
        <React.Fragment>
            
            <Pagination fluid totalPages={totalPages} activePage={page} onPageChange={(e, data) => setPage(data.activePage as number)} />

            <Table>
                <Table.Header>
                    <Table.Row>
                        <Table.HeaderCell>

                        </Table.HeaderCell>
                    </Table.Row>
                </Table.Header>
            </Table>
        </React.Fragment>
    )
}