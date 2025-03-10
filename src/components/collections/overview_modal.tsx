import React from "react"
import { Container, Image, Tab } from "semantic-ui-react"
import { CrewHoverStat } from "../hovering/crewhoverstat"
import { ItemHoverStat } from "../hovering/itemhoverstat"
import { ShipHoverStat } from "../hovering/shiphoverstat"
import { PlayerCollection } from "../../model/player"
import { CollectionCrew } from "./overview_panes/collectioncrew"
import { CollectionTiers } from "./overview_panes/collectionmilestones"
import { GlobalContext } from "../../context/globalcontext"
import { useStateWithStorage } from "../../utils/storage"

export interface CollectionDetailsProps {
	/** The collection to display */
	collection: PlayerCollection;

	/** Page Id for storage variables (optional) */
	pageId?: string;

	/** Set the active tab */
	activeTab?: number;
}

export const CollectionDetails = (props: CollectionDetailsProps) => {
	const globalContext = React.useContext(GlobalContext);
	const { t } = globalContext.localized;
	const { collection, activeTab } = props;
	const pageId = props.pageId ? props.pageId + "/" : '';
	const [tab, setTab] = useStateWithStorage(`${pageId}collection_details_modal/active_tab`, props.activeTab || 0, { rememberForever: true });
	const [scrollY, setScrollY] = useStateWithStorage(`${pageId}collection_details_modal/scroll_y`, undefined as number | undefined);
	const [oldRef, setOldRef] = React.useState<HTMLElement>();
	const [shown, setShown] = React.useState(false);
	const ref = React.createRef<HTMLDivElement>();

	let image = collection.image?.replace("/collection_vault/", "collection_vault_");
	if (!image?.endsWith(".png")) image += ".png";

	// React.useEffect(() => {
	// 	if (props.activeTab) {
	// 		setTab(props.activeTab);
	// 	}
	// }, []);

	const panes = [
		{
			menuItem: t('base.crew'),
			render: () => (
				<Tab.Pane attached={false}>
					<CollectionCrew collection={collection} />
				</Tab.Pane>
			),
		},
		{
			menuItem: t('collections.milestones'),
			render: () => (
				<Tab.Pane attached={false}>
					<CollectionTiers collection={collection} />
				</Tab.Pane>
			),
		},
	];

	React.useEffect(() => {
		setupScroll();
	}, [ref]);

	return <Container as='div' style={{ padding: '1em' }}>
		<div ref={ref}>
			<div className="ui segment">
				<Image
					src={`${process.env.GATSBY_ASSETS_URL}${image}`}
					fluid
				/>
			</div>
			<Tab
				style={{ marginTop: '1em' }}
				menu={{ secondary: true, pointing: true }}
				panes={panes}
				renderActiveOnly
				activeIndex={tab}
				onTabChange={(e, { activeIndex }) => setTab(activeIndex as number)}
			/>
			<CrewHoverStat targetGroup='col_overview_crew' modalPositioning={true} />
			<ItemHoverStat targetGroup='col_overview_items' modalPositioning={true} />
			<ShipHoverStat targetGroup='col_overview_ships' modalPositioning={true} />
		</div>
	</Container>

	function captureScroll(e: any) {
		const t = e.target;
		if (t instanceof HTMLElement) {
			if (scrollY !== t.scrollTop) {
				//console.log("Set Scroll Y", t.scrollTop);
				setScrollY(t.scrollTop)
			}
		}
	}

	function setupScroll() {
		if (ref.current && ref.current != oldRef) {
			if (oldRef) {
				oldRef.removeEventListener('scroll', captureScroll);
			}
			let p = ref.current as HTMLElement | null;
			while (p && p.className !== 'scrolling content') {
				p = p.parentElement;
			}
			if (p?.className === 'scrolling content') {
				setTimeout(() => {
					if (shown) return;
					if (p.scrollTop !== scrollY) {
						//console.log("Restore Scroll Y", scrollY);
						p.scrollTo({ top: scrollY });
						if (p.scrollTop !== scrollY) {
							//console.log("Scroll overflow")
							setScrollY(p.scrollTop);
						}
						setShown(true);
					}
				});
				p.removeEventListener('scroll', captureScroll);
				p.addEventListener('scroll', captureScroll);
				setOldRef(p);
			}
			else {
				setOldRef(undefined);
				setScrollY(undefined);
			}
		}
	}
}