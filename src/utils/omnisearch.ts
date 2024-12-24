import { Filter } from "../model/game-elements";

export interface OmniSearchColumn {
    field: string;
    customMatch?: (fieldValue: any, text: string) => boolean;
}

export function omniSearchFilter<T>(item: T, filters: Filter[], filterType: string | null | undefined, fields: (string | OmniSearchColumn)[]): boolean {
	if (filters.length == 0 || !filterType) return true;

    const workfields = [] as OmniSearchColumn[];
    let c = fields.length;
    for (let i = 0; i < c; i++) {
        if (typeof fields[i] === 'string') {
            workfields.push({
                field: fields[i] as string
            });
        }
        else {
            workfields.push(fields[i] as OmniSearchColumn);
        }
    }

    function getValue(data: any, field: string) {
        if (!field) return data;
        let parts = field.split(".");
        for (let part of parts) {
            data = data[part];
            if (!data) break;
        }
        return data || '';
    }

    const filterTypes = {
        'Exact': (input: string, searchString: string) => input.toLowerCase() == searchString.toLowerCase(),
        'Whole word': (input: string, searchString: string) => new RegExp('\\b' + searchString + '\\b', 'i').test(input),
        'Any match': (input: string, searchString: string) => input.toLowerCase().indexOf(searchString.toLowerCase()) >= 0
    };
	const matchesFilter = filterTypes[filterType];
	let meetsAnyCondition = false;

	for (let filter of filters) {
		let meetsAllConditions = true;
		if ((filter.conditionArray?.length ?? 0) === 0) {
			// text search only
			for (let segment of filter.textSegments ?? []) {
				let segmentResult = workfields.some((field) => {
                    if (field.customMatch) {
                        return field.customMatch(getValue(item, field.field), segment.text);
                    }
                    else {
                        return matchesFilter(getValue(item, field.field), segment.text)
                    }
                });
				meetsAllConditions = meetsAllConditions && (segment.negated ? !segmentResult : segmentResult);
			}
		}
		if (meetsAllConditions) {
			meetsAnyCondition = true;
			break;
		}
	}

	return meetsAnyCondition;
}