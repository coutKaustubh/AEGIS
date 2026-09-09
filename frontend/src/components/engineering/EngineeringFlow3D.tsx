import { useEffect, useRef, useState } from 'react';

export type FlowNode = { id: string; label: string; kind: string; status?: string; revision?: string; position?: { x: number; y: number } };

type Props = { nodes: FlowNode[]; selectedId?: string; onSelect: (node: FlowNode) => void; reducedMotion?: boolean };

/** Lightweight CSS-3D engineering graph. It is intentionally schematic, not a physical plant model. */
export function EngineeringFlow3D({ nodes, selectedId, onSelect, reducedMotion = false }: Props) {
  const [rotation, setRotation] = useState({ x: 58, y: -18 });
  const [zoom, setZoom] = useState(1);
  const drag = useRef<{ x: number; y: number } | null>(null);
  const [motion, setMotion] = useState(reducedMotion);
  useEffect(() => setMotion(reducedMotion), [reducedMotion]);
  const reset = () => { setRotation({ x: 58, y: -18 }); setZoom(1); };
  return <div className="relative overflow-hidden rounded-lg border border-border-subtle bg-[radial-gradient(circle_at_50%_30%,rgba(59,130,246,.12),transparent_55%),var(--color-bg-primary)]" onWheel={(event) => { event.preventDefault(); setZoom((value) => Math.min(1.8, Math.max(.55, value - event.deltaY * .001))); }} onPointerDown={(event) => { drag.current = { x: event.clientX, y: event.clientY }; event.currentTarget.setPointerCapture(event.pointerId); }} onPointerMove={(event) => { if (!drag.current) return; setRotation((value) => ({ x: value.x + (event.clientY - drag.current!.y) * .3, y: value.y + (event.clientX - drag.current!.x) * .3 })); drag.current = { x: event.clientX, y: event.clientY }; }} onPointerUp={() => { drag.current = null; }}>
    <div className="absolute left-3 top-3 z-10 flex items-center gap-2 text-[10px] text-text-muted"><span className="rounded border border-border-subtle bg-bg-surface/80 px-2 py-1">SCHEMATIC 3D FLOW · not to scale</span><button type="button" onClick={reset} className="rounded border border-border-subtle bg-bg-surface/80 px-2 py-1">Reset</button><button type="button" onClick={() => setMotion((value) => !value)} className="rounded border border-border-subtle bg-bg-surface/80 px-2 py-1">{motion ? 'Motion off' : 'Motion on'}</button></div>
    <div className="flex h-[360px] items-center justify-center [perspective:900px]" aria-label="Interactive engineering lifecycle 3D flow. Use the synchronized list for keyboard access.">
      <div className="relative h-[250px] w-[760px] max-w-[90%] transition-transform duration-150" style={{ transform: `scale(${zoom}) rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`, transformStyle: 'preserve-3d' }}>
        {nodes.map((node, index) => { const x = node.position?.x ?? (index % 6) * 125 + 15; const y = node.position?.y ?? Math.floor(index / 6) * 120 + 50; return <button type="button" key={node.id} onClick={(event) => { event.stopPropagation(); onSelect(node); }} title={`${node.label} · ${node.status || 'Draft'} · ${node.revision || 'REV-00'}`} className={`absolute w-28 rounded border px-2 py-2 text-left text-[10px] shadow-lg transition ${selectedId === node.id ? 'border-accent-primary bg-accent-primary/20 text-text-primary' : 'border-border-subtle bg-bg-surface/90 text-text-secondary'} ${motion ? 'hover:-translate-y-1' : ''}`} style={{ left: `${x}px`, top: `${y}px`, transform: 'translateZ(22px)' }}><span className="block truncate font-mono text-accent-primary">{node.label}</span><span className="block capitalize text-text-muted">{node.kind}</span><span className="block text-[9px]">{node.status || 'Draft'}</span></button>; })}
        {nodes.slice(0, -1).map((node, index) => <div aria-hidden="true" key={`link-${node.id}`} className={`pointer-events-none absolute h-px origin-left border-t ${motion ? 'border-accent-primary/60' : 'border-text-dim/40'}`} style={{ left: `${node.position?.x ?? (index % 6) * 125 + 70}px`, top: `${(node.position?.y ?? Math.floor(index / 6) * 120 + 70) + 30}px`, width: '110px', transform: 'translateZ(0) rotateZ(0deg)' }} />)}
      </div>
    </div>
    <div className="border-t border-border-subtle px-3 py-2 text-[10px] text-text-muted">Drag to orbit · wheel to zoom · select a node to focus the related engineering record. Reduced-motion and list views remain available.</div>
  </div>;
}
