import React, { PureComponent } from 'react';
import { Item, Icon, Dropdown, Label } from 'semantic-ui-react';
import { Link } from 'gatsby';

import { CrewMember } from '../../model/crew';
import { Collection } from '../../model/game-elements';
import { GlobalContext } from '../../context/globalcontext';
import CONFIG from '../CONFIG';
import { DEFAULT_MOBILE_WIDTH } from '../hovering/hoverstat';
import { crewCopy } from '../../utils/crewutils';
import { TinyStore } from '../../utils/tiny';

type CollectionsPageProps = {
	onClick?: (collectionId: number) => void;
};
type SortOptions = 'date_added' | 'rarity' | 'owned_status';
type Direction = 'ascending' | 'descending';
type CollectionsPageState = {
	collections?: Collection[];
	allcrew?: CrewMember[];
	sortBy: SortOptions;
	direction: Direction;
};

/**
 * Format collection description text by parsing the markup
 * @param text The collection text to parse and format
 * @param style Optional style to include on the output DIV
 * @param className Optional className to include on the output DIV (comes before style in rendering)
 * @param linkFunc Optional on-click function
 * @param linkValue Optional value (parsed contents used otherwise)
 * @returns {JSX.Element} Formatted collection description
 */
export const formatColString = (text: string, style?: React.CSSProperties, className?: string, linkFunc?: (value: string) => void, linkValue?: string) => {	
	const greg = new RegExp(/(.+)\<([A-Fa-f0-9#]+)\>\<b\>(.+)\<\/b\>\<\/color\>(.+)/);
	const greg2 = new RegExp(/(.+)\<span style\=\"color:([A-Fa-f0-9#]+)\"\>\<b\>(.+)\<\/b\>\<\/span\>(.+)/);

    let testA = greg.test(text);
    let testB = greg2.test(text);

	if (!testA && !testB) {
        if (linkFunc && linkValue) {
            return <div className={className} style={{...(style ?? {}), cursor: "pointer"}} onClick={(e) => linkFunc(linkValue)}>{text}</div>;
        }
        else {
            return <div className={className} style={style}>{text}</div>;
        }
        
	}		

    if (testA) {
        const result = greg.exec(text);
    
        return result && <div style={style}>
            {result[1]}<b style={{color: result[2], cursor: linkFunc ? 'pointer' : undefined}} onClick={(e) => linkFunc ? linkFunc(linkValue ?? result[3]) : null}>{result[3]}</b>{result[4]}
        </div> || <>{text}</>    
    }
    else {
        const result = greg2.exec(text);
    
        return result && <div className={className} style={style}>
            {result[1]}<b style={{color: result[2], cursor: linkFunc ? 'pointer' : undefined}} onClick={(e) => linkFunc ? linkFunc(linkValue ?? result[3]) : null}>{result[3]}</b>{result[4]}
        </div> || <>{text}</>    
    }
}


class CollectionsOverviewComponent extends PureComponent<CollectionsPageProps, CollectionsPageState> {
	static contextType = GlobalContext;
	context!: React.ContextType<typeof GlobalContext>;
	tiny = TinyStore.getStore('collectionBrowser');
	constructor(props: CollectionsPageProps) {
		super(props);
		
		const sb = this.tiny.getValue<SortOptions>('sortBy', 'date_added') ?? 'date_added';
		const sd = this.tiny.getValue<Direction>('sortDirection', 'ascending') ?? 'ascending';
		
		this.state = { collections: undefined, allcrew: undefined, sortBy: sb, direction: sd };
	}

	componentDidMount() {
		this.setState({ ... this.state, allcrew: this.context.core.crew, collections: this.context.core.collections });			
		if (!this.context.player.playerData) {
			if (this.state.sortBy === 'owned_status') {
				this.setSort('date_added');
			}
		}
	}

	componentDidUpdate(prevProps: Readonly<CollectionsPageProps>, prevState: Readonly<CollectionsPageState>, snapshot?: any): void {
		if (!this.context.player.playerData) {
			if (this.state.sortBy === 'owned_status') {
				this.setSort('date_added');
			}
		}
	}

	private readonly setSort = (sort?: SortOptions, dir?: Direction) => {
		sort ??= this.state.sortBy;
		dir ??= this.state.direction;

		// we don't want to force update
		if (this.state.direction === dir && this.state.sortBy === sort) return;

		this.tiny.setValue('sortBy', sort, true);
		this.tiny.setValue('sortDirection', dir, true);
		this.setState({ ...this.state, sortBy: sort, direction: dir });
	}

	render() {
		const { direction, sortBy, collections, allcrew } = this.state;

		if (!collections || collections.length === 0) {
			return this.context.core.spin ? this.context.core.spin() : <></>;
		}
		const mul = direction === 'ascending' ? 1 : -1;

		for (let col of collections) {
			let workcol = (col.crew?.map(cm => allcrew?.find(fc => fc.symbol === cm)) ?? []) as CrewMember[];
			
			if (sortBy === 'date_added') {
				workcol?.sort((a, b) => {
					let r = a.date_added.getTime() - b.date_added.getTime();
					if (!r) r = a.name.localeCompare(b.name);
					return r * mul;
				});
			}
			else if (sortBy === 'rarity') {
				workcol?.sort((a, b) => {
					let r = a.max_rarity - b.max_rarity;
					if (!r) r = a.name.localeCompare(b.name);
					return r * mul;
				});
			}
			else if (sortBy === 'owned_status' && this.context.player.playerData) {
				workcol?.sort((a, b) => {
					let acheck = this.context.player.playerData?.player.character.crew.find(fc => fc.symbol === a.symbol);
					let bcheck = this.context.player.playerData?.player.character.crew.find(fc => fc.symbol === b.symbol);
					let r = 0;
					if (!!acheck != !!bcheck) {
						if (!!acheck) r = -1;
						else r = 1;
					}
					else {
						r = a.date_added.getTime() - b.date_added.getTime();
					}
					if (!r) r = a.name.localeCompare(b.name);
					return r * mul;
				})
			}

			col.crew = workcol.map(m => m.symbol);
		}
		
		const directions = [
			{
				key: 'ascending',
				value: 'ascending',
				text: 'Ascending'
			},
			{
				key: 'descending',
				value: 'descending',
				text: 'Descending'
			},
		]
		
		const sortOptions = [
			{
				key: 'date_added',
				value: 'date_added',
				text: "Date Added"
			},
			{
				key: 'rarity',
				value: 'rarity',
				text: "Rarity"
			}						
		];
		
		if (this.context.player.playerData) {
			sortOptions.push({
				key: "owned_status",
				value: "owned_status",
				text: "Owned Status"
			})
		}

		return (
			<div>
				<div style={{display:"flex", flexDirection:"row", alignItems:"center"}}>
					<Label >Sort Crew: </Label>
					<Dropdown 
						style={{margin:"0 1em"}}
						value={this.state.sortBy}
						onChange={(e, { value }) => this.setSort(value as SortOptions)}
						placeholder='Sort crew...'
						options={sortOptions} />
					<Label>Direction: </Label>
					<Dropdown 
						style={{margin:"0 1em"}}
						value={this.state.direction}
						onChange={(e, { value }) => this.setSort(undefined, value as Direction)}
						placeholder='Sort crew...'
						options={directions} />
				</div>

			<Item.Group>
				{collections.map(collection => (
					<Item key={collection.name} id={encodeURIComponent(collection.name)} style={{display: "flex", flexDirection: window.innerWidth < DEFAULT_MOBILE_WIDTH ? 'column' : "row", alignItems: "center"}}>
						<Item.Image size='medium' className='ui segment' style={{border: "1px solid #7f7f7f7f", width: "300px", height: "100%", borderRadius: "6px"}} src={`${process.env.GATSBY_ASSETS_URL}${collection.image}`} />

						<Item.Content>
							<Item.Header>
								<div className='text' 
									style={{
										cursor: !!this.context.player.playerData ? 'pointer' : undefined										
										}}
									onClick={(e) => this.props.onClick ? this.props.onClick(collection.id) : null}>
									{collection.name}
								</div>
								<hr/>
							</Item.Header>
							<Item.Meta>
								<div className='text'>
									{formatColString(collection.description ?? "", undefined, 'ui label')}
								</div>
							</Item.Meta>
							<Item.Description>
								<b>Crew: </b>
								{collection.crew?.map(crew => {
									const mapped = allcrew?.find(c => c.symbol === crew);
									return (
										<Link key={crew} to={`/crew/${crew}/`} style={{color: CONFIG.RARITIES[mapped?.max_rarity ?? 0].color}}>
											{mapped?.name}
										</Link>
									)
								})
									.reduce((prev, curr) => <>{prev}, {curr}</>)}
							</Item.Description>
						</Item.Content>
					</Item>
				))}
				<br/><br/><br/>
			</Item.Group>			
			</div>
		);
	}
}

export default CollectionsOverviewComponent;
