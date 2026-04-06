import { useState, useCallback } from 'react';

interface SearchResult {
    title: string;
    path: string;
    snippet: string;
}

const DOC_CONTENT: { title: string; path: string; keywords: string }[] = [
    {
        title: 'Introduction',
        path: '/docs',
        keywords: 'introduction overview what is decisionnode problem flat markdown files CLAUDE.md CURSORRULES semantic retrieval vector search structured scoped lifecycle architecture cli mcp two interfaces install npm'
    },
    {
        title: 'Quickstart',
        path: '/docs/quickstart',
        keywords: 'quickstart install init setup api key gemini add first decision scope rationale constraints search mcp connected'
    },
    {
        title: 'Installation',
        path: '/docs/installation',
        keywords: 'install npm npx global cli decide decisionnode decide-mcp binaries permission EACCES execution policy windows powershell'
    },
    {
        title: 'Configuration',
        path: '/docs/setup',
        keywords: 'configuration storage layout env gemini api key config.json vectors.json history activity multiple projects agent behavior strict relaxed threshold'
    },
    {
        title: 'Decision Nodes',
        path: '/docs/decisions',
        keywords: 'decision node structure fields id scope rationale constraints status active deprecated lifecycle json storage format global prefix'
    },
    {
        title: 'Context Engine',
        path: '/docs/context',
        keywords: 'context engine rag embedding vector cosine similarity search retrieval gemini gemini-embedding-001 vectors.json conflict detection 75% threshold local private deprecate activate delete'
    },
    {
        title: 'Common Workflows',
        path: '/docs/workflows',
        keywords: 'workflow search decide code new ai session global decisions deprecate activate export import migrate move between projects check embed clean'
    },
    {
        title: 'CLI Reference',
        path: '/docs/cli',
        keywords: 'cli reference commands decide init setup add list get search edit deprecate activate delete export import embed check clean history projects config delete-scope global inline flags -s -d -r -c'
    },
    {
        title: 'MCP Server',
        path: '/docs/mcp',
        keywords: 'mcp server model context protocol setup .mcp.json claude code cursor windsurf antigravity tools search_decisions list_decisions get_decision add_decision update_decision delete_decision get_history get_status list_projects agent behavior strict relaxed force conflict'
    },
];

export function useDocSearch() {
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isOpen, setIsOpen] = useState(false);

    const search = useCallback((query: string) => {
        if (!query.trim()) {
            setResults([]);
            return;
        }

        const terms = query.toLowerCase().split(/\s+/);
        const matches = DOC_CONTENT
            .map(doc => {
                const content = `${doc.title} ${doc.keywords}`.toLowerCase();
                const score = terms.reduce((acc, term) => {
                    if (doc.title.toLowerCase().includes(term)) return acc + 3;
                    if (content.includes(term)) return acc + 1;
                    return acc;
                }, 0);
                return { ...doc, score, snippet: doc.keywords.substring(0, 80) + '...' };
            })
            .filter(r => r.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 5);

        setResults(matches);
    }, []);

    return { results, search, isOpen, setIsOpen };
}
