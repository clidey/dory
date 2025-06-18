import classNames from 'classnames'
import { useEffect, useMemo, useRef, useState } from 'preact/compat'

export function MermaidRenderer({ content }: { content: string }) {
    const mermaidRef = useRef<HTMLDivElement>(null)
    const [isFullscreen, setIsFullscreen] = useState(false)
    const [isLoaded, setIsLoaded] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const diagramId = useMemo(() => `mermaid-${btoa(content).replace(/[^a-zA-Z0-9]/g, '').substring(0, 10)}`, [content])

    useEffect(() => {
        let mounted = true

        const renderMermaid = async () => {
            try {
                const mermaid = (await import('mermaid')).default
                mermaid.initialize({ startOnLoad: true });

                if (!mounted || !mermaidRef.current) return

                mermaid.initialize({
                    startOnLoad: true,
                    theme: 'base',
                    themeVariables: {
                        fontSize: '14px',
                        nodePadding: 20,        // More padding inside nodes
                        notePadding: 15,
                        padding: 10,            // Diagram-wide padding
                        nodeBorderRadius: 8,    // Rounded corners for nodes
                    },
                    flowchart: {
                        nodeSpacing: 50,      // horizontal spacing between nodes
                        rankSpacing: 80,      // vertical spacing between layers
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
              
                const { svg } = await mermaid.render(diagramId, contentWithoutStyle);
                

                if (mounted && mermaidRef.current) {
                    mermaidRef.current.innerHTML = svg
                    setIsLoaded(true)
                }
            } catch (err) {
                console.error('Mermaid rendering error:', err)
                if (mounted) {
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

    if (error) {
        return (
            <div className="flex items-center justify-center py-8 text-red-400 bg-red-900/20 border border-red-800 rounded">
                <span>Error rendering diagram: {error}</span>
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
