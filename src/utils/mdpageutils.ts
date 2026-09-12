import { MarkdownEntry } from "../model/mdpages";

export function stripFrontMatter(md: string, excerpt?: boolean) {
    let parts = md.split('---\n');
    if (parts?.length && parts.length > 2) {
        let remainder = parts.slice(2).join('---\n');
        if (excerpt) {
            parts = remainder.split("<!-- end -->");
            if (parts.length >= 2) {
                return parts[0];
            }
        }
        else {
            parts = remainder.split("<!-- end -->");
            if (parts.length >= 2) {
                return parts.slice(1).join(" ");
            }
        }
        return remainder;
    }
    return md;
}

export function populateSlugs(mdInfo: MarkdownEntry[]) {
    for (let md of mdInfo) {
        if (md.file?.endsWith(".md")) {
            md.slug = md.file.slice(0, md.file.length - 3);
        }
        else if (md.file) {
            md.slug = md.file;
        }
        if (!md.name) md.name = md.slug;
        if (!md.title) md.title = md.name;
        if (md.date) (md.date as any) = new Date(md.date);
    }
    if (mdInfo.every(i => i.date)) {
        mdInfo.sort((a, b) => (b.date! as any).getTime() - (a.date! as any).getTime());
    }
}