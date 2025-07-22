import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import classNames from 'classnames'
import { useEffect, useMemo, useRef, useState } from 'preact/compat'

function fixNodeLabelsWithSpecialChars(content: string): string {
    // Pattern to match node definitions with brackets containing special characters
    // Matches: NodeId[text content] where text content has special chars and isn't already quoted
    const nodePattern = /(\w+)\[([^\]"]*[(),\s][^\]"]*)\]/g;
    
    return content.replace(nodePattern, (match, nodeId, labelContent) => {
        // Only wrap in quotes if not already quoted and contains special characters
        if (!labelContent.startsWith('"') || !labelContent.endsWith('"')) {
            return `${nodeId}["${labelContent}"]`;
        }
        return match;
    });
}

export function MermaidRenderer({ content }: { content: string }) {
    const mermaidRef = useRef<HTMLDivElement>(null)
    const [isFullscreen, setIsFullscreen] = useState(false)
    const [isLoaded, setIsLoaded] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [isValid, setIsValid] = useState<boolean | null>(null)

    const diagramId = useMemo(() => `mermaid-${btoa(content).replace(/[^a-zA-Z0-9]/g, '').substring(0, 10)}`, [content])

    useEffect(() => {
        let mounted = true

        const renderMermaid = async () => {
            try {
                const mermaid = (await import('mermaid')).default
                
                if (!mounted || !mermaidRef.current) return

                mermaid.initialize({
                    startOnLoad: true,
                    theme: 'base',
                    themeVariables: {
                        fontSize: '14px',
                        nodePadding: 20,
                        notePadding: 15,
                        padding: 10,
                        nodeBorderRadius: 8,
                    },
                    flowchart: {
                        nodeSpacing: 50,
                        rankSpacing: 80,
                        padding: 20,
                        useMaxWidth: true,
                    },
                })

                if (mermaidRef.current) {
                    mermaidRef.current.innerHTML = ''
                }

                const contentWithoutStyle = content
                    .replace(/^\s*style .*$/gm, '')
                    .replace(/^\s*classDef .*$/gm, '')
                    .replace(/^\s*class .*$/gm, '');

                // Fix node labels with special characters by wrapping them in quotes
                const processedContent = fixNodeLabelsWithSpecialChars(contentWithoutStyle);

                // Validate the mermaid syntax first
                try {
                    await mermaid.parse(processedContent)
                    setIsValid(true)
                } catch (parseError) {
                    setIsValid(false)
                    if (mounted) {
                        setError(parseError instanceof Error ? parseError.message : 'Invalid diagram syntax')
                    }
                    return
                }
              
                const { svg } = await mermaid.render(diagramId, processedContent);

                if (mounted && mermaidRef.current) {
                    mermaidRef.current.innerHTML = svg
                    setIsLoaded(true)
                }
            } catch (err) {
                console.error('Mermaid rendering error:', err)
                if (mounted) {
                    setIsValid(false)
                    setError(err instanceof Error ? err.message : 'Failed to render diagram')
                }
            }
        }

        renderMermaid()

        return () => {
            mounted = false
        }
    }, [content, diagramId])

    const toggleFullscreen = () => {
        setIsFullscreen(!isFullscreen)
    }

    if (error || isValid === false) {
        return (
            <div className="mermaid-wrapper my-8">
                <div className="flex flex-col items-center justify-center py-12 px-6 text-center bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-2 border-dashed border-red-300 dark:border-red-700 rounded-lg">
                    <div className="w-16 h-16 mb-4 flex items-center justify-center bg-red-100 dark:bg-red-900/30 rounded-full">
                        <ExclamationTriangleIcon className="w-8 h-8 text-red-500" />
                    </div>
                    <h3 className="text-lg font-semibold text-red-700 dark:text-red-300 mb-2">
                        Diagram Syntax Error
                    </h3>
                    <p className="text-red-600 dark:text-red-400 mb-4 max-w-md">
                        The Mermaid diagram contains invalid syntax and cannot be rendered.
                    </p>
                    <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-md p-3 max-w-md">
                        <p className="text-sm text-red-700 dark:text-red-300 font-mono break-all">
                            {error}
                        </p>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="mermaid-wrapper my-8">
            {!isLoaded && (
                <div className="flex items-center justify-center py-8 text-gray-400">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    <span className="ml-2">Loading diagram...</span>
                </div>
            )}
            <div
                ref={mermaidRef}
                className={classNames('mermaid cursor-pointer transition-all duration-300 rounded-lg p-4 bg-white', {
                    'fixed inset-0 z-50 bg-black/90 flex items-center justify-center backdrop-blur-sm': isFullscreen,
                    'opacity-0': !isLoaded,
                    'opacity-100': isLoaded,
                })}
                onClick={toggleFullscreen}
            />
        </div>
    )
}
