/**
 * Build An Agent - s15: 执行日志
 *
 * 执行日志记录器。
 * 为每次工作流运行创建一个 ExecutionRun，
 * 记录每个节点的输入、输出、耗时和状态。
 */

import type {
  NodeLog,
  NodeType,
  NodeStatus,
  NodeError,
  ExecutionRun,
  RunStatus,
} from "./types";

export class ExecutionLogger {
  private run: ExecutionRun;
  private listeners: Array<(run: ExecutionRun) => void> = [];

  constructor(workflowId: string, workflowName: string) {
    this.run = {
      id: `run_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      workflowId,
      workflowName,
      status: "running",
      startedAt: Date.now(),
      finishedAt: 0,
      duration: 0,
      nodeLogs: [],
    };
  }

  /* ── 记录节点事件 ───────────────────────── */

  /** 节点开始执行 */
  startNode(nodeId: string, nodeType: NodeType, input: unknown): void {
    const log: NodeLog = {
      nodeId,
      nodeType,
      status: "running",
      input,
      output: null,
      startedAt: Date.now(),
      finishedAt: 0,
      duration: 0,
    };
    this.run.nodeLogs.push(log);
    this.emit();
  }

  /** 节点执行成功 */
  finishNode(nodeId: string, output: unknown): void {
    const log = this.findLog(nodeId);
    if (!log) return;

    log.output = output;
    log.status = "success";
    log.finishedAt = Date.now();
    log.duration = log.finishedAt - log.startedAt;
    this.emit();
  }

  /** 节点执行失败 */
  failNode(nodeId: string, error: NodeError): void {
    const log = this.findLog(nodeId);
    if (!log) return;

    log.error = error;
    log.status = "error";
    log.finishedAt = Date.now();
    log.duration = log.finishedAt - log.startedAt;
    this.emit();
  }

  /** 节点被跳过（条件分支未命中） */
  skipNode(nodeId: string, nodeType: NodeType): void {
    const log: NodeLog = {
      nodeId,
      nodeType,
      status: "skipped",
      input: null,
      output: null,
      startedAt: Date.now(),
      finishedAt: Date.now(),
      duration: 0,
    };
    this.run.nodeLogs.push(log);
    this.emit();
  }

  /* ── 结束运行 ───────────────────────────── */

  /** 标记整个运行完成 */
  finish(status: RunStatus): void {
    this.run.status = status;
    this.run.finishedAt = Date.now();
    this.run.duration = this.run.finishedAt - this.run.startedAt;
    this.emit();
  }

  /** 获取完整的运行记录 */
  getRun(): ExecutionRun {
    return { ...this.run };
  }

  get runId(): string {
    return this.run.id;
  }

  /* ── 事件监听 ───────────────────────────── */

  /** 注册监听器，每次日志更新时触发 */
  onUpdate(listener: (run: ExecutionRun) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  /* ── 私有方法 ───────────────────────────── */

  private findLog(nodeId: string): NodeLog | undefined {
    return this.run.nodeLogs.find((l) => l.nodeId === nodeId);
  }

  private emit(): void {
    const snapshot = this.getRun();
    this.listeners.forEach((l) => l(snapshot));
  }
}
