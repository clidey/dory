import { useEffect, useRef } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'

interface LatexProps {
  children: string
}

export function Latex({ children }: LatexProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (containerRef.current) {
      try {
        katex.render(children, containerRef.current, {
          displayMode: true,
          throwOnError: false,
        })
      } catch (error) {
        console.error('Error rendering LaTeX:', error)
      }
    }
  }, [children])

  return <div ref={containerRef} className="my-4" />
}
