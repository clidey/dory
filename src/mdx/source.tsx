type PathRange = {
    path: string;
    range: string;
};

type SourceProps = {
    url: string;
    branch?: string;
    paths: PathRange[];
};

export const Source = ({ url, branch = "main", paths }: SourceProps) => {
    const createSourceUrl = (path: string, range: string) => {
        const [start, end] = range.split('-');

        if (url.includes('github.com')) {
            return `${url}/blob/${branch}/${path}#L${start}${end ? `-L${end}` : ''}`;
        } else if (url.includes('bitbucket.org')) {
            return `${url}/src/${branch}/${path}#lines-${start}${end ? `:${end}` : ''}`;
        } else if (url.includes('gitlab.com')) {
            return `${url}/-/blob/${branch}/${path}#L${range.replace('-', '-')}`;
        }

        return url;
    };

    return (
        <div>
            <p className="text-sm text-slate-900 dark:text-white">Sources:</p>
            <ul className="list-none pl-0 flex flex-wrap gap-2 mt-2">
                {paths.map(({ path, range }) => (
                    <li key={path + range}>
                        <a
                            href={createSourceUrl(path, range)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded px-3 py-1 font-mono text-sm text-slate-700 dark:text-slate-400 hover:opacity-80 transition-colors border border-slate-200 dark:border-slate-700"
                        >
                            {path}
                            <span className="ml-2 opacity-70">{range}</span>
                        </a>
                    </li>
                ))}
            </ul>
        </div>
    );
};
