/**
 * Build An Agent - s17: 错误恢复
 *
 * 状态快照与回滚。
 *
 * 在工作流执行前拍一张"快照"，记录当前的执行上下文。
 * 如果执行中途失败且无法恢复，可以把状态恢复到快照时刻——
 * 就像游戏的存档读档。
 *
 * 为什么需要这个？
 *   - 工作流可能执行了一半，部分节点已经修改了上下文
 *   - 如果不回滚，下次执行时上下文是脏的（包含上次半成品的结果）
 *   - 回滚到快照状态，确保下次执行从一个干净的起点开始
 */

import type { WorkflowSnapshot, WorkflowNode, WorkflowEdge, NodeLog } from "./types";

/* ── 创建快照 ──────────────────────────────── */

/**
 * 在执行开始前调用，拍下当前状态的快照。
 *
 * @param context      当前的执行上下文（节点输出等）
 * @param workflowNodes 工作流节点列表（用于确定哪些节点需要记录）
 * @returns            一个不可变的快照对象
 */
export function takeSnapshot(
  context: Record<string, unknown>,
  workflowNodes?: WorkflowNode[],
): WorkflowSnapshot {
  // 深拷贝 context，确保快照不受后续修改影响
  const contextCopy = deepClone(context);

  // 提取每个节点的输出（如果有的话）
  const nodeOutputs: Record<string, unknown> = {};
  if (workflowNodes) {
    for (const node of workflowNodes) {
      if (node.id in contextCopy) {
        nodeOutputs[node.id] = contextCopy[node.id];
      }
    }
  }

  return {
    timestamp: Date.now(),
    context: contextCopy,
    completedNodeIds: Object.keys(nodeOutputs),
    nodeOutputs,
  };
}

/* ── 恢复快照 ──────────────────────────────── */

/**
 * 从快照恢复执行上下文。
 *
 * 把 context 重置到快照时刻的状态，
 * 同时返回需要标记为"已跳过"的节点列表。
 *
 * @param snapshot     之前拍的快照
 * @param nodeLogs     当前执行的日志（用于判断哪些节点需要重置）
 * @returns            恢复后的上下文 + 需要重置的节点 ID 列表
 */
export function restoreSnapshot(
  snapshot: WorkflowSnapshot,
  nodeLogs: NodeLog[],
): {
  context: Record<string, unknown>;
  nodesToReset: string[];
} {
  // 恢复上下文：从快照的深拷贝中恢复
  const context = deepClone(snapshot.context);

  // 找出在快照之后开始执行的节点（需要重置状态）
  const nodesToReset: string[] = [];
  for (const log of nodeLogs) {
    if (log.startedAt > snapshot.timestamp) {
      nodesToReset.push(log.nodeId);
    }
  }

  return { context, nodesToReset };
}

/* ── 快照管理器 ────────────────────────────── */

/**
 * 管理多个快照的栈结构。
 * 支持多级回滚（回滚到上一个快照，而不是最早的那个）。
 */
export class SnapshotStack {
  private snapshots: WorkflowSnapshot[] = [];
  private maxSize: number;

  constructor(maxSize: number = 10) {
    this.maxSize = maxSize;
  }

  /**
   * 压入一个新快照。
   * 如果栈满了，丢弃最早的快照。
   */
  push(snapshot: WorkflowSnapshot): void {
    this.snapshots.push(snapshot);
    if (this.snapshots.length > this.maxSize) {
      this.snapshots.shift();
    }
  }

  /**
   * 弹出最近的快照（用于回滚）。
   * 如果栈为空，返回 null。
   */
  pop(): WorkflowSnapshot | null {
    return this.snapshots.pop() ?? null;
  }

  /**
   * 查看最近的快照但不弹出。
   */
  peek(): WorkflowSnapshot | null {
    return this.snapshots[this.snapshots.length - 1] ?? null;
  }

  /**
   * 栈中有多少个快照。
   */
  get size(): number {
    return this.snapshots.length;
  }

  /**
   * 清空所有快照。
   */
  clear(): void {
    this.snapshots = [];
  }
}

/* ── 辅助函数 ──────────────────────────────── */

/**
 * 深拷贝。用 JSON 序列化实现——简单够用，
 * 但不支持 undefined、函数、循环引用等。
 * 对于工作流上下文（纯数据）完全够用。
 */
function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== "object") return obj;
  return JSON.parse(JSON.stringify(obj));
}
