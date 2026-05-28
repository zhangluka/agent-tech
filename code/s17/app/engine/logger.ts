/**
 * Build An Agent - s17: 错误恢复
 *
 * 执行日志记录器。
 * 在 s15 基础上增加了重试状态记录和节点状态重置。
 */

import type {
  NodeLog,
  NodeType,
  NodeStatus,
  NodeError,
  ExecutionRun,
  RunStatus,
  RetryAttempt,
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
      rolledBack: false,
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
      retryCount: 0,
      retryHistory: [],
    };
    this.run.nodeLogs.push(log);
    this.emit();
  }

  /** 节点执行成功 */
  finishNode(
    nodeId: string,
    output: unknown,
    retryCount?: number,
    retryHistory?: RetryAttempt[],
  ): void {
    const log = this.findLog(nodeId);
    if (!log) return;

    log.output = output;
    log.status = "success";
    log.finishedAt = Date.now();
    log.duration = log.finishedAt - log.startedAt;
    if (retryCount !== undefined) log.retryCount = retryCount;
    if (retryHistory) log.retryHistory = retryHistory;
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

  /** 节点被跳过 */
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
      retryCount: 0,
      retryHistory: [],
    };
    this.run.nodeLogs.push(log);
    this.emit();
  }

  /** 节点正在重试 */
  markRetrying(
    nodeId: string,
    error: NodeError,
    attempt: number,
    _delay: number,
  ): void {
    const log = this.findLog(nodeId);
    if (!log) return;

    log.status = "retrying";
    log.retryCount = attempt + 1;
    log.retryHistory.push({
      attempt,
      startedAt: Date.now(),
      finishedAt: Date.now(),
      error,
    });
    this.emit();
  }

  /**
   * 重置节点状态（用于回滚后清除已完成节点的状态）。
   * 把节点从 success/error 恢复到 pending。
   */
  resetNode(nodeId: string): void {
    const log = this.findLog(nodeId);
    if (!log) return;

    log.status = "pending";
    log.output = null;
    log.error = undefined;
    log.finishedAt = 0;
    log.duration = 0;
    log.retryCount = 0;
    log.retryHistory = [];
    this.emit();
  }

  /* ── 结束运行 ───────────────────────────── */

  finish(status: RunStatus, rolledBack: boolean = false): void {
    this.run.status = status;
    this.run.rolledBack = rolledBack;
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
