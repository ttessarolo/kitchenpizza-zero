import { useCallback } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  reconnectEdge,
  type EdgeTypes,
  type NodeMouseHandler,
  type EdgeMouseHandler,
  type OnReconnect,
  type Edge,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { customNodeTypes } from './nodes'
import { RecipeFlowEdge } from './edges/RecipeFlowEdge'
import { useRecipeFlowStore } from '~/stores/recipe-flow-store'
import { NodeContextToolbar } from './NodeContextToolbar'
import { UndoToast } from './UndoToast'
import { EdgeCallout } from './EdgeCallout'

const edgeTypes: EdgeTypes = {
  recipe: RecipeFlowEdge,
}

export function RecipeFlowCanvas() {
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

  const onNodeClick: NodeMouseHandler = useCallback(
    (event, node) => {
      if (event.metaKey) {
        if (peekNodeIds.includes(node.id)) {
          closePeek(node.id)
        } else {
          peekNode(node.id)
        }
      } else {
        expandNode(node.id)
      }
      selectEdge(null) // close edge callout when clicking a node
    },
    [expandNode, peekNode, closePeek, peekNodeIds, selectEdge],
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
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick}
        onReconnect={onReconnect}
        edgesReconnectable
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
