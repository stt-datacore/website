import React, { PureComponent } from 'react';

import MissionCost from './missioncost';
import { EquipmentItemSource } from '../model/equipment';
import { Link } from 'gatsby';
import CONFIG from './CONFIG';
import { TinyStore } from '../utils/tiny';
import { GlobalContext } from '../context/globalcontext';
import { Quest } from '../model/missions';
import { ContinuumMission } from '../model/continuum';

type ItemSourcesProps = {
	item_sources: EquipmentItemSource[];
	continuum_mission?: ContinuumMission;
	brief?: boolean;
	refItem?: string;
	pageId?: string;
	briefLength?: number;
	farmFormat?: boolean;
};

interface ItemSourcesState {
	briefs: {
		dispute: boolean;
		battle: boolean;
		faction: boolean;
		cadet: boolean;
		continuum: boolean;
	}
}

class ItemSources extends PureComponent<ItemSourcesProps, ItemSourcesState> {
	static contextType = GlobalContext;
	declare context: React.ContextType<typeof GlobalContext>;

	private readonly tiny: TinyStore;

	constructor(props: ItemSourcesProps) {
		super(props);
		this.tiny = TinyStore.getStore((props.pageId ? props.pageId + "_" : "") + 'itemsources', true);

		const defstate = {
			briefs: {
				dispute: true,
				battle: true,
				faction: true,
				cadet: true,
				continuum: true
			}
		} as ItemSourcesState;
		this.state = this.tiny.getValue<ItemSourcesState>('whole_state', defstate) ?? defstate;
	}

	private readonly setBrief = (name: 'dispute' | 'battle' | 'faction' | 'cadet' | 'continuum', value: boolean) => {
		const newstate = structuredClone(this.state) as ItemSourcesState;
		newstate.briefs[name] = value;
		this.tiny.setValue('whole_state', newstate);
		window.setTimeout(() => {
			this.setState({ ... newstate });
		})

	}

	private readonly getBrief = (name: 'dispute' | 'battle' | 'faction' | 'cadet' | 'continuum') => {
		return this.state.briefs[name];
	}

	render() {
		const { t, tfmt } = this.context.localized;
		let disputeMissions = this.props.item_sources.filter(e => e.type === 0);
		let shipBattles = this.props.item_sources.filter(e => e.type === 2);
		let factions = this.props.item_sources.filter(e => e.type === 1);
		let cadets = this.props.item_sources.filter(e => e.type === 4);
		let continuum = this.props.item_sources.filter(e => e.type === 5);
		let cq = this.props.continuum_mission?.quests?.map(q => q.name!);

		const { brief, refItem, farmFormat: noHeading } = this.props;
		const briefLen = this.props.briefLength ?? 2;
		const briefSep = <>, </>;
		const briefSepInit = <>&nbsp;</>;
		const briefSepFinal = <><br /></>;
		const textDec = "";
		let res = [] as JSX.Element[];
		let eps = {} as {[key:string]: JSX.Element};

		if (this.context.core.episodes) {
			this.context.core.episodes.forEach(e => {
				let prefilter = e.quests.filter(f => f.challenges?.length || f.action === 'Enter Space Battle');
				let questidx = [] as { quest: Quest, index: number }[]

				questidx = prefilter.map((item, idx) => ({ quest: item, index: idx + 1}));

				if (e.symbol.startsWith("dispute_")) {
					questidx[questidx.length - 1].index--;
				}

				questidx.forEach(({ quest: q, index: idx}) => {
					let t = `${e.episode > 0 ? "(" + e.episode + ") " : ''}${e.episode_title ?? e.name}`;
					let n = `(${idx}) ${q.name}`;
					eps[q.symbol] = <>{t}: {noHeading && <><br />&nbsp;&#x21b3;&nbsp;</>}{n}</>;
				});
			});
		}

		const getEpName = (e: string) => {
			if (e in eps) {
				return eps[e];
			}
			return '';
		}

		if (disputeMissions.length > 0) {
			const isBriefed = this.getBrief('dispute');

			res.push(
				<p key={'disputeMissions'}>
					{!noHeading && <b style={{textDecoration: brief ? textDec : undefined}}>{t('item_source.missions')}: </b>}{brief && <>{briefSepInit}</>}
					{disputeMissions
						.slice(0, (brief && isBriefed) ? briefLen : undefined)
						.map((entry, idx) => (
							<MissionCost
								key={idx}
								hideCost={noHeading}
								mission_symbol={entry.mission_symbol}
								cost={entry.cost ?? 0}
								avg_cost={entry.avg_cost}
								name={getEpName(entry.mission_symbol ?? '') || entry.name}
								chance_grade={entry.chance_grade}
								mastery={entry.mastery ?? 0}
							/>
						))
						.reduce((prev, curr) => <>{prev}{brief && <>{briefSep}</> || <>{', '}</>}{curr}</>)}
					{refItem && brief && isBriefed && disputeMissions.length > briefLen && <><>{briefSepFinal}</><a style={{cursor: "pointer"}} onClick={(e) => this.setBrief('dispute', false)}>({t('global.show_n_more_ellipses', { n: `${disputeMissions.length - briefLen}` })})</a></>}
					{refItem && brief && !isBriefed && disputeMissions.length > briefLen && <><>{briefSepFinal}</><a style={{cursor: "pointer"}} onClick={(e) => this.setBrief('dispute', true)}>({t('global.show_less')})</a></>}
				</p>
			);
		}

		if (shipBattles.length > 0) {
			const isBriefed = this.getBrief('battle');

			res.push(
				<p key={'shipBattles'}>
					{!noHeading && <b style={{textDecoration: brief ? textDec : undefined}}>{t('item_source.ship_battles')}: </b>}{brief && <>{briefSepInit}</>}
					{shipBattles
						.slice(0, (brief && isBriefed) ? briefLen : undefined)
						.map((entry, idx) => (
							<MissionCost
								key={idx}
								hideCost={noHeading}
								mission_symbol={entry.mission_symbol}
								cost={entry.cost ?? 0}
								avg_cost={entry.avg_cost}
								name={getEpName(entry.mission_symbol ?? '') || entry.name}
								chance_grade={entry.chance_grade}
								mastery={entry.mastery ?? 0}
							/>
						))
						.reduce((prev, curr) => <>{prev}{brief && <>{briefSep}</> || <>{', '}</>}{curr}</>)}
					{refItem && brief && isBriefed && shipBattles.length > briefLen && <><>{briefSepFinal}</><a style={{cursor: "pointer"}} onClick={(e) => this.setBrief('battle', false)}>({t('global.show_n_more_ellipses', { n: `${shipBattles.length - briefLen}` })})</a></>}
					{refItem && brief && !isBriefed && shipBattles.length > briefLen && <><>{briefSepFinal}</><a style={{cursor: "pointer"}} onClick={(e) => this.setBrief('battle', true)}>({t('global.show_less')})</a></>}
				</p>
			);
		}

		if (factions.length > 0) {
			const isBriefed = this.getBrief('faction');

			res.push(
				<p key={'factions'}>
					{!noHeading && <b style={{textDecoration: brief ? textDec : undefined}}>{t('item_source.faction_missions')}: </b>}{brief && <>{briefSepInit}</>}
					{factions
						.slice(0, (brief && isBriefed) ? briefLen : undefined)
						.map((entry, idx) => noHeading ? <></> : <>{`${entry.name} (${entry.chance_grade}/5)`}</>)
						.reduce((prev, curr) => <>{prev}{brief && <>{briefSep}</> || <>{', '}</>}{curr}</>)}
					{refItem && brief && isBriefed && factions.length > briefLen && <><>{briefSepFinal}</><a style={{cursor: "pointer"}} onClick={(e) => this.setBrief('faction', false)}>({t('global.show_n_more_ellipses', { n: `${factions.length - briefLen}` })})</a></>}
					{refItem && brief && !isBriefed && factions.length > briefLen && <><>{briefSepFinal}</><a style={{cursor: "pointer"}} onClick={(e) => this.setBrief('faction', true)}>({t('global.show_less')})</a></>}
				</p>
			);
		}

		if (cadets.length > 0) {
			const isBriefed = this.getBrief('cadet');

			cadets.sort((a, b) => (a.avg_cost ?? 0) - (b.avg_cost ?? 0));
			res.push(
				<p key={'cadetMissions'}>
					{!noHeading && <b style={{textDecoration: brief ? textDec : undefined}}>{t('item_source.cadet_missions')}: </b>}{brief && <>{briefSepInit}</>}
					{cadets
						.slice(0, (brief && isBriefed) ? briefLen : undefined)
						.map((entry, idx) => (
							<MissionCost
								cadet={true}
								hideCost={noHeading}
								key={idx}
								mission_symbol={entry.mission_symbol}
								cost={entry.cost ?? 0}
								avg_cost={entry.avg_cost}
								name={`${entry.cadet_mission}: ${entry.name}`}
								chance_grade={entry.chance_grade}
								mastery={entry.mastery ?? 0}
							/>
						))
						.reduce((prev, curr) => <>{prev}{brief && <>{briefSep}</> || <>{', '}</>}{curr}</>)}
					{refItem && brief && isBriefed && cadets.length > briefLen && <><>{briefSepFinal}</><a style={{cursor: "pointer"}} onClick={(e) => this.setBrief('cadet', false)}>({t('global.show_n_more_ellipses', { n: `${cadets.length - briefLen}` })})</a></>}
					{refItem && brief && !isBriefed && cadets.length > briefLen && <><>{briefSepFinal}</><a style={{cursor: "pointer"}} onClick={(e) => this.setBrief('cadet', true)}>({t('global.show_less')})</a></>}
				</p>
			);
		}

		if (continuum.length > 0) {
			const isBriefed = this.getBrief('continuum');

			res.push(
				<p key={'continuumMissions'}>
					{!noHeading && <b style={{textDecoration: brief ? textDec : undefined}}>{t('mission_type.type_5')}: </b>}{brief && <>{briefSepInit}</>}
					{continuum
						.slice(0, (brief && isBriefed) ? briefLen : undefined)
						.map((entry, idx) => (
							<MissionCost
								continuum={true}
								key={idx}
								hideCost={noHeading}
								mission_symbol={entry.mission_symbol}
								cost={entry.cost ?? 0}
								avg_cost={entry.avg_cost}
								name={this.contFmt(entry.name, cq)}
								chance_grade={entry.chance_grade}
								mastery={entry.mastery ?? 0}
							/>
						))
						.reduce((prev, curr) => <>{prev}{brief && <>{briefSep}</> || <>{', '}</>}{curr}</>)}
					{refItem && brief && isBriefed && disputeMissions.length > briefLen && <><>{briefSepFinal}</><a style={{cursor: "pointer"}} onClick={(e) => this.setBrief('dispute', false)}>({t('global.show_n_more_ellipses', { n: `${disputeMissions.length - briefLen}` })})</a></>}
					{refItem && brief && !isBriefed && disputeMissions.length > briefLen && <><>{briefSepFinal}</><a style={{cursor: "pointer"}} onClick={(e) => this.setBrief('dispute', true)}>({t('global.show_less')})</a></>}
				</p>
			);
		}

		return res;
	}

	contFmt(name: string, cq?: string[]) {
		if (!cq) return name;
		let i = cq.indexOf(name);
		if (i !== -1) {
			return `(${i+1}) ${name}`;
		}
		return name;
	}
}

export default ItemSources;