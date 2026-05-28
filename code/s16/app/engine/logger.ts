/**
 * Build An Agent - s16: 权限与确认
 *
 * 执行日志记录器。
 * 在 s15 基础上新增 denyNode 方法，用于记录被权限拒绝的节点。
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

  finishNode(nodeId: string, output: unknown): void {
    const log = this.findLog(nodeId);
    if (!log) return;

    log.output = output;
    log.status = "success";
    log.finishedAt = Date.now();
    log.duration = log.finishedAt - log.startedAt;
    this.emit();
  }

  failNode(nodeId: string, error: NodeError): void {
    const log = this.findLog(nodeId);
    if (!log) return;

    log.error = error;
    log.status = "error";
    log.finishedAt = Date.now();
    log.duration = log.finishedAt - log.startedAt;
    this.emit();
  }

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

  /**
   * s16 新增：节点被权限系统拒绝。
   * 与 skipNode 不同，denied 表示用户主动拒绝了这个操作。
   */
  denyNode(nodeId: string, nodeType: NodeType): void {
    const log = this.findLog(nodeId);
    if (log) {
      log.status = "denied";
      log.error = { message: "权限不足：用户拒绝执行此工具" };
      log.finishedAt = Date.now();
      log.duration = log.finishedAt - log.startedAt;
    } else {
      // 如果还没 start，补一条
      this.run.nodeLogs.push({
        nodeId,
        nodeType,
        status: "denied",
        input: null,
        output: null,
        error: { message: "权限不足：用户拒绝执行此工具" },
        startedAt: Date.now(),
        finishedAt: Date.now(),
        duration: 0,
      });
    }
    this.emit();
  }

  /* ── 结束运行 ───────────────────────────── */

  finish(status: RunStatus): void {
    this.run.status = status;
    this.run.finishedAt = Date.now();
    this.run.duration = this.run.finishedAt - this.run.startedAt;
    this.emit();
  }

  getRun(): ExecutionRun {
    return { ...this.run };
  }

  get runId(): string {
    return this.run.id;
  }

  /* ── 事件监听 ───────────────────────────── */

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
