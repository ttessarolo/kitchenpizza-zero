import { useCallback, useState, useEffect } from 'react'
import { useT } from '~/hooks/useTranslation'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useReactFlow,
  type EdgeTypes,
  type NodeMouseHandler,
  type EdgeMouseHandler,
  type OnReconnect,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { customNodeTypes } from './nodes'
import { RecipeFlowEdge } from './edges/RecipeFlowEdge'
import { useRecipeFlowStore, selectGraph } from '~/stores/recipe-flow-store'
import { NodeContextToolbar } from './NodeContextToolbar'
import { UndoToast } from './UndoToast'
import { EdgeCallout } from './EdgeCallout'

const edgeTypes: EdgeTypes = {
  recipe: RecipeFlowEdge,
}

export function RecipeFlowCanvas() {
  const t = useT()
  const flowNodes = useRecipeFlowStore((s) => s.flowNodes)
  const flowEdges = useRecipeFlowStore((s) => s.flowEdges)
  const onNodesChange = useRecipeFlowStore((s) => s.onNodesChange)
  const onEdgesChange = useRecipeFlowStore((s) => s.onEdgesChange)
  const onConnect = useRecipeFlowStore((s) => s.onConnect)
  const expandNode = useRecipeFlowStore((s) => s.expandNode)
  const peekNode = useRecipeFlowStore((s) => s.peekNode)
  const closeAll = useRecipeFlowStore((s) => s.closeAll)
  const closePeek = useRecipeFlowStore((s) => s.closePeek)
  const peekNodeIds = useRecipeFlowStore((s) => s.peekNodeIds)
  const selectEdge = useRecipeFlowStore((s) => s.selectEdge)
  const layers = useRecipeFlowStore((s) => s.layers)
  const setActiveLayer = useRecipeFlowStore((s) => s.setActiveLayer)
  const resetRecipe = useRecipeFlowStore((s) => s.resetRecipe)
  const undo = useRecipeFlowStore((s) => s.undo)
  const canUndo = useRecipeFlowStore((s) => s.canUndo)
  const viewMode = useRecipeFlowStore((s) => s.viewMode)
  const hasNodes = useRecipeFlowStore((s) => selectGraph(s).nodes.length > 0)
  const isPanoramica = viewMode === 'panoramica'
  const { fitView } = useReactFlow()
  const [confirmReset, setConfirmReset] = useState(false)
  const [confirmUndo, setConfirmUndo] = useState(false)

  // Re-center viewport when switching between layer/panoramica
  useEffect(() => {
    const timer = setTimeout(() => fitView({ padding: 0.2, duration: 300 }), 50)
    return () => clearTimeout(timer)
  }, [viewMode, fitView])

  // CTRL+Z / CMD+Z keyboard shortcut
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        if (useRecipeFlowStore.getState().canUndo) {
          setConfirmUndo(true)
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleNodeClick: NodeMouseHandler = useCallback(
    (event, node) => {
      // Check if this is a dimmed node from an inactive layer (namespaced ID)
      if (node.id.includes(':')) {
        const layerId = node.id.split(':')[0]
        const layer = layers.find((l) => l.id === layerId)
        if (!layer || layer.locked) return

        if (event.metaKey || event.ctrlKey) {
          // CMD+click → Peek cross-layer node (DON'T switch layer)
          selectEdge(null)
          if (peekNodeIds.includes(node.id)) {
            closePeek(node.id)
          } else {
            peekNode(node.id)
          }
        } else {
          // Normal click → switch to that layer
          setActiveLayer(layerId)
        }
        return
      }

      // Active layer nodes
      selectEdge(null)
      if (event.metaKey || event.ctrlKey) {
        if (peekNodeIds.includes(node.id)) {
          closePeek(node.id)
        } else {
          peekNode(node.id)
        }
      } else {
        expandNode(node.id)
      }
    },
    [expandNode, peekNode, closePeek, peekNodeIds, selectEdge, layers, setActiveLayer],
  )

  const onEdgeClick: EdgeMouseHandler = useCallback(
    (event, edge) => {
      // Position callout near the click
      const canvasEl = (event.target as HTMLElement).closest('.react-flow')
      const rect = canvasEl?.getBoundingClientRect()
      const x = event.clientX - (rect?.left ?? 0)
      const y = event.clientY - (rect?.top ?? 0)
      selectEdge(edge.id, { x, y })
    },
    [selectEdge],
  )

  const onPaneClick = useCallback(() => {
    closeAll()
    selectEdge(null)
  }, [closeAll, selectEdge])

  // Handle edge reconnection (drag handle to re-route)
  const onReconnect: OnReconnect = useCallback(
    (oldEdge, newConnection) => {
      // Remove old edge from graph, add new one
      const store = useRecipeFlowStore.getState()
      store.removeEdge(oldEdge.id)
      store.onConnect(newConnection)
    },
    [],
  )

  return (
    <>
      <NodeContextToolbar />
      <UndoToast />
      <EdgeCallout />

      {/* Top-right buttons */}
      <div className="absolute top-2 right-2 z-10 flex items-center gap-1.5">
        {canUndo && (
          <button
            type="button"
            onClick={() => setConfirmUndo(true)}
            className="h-8 px-3 rounded-lg bg-white border border-border shadow-sm text-xs font-medium text-[#8a7a66] hover:bg-[#faf8f5] flex items-center gap-1"
            title={t('btn_undo_title')}
          >
            {t('btn_undo')}
          </button>
        )}
        {hasNodes && (
          <button
            type="button"
            onClick={() => setConfirmReset(true)}
            className="h-8 px-3 rounded-lg bg-white border border-border shadow-sm text-xs font-medium text-red-600 hover:bg-red-50 flex items-center gap-1"
          >
            {t('btn_restart')}
          </button>
        )}
      </div>

      {/* Confirm undo dialog */}
      {confirmUndo && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-xl shadow-xl p-5 max-w-sm mx-4">
            <div className="text-base font-bold text-foreground mb-2">{t('dialog_undo_title')}</div>
            <p className="text-sm text-muted-foreground mb-4">
              {t('dialog_undo_message')}
            </p>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setConfirmUndo(false)}
                className="text-sm px-4 py-2 rounded-lg border border-border hover:bg-[#faf8f5]"
              >
                {t('dialog_undo_keep')}
              </button>
              <button
                type="button"
                onClick={() => {
                  undo()
                  setConfirmUndo(false)
                }}
                className="text-sm font-bold px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90"
              >
                {t('dialog_undo_confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm reset dialog */}
      {confirmReset && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-xl shadow-xl p-5 max-w-sm mx-4">
            <div className="text-base font-bold text-foreground mb-2">{t('dialog_restart_title')}</div>
            <p className="text-sm text-muted-foreground mb-4">
              {t('dialog_restart_message')}
            </p>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="text-sm px-4 py-2 rounded-lg border border-border hover:bg-[#faf8f5]"
              >
                {t('btn_cancel')}
              </button>
              <button
                type="button"
                onClick={() => {
                  resetRecipe()
                  setConfirmReset(false)
                }}
                className="text-sm font-bold px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700"
              >
                {t('dialog_delete_all')}
              </button>
            </div>
          </div>
        </div>
      )}
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        onNodesChange={isPanoramica ? undefined : onNodesChange}
        onEdgesChange={isPanoramica ? undefined : onEdgesChange}
        onConnect={isPanoramica ? undefined : onConnect}
        onNodeClick={isPanoramica ? undefined : handleNodeClick}
        onEdgeClick={isPanoramica ? undefined : onEdgeClick}
        onPaneClick={isPanoramica ? undefined : onPaneClick}
        onReconnect={isPanoramica ? undefined : onReconnect}
        edgesReconnectable={!isPanoramica}
        nodesDraggable={!isPanoramica}
        nodesConnectable={!isPanoramica}
        elementsSelectable={!isPanoramica}
        nodeTypes={customNodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={{ type: 'recipe' }}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        proOptions={{ hideAttribution: true }}
        className="bg-[#faf8f5]"
      >
        <Background color="#e0d5c8" gap={20} size={1} />
        <Controls
          position="bottom-left"
          showInteractive={false}
          className="!bg-white !border-border !shadow-sm !rounded-lg"
        />
        <MiniMap
          position="bottom-right"
          nodeColor={(n) => {
            const type = n.type || 'dough'
            const colors: Record<string, string> = {
              pre_dough: '#f5eef8', pre_ferment: '#fef8eb', dough: '#eef0f5',
              rest: '#f5f0ea', rise: '#fef6ed', shape: '#f0eef5',
              pre_bake: '#fef5ee', bake: '#fdeee8', done: '#eaf5ea',
              post_bake: '#f5eef0', prep: '#edf7ed', split: '#f0e8f5', join: '#f0e8f5',
            }
            return colors[type] || '#eef0f5'
          }}
          className="!bg-white/80 !border-border !rounded-lg"
          maskColor="rgba(250,248,245,0.7)"
        />
      </ReactFlow>
    </>
  )
}
