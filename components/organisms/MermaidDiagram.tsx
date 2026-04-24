'use client'

import { useEffect, useId, useState, useCallback, type ReactElement } from 'react'
import mermaid from 'mermaid'
import { Button } from '@atoms/Button'

let mermaidInitialized = false

interface MermaidDiagramProps {
  source: string
  className?: string
}

export function MermaidDiagram({ source, className = '' }: MermaidDiagramProps): ReactElement {
  const [svg, setSvg] = useState<string>('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const uid = useId().replace(/:/g, '-')

  const closeModal = useCallback(() => {
    setIsModalOpen(false)
  }, [])

  useEffect(() => {
    async function doRender() {
      try {
        if (!mermaidInitialized) {
          mermaid.initialize({})
          mermaidInitialized = true
        }
        const id = `mermaid-${uid}`
        const result = await mermaid.render(id, source)
        setSvg(result.svg)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to render diagram')
        setSvg('')
      }
    }
    void doRender()
  }, [source])

  useEffect(() => {
    if (!isModalOpen) return

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' || e.key === 'Enter') {
        closeModal()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isModalOpen, closeModal])

  return (
    <>
      {/* Inline diagram with Enlarge button */}
      <div
        className={`relative my-4 rounded-xl border border-moss/20 bg-white w-full max-w-full overflow-hidden ${className}`}
      >
        <div className="absolute right-2 top-2 z-10">
          <Button type="button" onClick={() => setIsModalOpen(true)} variant="secondary" size="sm">
            Enlarge
          </Button>
        </div>
        {error ? (
          <div className="p-4 text-sm text-clay">Diagram error: {error}</div>
        ) : svg ? (
          <div dangerouslySetInnerHTML={{ __html: svg }} className="w-full" />
        ) : (
          <div className="flex w-full items-center justify-center p-8">
            <span className="text-sm text-ink/50">Rendering diagram...</span>
          </div>
        )}
      </div>

      {/* Full-screen modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/80 overflow-auto p-4"
          onClick={closeModal}
        >
          <div
            className="relative bg-white rounded-2xl shadow-2xl overflow-auto max-w-full max-h-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute right-2 top-2 z-10">
              <Button type="button" onClick={closeModal} variant="secondary" size="sm">
                Close
              </Button>
            </div>
            {svg ? (
              <div
                dangerouslySetInnerHTML={{ __html: svg }}
                className="[&_svg]:scale-[3]"
                style={{ minWidth: '200vw', minHeight: '200vh' }}
              />
            ) : (
              <div className="flex items-center justify-center p-16">
                <span className="text-sm text-ink/50">Rendering diagram...</span>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
