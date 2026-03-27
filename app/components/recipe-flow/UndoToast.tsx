import { useEffect, useState } from 'react'
import { useRecipeFlowStore } from '~/stores/recipe-flow-store'
import { useT } from '~/hooks/useTranslation'

export function UndoToast() {
  const t = useT()
  const lastAddedNodeId = useRecipeFlowStore((s) => s.lastAddedNodeId)
  const undoLastAdd = useRecipeFlowStore((s) => s.undoLastAdd)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (lastAddedNodeId) {
      setVisible(true)
      const timer = setTimeout(() => {
        setVisible(false)
        useRecipeFlowStore.setState({ lastAddedNodeId: null })
      }, 5000)
      return () => clearTimeout(timer)
    } else {
      setVisible(false)
    }
  }, [lastAddedNodeId])

  if (!visible || !lastAddedNodeId) return null

  return (
    <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 bg-white border border-border rounded-xl shadow-lg px-4 py-2.5">
      <span className="text-sm text-foreground">{t('toast_node_added')}</span>
      <button
        type="button"
        onClick={() => {
          undoLastAdd()
          setVisible(false)
        }}
        className="text-sm font-semibold text-primary hover:text-primary/80 underline underline-offset-2"
      >
        {t('btn_undo')}
      </button>
    </div>
  )
}
