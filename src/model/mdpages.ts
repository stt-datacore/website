

export interface MarkdownRoot {
    [key: string]: MarkdownEntry[];
    announcements: MarkdownEntry[];
    pages: MarkdownEntry[];
}

export interface MarkdownEntry {
    [key:string]: string | undefined;
    file: string;
    name?: string;
    title?: string;
    slug?: string;
    date?: string;
    content?: string;
}