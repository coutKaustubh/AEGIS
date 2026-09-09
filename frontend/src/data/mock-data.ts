import type { Conversation, Message, AgentActivity, TaskInfo, Citation, GeneratedArtifact } from '@/types/chat';
import type { AgentExecution } from '@/types/agent';
import type { Document } from '@/types/document';
import type { Approval } from '@/types/approval';
import type { AuditRecord, VerificationResult } from '@/types/audit';
import type { SystemComponent, DashboardMetrics, RecentTask, SovereigntyMetrics, User } from '@/types/system';
import type { KnowledgeSearchResult } from '@/types/knowledge';

// ─── Current User ──────────────────────────────────────────────────────────────

export const mockUser: User = {
  id: 'usr-001',
  name: 'Rajesh Kumar',
  email: 'r.kumar@bharatpetro.gov.in',
  role: 'admin',
  department: 'Engineering',
  status: 'active',
};

// ─── Dashboard ─────────────────────────────────────────────────────────────────

export const mockDashboardMetrics: DashboardMetrics = {
  activeAiTasks: 3,
  documentsProcessed: 1247,
  knowledgeBaseDocuments: 856,
  pendingApprovals: 7,
};

export const mockRecentTasks: RecentTask[] = [
  { id: 'task-001', task: 'Inspection Report Analysis — Unit 4 Distillation Column', type: 'Document Analysis', status: 'completed', model: 'qwen3.5:9b', createdAt: '2026-09-03T14:30:00Z' },
  { id: 'task-002', task: 'Vendor Comparison — Valve Suppliers Q3', type: 'Comparison', status: 'running', model: 'qwen3.5:9b', createdAt: '2026-09-03T13:45:00Z' },
  { id: 'task-003', task: 'Safety Procedure Search — H2S Emergency Protocol', type: 'Knowledge Search', status: 'completed', model: 'qwen3.5:9b', createdAt: '2026-09-03T12:00:00Z' },
  { id: 'task-004', task: 'Pressure Loss Calculation — Pipeline Section 7B', type: 'Code Execution', status: 'failed', model: 'qwen3-coder:30b-a3b-q4_K_M', createdAt: '2026-09-03T11:15:00Z' },
  { id: 'task-005', task: 'Engineering Drawing Analysis — P&ID Revision 12', type: 'Vision Analysis', status: 'completed', model: 'LLaVA-13B', createdAt: '2026-09-03T10:00:00Z' },
  { id: 'task-006', task: 'Monthly Maintenance Summary — August 2026', type: 'Document Generation', status: 'pending', model: 'qwen3.5:9b', createdAt: '2026-09-03T09:30:00Z' },
];

export const mockSystemComponents: SystemComponent[] = [
  { id: 'llm', name: 'Local Ollama Models', status: 'operational', detail: 'Configured models loaded from AEGIS registry', lastChecked: '2026-09-03T14:55:00Z' },
  { id: 'vision', name: 'Vision Model', status: 'operational', detail: 'LLaVA-13B ready', lastChecked: '2026-09-03T14:55:00Z' },
  { id: 'ocr', name: 'OCR Engine', status: 'operational', detail: 'Tesseract + DocTR active', lastChecked: '2026-09-03T14:55:00Z' },
  { id: 'kb', name: 'Knowledge Base', status: 'operational', detail: '856 documents indexed', lastChecked: '2026-09-03T14:55:00Z' },
  { id: 'sandbox', name: 'Sandbox', status: 'warning', detail: 'High memory usage', lastChecked: '2026-09-03T14:55:00Z' },
  { id: 'audit', name: 'Audit Ledger', status: 'operational', detail: '4,832 records', lastChecked: '2026-09-03T14:55:00Z' },
];

export const mockSovereigntyMetrics: SovereigntyMetrics = {
  networkStatus: 'isolated',
  externalApiCalls: 0,
  cloudAiRequests: 0,
  externalDataTransfer: 0,
  localAiOperations: 14832,
  localOcrOperations: 3241,
  localRagQueries: 8947,
};

// ─── Conversations ─────────────────────────────────────────────────────────────

export const mockConversations: Conversation[] = [
  { id: 'conv-001', title: 'Inspection Report Analysis — Unit 4', taskType: 'Document Analysis', model: 'qwen3.5:9b', status: 'completed', createdAt: '2026-09-03T14:30:00Z', updatedAt: '2026-09-03T14:45:00Z', messageCount: 6 },
  { id: 'conv-002', title: 'Vendor Comparison — Valve Suppliers', taskType: 'Comparison', model: 'qwen3.5:9b', status: 'active', createdAt: '2026-09-03T13:45:00Z', updatedAt: '2026-09-03T14:50:00Z', messageCount: 4 },
  { id: 'conv-003', title: 'H2S Emergency Protocol Search', taskType: 'Knowledge Search', model: 'qwen3.5:9b', status: 'completed', createdAt: '2026-09-03T12:00:00Z', updatedAt: '2026-09-03T12:15:00Z', messageCount: 3 },
  { id: 'conv-004', title: 'Pipeline Pressure Calculation', taskType: 'Code Execution', model: 'qwen3-coder:30b-a3b-q4_K_M', status: 'failed', createdAt: '2026-09-03T11:15:00Z', updatedAt: '2026-09-03T11:20:00Z', messageCount: 2 },
  { id: 'conv-005', title: 'P&ID Drawing Analysis Rev.12', taskType: 'Vision Analysis', model: 'LLaVA-13B', status: 'completed', createdAt: '2026-09-03T10:00:00Z', updatedAt: '2026-09-03T10:30:00Z', messageCount: 5 },
];

export const mockMessages: Message[] = [
  {
    id: 'msg-001',
    role: 'user',
    content: 'Analyze the attached inspection report for Unit 4 distillation column. Identify any critical findings related to corrosion or structural integrity.',
    timestamp: '2026-09-03T14:30:00Z',
    attachments: [{ id: 'att-001', name: 'Unit4_Inspection_Report_Aug2026.pdf', type: 'document', size: 4500000 }],
  },
  {
    id: 'msg-002',
    role: 'assistant',
    content: `## Inspection Report Analysis — Unit 4 Distillation Column

### Critical Findings

**1. Corrosion Detected — Tray 14-18 Section**
- Measured wall thickness: **4.2mm** (minimum allowable: 5.0mm)
- Location: Upper section, trays 14 through 18
- Risk Level: **HIGH**
- Recommendation: Schedule repair within 30 days

**2. Weld Joint Deterioration — Bottom Head**
- Visual inspection shows surface cracking at weld joint WJ-04
- Ultrasonic testing recommended
- Risk Level: **MEDIUM**

**3. Insulation Damage — External Shell**
- Moisture ingress noted at elevation 12m to 15m
- CUI (Corrosion Under Insulation) risk
- Risk Level: **MEDIUM**

### Summary Statistics
| Parameter | Value |
|---|---|
| Overall Condition | Fair |
| Critical Findings | 1 |
| Medium Findings | 2 |
| Low Findings | 4 |
| Next Inspection Due | March 2027 |

### Recommended Actions
1. Immediate thickness measurement at trays 14-18
2. Schedule UT inspection for weld joint WJ-04
3. Remove and replace damaged insulation section
4. Update maintenance schedule in SAP`,
    timestamp: '2026-09-03T14:32:00Z',
    model: 'Mistral-7B',
    tokenCount: 847,
    latencyMs: 3200,
    citations: [
      { id: 'cit-001', documentName: 'Unit4_Inspection_Report_Aug2026.pdf', page: 3, relevance: 0.95, snippet: 'Wall thickness measurement at tray 14 shows 4.2mm...' },
      { id: 'cit-002', documentName: 'Unit4_Inspection_Report_Aug2026.pdf', page: 7, relevance: 0.88, snippet: 'Visual inspection of bottom head weld joints...' },
      { id: 'cit-003', documentName: 'Corrosion_Standards_BPCL.pdf', page: 12, relevance: 0.82, snippet: 'Minimum allowable wall thickness for carbon steel columns...' },
    ],
    toolCalls: [
      { id: 'tc-001', name: 'OCR Extract', status: 'completed', duration: 1200 },
      { id: 'tc-002', name: 'Knowledge Search', status: 'completed', duration: 800 },
      { id: 'tc-003', name: 'Document Analysis', status: 'completed', duration: 1800 },
    ],
  },
];

export const mockTaskInfo: TaskInfo = {
  id: 'task-001',
  type: 'Document Analysis',
  model: 'Mistral-7B',
  status: 'completed',
  startedAt: '2026-09-03T14:30:00Z',
  duration: '2m 15s',
};

export const mockAgentActivity: AgentActivity[] = [
  { id: 'act-001', action: 'Task classified', detail: 'Document Analysis — Technical Report', timestamp: '2026-09-03T14:30:01Z', status: 'completed' },
  { id: 'act-002', action: 'Plan created', detail: 'OCR → Knowledge Search → Analysis → Summary', timestamp: '2026-09-03T14:30:02Z', status: 'completed' },
  { id: 'act-003', action: 'OCR processing', detail: 'Extracted text from 12-page PDF', timestamp: '2026-09-03T14:30:05Z', status: 'completed' },
  { id: 'act-004', action: 'Knowledge search', detail: 'Queried corrosion standards database', timestamp: '2026-09-03T14:31:00Z', status: 'completed' },
  { id: 'act-005', action: 'Reasoning', detail: 'Cross-referencing findings with standards', timestamp: '2026-09-03T14:31:30Z', status: 'completed' },
  { id: 'act-006', action: 'Response generated', detail: 'Analysis report with 3 critical findings', timestamp: '2026-09-03T14:32:00Z', status: 'completed' },
];

export const mockCitations: Citation[] = [
  { id: 'cit-001', documentName: 'Unit4_Inspection_Report_Aug2026.pdf', page: 3, relevance: 0.95, snippet: 'Wall thickness measurement at tray 14 shows 4.2mm...' },
  { id: 'cit-002', documentName: 'Unit4_Inspection_Report_Aug2026.pdf', page: 7, relevance: 0.88, snippet: 'Visual inspection of bottom head weld joints reveals...' },
  { id: 'cit-003', documentName: 'Corrosion_Standards_BPCL.pdf', page: 12, relevance: 0.82, snippet: 'Minimum allowable wall thickness for carbon steel columns...' },
];

export const mockArtifacts: GeneratedArtifact[] = [
  { id: 'art-001', name: 'Inspection_Analysis_Unit4.docx', type: 'docx', size: 245000, hash: '0xa3f8c2d1e9b4' },
  { id: 'art-002', name: 'Findings_Summary.xlsx', type: 'xlsx', size: 89000, hash: '0xb7e1d4f2a8c3' },
];

// ─── Agent Executions ──────────────────────────────────────────────────────────

export const mockAgentExecutions: AgentExecution[] = [
  {
    id: 'exec-001',
    taskId: 'task-001',
    taskTitle: 'Inspection Report Analysis — Unit 4 Distillation Column',
    taskType: 'Document Analysis',
    status: 'completed',
    startedAt: '2026-09-03T14:30:00Z',
    completedAt: '2026-09-03T14:32:15Z',
    duration: '2m 15s',
    nodes: [
      { id: 'n1', name: 'User Request', type: 'user', status: 'completed', position: { x: 400, y: 0 } },
      { id: 'n2', name: 'Master Agent', type: 'master', status: 'completed', model: 'LLaMA-3-70B', duration: '0.3s', position: { x: 400, y: 100 } },
      { id: 'n3', name: 'Task Planning', type: 'planner', status: 'completed', duration: '0.5s', position: { x: 400, y: 200 } },
      { id: 'n4', name: 'OCR Processing', type: 'ocr', status: 'completed', tool: 'DocTR', duration: '12s', position: { x: 200, y: 320 } },
      { id: 'n5', name: 'Vision Analysis', type: 'vision', status: 'completed', model: 'LLaVA-13B', duration: '8s', position: { x: 600, y: 320 } },
      { id: 'n6', name: 'Knowledge Search', type: 'rag', status: 'completed', tool: 'Vector DB', duration: '2s', position: { x: 400, y: 440 } },
      { id: 'n7', name: 'Reasoning Model', type: 'reasoning', status: 'completed', model: 'Mistral-7B', duration: '18s', position: { x: 400, y: 560 } },
      { id: 'n8', name: 'Document Generation', type: 'document', status: 'completed', duration: '5s', position: { x: 400, y: 680 } },
      { id: 'n9', name: 'Human Review', type: 'review', status: 'completed', duration: '45s', position: { x: 400, y: 800 } },
      { id: 'n10', name: 'Blockchain Audit', type: 'blockchain', status: 'completed', duration: '1.2s', position: { x: 400, y: 920 } },
    ],
    edges: [
      { id: 'e1', source: 'n1', target: 'n2' },
      { id: 'e2', source: 'n2', target: 'n3' },
      { id: 'e3', source: 'n3', target: 'n4' },
      { id: 'e4', source: 'n3', target: 'n5' },
      { id: 'e5', source: 'n4', target: 'n6' },
      { id: 'e6', source: 'n5', target: 'n6' },
      { id: 'e7', source: 'n6', target: 'n7' },
      { id: 'e8', source: 'n7', target: 'n8' },
      { id: 'e9', source: 'n8', target: 'n9' },
      { id: 'e10', source: 'n9', target: 'n10' },
    ],
    timeline: [
      { id: 'tl-01', nodeId: 'n1', nodeName: 'User Request', action: 'Request received', timestamp: '2026-09-03T14:30:00Z', status: 'completed' },
      { id: 'tl-02', nodeId: 'n2', nodeName: 'Master Agent', action: 'Task classified as Document Analysis', timestamp: '2026-09-03T14:30:01Z', duration: '0.3s', status: 'completed' },
      { id: 'tl-03', nodeId: 'n3', nodeName: 'Task Planning', action: 'Plan: OCR → Vision → RAG → Reason → Generate', timestamp: '2026-09-03T14:30:01Z', duration: '0.5s', status: 'completed' },
      { id: 'tl-04', nodeId: 'n4', nodeName: 'OCR Processing', action: 'Extracted text from 12-page PDF', timestamp: '2026-09-03T14:30:02Z', duration: '12s', status: 'completed' },
      { id: 'tl-05', nodeId: 'n5', nodeName: 'Vision Analysis', action: 'Analyzed engineering diagrams', timestamp: '2026-09-03T14:30:02Z', duration: '8s', status: 'completed' },
      { id: 'tl-06', nodeId: 'n6', nodeName: 'Knowledge Search', action: 'Found 3 relevant documents', timestamp: '2026-09-03T14:30:14Z', duration: '2s', status: 'completed' },
      { id: 'tl-07', nodeId: 'n7', nodeName: 'Reasoning Model', action: 'Cross-referenced findings with standards', timestamp: '2026-09-03T14:30:16Z', duration: '18s', status: 'completed' },
      { id: 'tl-08', nodeId: 'n8', nodeName: 'Document Generation', action: 'Generated DOCX report', timestamp: '2026-09-03T14:30:34Z', duration: '5s', status: 'completed' },
      { id: 'tl-09', nodeId: 'n9', nodeName: 'Human Review', action: 'Approved by operator', timestamp: '2026-09-03T14:30:39Z', duration: '45s', status: 'completed' },
      { id: 'tl-10', nodeId: 'n10', nodeName: 'Blockchain Audit', action: 'Hash recorded on-chain', timestamp: '2026-09-03T14:31:24Z', duration: '1.2s', status: 'completed' },
    ],
  },
  {
    id: 'exec-002',
    taskId: 'task-002',
    taskTitle: 'Vendor Comparison — Valve Suppliers Q3',
    taskType: 'Comparison',
    status: 'running',
    startedAt: '2026-09-03T13:45:00Z',
    duration: '1h 5m',
    nodes: [
      { id: 'n1', name: 'User Request', type: 'user', status: 'completed', position: { x: 400, y: 0 } },
      { id: 'n2', name: 'Master Agent', type: 'master', status: 'completed', model: 'LLaMA-3-70B', position: { x: 400, y: 100 } },
      { id: 'n3', name: 'Task Planning', type: 'planner', status: 'completed', position: { x: 400, y: 200 } },
      { id: 'n4', name: 'Knowledge Search', type: 'rag', status: 'completed', position: { x: 400, y: 320 } },
      { id: 'n5', name: 'Reasoning Model', type: 'reasoning', status: 'running', model: 'LLaMA-3-70B', position: { x: 400, y: 440 } },
      { id: 'n6', name: 'Document Generation', type: 'document', status: 'pending', position: { x: 400, y: 560 } },
    ],
    edges: [
      { id: 'e1', source: 'n1', target: 'n2' },
      { id: 'e2', source: 'n2', target: 'n3' },
      { id: 'e3', source: 'n3', target: 'n4' },
      { id: 'e4', source: 'n4', target: 'n5' },
      { id: 'e5', source: 'n5', target: 'n6' },
    ],
    timeline: [
      { id: 'tl-01', nodeId: 'n1', nodeName: 'User Request', action: 'Request received', timestamp: '2026-09-03T13:45:00Z', status: 'completed' },
      { id: 'tl-02', nodeId: 'n2', nodeName: 'Master Agent', action: 'Task classified as Comparison', timestamp: '2026-09-03T13:45:01Z', status: 'completed' },
      { id: 'tl-03', nodeId: 'n4', nodeName: 'Knowledge Search', action: 'Searching vendor documents...', timestamp: '2026-09-03T13:45:05Z', status: 'completed' },
      { id: 'tl-04', nodeId: 'n5', nodeName: 'Reasoning Model', action: 'Comparing vendor specifications...', timestamp: '2026-09-03T14:48:00Z', status: 'running' },
    ],
  },
];

// ─── Documents ─────────────────────────────────────────────────────────────────

export const mockDocuments: Document[] = [
  {
    id: 'doc-001',
    name: 'Equipment Inspection Report — Unit 4 Distillation Column',
    type: 'pdf',
    department: 'Engineering',
    classification: 'CONFIDENTIAL',
    status: 'indexed',
    size: 4500000,
    pages: 12,
    uploadedAt: '2026-09-01T09:00:00Z',
    uploadedBy: 'Rajesh Kumar',
    hash: '0xa3f8c2d1e9b47f3a6c8d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1',
    ocrStatus: 'completed',
    ragStatus: 'indexed',
    aiAnalysis: {
      summary: 'Inspection report covering Unit 4 distillation column structural integrity assessment. Three findings identified: critical corrosion at trays 14-18, weld deterioration at bottom head, and insulation damage.',
      keyFindings: ['Critical wall thickness reduction at trays 14-18', 'Weld joint WJ-04 surface cracking', 'CUI risk at 12-15m elevation'],
      topics: ['Corrosion', 'Structural Integrity', 'Maintenance'],
      generatedAt: '2026-09-01T09:15:00Z',
      model: 'Mistral-7B',
    },
  },
  {
    id: 'doc-002',
    name: 'Safety Manual — H2S Emergency Response Procedures',
    type: 'pdf',
    department: 'Safety',
    classification: 'INTERNAL',
    status: 'indexed',
    size: 8900000,
    pages: 48,
    uploadedAt: '2026-08-15T10:30:00Z',
    uploadedBy: 'Priya Sharma',
    hash: '0xb7e1d4f2a8c39b6e5d4c3f2a1b0e9d8c7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2',
    ocrStatus: 'completed',
    ragStatus: 'indexed',
  },
  {
    id: 'doc-003',
    name: 'Standard Operating Procedure — Crude Distillation Unit Startup',
    type: 'pdf',
    department: 'Operations',
    classification: 'CONFIDENTIAL',
    status: 'indexed',
    size: 3200000,
    pages: 24,
    uploadedAt: '2026-08-10T08:00:00Z',
    uploadedBy: 'Amit Patel',
    hash: '0xc9d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2',
    ocrStatus: 'completed',
    ragStatus: 'indexed',
  },
  {
    id: 'doc-004',
    name: 'Maintenance Report — Compressor K-201 Overhaul',
    type: 'docx',
    department: 'Engineering',
    classification: 'INTERNAL',
    status: 'indexed',
    size: 1800000,
    pages: 8,
    uploadedAt: '2026-08-28T14:00:00Z',
    uploadedBy: 'Vikram Singh',
    hash: '0xd1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2',
    ocrStatus: 'not_required',
    ragStatus: 'indexed',
  },
  {
    id: 'doc-005',
    name: 'Vendor Comparison Report — Gate Valve Suppliers Q3 2026',
    type: 'xlsx',
    department: 'Procurement',
    classification: 'RESTRICTED',
    status: 'indexed',
    size: 560000,
    pages: 4,
    uploadedAt: '2026-08-25T11:00:00Z',
    uploadedBy: 'Sunita Devi',
    hash: '0xe3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4',
    ocrStatus: 'not_required',
    ragStatus: 'indexed',
  },
  {
    id: 'doc-006',
    name: 'Engineering Drawing — P&ID CDU Revision 12',
    type: 'dwg',
    department: 'Engineering',
    classification: 'RESTRICTED',
    status: 'indexed',
    size: 12500000,
    uploadedAt: '2026-08-20T09:30:00Z',
    uploadedBy: 'Rajesh Kumar',
    hash: '0xf5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6',
    ocrStatus: 'completed',
    ragStatus: 'indexed',
  },
  {
    id: 'doc-007',
    name: 'Board Approval Note — Capital Expenditure FY2027',
    type: 'pdf',
    department: 'Management',
    classification: 'RESTRICTED',
    status: 'processing',
    size: 2100000,
    pages: 6,
    uploadedAt: '2026-09-03T08:00:00Z',
    uploadedBy: 'Anand Mehta',
    hash: '0xa1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2',
    ocrStatus: 'pending',
    ragStatus: 'pending',
  },
];

// ─── Knowledge Base ────────────────────────────────────────────────────────────

export const mockKnowledgeResults: KnowledgeSearchResult[] = [
  { id: 'kr-001', documentId: 'doc-002', documentName: 'Safety Manual — H2S Emergency Response', department: 'Safety', relevantPages: [37, 38, 39], relevanceScore: 0.96, lastUpdated: '2026-08-15T10:30:00Z', snippet: 'In case of H2S detection above 10 ppm, immediately evacuate the area and activate the emergency response protocol...' },
  { id: 'kr-002', documentId: 'doc-003', documentName: 'SOP — Crude Distillation Unit Startup', department: 'Operations', relevantPages: [14, 15], relevanceScore: 0.89, lastUpdated: '2026-08-10T08:00:00Z', snippet: 'Pre-startup safety review checklist must be completed before initiating the CDU startup sequence...' },
  { id: 'kr-003', documentId: 'doc-001', documentName: 'Inspection Report — Unit 4', department: 'Engineering', relevantPages: [3, 7], relevanceScore: 0.84, lastUpdated: '2026-09-01T09:00:00Z', snippet: 'Wall thickness measurements indicate minimum values at tray section 14-18 requiring immediate attention...' },
  { id: 'kr-004', documentId: 'doc-004', documentName: 'Maintenance Report — Compressor K-201', department: 'Engineering', relevantPages: [2, 5], relevanceScore: 0.78, lastUpdated: '2026-08-28T14:00:00Z', snippet: 'Compressor K-201 overhaul completed. Replaced impeller and shaft seals. Vibration analysis within acceptable range...' },
];

// ─── Approvals ─────────────────────────────────────────────────────────────────

export const mockApprovals: Approval[] = [
  {
    id: 'apr-001',
    documentId: 'doc-001',
    documentName: 'AI Analysis — Unit 4 Inspection Report',
    requestType: 'AI-Generated Analysis',
    requestDetail: 'Automated inspection report analysis with critical findings and recommendations',
    generatedBy: 'AEGIS AI',
    model: 'Mistral-7B',
    reviewer: 'Rajesh Kumar',
    status: 'approved',
    createdAt: '2026-09-01T09:15:00Z',
    reviewedAt: '2026-09-01T10:00:00Z',
    reviewerComment: 'Analysis is accurate. Forwarding critical finding to maintenance team.',
    aiSummary: 'Analysis identified 3 findings: 1 critical (corrosion at trays 14-18), 2 medium (weld deterioration, insulation damage).',
    keyFindings: ['Critical wall thickness reduction at trays 14-18', 'Weld joint WJ-04 surface cracking', 'CUI risk at 12-15m elevation'],
    sources: [
      { documentName: 'Unit4_Inspection_Report_Aug2026.pdf', page: 3, relevance: 0.95, snippet: 'Wall thickness measurement at tray 14...' },
      { documentName: 'Corrosion_Standards_BPCL.pdf', page: 12, relevance: 0.82, snippet: 'Minimum allowable wall thickness...' },
    ],
    artifactHash: '0xa3f8c2d1e9b47f3a',
    blockchainTxHash: '0x7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8',
  },
  {
    id: 'apr-002',
    documentId: 'doc-005',
    documentName: 'AI Summary — Vendor Comparison Q3',
    requestType: 'AI-Generated Summary',
    requestDetail: 'Comparative analysis of valve suppliers for procurement decision',
    generatedBy: 'AEGIS AI',
    model: 'LLaMA-3-70B',
    status: 'pending',
    createdAt: '2026-09-03T13:50:00Z',
    aiSummary: 'Comparison of 4 vendors across price, delivery, quality certification, and past performance metrics.',
    keyFindings: ['Vendor A offers lowest price but longest lead time', 'Vendor C has best quality certifications', 'Vendor B recommended based on weighted scoring'],
  },
  {
    id: 'apr-003',
    documentId: 'doc-003',
    documentName: 'AI Update — CDU Startup SOP',
    requestType: 'AI-Suggested Edit',
    requestDetail: 'AI suggested updates to startup procedure based on recent incident reports',
    generatedBy: 'AEGIS AI',
    model: 'Mistral-7B',
    status: 'pending',
    createdAt: '2026-09-02T16:00:00Z',
  },
  {
    id: 'apr-004',
    documentId: 'doc-006',
    documentName: 'Vision Analysis — P&ID Rev.12',
    requestType: 'AI-Generated Analysis',
    requestDetail: 'Automated P&ID drawing analysis with equipment identification',
    generatedBy: 'AEGIS AI',
    model: 'LLaVA-13B',
    status: 'rejected',
    createdAt: '2026-08-20T10:00:00Z',
    reviewedAt: '2026-08-20T11:30:00Z',
    reviewer: 'Amit Patel',
    reviewerComment: 'Analysis missed several control valves in section 3. Needs re-analysis with higher resolution.',
  },
  {
    id: 'apr-005',
    documentId: 'doc-004',
    documentName: 'Maintenance Summary — K-201 Overhaul',
    requestType: 'AI-Generated Document',
    requestDetail: 'Auto-generated maintenance completion summary for records',
    generatedBy: 'AEGIS AI',
    model: 'Mistral-7B',
    status: 'revision',
    createdAt: '2026-08-28T15:00:00Z',
    reviewedAt: '2026-08-28T16:30:00Z',
    reviewer: 'Vikram Singh',
    reviewerComment: 'Include vibration analysis data in the summary. Also add bearing clearance measurements.',
  },
  {
    id: 'apr-006',
    documentId: 'doc-007',
    documentName: 'AI Analysis — CapEx FY2027',
    requestType: 'AI-Generated Analysis',
    requestDetail: 'Financial analysis of capital expenditure proposals',
    generatedBy: 'AEGIS AI',
    model: 'LLaMA-3-70B',
    status: 'pending',
    createdAt: '2026-09-03T08:30:00Z',
  },
  {
    id: 'apr-007',
    documentId: 'doc-002',
    documentName: 'Safety Procedure Update — H2S Protocol',
    requestType: 'AI-Suggested Edit',
    requestDetail: 'Updated emergency response thresholds based on latest OISD guidelines',
    generatedBy: 'AEGIS AI',
    model: 'Mistral-7B',
    status: 'pending',
    createdAt: '2026-09-03T07:00:00Z',
  },
];

// ─── Audit Records ─────────────────────────────────────────────────────────────

export const mockAuditRecords: AuditRecord[] = [
  { id: 'aud-001', artifactId: 'doc-001', artifactName: 'Unit 4 Inspection Report', action: 'DOCUMENT_UPLOADED', actor: 'Rajesh Kumar', timestamp: '2026-09-01T09:00:00Z', hash: '0xa3f8c2d1e9b47f3a6c8d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1', blockchainStatus: 'confirmed', transactionHash: '0x7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8', blockNumber: 18234567 },
  { id: 'aud-002', artifactId: 'doc-001', artifactName: 'Unit 4 Inspection Report', action: 'AI_ANALYSIS', actor: 'AEGIS AI', model: 'Mistral-7B', timestamp: '2026-09-01T09:15:00Z', hash: '0xb7e1d4f2a8c39b6e5d4c3f2a1b0e9d8c7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2', blockchainStatus: 'confirmed', transactionHash: '0x8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9', blockNumber: 18234568 },
  { id: 'aud-003', artifactId: 'art-001', artifactName: 'Inspection Analysis Report', action: 'DOCUMENT_GENERATED', actor: 'AEGIS AI', model: 'Mistral-7B', timestamp: '2026-09-01T09:16:00Z', hash: '0xc9d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2', blockchainStatus: 'confirmed', transactionHash: '0x9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0', blockNumber: 18234569 },
  { id: 'aud-004', artifactId: 'art-001', artifactName: 'Inspection Analysis Report', action: 'HUMAN_APPROVED', actor: 'Rajesh Kumar', timestamp: '2026-09-01T10:00:00Z', hash: '0xd1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2', blockchainStatus: 'confirmed', transactionHash: '0xa0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1', blockNumber: 18234570 },
  { id: 'aud-005', artifactId: 'doc-002', artifactName: 'Safety Manual — H2S', action: 'KNOWLEDGE_INDEXED', actor: 'AEGIS System', timestamp: '2026-08-15T10:35:00Z', hash: '0xe3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4', blockchainStatus: 'confirmed', transactionHash: '0xb1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2', blockNumber: 18234500 },
  { id: 'aud-006', artifactId: 'doc-006', artifactName: 'P&ID Rev.12', action: 'AI_ANALYSIS', actor: 'AEGIS AI', model: 'LLaVA-13B', timestamp: '2026-08-20T10:00:00Z', hash: '0xf5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6', blockchainStatus: 'confirmed', transactionHash: '0xc2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3', blockNumber: 18234520 },
  { id: 'aud-007', artifactId: 'doc-006', artifactName: 'P&ID Rev.12 Analysis', action: 'HUMAN_REJECTED', actor: 'Amit Patel', timestamp: '2026-08-20T11:30:00Z', hash: '0xa7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8', blockchainStatus: 'confirmed', transactionHash: '0xd3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4', blockNumber: 18234521 },
  { id: 'aud-008', artifactId: 'doc-007', artifactName: 'Board Approval Note', action: 'DOCUMENT_UPLOADED', actor: 'Anand Mehta', timestamp: '2026-09-03T08:00:00Z', hash: '0xa1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2', blockchainStatus: 'pending', transactionHash: '0xe4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5', blockNumber: 18234580 },
  { id: 'aud-009', artifactId: 'exec-001', artifactName: 'Agent Execution — Inspection Analysis', action: 'AGENT_EXECUTED', actor: 'AEGIS AI', model: 'Mistral-7B', timestamp: '2026-09-03T14:32:15Z', hash: '0xb2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3', blockchainStatus: 'confirmed', transactionHash: '0xf5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6', blockNumber: 18234585 },
  { id: 'aud-010', artifactId: 'art-001', artifactName: 'Inspection Analysis Report', action: 'ARTIFACT_VERIFIED', actor: 'Rajesh Kumar', timestamp: '2026-09-03T15:00:00Z', hash: '0xc3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4', blockchainStatus: 'confirmed', transactionHash: '0xa6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7', blockNumber: 18234590 },
];

// ─── Verification ──────────────────────────────────────────────────────────────

export const mockVerificationSuccess: VerificationResult = {
  artifactId: 'art-001',
  artifactName: 'Inspection_Analysis_Unit4.docx',
  localHash: '0xa3f8c2d1e9b47f3a6c8d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1',
  recordedHash: '0xa3f8c2d1e9b47f3a6c8d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1',
  match: true,
  blockchainNetwork: 'AEGIS Private Chain (MOCK)',
  transactionHash: '0x7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8',
  blockNumber: 18234567,
  timestamp: '2026-09-01T09:00:00Z',
  action: 'DOCUMENT_UPLOADED',
};

export const mockVerificationFailure: VerificationResult = {
  artifactId: 'art-002',
  artifactName: 'Findings_Summary.xlsx',
  localHash: '0xb7e1d4f2a8c39b6e5d4c3f2a1b0e9d8c7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2',
  recordedHash: '0xff00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff',
  match: false,
  blockchainNetwork: 'AEGIS Private Chain (MOCK)',
  transactionHash: '0x8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9',
  blockNumber: 18234568,
  timestamp: '2026-09-01T09:16:00Z',
  action: 'DOCUMENT_GENERATED',
};
