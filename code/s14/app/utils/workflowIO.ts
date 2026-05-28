/**
 * workflowIO — 工作流序列化工具
 *
 * 三个核心能力：
 *   serialize   把 React Flow 的 nodes + edges 转成干净的 JSON
 *   deserialize 把 JSON 还原成 React Flow 可用的 nodes + edges
 *   validate    校验 JSON 结构是否合法
 *
 * 另外提供 localStorage 读写，实现本地工作流库。
 */

import type { Node, Edge } from "reactflow";

// ── 类型定义 ──────────────────────────────────────────────

export interface WorkflowMeta {
  id: string;
  name: string;
  description: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowJSON {
  meta: WorkflowMeta;
  nodes: SerializedNode[];
  edges: SerializedEdge[];
}

/** 节点只保留业务数据，position 由 React Flow 管理 */
export interface SerializedNode {
  id: string;
  type: string;
  data: Record<string, unknown>;
  position: { x: number; y: number };
}

/** 边只保留连接关系 */
export interface SerializedEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

// ── 当前 schema 版本 ─────────────────────────────────────

export const SCHEMA_VERSION = 1;

// ── 序列化 ────────────────────────────────────────────────

export function serialize(
  name: string,
  description: string,
  nodes: Node[],
  edges: Edge[],
  existingId?: string
): WorkflowJSON {
  return {
    meta: {
      id: existingId || generateId(),
      name,
      description,
      version: SCHEMA_VERSION,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    nodes: nodes.map((n) => ({
      id: n.id,
      type: n.type || "default",
      data: n.data ?? {},
      position: n.position,
    })),
    edges: edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle ?? undefined,
      targetHandle: e.targetHandle ?? undefined,
    })),
  };
}

// ── 反序列化 ──────────────────────────────────────────────

export function deserialize(json: WorkflowJSON): {
  nodes: Node[];
  edges: Edge[];
} {
  const nodes: Node[] = json.nodes.map((n) => ({
    id: n.id,
    type: n.type,
    data: n.data,
    position: n.position,
  }));

  const edges: Edge[] = json.edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    sourceHandle: e.sourceHandle,
    targetHandle: e.targetHandle,
  }));

  return { nodes, edges };
}

// ── 校验 ──────────────────────────────────────────────────

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validate(json: unknown): ValidationResult {
  if (!json || typeof json !== "object") {
    return { valid: false, error: "JSON 格式错误：不是对象" };
  }

  const obj = json as Record<string, unknown>;

  // 检查 meta
  if (!obj.meta || typeof obj.meta !== "object") {
    return { valid: false, error: "缺少 meta 字段" };
  }

  const meta = obj.meta as Record<string, unknown>;

  if (typeof meta.name !== "string" || meta.name.trim() === "") {
    return { valid: false, error: "meta.name 必须是非空字符串" };
  }

  if (typeof meta.version !== "number") {
    return { valid: false, error: "meta.version 必须是数字" };
  }

  if (meta.version > SCHEMA_VERSION) {
    return {
      valid: false,
      error: `版本不兼容：文件版本 ${meta.version}，当前支持 ${SCHEMA_VERSION}`,
    };
  }

  // 检查 nodes
  if (!Array.isArray(obj.nodes)) {
    return { valid: false, error: "缺少 nodes 数组" };
  }

  for (const node of obj.nodes as Record<string, unknown>[]) {
    if (typeof node.id !== "string") {
      return { valid: false, error: "节点缺少 id" };
    }
    if (typeof node.type !== "string") {
      return { valid: false, error: `节点 ${node.id} 缺少 type` };
    }
    const pos = node.position as Record<string, unknown> | undefined;
    if (!pos || typeof pos.x !== "number" || typeof pos.y !== "number") {
      return { valid: false, error: `节点 ${node.id} 的 position 格式错误` };
    }
  }

  // 检查 edges
  if (!Array.isArray(obj.edges)) {
    return { valid: false, error: "缺少 edges 数组" };
  }

  const nodeIds = new Set(
    (obj.nodes as Record<string, unknown>[]).map((n) => n.id)
  );

  for (const edge of obj.edges as Record<string, unknown>[]) {
    if (typeof edge.source !== "string" || !nodeIds.has(edge.source)) {
      return { valid: false, error: `边的 source "${edge.source}" 不存在` };
    }
    if (typeof edge.target !== "string" || !nodeIds.has(edge.target)) {
      return { valid: false, error: `边的 target "${edge.target}" 不存在` };
    }
  }

  return { valid: true };
}

// ── localStorage 工作流库 ─────────────────────────────────

const STORAGE_KEY = "agent-workflow-library";

export function saveToLibrary(workflow: WorkflowJSON): void {
  const library = loadLibrary();
  const idx = library.findIndex((w) => w.meta.id === workflow.meta.id);

  if (idx >= 0) {
    library[idx] = workflow;
  } else {
    library.push(workflow);
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(library));
}

export function loadLibrary(): WorkflowJSON[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as WorkflowJSON[];
  } catch {
    return [];
  }
}

export function deleteFromLibrary(id: string): void {
  const library = loadLibrary().filter((w) => w.meta.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(library));
}

// ── 工具函数 ──────────────────────────────────────────────

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/** 触发浏览器下载 */
export function downloadJSON(workflow: WorkflowJSON): void {
  const blob = new Blob([JSON.stringify(workflow, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${workflow.meta.name || "workflow"}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/** 读取上传的 JSON 文件 */
export function readUploadedFile(file: File): Promise<WorkflowJSON> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        resolve(JSON.parse(reader.result as string) as WorkflowJSON);
      } catch {
        reject(new Error("文件不是合法的 JSON"));
      }
    };
    reader.onerror = () => reject(new Error("文件读取失败"));
    reader.readAsText(file);
  });
}
