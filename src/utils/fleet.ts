import { Member } from "../model/fleet";
import { ExportField, printShortDistance, simplejson2csv } from "./misc";

export function exportMemberFields(): ExportField[] {
	return [
		{
			label: 'Name',
			value: (row: Member) => row.display_name
		},
		{
			label: 'Event Rank',
			value: (row: Member) => row.event_rank
		},
		{
			label: 'Squadron Rank',
			value: (row: Member) => row.squadron_event_rank
		},
		{
			label: 'Squadron',
			value: (row: Member) => row.squad
		},
		{
			label: 'Rank',
			value: (row: Member) => row.rank
		},
		{
			label: 'Dailies',
			value: (row: Member) => `${row.daily_meta_progress?.progress} / ${row.daily_meta_progress?.goal}\n(${row.daily_activity})`
		},
		{
			label: 'Last Active',
			value: (row: Member) => printShortDistance(undefined, row.last_active, true)
		},
		{
			label: 'Image',
			value: (row: Member) => row.crew_avatar.icon.file
		}
	];
}

export function exportMembers(items: Member[], clipboard?: boolean): string {
	return simplejson2csv(items, exportMemberFields(), clipboard ? "\t" : undefined);
}