import { useCallback, useMemo } from 'react';
import {
  Background,
  ConnectionMode,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  type Connection,
  type Edge,
  type Node,
  type NodeProps,
  type XYPosition,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

export type ComponentKind = 'pump' | 'vessel' | 'tank' | 'heat_exchanger' | 'compressor' | 'column' | 'reactor' | 'valve' | 'instrument' | 'pipe';
export type PortDefinition = { id: string; label: string; direction: 'input' | 'output'; connection: 'process' | 'instrument'; multiple?: boolean };

export const PORTS: Record<ComponentKind, PortDefinition[]> = {
  pump: [{ id: 'inlet', label: 'Inlet', direction: 'input', connection: 'process' }, { id: 'outlet', label: 'Outlet', direction: 'output', connection: 'process' }],
  vessel: [{ id: 'inlet', label: 'Inlet', direction: 'input', connection: 'process', multiple: true }, { id: 'outlet', label: 'Outlet', direction: 'output', connection: 'process', multiple: true }],
  tank: [{ id: 'inlet', label: 'Inlet', direction: 'input', connection: 'process', multiple: true }, { id: 'outlet', label: 'Outlet', direction: 'output', connection: 'process', multiple: true }],
  heat_exchanger: [{ id: 'process_inlet', label: 'Process in', direction: 'input', connection: 'process' }, { id: 'process_outlet', label: 'Process out', direction: 'output', connection: 'process' }, { id: 'secondary_inlet', label: 'Secondary in', direction: 'input', connection: 'process' }, { id: 'secondary_outlet', label: 'Secondary out', direction: 'output', connection: 'process' }],
  compressor: [{ id: 'inlet', label: 'Suction', direction: 'input', connection: 'process' }, { id: 'outlet', label: 'Discharge', direction: 'output', connection: 'process' }],
  column: [{ id: 'feed', label: 'Feed', direction: 'input', connection: 'process' }, { id: 'overhead', label: 'Overhead', direction: 'output', connection: 'process' }, { id: 'bottoms', label: 'Bottoms', direction: 'output', connection: 'process' }],
  reactor: [{ id: 'feed', label: 'Feed', direction: 'input', connection: 'process' }, { id: 'product', label: 'Product', direction: 'output', connection: 'process' }],
  valve: [{ id: 'inlet', label: 'Inlet', direction: 'input', connection: 'process' }, { id: 'outlet', label: 'Outlet', direction: 'output', connection: 'process' }],
  instrument: [{ id: 'measurement', label: 'Measurement', direction: 'input', connection: 'instrument' }, { id: 'signal', label: 'Signal', direction: 'output', connection: 'instrument' }],
  pipe: [{ id: 'inlet', label: 'Inlet', direction: 'input', connection: 'process' }, { id: 'outlet', label: 'Outlet', direction: 'output', connection: 'process' }],
};

const title = (kind: string) => kind.replaceAll('_', ' ');
const portsFor = (node: Node) => PORTS[(node.data.kind || 'pipe') as ComponentKind] || PORTS.pipe;

type DiagramNodeData = { kind: ComponentKind; tag: string; label?: string };
type DiagramNodeModel = Node<DiagramNodeData>;
function DiagramNode({ data, selected }: NodeProps<DiagramNodeModel>) {
  const ports = PORTS[data.kind as ComponentKind] || PORTS.pipe;
  const inputs = ports.filter((port) => port.direction === 'input');
  const outputs = ports.filter((port) => port.direction === 'output');
  const portStyle = (index: number, length: number) => ({ top: `${((index + 1) / (length + 1)) * 100}%` });
  return <div className={`min-w-36 rounded border bg-bg-surface px-3 py-2 shadow ${selected ? 'border-accent-primary ring-2 ring-accent-primary/30' : 'border-accent-primary/50'}`}>
    {inputs.map((port, index) => <div key={port.id}><Handle id={port.id} type="target" position={Position.Left} style={portStyle(index, inputs.length)} className={port.connection === 'instrument' ? '!border-status-warning !bg-status-warning' : '!border-accent-primary !bg-accent-primary'} /></div>)}
    {outputs.map((port, index) => <div key={port.id}><Handle id={port.id} type="source" position={Position.Right} style={portStyle(index, outputs.length)} className={port.connection === 'instrument' ? '!border-status-warning !bg-status-warning' : '!border-accent-primary !bg-accent-primary'} /></div>)}
    <div className="font-mono text-center text-[11px] font-semibold text-accent-primary">{data.tag}</div>
    <div className="mt-1 text-center text-[10px] capitalize text-text-muted">{title(data.kind)}</div>
    <div className="mt-2 space-y-0.5 text-[8px] text-text-muted">{ports.map((port) => <div key={port.id} className="flex justify-between gap-2"><span>{port.direction === 'input' ? '←' : '→'} {port.label}</span>{port.connection === 'instrument' && <span className="text-status-warning">signal</span>}</div>)}</div>
  </div>;
}

const nodeTypes = { diagram: DiagramNode };

export type PidCanvasProps = {
  nodes: any[];
  connections: any[];
  onNodeMove: (id: string, position: XYPosition) => void;
  onConnect: (connection: Connection) => void;
  onSelectNode: (node: any | null) => void;
  onSelectConnection?: (connection: any | null) => void;
  onDeleteConnection?: (id: string) => void;
};

export function PidCanvas({ nodes, connections, onNodeMove, onConnect, onSelectNode, onSelectConnection, onDeleteConnection }: PidCanvasProps) {
  const flowNodes = useMemo<Node[]>(() => nodes.map((node) => ({ id: node.id, type: 'diagram', position: node.position || { x: 20, y: 20 }, data: { ...node } })), [nodes]);
  const flowEdges = useMemo<Edge[]>(() => connections.flatMap((connection) => {
    const source = nodes.find((node) => node.id === connection.source);
    const target = nodes.find((node) => node.id === connection.target);
    if (!source || !target) return [];
    const instrument = connection.type === 'instrument' || source.kind === 'instrument' || target.kind === 'instrument';
    return [{ id: connection.id, source: connection.source, target: connection.target, sourceHandle: connection.sourcePort, targetHandle: connection.targetPort, type: 'smoothstep', animated: false, style: { stroke: instrument ? '#f59e0b' : '#38bdf8', strokeWidth: 2, strokeDasharray: instrument ? '6 5' : undefined }, markerEnd: { type: MarkerType.ArrowClosed, color: instrument ? '#f59e0b' : '#38bdf8' }, data: connection }];
  }), [connections, nodes]);

  const portValid = useCallback((connection: Connection | Edge) => {
    if (!connection.source || !connection.target || connection.source === connection.target) return false;
    const sourceNode = flowNodes.find((node) => node.id === connection.source);
    const targetNode = flowNodes.find((node) => node.id === connection.target);
    const sourcePort = sourceNode && portsFor(sourceNode).find((port) => port.id === connection.sourceHandle);
    const targetPort = targetNode && portsFor(targetNode).find((port) => port.id === connection.targetHandle);
    if (!sourcePort || !targetPort || sourcePort.direction !== 'output' || targetPort.direction !== 'input') return false;
    if (sourcePort.connection !== targetPort.connection && sourcePort.connection !== 'instrument' && targetPort.connection !== 'instrument') return false;
    return !connections.some((edge) => edge.source === connection.source && edge.sourcePort === connection.sourceHandle && edge.target === connection.target && edge.targetPort === connection.targetHandle);
  }, [connections, flowNodes]);

  return <div className="h-[560px] rounded border border-dashed border-border-subtle bg-bg-primary" onKeyDown={(event) => { if (event.key === 'Delete') { const selected = flowEdges.find((edge) => edge.selected); if (selected) onDeleteConnection?.(selected.id); } }} tabIndex={0}>
    <ReactFlow nodes={flowNodes} edges={flowEdges} nodeTypes={nodeTypes} connectionMode={ConnectionMode.Strict} isValidConnection={portValid} fitView onConnect={onConnect} onNodeDragStop={(_, node) => onNodeMove(node.id, node.position)} onNodeClick={(_, node) => onSelectNode(nodes.find((item) => item.id === node.id) || null)} onPaneClick={() => onSelectNode(null)} onEdgeClick={(_, edge) => onSelectConnection?.(connections.find((item) => item.id === edge.id) || null)} onEdgeDoubleClick={(_, edge) => onDeleteConnection?.(edge.id)} defaultEdgeOptions={{ type: 'smoothstep' }}>
      <Background gap={20} size={1} color="#334155" /><Controls /><MiniMap nodeColor="#38bdf8" pannable zoomable />
    </ReactFlow>
  </div>;
}
