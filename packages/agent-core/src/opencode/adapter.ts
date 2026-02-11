import * as pty from 'node-pty';
nst safeCwd = this.currentSessionTempDir
import { EventEmitter } from 'events';
nst safeCwd = this.currentSessionTempDir
import fs from 'fs';
nst safeCwd = this.currentSessionTempDir
import path from 'path';
nst safeCwd = this.currentSessionTempDir
import { spawn } from 'child_process';
nst safeCwd = this.currentSessionTempDir
import { StreamParser } from './stream-parser.js';
nst safeCwd = this.currentSessionTempDir
import { OpenCodeLogWatcher, createLogWatcher, OpenCodeLogError } from './log-watcher.js';
nst safeCwd = this.currentSessionTempDir
import { CompletionEnforcer, CompletionEnforcerCallbacks } from './completion/index.js';
nst safeCwd = this.currentSessionTempDir
import { TempFilesManager, type TempFileInfo } from '../common/utils/temp-files-manager.js';
nst safeCwd = this.currentSessionTempDir
import type { TaskConfig, Task, TaskMessage, TaskResult } from '../common/types/task.js';
nst safeCwd = this.currentSessionTempDir
import type { OpenCodeMessage } from '../common/types/opencode.js';
nst safeCwd = this.currentSessionTempDir
import type { PermissionRequest } from '../common/types/permission.js';
nst safeCwd = this.currentSessionTempDir
import type { TodoItem } from '../common/types/todo.js';
nst safeCwd = this.currentSessionTempDir

nst safeCwd = this.currentSessionTempDir
export class OpenCodeCliNotFoundError extends Error {
nst safeCwd = this.currentSessionTempDir
  constructor() {
nst safeCwd = this.currentSessionTempDir
    super(
nst safeCwd = this.currentSessionTempDir
      'OpenCode CLI is not available. The bundled CLI may be missing or corrupted. Please reinstall the application.'
nst safeCwd = this.currentSessionTempDir
    );
nst safeCwd = this.currentSessionTempDir
    this.name = 'OpenCodeCliNotFoundError';
nst safeCwd = this.currentSessionTempDir
  }
nst safeCwd = this.currentSessionTempDir
}
nst safeCwd = this.currentSessionTempDir

nst safeCwd = this.currentSessionTempDir
export interface AdapterOptions {
nst safeCwd = this.currentSessionTempDir
  platform: NodeJS.Platform;
nst safeCwd = this.currentSessionTempDir
  isPackaged: boolean;
nst safeCwd = this.currentSessionTempDir
  tempPath: string;
nst safeCwd = this.currentSessionTempDir
  getCliCommand: () => { command: string; args: string[] };
nst safeCwd = this.currentSessionTempDir
  buildEnvironment: (taskId: string) => Promise<NodeJS.ProcessEnv>;
nst safeCwd = this.currentSessionTempDir
  buildCliArgs: (options: {
nst safeCwd = this.currentSessionTempDir
    prompt: string;
nst safeCwd = this.currentSessionTempDir
    sessionId?: string;
nst safeCwd = this.currentSessionTempDir
    selectedModel?: { provider: string; model: string } | null;
nst safeCwd = this.currentSessionTempDir
    attachments?: import('../common/types/task.js').TaskAttachment[];
nst safeCwd = this.currentSessionTempDir
    tempFiles?: TempFileInfo[];
nst safeCwd = this.currentSessionTempDir
  }) => Promise<string[]>;
nst safeCwd = this.currentSessionTempDir
  onBeforeStart?: () => Promise<void>;
nst safeCwd = this.currentSessionTempDir
  getModelDisplayName?: (modelId: string) => string;
nst safeCwd = this.currentSessionTempDir
}
nst safeCwd = this.currentSessionTempDir

nst safeCwd = this.currentSessionTempDir
export interface OpenCodeAdapterEvents {
nst safeCwd = this.currentSessionTempDir
  message: [OpenCodeMessage];
nst safeCwd = this.currentSessionTempDir
  'tool-use': [string, unknown];
nst safeCwd = this.currentSessionTempDir
  'tool-result': [string];
nst safeCwd = this.currentSessionTempDir
  'permission-request': [PermissionRequest];
nst safeCwd = this.currentSessionTempDir
  progress: [{ stage: string; message?: string; modelName?: string }];
nst safeCwd = this.currentSessionTempDir
  complete: [TaskResult];
nst safeCwd = this.currentSessionTempDir
  error: [Error];
nst safeCwd = this.currentSessionTempDir
  debug: [{ type: string; message: string; data?: unknown }];
nst safeCwd = this.currentSessionTempDir
  'todo:update': [TodoItem[]];
nst safeCwd = this.currentSessionTempDir
  'auth-error': [{ providerId: string; message: string }];
nst safeCwd = this.currentSessionTempDir
}
nst safeCwd = this.currentSessionTempDir

nst safeCwd = this.currentSessionTempDir
export class OpenCodeAdapter extends EventEmitter<OpenCodeAdapterEvents> {
nst safeCwd = this.currentSessionTempDir
  private ptyProcess: pty.IPty | null = null;
nst safeCwd = this.currentSessionTempDir
  private streamParser: StreamParser;
nst safeCwd = this.currentSessionTempDir
  private logWatcher: OpenCodeLogWatcher | null = null;
nst safeCwd = this.currentSessionTempDir
  private currentSessionId: string | null = null;
nst safeCwd = this.currentSessionTempDir
  private currentTaskId: string | null = null;
nst safeCwd = this.currentSessionTempDir
  private messages: TaskMessage[] = [];
nst safeCwd = this.currentSessionTempDir
  private hasCompleted: boolean = false;
nst safeCwd = this.currentSessionTempDir
  private isDisposed: boolean = false;
nst safeCwd = this.currentSessionTempDir
  private wasInterrupted: boolean = false;
nst safeCwd = this.currentSessionTempDir
  private completionEnforcer: CompletionEnforcer;
nst safeCwd = this.currentSessionTempDir
  private lastWorkingDirectory: string | undefined;
nst safeCwd = this.currentSessionTempDir
  private currentModelId: string | null = null;
nst safeCwd = this.currentSessionTempDir
  private waitingTransitionTimer: ReturnType<typeof setTimeout> | null = null;
nst safeCwd = this.currentSessionTempDir
  private hasReceivedFirstTool: boolean = false;
nst safeCwd = this.currentSessionTempDir
  private startTaskCalled: boolean = false;
nst safeCwd = this.currentSessionTempDir
  private options: AdapterOptions;
nst safeCwd = this.currentSessionTempDir
  private tempFilesManager: TempFilesManager;
nst safeCwd = this.currentSessionTempDir
  private tempFileInfos: TempFileInfo[] = [];
nst safeCwd = this.currentSessionTempDir
  private currentSessionTempDir: string | null = null;
nst safeCwd = this.currentSessionTempDir

nst safeCwd = this.currentSessionTempDir
  constructor(options: AdapterOptions, taskId?: string) {
nst safeCwd = this.currentSessionTempDir
    super();
nst safeCwd = this.currentSessionTempDir
    this.options = options;
nst safeCwd = this.currentSessionTempDir
    this.currentTaskId = taskId || null;
nst safeCwd = this.currentSessionTempDir
    this.streamParser = new StreamParser();
nst safeCwd = this.currentSessionTempDir
    this.completionEnforcer = this.createCompletionEnforcer();
nst safeCwd = this.currentSessionTempDir
    this.setupStreamParsing();
nst safeCwd = this.currentSessionTempDir
    this.setupLogWatcher();
nst safeCwd = this.currentSessionTempDir
    this.tempFilesManager = TempFilesManager.getInstance();
nst safeCwd = this.currentSessionTempDir
  }
nst safeCwd = this.currentSessionTempDir

nst safeCwd = this.currentSessionTempDir
  private createCompletionEnforcer(): CompletionEnforcer {
nst safeCwd = this.currentSessionTempDir
    const callbacks: CompletionEnforcerCallbacks = {
nst safeCwd = this.currentSessionTempDir
      onStartContinuation: async (prompt: string) => {
nst safeCwd = this.currentSessionTempDir
        await this.spawnSessionResumption(prompt);
nst safeCwd = this.currentSessionTempDir
      },
nst safeCwd = this.currentSessionTempDir
      onComplete: () => {
nst safeCwd = this.currentSessionTempDir
        this.hasCompleted = true;
nst safeCwd = this.currentSessionTempDir
        this.emit('complete', {
nst safeCwd = this.currentSessionTempDir
          status: 'success',
nst safeCwd = this.currentSessionTempDir
          sessionId: this.currentSessionId || undefined,
nst safeCwd = this.currentSessionTempDir
        });
nst safeCwd = this.currentSessionTempDir
      },
nst safeCwd = this.currentSessionTempDir
      onDebug: (type: string, message: string, data?: unknown) => {
nst safeCwd = this.currentSessionTempDir
        this.emit('debug', { type, message, data });
nst safeCwd = this.currentSessionTempDir
      },
nst safeCwd = this.currentSessionTempDir
    };
nst safeCwd = this.currentSessionTempDir
    return new CompletionEnforcer(callbacks);
nst safeCwd = this.currentSessionTempDir
  }
nst safeCwd = this.currentSessionTempDir

nst safeCwd = this.currentSessionTempDir
  private setupLogWatcher(): void {
nst safeCwd = this.currentSessionTempDir
    this.logWatcher = createLogWatcher();
nst safeCwd = this.currentSessionTempDir

nst safeCwd = this.currentSessionTempDir
    this.logWatcher.on('error', (error: OpenCodeLogError) => {
nst safeCwd = this.currentSessionTempDir
      if (!this.hasCompleted && this.ptyProcess) {
nst safeCwd = this.currentSessionTempDir
        console.log('[OpenCode Adapter] Log watcher detected error:', error.errorName);
nst safeCwd = this.currentSessionTempDir

nst safeCwd = this.currentSessionTempDir
        const errorMessage = OpenCodeLogWatcher.getErrorMessage(error);
nst safeCwd = this.currentSessionTempDir

nst safeCwd = this.currentSessionTempDir
        this.emit('debug', {
nst safeCwd = this.currentSessionTempDir
          type: 'error',
nst safeCwd = this.currentSessionTempDir
          message: `[${error.errorName}] ${errorMessage}`,
nst safeCwd = this.currentSessionTempDir
          data: {
nst safeCwd = this.currentSessionTempDir
            errorName: error.errorName,
nst safeCwd = this.currentSessionTempDir
            statusCode: error.statusCode,
nst safeCwd = this.currentSessionTempDir
            providerID: error.providerID,
nst safeCwd = this.currentSessionTempDir
            modelID: error.modelID,
nst safeCwd = this.currentSessionTempDir
            message: error.message,
nst safeCwd = this.currentSessionTempDir
          },
nst safeCwd = this.currentSessionTempDir
        });
nst safeCwd = this.currentSessionTempDir

nst safeCwd = this.currentSessionTempDir
        if (error.isAuthError && error.providerID) {
nst safeCwd = this.currentSessionTempDir
          console.log('[OpenCode Adapter] Emitting auth-error for provider:', error.providerID);
nst safeCwd = this.currentSessionTempDir
          this.emit('auth-error', {
nst safeCwd = this.currentSessionTempDir
            providerId: error.providerID,
nst safeCwd = this.currentSessionTempDir
            message: errorMessage,
nst safeCwd = this.currentSessionTempDir
          });
nst safeCwd = this.currentSessionTempDir
        }
nst safeCwd = this.currentSessionTempDir

nst safeCwd = this.currentSessionTempDir
        this.hasCompleted = true;
nst safeCwd = this.currentSessionTempDir
        this.emit('complete', {
nst safeCwd = this.currentSessionTempDir
          status: 'error',
nst safeCwd = this.currentSessionTempDir
          sessionId: this.currentSessionId || undefined,
nst safeCwd = this.currentSessionTempDir
          error: errorMessage,
nst safeCwd = this.currentSessionTempDir
        });
nst safeCwd = this.currentSessionTempDir

nst safeCwd = this.currentSessionTempDir
        if (this.ptyProcess) {
nst safeCwd = this.currentSessionTempDir
          try {
nst safeCwd = this.currentSessionTempDir
            this.ptyProcess.kill();
nst safeCwd = this.currentSessionTempDir
          } catch (err) {
nst safeCwd = this.currentSessionTempDir
            console.warn('[OpenCode Adapter] Error killing PTY after log error:', err);
nst safeCwd = this.currentSessionTempDir
          }
nst safeCwd = this.currentSessionTempDir
          this.ptyProcess = null;
nst safeCwd = this.currentSessionTempDir
        }
nst safeCwd = this.currentSessionTempDir
      }
nst safeCwd = this.currentSessionTempDir
    });
nst safeCwd = this.currentSessionTempDir
  }
nst safeCwd = this.currentSessionTempDir

nst safeCwd = this.currentSessionTempDir
  async startTask(config: TaskConfig): Promise<Task> {
nst safeCwd = this.currentSessionTempDir
    if (this.isDisposed) {
nst safeCwd = this.currentSessionTempDir
      throw new Error('Adapter has been disposed and cannot start new tasks');
nst safeCwd = this.currentSessionTempDir
    }
nst safeCwd = this.currentSessionTempDir

nst safeCwd = this.currentSessionTempDir
    const taskId = config.taskId || this.generateTaskId();
nst safeCwd = this.currentSessionTempDir
    this.currentTaskId = taskId;
nst safeCwd = this.currentSessionTempDir
    this.currentSessionId = null;
nst safeCwd = this.currentSessionTempDir
    this.currentModelId = config.modelId || null;
nst safeCwd = this.currentSessionTempDir
    this.messages = [];
nst safeCwd = this.currentSessionTempDir
    this.streamParser.reset();
nst safeCwd = this.currentSessionTempDir
    this.hasCompleted = false;
nst safeCwd = this.currentSessionTempDir
    this.wasInterrupted = false;
nst safeCwd = this.currentSessionTempDir
    this.completionEnforcer.reset();
nst safeCwd = this.currentSessionTempDir
    this.lastWorkingDirectory = config.workingDirectory;
nst safeCwd = this.currentSessionTempDir
    this.currentSessionTempDir = null;
nst safeCwd = this.currentSessionTempDir
    this.hasReceivedFirstTool = false;
nst safeCwd = this.currentSessionTempDir
    this.startTaskCalled = false;
nst safeCwd = this.currentSessionTempDir
    if (this.waitingTransitionTimer) {
nst safeCwd = this.currentSessionTempDir
      clearTimeout(this.waitingTransitionTimer);
nst safeCwd = this.currentSessionTempDir
      this.waitingTransitionTimer = null;
nst safeCwd = this.currentSessionTempDir
    }
nst safeCwd = this.currentSessionTempDir

nst safeCwd = this.currentSessionTempDir
    // Reset temp file info from previous task
nst safeCwd = this.currentSessionTempDir
    this.tempFileInfos = [];
nst safeCwd = this.currentSessionTempDir
    this.currentSessionTempDir = null;
nst safeCwd = this.currentSessionTempDir

nst safeCwd = this.currentSessionTempDir
    // Create temporary files from attachments if present
nst safeCwd = this.currentSessionTempDir
    if (config.attachments && config.attachments.length > 0) {
nst safeCwd = this.currentSessionTempDir
      try {
nst safeCwd = this.currentSessionTempDir
        await this.tempFilesManager.initialize();
nst safeCwd = this.currentSessionTempDir
        this.tempFileInfos = await this.tempFilesManager.createTempFilesFromAttachments(
nst safeCwd = this.currentSessionTempDir
          taskId,
nst safeCwd = this.currentSessionTempDir
          config.attachments
nst safeCwd = this.currentSessionTempDir
        );
nst safeCwd = this.currentSessionTempDir
        this.currentSessionTempDir = this.tempFilesManager.getSessionPath(taskId);
nst safeCwd = this.currentSessionTempDir
        console.log(`[OpenCode Adapter] Created ${this.tempFileInfos.length} temp files for task ${taskId}`);
nst safeCwd = this.currentSessionTempDir
        console.log('[OpenCode Adapter] Temp file paths:', this.tempFileInfos.map(f => f.tempFilePath));
nst safeCwd = this.currentSessionTempDir
        console.log('[OpenCode Adapter] Session temp dir:', this.currentSessionTempDir);
nst safeCwd = this.currentSessionTempDir
      } catch (error) {
nst safeCwd = this.currentSessionTempDir
        console.error('[OpenCode Adapter] Failed to create temp files, continuing without them:', error);
nst safeCwd = this.currentSessionTempDir
        // Continue without temp files - the system will fall back to text-only context
nst safeCwd = this.currentSessionTempDir
      }
nst safeCwd = this.currentSessionTempDir
    } else {
nst safeCwd = this.currentSessionTempDir
      console.log('[OpenCode Adapter] No attachments to process for task', taskId);
nst safeCwd = this.currentSessionTempDir
    }
nst safeCwd = this.currentSessionTempDir

nst safeCwd = this.currentSessionTempDir
    if (this.logWatcher) {
nst safeCwd = this.currentSessionTempDir
      await this.logWatcher.start();
nst safeCwd = this.currentSessionTempDir
    }
nst safeCwd = this.currentSessionTempDir

nst safeCwd = this.currentSessionTempDir
    if (this.options.onBeforeStart) {
nst safeCwd = this.currentSessionTempDir
      await this.options.onBeforeStart();
nst safeCwd = this.currentSessionTempDir
    }
nst safeCwd = this.currentSessionTempDir

nst safeCwd = this.currentSessionTempDir
    const cliArgs = await this.options.buildCliArgs({
nst safeCwd = this.currentSessionTempDir
      prompt: config.prompt,
nst safeCwd = this.currentSessionTempDir
      sessionId: config.sessionId,
nst safeCwd = this.currentSessionTempDir
      selectedModel: this.currentModelId ? { provider: 'anthropic', model: this.currentModelId } : null,
nst safeCwd = this.currentSessionTempDir
      attachments: config.attachments,
nst safeCwd = this.currentSessionTempDir
      tempFiles: this.tempFileInfos,
nst safeCwd = this.currentSessionTempDir
    });
nst safeCwd = this.currentSessionTempDir

nst safeCwd = this.currentSessionTempDir
    const { command, args: baseArgs } = this.options.getCliCommand();
nst safeCwd = this.currentSessionTempDir
    const startMsg = `Starting: ${command} ${[...baseArgs, ...cliArgs].join(' ')}`;
nst safeCwd = this.currentSessionTempDir
    console.log('[OpenCode CLI]', startMsg);
nst safeCwd = this.currentSessionTempDir
    this.emit('debug', { type: 'info', message: startMsg });
nst safeCwd = this.currentSessionTempDir

nst safeCwd = this.currentSessionTempDir
    const env = await this.options.buildEnvironment(taskId);
nst safeCwd = this.currentSessionTempDir

nst safeCwd = this.currentSessionTempDir
    const allArgs = [...baseArgs, ...cliArgs];
nst safeCwd = this.currentSessionTempDir
    const cmdMsg = `Command: ${command}`;
nst safeCwd = this.currentSessionTempDir
    const argsMsg = `Args: ${allArgs.join(' ')}`;
nst safeCwd = this.currentSessionTempDir
    // Use session temp directory if attachments were created, otherwise use configured working directory
nst safeCwd = this.currentSessionTempDir
    const safeCwd = this.currentSessionTempDir || config.workingDirectory || this.options.tempPath;
nst safeCwd = this.currentSessionTempDir
    const cwdMsg = `Working directory: ${safeCwd}`;
nst safeCwd = this.currentSessionTempDir

nst safeCwd = this.currentSessionTempDir
    if (this.options.isPackaged && this.options.platform === 'win32') {
nst safeCwd = this.currentSessionTempDir
      const dummyPackageJson = path.join(safeCwd, 'package.json');
nst safeCwd = this.currentSessionTempDir
      if (!fs.existsSync(dummyPackageJson)) {
nst safeCwd = this.currentSessionTempDir
        try {
nst safeCwd = this.currentSessionTempDir
          fs.writeFileSync(dummyPackageJson, JSON.stringify({ name: 'opencode-workspace', private: true }, null, 2));
nst safeCwd = this.currentSessionTempDir
          console.log('[OpenCode CLI] Created workspace package.json at:', dummyPackageJson);
nst safeCwd = this.currentSessionTempDir
        } catch (err) {
nst safeCwd = this.currentSessionTempDir
          console.warn('[OpenCode CLI] Could not create workspace package.json:', err);
nst safeCwd = this.currentSessionTempDir
        }
nst safeCwd = this.currentSessionTempDir
      }
nst safeCwd = this.currentSessionTempDir
    }
nst safeCwd = this.currentSessionTempDir

nst safeCwd = this.currentSessionTempDir
    console.log('[OpenCode CLI]', cmdMsg);
nst safeCwd = this.currentSessionTempDir
    console.log('[OpenCode CLI]', argsMsg);
nst safeCwd = this.currentSessionTempDir
    console.log('[OpenCode CLI]', cwdMsg);
nst safeCwd = this.currentSessionTempDir

nst safeCwd = this.currentSessionTempDir
    this.emit('debug', { type: 'info', message: cmdMsg });
nst safeCwd = this.currentSessionTempDir
    this.emit('debug', { type: 'info', message: argsMsg, data: { args: allArgs } });
nst safeCwd = this.currentSessionTempDir
    this.emit('debug', { type: 'info', message: cwdMsg });
nst safeCwd = this.currentSessionTempDir

nst safeCwd = this.currentSessionTempDir
    {
nst safeCwd = this.currentSessionTempDir
      const fullCommand = this.buildShellCommand(command, allArgs);
nst safeCwd = this.currentSessionTempDir

nst safeCwd = this.currentSessionTempDir
      const shellCmdMsg = `Full shell command: ${fullCommand}`;
nst safeCwd = this.currentSessionTempDir
      console.log('[OpenCode CLI]', shellCmdMsg);
nst safeCwd = this.currentSessionTempDir
      this.emit('debug', { type: 'info', message: shellCmdMsg });
nst safeCwd = this.currentSessionTempDir

nst safeCwd = this.currentSessionTempDir
      const shellCmd = this.getPlatformShell();
nst safeCwd = this.currentSessionTempDir
      const shellArgs = this.getShellArgs(fullCommand);
nst safeCwd = this.currentSessionTempDir
      const shellMsg = `Using shell: ${shellCmd} ${shellArgs.join(' ')}`;
nst safeCwd = this.currentSessionTempDir
      console.log('[OpenCode CLI]', shellMsg);
nst safeCwd = this.currentSessionTempDir
      this.emit('debug', { type: 'info', message: shellMsg });
nst safeCwd = this.currentSessionTempDir

nst safeCwd = this.currentSessionTempDir
      this.ptyProcess = pty.spawn(shellCmd, shellArgs, {
nst safeCwd = this.currentSessionTempDir
        name: 'xterm-256color',
nst safeCwd = this.currentSessionTempDir
        cols: 32000,
nst safeCwd = this.currentSessionTempDir
        rows: 30,
nst safeCwd = this.currentSessionTempDir
        cwd: safeCwd,
nst safeCwd = this.currentSessionTempDir
        env: env as { [key: string]: string },
nst safeCwd = this.currentSessionTempDir
      });
nst safeCwd = this.currentSessionTempDir
      const pidMsg = `PTY Process PID: ${this.ptyProcess.pid}`;
nst safeCwd = this.currentSessionTempDir
      console.log('[OpenCode CLI]', pidMsg);
nst safeCwd = this.currentSessionTempDir
      this.emit('debug', { type: 'info', message: pidMsg });
nst safeCwd = this.currentSessionTempDir

nst safeCwd = this.currentSessionTempDir
      this.emit('progress', { stage: 'loading', message: 'Loading agent...' });
nst safeCwd = this.currentSessionTempDir

nst safeCwd = this.currentSessionTempDir
      this.ptyProcess.onData((data: string) => {
nst safeCwd = this.currentSessionTempDir
        const cleanData = data
nst safeCwd = this.currentSessionTempDir
          .replace(/\x1B\[[0-9;?]*[a-zA-Z]/g, '')
nst safeCwd = this.currentSessionTempDir
          .replace(/\x1B\][^\x07]*\x07/g, '')
nst safeCwd = this.currentSessionTempDir
          .replace(/\x1B\][^\x1B]*\x1B\\/g, '');
nst safeCwd = this.currentSessionTempDir
        if (cleanData.trim()) {
nst safeCwd = this.currentSessionTempDir
          const truncated = cleanData.substring(0, 500) + (cleanData.length > 500 ? '...' : '');
nst safeCwd = this.currentSessionTempDir
          console.log('[OpenCode CLI stdout]:', truncated);
nst safeCwd = this.currentSessionTempDir
          this.emit('debug', { type: 'stdout', message: cleanData });
nst safeCwd = this.currentSessionTempDir

nst safeCwd = this.currentSessionTempDir
          this.streamParser.feed(cleanData);
nst safeCwd = this.currentSessionTempDir
        }
nst safeCwd = this.currentSessionTempDir
      });
nst safeCwd = this.currentSessionTempDir

nst safeCwd = this.currentSessionTempDir
      this.ptyProcess.onExit(({ exitCode, signal }) => {
nst safeCwd = this.currentSessionTempDir
        const exitMsg = `PTY Process exited with code: ${exitCode}, signal: ${signal}`;
nst safeCwd = this.currentSessionTempDir
        console.log('[OpenCode CLI]', exitMsg);
nst safeCwd = this.currentSessionTempDir
        this.emit('debug', { type: 'exit', message: exitMsg, data: { exitCode, signal } });
nst safeCwd = this.currentSessionTempDir
        this.handleProcessExit(exitCode);
nst safeCwd = this.currentSessionTempDir
      });
nst safeCwd = this.currentSessionTempDir
    }
nst safeCwd = this.currentSessionTempDir

nst safeCwd = this.currentSessionTempDir
    return {
nst safeCwd = this.currentSessionTempDir
      id: taskId,
nst safeCwd = this.currentSessionTempDir
      prompt: config.prompt,
nst safeCwd = this.currentSessionTempDir
      status: 'running',
nst safeCwd = this.currentSessionTempDir
      messages: [],
nst safeCwd = this.currentSessionTempDir
      createdAt: new Date().toISOString(),
nst safeCwd = this.currentSessionTempDir
      startedAt: new Date().toISOString(),
nst safeCwd = this.currentSessionTempDir
    };
nst safeCwd = this.currentSessionTempDir
  }
nst safeCwd = this.currentSessionTempDir

nst safeCwd = this.currentSessionTempDir
  async resumeSession(sessionId: string, prompt: string): Promise<Task> {
nst safeCwd = this.currentSessionTempDir
    return this.startTask({
nst safeCwd = this.currentSessionTempDir
      prompt,
nst safeCwd = this.currentSessionTempDir
      sessionId,
nst safeCwd = this.currentSessionTempDir
    });
nst safeCwd = this.currentSessionTempDir
  }
nst safeCwd = this.currentSessionTempDir

nst safeCwd = this.currentSessionTempDir
  async sendResponse(response: string): Promise<void> {
nst safeCwd = this.currentSessionTempDir
    if (!this.ptyProcess) {
nst safeCwd = this.currentSessionTempDir
      throw new Error('No active process');
nst safeCwd = this.currentSessionTempDir
    }
nst safeCwd = this.currentSessionTempDir

nst safeCwd = this.currentSessionTempDir
    this.ptyProcess.write(response + '\n');
nst safeCwd = this.currentSessionTempDir
    console.log('[OpenCode CLI] Response sent via PTY');
nst safeCwd = this.currentSessionTempDir
  }
nst safeCwd = this.currentSessionTempDir

nst safeCwd = this.currentSessionTempDir
  async cancelTask(): Promise<void> {
nst safeCwd = this.currentSessionTempDir
    if (this.ptyProcess) {
nst safeCwd = this.currentSessionTempDir
      this.ptyProcess.kill();
nst safeCwd = this.currentSessionTempDir
      this.ptyProcess = null;
nst safeCwd = this.currentSessionTempDir
    }
nst safeCwd = this.currentSessionTempDir
  }
nst safeCwd = this.currentSessionTempDir

nst safeCwd = this.currentSessionTempDir
  async interruptTask(): Promise<void> {
nst safeCwd = this.currentSessionTempDir
    if (!this.ptyProcess) {
nst safeCwd = this.currentSessionTempDir
      console.log('[OpenCode CLI] No active process to interrupt');
nst safeCwd = this.currentSessionTempDir
      return;
nst safeCwd = this.currentSessionTempDir
    }
nst safeCwd = this.currentSessionTempDir

nst safeCwd = this.currentSessionTempDir
    this.wasInterrupted = true;
nst safeCwd = this.currentSessionTempDir

nst safeCwd = this.currentSessionTempDir
    this.ptyProcess.write('\x03');
nst safeCwd = this.currentSessionTempDir
    console.log('[OpenCode CLI] Sent Ctrl+C interrupt signal');
nst safeCwd = this.currentSessionTempDir

nst safeCwd = this.currentSessionTempDir
    if (this.options.platform === 'win32') {
nst safeCwd = this.currentSessionTempDir
      setTimeout(() => {
nst safeCwd = this.currentSessionTempDir
        if (this.ptyProcess) {
nst safeCwd = this.currentSessionTempDir
          this.ptyProcess.write('Y\n');
nst safeCwd = this.currentSessionTempDir
          console.log('[OpenCode CLI] Sent Y to confirm batch termination');
nst safeCwd = this.currentSessionTempDir
        }
nst safeCwd = this.currentSessionTempDir
      }, 100);
nst safeCwd = this.currentSessionTempDir
    }
nst safeCwd = this.currentSessionTempDir
  }
nst safeCwd = this.currentSessionTempDir

nst safeCwd = this.currentSessionTempDir
  getSessionId(): string | null {
nst safeCwd = this.currentSessionTempDir
    return this.currentSessionId;
nst safeCwd = this.currentSessionTempDir
  }
nst safeCwd = this.currentSessionTempDir

nst safeCwd = this.currentSessionTempDir
  getTaskId(): string | null {
nst safeCwd = this.currentSessionTempDir
    return this.currentTaskId;
nst safeCwd = this.currentSessionTempDir
  }
nst safeCwd = this.currentSessionTempDir

nst safeCwd = this.currentSessionTempDir
  get running(): boolean {
nst safeCwd = this.currentSessionTempDir
    return this.ptyProcess !== null && !this.hasCompleted;
nst safeCwd = this.currentSessionTempDir
  }
nst safeCwd = this.currentSessionTempDir

nst safeCwd = this.currentSessionTempDir
  isAdapterDisposed(): boolean {
nst safeCwd = this.currentSessionTempDir
    return this.isDisposed;
nst safeCwd = this.currentSessionTempDir
  }
nst safeCwd = this.currentSessionTempDir

nst safeCwd = this.currentSessionTempDir
  dispose(): void {
nst safeCwd = this.currentSessionTempDir
    if (this.isDisposed) {
nst safeCwd = this.currentSessionTempDir
      return;
nst safeCwd = this.currentSessionTempDir
    }
nst safeCwd = this.currentSessionTempDir

nst safeCwd = this.currentSessionTempDir
    console.log(`[OpenCode Adapter] Disposing adapter for task ${this.currentTaskId}`);
nst safeCwd = this.currentSessionTempDir
    this.isDisposed = true;
nst safeCwd = this.currentSessionTempDir

nst safeCwd = this.currentSessionTempDir
    if (this.logWatcher) {
nst safeCwd = this.currentSessionTempDir
      this.logWatcher.stop().catch((err) => {
nst safeCwd = this.currentSessionTempDir
        console.warn('[OpenCode Adapter] Error stopping log watcher:', err);
nst safeCwd = this.currentSessionTempDir
      });
nst safeCwd = this.currentSessionTempDir
    }
nst safeCwd = this.currentSessionTempDir

nst safeCwd = this.currentSessionTempDir
    if (this.ptyProcess) {
nst safeCwd = this.currentSessionTempDir
      try {
nst safeCwd = this.currentSessionTempDir
        this.ptyProcess.kill();
nst safeCwd = this.currentSessionTempDir
      } catch (error) {
nst safeCwd = this.currentSessionTempDir
        console.error('[OpenCode Adapter] Error killing PTY process:', error);
nst safeCwd = this.currentSessionTempDir
      }
nst safeCwd = this.currentSessionTempDir
      this.ptyProcess = null;
nst safeCwd = this.currentSessionTempDir
    }
nst safeCwd = this.currentSessionTempDir

nst safeCwd = this.currentSessionTempDir
    // Cleanup temporary files
nst safeCwd = this.currentSessionTempDir
    if (this.currentTaskId && this.tempFileInfos.length > 0) {
nst safeCwd = this.currentSessionTempDir
      const taskId = this.currentTaskId;
nst safeCwd = this.currentSessionTempDir
      // Don't await - cleanup in background
nst safeCwd = this.currentSessionTempDir
      this.tempFilesManager.cleanupSession(taskId).catch((err) => {
nst safeCwd = this.currentSessionTempDir
        console.warn(`[OpenCode Adapter] Failed to cleanup temp files for task ${taskId}:`, err);
nst safeCwd = this.currentSessionTempDir
      });
nst safeCwd = this.currentSessionTempDir
      console.log(`[OpenCode Adapter] Scheduled cleanup for ${this.tempFileInfos.length} temp files`);
nst safeCwd = this.currentSessionTempDir
    }
nst safeCwd = this.currentSessionTempDir

nst safeCwd = this.currentSessionTempDir
    this.currentSessionId = null;
nst safeCwd = this.currentSessionTempDir
    this.currentTaskId = null;
nst safeCwd = this.currentSessionTempDir
    this.currentSessionTempDir = null;
nst safeCwd = this.currentSessionTempDir
    this.tempFileInfos = [];
nst safeCwd = this.currentSessionTempDir
    this.messages = [];
nst safeCwd = this.currentSessionTempDir
    this.hasCompleted = true;
nst safeCwd = this.currentSessionTempDir
    this.currentModelId = null;
nst safeCwd = this.currentSessionTempDir
    this.hasReceivedFirstTool = false;
nst safeCwd = this.currentSessionTempDir
    this.startTaskCalled = false;
nst safeCwd = this.currentSessionTempDir

nst safeCwd = this.currentSessionTempDir
    if (this.waitingTransitionTimer) {
nst safeCwd = this.currentSessionTempDir
      clearTimeout(this.waitingTransitionTimer);
nst safeCwd = this.currentSessionTempDir
      this.waitingTransitionTimer = null;
nst safeCwd = this.currentSessionTempDir
    }
nst safeCwd = this.currentSessionTempDir

nst safeCwd = this.currentSessionTempDir
    this.streamParser.reset();
nst safeCwd = this.currentSessionTempDir
    this.removeAllListeners();
nst safeCwd = this.currentSessionTempDir

nst safeCwd = this.currentSessionTempDir
    console.log('[OpenCode Adapter] Adapter disposed');
nst safeCwd = this.currentSessionTempDir
  }
nst safeCwd = this.currentSessionTempDir

nst safeCwd = this.currentSessionTempDir
  private escapeShellArg(arg: string): string {
nst safeCwd = this.currentSessionTempDir
    if (this.options.platform === 'win32') {
nst safeCwd = this.currentSessionTempDir
      if (arg.includes(' ') || arg.includes('"')) {
nst safeCwd = this.currentSessionTempDir
        return `"${arg.replace(/"/g, '""')}"`;
nst safeCwd = this.currentSessionTempDir
      }
nst safeCwd = this.currentSessionTempDir
      return arg;
nst safeCwd = this.currentSessionTempDir
    } else {
nst safeCwd = this.currentSessionTempDir
      const needsEscaping = ["'", ' ', '$', '`', '\\', '"', '\n'].some(c => arg.includes(c));
nst safeCwd = this.currentSessionTempDir
      if (needsEscaping) {
nst safeCwd = this.currentSessionTempDir
        return `'${arg.replace(/'/g, "'\\''")}'`;
nst safeCwd = this.currentSessionTempDir
      }
nst safeCwd = this.currentSessionTempDir
      return arg;
nst safeCwd = this.currentSessionTempDir
    }
nst safeCwd = this.currentSessionTempDir
  }
nst safeCwd = this.currentSessionTempDir

nst safeCwd = this.currentSessionTempDir
  private buildShellCommand(command: string, args: string[]): string {
nst safeCwd = this.currentSessionTempDir
    const escapedCommand = this.escapeShellArg(command);
nst safeCwd = this.currentSessionTempDir
    const escapedArgs = args.map(arg => this.escapeShellArg(arg));
nst safeCwd = this.currentSessionTempDir
    return [escapedCommand, ...escapedArgs].join(' ');
nst safeCwd = this.currentSessionTempDir
  }
nst safeCwd = this.currentSessionTempDir

nst safeCwd = this.currentSessionTempDir
  private setupStreamParsing(): void {
nst safeCwd = this.currentSessionTempDir
    this.streamParser.on('message', (message: OpenCodeMessage) => {
nst safeCwd = this.currentSessionTempDir
      this.handleMessage(message);
nst safeCwd = this.currentSessionTempDir
    });
nst safeCwd = this.currentSessionTempDir

nst safeCwd = this.currentSessionTempDir
    this.streamParser.on('error', (error: Error) => {
nst safeCwd = this.currentSessionTempDir
      console.warn('[OpenCode Adapter] Stream parse warning:', error.message);
nst safeCwd = this.currentSessionTempDir
      this.emit('debug', { type: 'parse-warning', message: error.message });
nst safeCwd = this.currentSessionTempDir
    });
nst safeCwd = this.currentSessionTempDir
  }
nst safeCwd = this.currentSessionTempDir

nst safeCwd = this.currentSessionTempDir
  private handleMessage(message: OpenCodeMessage): void {
nst safeCwd = this.currentSessionTempDir
    console.log('[OpenCode Adapter] Handling message type:', message.type);
nst safeCwd = this.currentSessionTempDir

nst safeCwd = this.currentSessionTempDir
    switch (message.type) {
nst safeCwd = this.currentSessionTempDir
      case 'step_start':
nst safeCwd = this.currentSessionTempDir
        this.currentSessionId = message.part.sessionID;
nst safeCwd = this.currentSessionTempDir
        const modelDisplayName = this.currentModelId && this.options.getModelDisplayName
nst safeCwd = this.currentSessionTempDir
          ? this.options.getModelDisplayName(this.currentModelId)
nst safeCwd = this.currentSessionTempDir
          : 'AI';
nst safeCwd = this.currentSessionTempDir
        this.emit('progress', {
nst safeCwd = this.currentSessionTempDir
          stage: 'connecting',
nst safeCwd = this.currentSessionTempDir
          message: `Connecting to ${modelDisplayName}...`,
nst safeCwd = this.currentSessionTempDir
          modelName: modelDisplayName,
nst safeCwd = this.currentSessionTempDir
        });
nst safeCwd = this.currentSessionTempDir
        if (this.waitingTransitionTimer) {
nst safeCwd = this.currentSessionTempDir
          clearTimeout(this.waitingTransitionTimer);
nst safeCwd = this.currentSessionTempDir
        }
nst safeCwd = this.currentSessionTempDir
        this.waitingTransitionTimer = setTimeout(() => {
nst safeCwd = this.currentSessionTempDir
          if (!this.hasReceivedFirstTool && !this.hasCompleted) {
nst safeCwd = this.currentSessionTempDir
            this.emit('progress', { stage: 'waiting', message: 'Waiting for response...' });
nst safeCwd = this.currentSessionTempDir
          }
nst safeCwd = this.currentSessionTempDir
        }, 500);
nst safeCwd = this.currentSessionTempDir
        break;
nst safeCwd = this.currentSessionTempDir

nst safeCwd = this.currentSessionTempDir
      case 'text':
nst safeCwd = this.currentSessionTempDir
        if (!this.currentSessionId && message.part.sessionID) {
nst safeCwd = this.currentSessionTempDir
          this.currentSessionId = message.part.sessionID;
nst safeCwd = this.currentSessionTempDir
        }
nst safeCwd = this.currentSessionTempDir
        this.emit('message', message);
nst safeCwd = this.currentSessionTempDir

nst safeCwd = this.currentSessionTempDir
        if (message.part.text) {
nst safeCwd = this.currentSessionTempDir
          const taskMessage: TaskMessage = {
nst safeCwd = this.currentSessionTempDir
            id: this.generateMessageId(),
nst safeCwd = this.currentSessionTempDir
            type: 'assistant',
nst safeCwd = this.currentSessionTempDir
            content: message.part.text,
nst safeCwd = this.currentSessionTempDir
            timestamp: new Date().toISOString(),
nst safeCwd = this.currentSessionTempDir
          };
nst safeCwd = this.currentSessionTempDir
          this.messages.push(taskMessage);
nst safeCwd = this.currentSessionTempDir
        }
nst safeCwd = this.currentSessionTempDir
        break;
nst safeCwd = this.currentSessionTempDir

nst safeCwd = this.currentSessionTempDir
      case 'tool_call':
nst safeCwd = this.currentSessionTempDir
        this.handleToolCall(message.part.tool || 'unknown', message.part.input, message.part.sessionID);
nst safeCwd = this.currentSessionTempDir
        break;
nst safeCwd = this.currentSessionTempDir

nst safeCwd = this.currentSessionTempDir
      case 'tool_use':
nst safeCwd = this.currentSessionTempDir
        const toolUseMessage = message as import('../common/types/opencode.js').OpenCodeToolUseMessage;
nst safeCwd = this.currentSessionTempDir
        const toolUseName = toolUseMessage.part.tool || 'unknown';
nst safeCwd = this.currentSessionTempDir
        const toolUseInput = toolUseMessage.part.state?.input;
nst safeCwd = this.currentSessionTempDir
        const toolUseOutput = toolUseMessage.part.state?.output || '';
nst safeCwd = this.currentSessionTempDir

nst safeCwd = this.currentSessionTempDir
        this.handleToolCall(toolUseName, toolUseInput, toolUseMessage.part.sessionID);
nst safeCwd = this.currentSessionTempDir

nst safeCwd = this.currentSessionTempDir
        const toolDescription = (toolUseInput as { description?: string })?.description;
nst safeCwd = this.currentSessionTempDir
        if (toolDescription) {
nst safeCwd = this.currentSessionTempDir
          const syntheticTextMessage: OpenCodeMessage = {
nst safeCwd = this.currentSessionTempDir
            type: 'text',
nst safeCwd = this.currentSessionTempDir
            timestamp: message.timestamp,
nst safeCwd = this.currentSessionTempDir
            sessionID: message.sessionID,
nst safeCwd = this.currentSessionTempDir
            part: {
nst safeCwd = this.currentSessionTempDir
              id: this.generateMessageId(),
nst safeCwd = this.currentSessionTempDir
              sessionID: toolUseMessage.part.sessionID,
nst safeCwd = this.currentSessionTempDir
              messageID: toolUseMessage.part.messageID,
nst safeCwd = this.currentSessionTempDir
              type: 'text',
nst safeCwd = this.currentSessionTempDir
              text: toolDescription,
nst safeCwd = this.currentSessionTempDir
            },
nst safeCwd = this.currentSessionTempDir
          } as import('../common/types/opencode.js').OpenCodeTextMessage;
nst safeCwd = this.currentSessionTempDir
          this.emit('message', syntheticTextMessage);
nst safeCwd = this.currentSessionTempDir
        }
nst safeCwd = this.currentSessionTempDir

nst safeCwd = this.currentSessionTempDir
        this.emit('message', message);
nst safeCwd = this.currentSessionTempDir
        const toolUseStatus = toolUseMessage.part.state?.status;
nst safeCwd = this.currentSessionTempDir

nst safeCwd = this.currentSessionTempDir
        console.log('[OpenCode Adapter] Tool use:', toolUseName, 'status:', toolUseStatus);
nst safeCwd = this.currentSessionTempDir

nst safeCwd = this.currentSessionTempDir
        if (toolUseStatus === 'completed' || toolUseStatus === 'error') {
nst safeCwd = this.currentSessionTempDir
          this.emit('tool-result', toolUseOutput);
nst safeCwd = this.currentSessionTempDir
        }
nst safeCwd = this.currentSessionTempDir

nst safeCwd = this.currentSessionTempDir
        if (toolUseName === 'AskUserQuestion') {
nst safeCwd = this.currentSessionTempDir
          this.handleAskUserQuestion(toolUseInput as AskUserQuestionInput);
nst safeCwd = this.currentSessionTempDir
        }
nst safeCwd = this.currentSessionTempDir
        break;
nst safeCwd = this.currentSessionTempDir

nst safeCwd = this.currentSessionTempDir
      case 'tool_result':
nst safeCwd = this.currentSessionTempDir
        const toolOutput = message.part.output || '';
nst safeCwd = this.currentSessionTempDir
        console.log('[OpenCode Adapter] Tool result received, length:', toolOutput.length);
nst safeCwd = this.currentSessionTempDir
        this.emit('tool-result', toolOutput);
nst safeCwd = this.currentSessionTempDir
        break;
nst safeCwd = this.currentSessionTempDir

nst safeCwd = this.currentSessionTempDir
      case 'step_finish':
nst safeCwd = this.currentSessionTempDir
        if (message.part.reason === 'error') {
nst safeCwd = this.currentSessionTempDir
          if (!this.hasCompleted) {
nst safeCwd = this.currentSessionTempDir
            this.hasCompleted = true;
nst safeCwd = this.currentSessionTempDir
            this.emit('complete', {
nst safeCwd = this.currentSessionTempDir
              status: 'error',
nst safeCwd = this.currentSessionTempDir
              sessionId: this.currentSessionId || undefined,
nst safeCwd = this.currentSessionTempDir
              error: 'Task failed',
nst safeCwd = this.currentSessionTempDir
            });
nst safeCwd = this.currentSessionTempDir
          }
nst safeCwd = this.currentSessionTempDir
          break;
nst safeCwd = this.currentSessionTempDir
        }
nst safeCwd = this.currentSessionTempDir

nst safeCwd = this.currentSessionTempDir
        const action = this.completionEnforcer.handleStepFinish(message.part.reason);
nst safeCwd = this.currentSessionTempDir
        console.log(`[OpenCode Adapter] step_finish action: ${action}`);
nst safeCwd = this.currentSessionTempDir

nst safeCwd = this.currentSessionTempDir
        if (action === 'complete' && !this.hasCompleted) {
nst safeCwd = this.currentSessionTempDir
          this.hasCompleted = true;
nst safeCwd = this.currentSessionTempDir
          this.emit('complete', {
nst safeCwd = this.currentSessionTempDir
            status: 'success',
nst safeCwd = this.currentSessionTempDir
            sessionId: this.currentSessionId || undefined,
nst safeCwd = this.currentSessionTempDir
          });
nst safeCwd = this.currentSessionTempDir
        }
nst safeCwd = this.currentSessionTempDir
        break;
nst safeCwd = this.currentSessionTempDir

nst safeCwd = this.currentSessionTempDir
      case 'error':
nst safeCwd = this.currentSessionTempDir
        this.hasCompleted = true;
nst safeCwd = this.currentSessionTempDir
        this.emit('complete', {
nst safeCwd = this.currentSessionTempDir
          status: 'error',
nst safeCwd = this.currentSessionTempDir
          sessionId: this.currentSessionId || undefined,
nst safeCwd = this.currentSessionTempDir
          error: message.error,
nst safeCwd = this.currentSessionTempDir
        });
nst safeCwd = this.currentSessionTempDir
        break;
nst safeCwd = this.currentSessionTempDir

nst safeCwd = this.currentSessionTempDir
      default:
nst safeCwd = this.currentSessionTempDir
        const unknownMessage = message as unknown as { type: string };
nst safeCwd = this.currentSessionTempDir
        console.log('[OpenCode Adapter] Unknown message type:', unknownMessage.type);
nst safeCwd = this.currentSessionTempDir
    }
nst safeCwd = this.currentSessionTempDir
  }
nst safeCwd = this.currentSessionTempDir

nst safeCwd = this.currentSessionTempDir
  private handleToolCall(toolName: string, toolInput: unknown, sessionID?: string): void {
nst safeCwd = this.currentSessionTempDir
    console.log('[OpenCode Adapter] Tool call:', toolName);
nst safeCwd = this.currentSessionTempDir

nst safeCwd = this.currentSessionTempDir
    if (this.isStartTaskTool(toolName)) {
nst safeCwd = this.currentSessionTempDir
      this.startTaskCalled = true;
nst safeCwd = this.currentSessionTempDir
      const startInput = toolInput as StartTaskInput;
nst safeCwd = this.currentSessionTempDir
      if (startInput?.goal && startInput?.steps) {
nst safeCwd = this.currentSessionTempDir
        this.emitPlanMessage(startInput, sessionID || this.currentSessionId || '');
nst safeCwd = this.currentSessionTempDir
        const todos: TodoItem[] = startInput.steps.map((step, i) => ({
nst safeCwd = this.currentSessionTempDir
          id: String(i + 1),
nst safeCwd = this.currentSessionTempDir
          content: step,
nst safeCwd = this.currentSessionTempDir
          status: i === 0 ? 'in_progress' : 'pending',
nst safeCwd = this.currentSessionTempDir
          priority: 'medium',
nst safeCwd = this.currentSessionTempDir
        }));
nst safeCwd = this.currentSessionTempDir
        if (todos.length > 0) {
nst safeCwd = this.currentSessionTempDir
          this.emit('todo:update', todos);
nst safeCwd = this.currentSessionTempDir
          this.completionEnforcer.updateTodos(todos);
nst safeCwd = this.currentSessionTempDir
          console.log('[OpenCode Adapter] Created todos from start_task steps');
nst safeCwd = this.currentSessionTempDir
        }
nst safeCwd = this.currentSessionTempDir
      }
nst safeCwd = this.currentSessionTempDir
    }
nst safeCwd = this.currentSessionTempDir

nst safeCwd = this.currentSessionTempDir
    if (!this.startTaskCalled && !this.isExemptTool(toolName)) {
nst safeCwd = this.currentSessionTempDir
      console.warn(`[OpenCode Adapter] Tool "${toolName}" called before start_task`);
nst safeCwd = this.currentSessionTempDir
      this.emit('debug', {
nst safeCwd = this.currentSessionTempDir
        type: 'warning',
nst safeCwd = this.currentSessionTempDir
        message: `Tool "${toolName}" called before start_task - plan may not be captured`,
nst safeCwd = this.currentSessionTempDir
      });
nst safeCwd = this.currentSessionTempDir
    }
nst safeCwd = this.currentSessionTempDir

nst safeCwd = this.currentSessionTempDir
    if (!this.hasReceivedFirstTool) {
nst safeCwd = this.currentSessionTempDir
      this.hasReceivedFirstTool = true;
nst safeCwd = this.currentSessionTempDir
      if (this.waitingTransitionTimer) {
nst safeCwd = this.currentSessionTempDir
        clearTimeout(this.waitingTransitionTimer);
nst safeCwd = this.currentSessionTempDir
        this.waitingTransitionTimer = null;
nst safeCwd = this.currentSessionTempDir
      }
nst safeCwd = this.currentSessionTempDir
    }
nst safeCwd = this.currentSessionTempDir

nst safeCwd = this.currentSessionTempDir
    this.completionEnforcer.markToolsUsed();
nst safeCwd = this.currentSessionTempDir

nst safeCwd = this.currentSessionTempDir
    if (toolName === 'complete_task' || toolName.endsWith('_complete_task')) {
nst safeCwd = this.currentSessionTempDir
      this.completionEnforcer.handleCompleteTaskDetection(toolInput);
nst safeCwd = this.currentSessionTempDir
    }
nst safeCwd = this.currentSessionTempDir

nst safeCwd = this.currentSessionTempDir
    if (toolName === 'todowrite' || toolName.endsWith('_todowrite')) {
nst safeCwd = this.currentSessionTempDir
      const input = toolInput as { todos?: TodoItem[] };
nst safeCwd = this.currentSessionTempDir
      if (input?.todos && Array.isArray(input.todos) && input.todos.length > 0) {
nst safeCwd = this.currentSessionTempDir
        this.emit('todo:update', input.todos);
nst safeCwd = this.currentSessionTempDir
        this.completionEnforcer.updateTodos(input.todos);
nst safeCwd = this.currentSessionTempDir
      }
nst safeCwd = this.currentSessionTempDir
    }
nst safeCwd = this.currentSessionTempDir

nst safeCwd = this.currentSessionTempDir
    this.emit('tool-use', toolName, toolInput);
nst safeCwd = this.currentSessionTempDir
    this.emit('progress', {
nst safeCwd = this.currentSessionTempDir
      stage: 'tool-use',
nst safeCwd = this.currentSessionTempDir
      message: `Using ${toolName}`,
nst safeCwd = this.currentSessionTempDir
    });
nst safeCwd = this.currentSessionTempDir

nst safeCwd = this.currentSessionTempDir
    if (toolName === 'AskUserQuestion') {
nst safeCwd = this.currentSessionTempDir
      this.handleAskUserQuestion(toolInput as AskUserQuestionInput);
nst safeCwd = this.currentSessionTempDir
    }
nst safeCwd = this.currentSessionTempDir
  }
nst safeCwd = this.currentSessionTempDir

nst safeCwd = this.currentSessionTempDir
  private handleAskUserQuestion(input: AskUserQuestionInput): void {
nst safeCwd = this.currentSessionTempDir
    const question = input.questions?.[0];
nst safeCwd = this.currentSessionTempDir
    if (!question) return;
nst safeCwd = this.currentSessionTempDir

nst safeCwd = this.currentSessionTempDir
    const permissionRequest: PermissionRequest = {
nst safeCwd = this.currentSessionTempDir
      id: this.generateRequestId(),
nst safeCwd = this.currentSessionTempDir
      taskId: this.currentTaskId || '',
nst safeCwd = this.currentSessionTempDir
      type: 'question',
nst safeCwd = this.currentSessionTempDir
      question: question.question,
nst safeCwd = this.currentSessionTempDir
      options: question.options?.map((o) => ({
nst safeCwd = this.currentSessionTempDir
        label: o.label,
nst safeCwd = this.currentSessionTempDir
        description: o.description,
nst safeCwd = this.currentSessionTempDir
      })),
nst safeCwd = this.currentSessionTempDir
      multiSelect: question.multiSelect,
nst safeCwd = this.currentSessionTempDir
      createdAt: new Date().toISOString(),
nst safeCwd = this.currentSessionTempDir
    };
nst safeCwd = this.currentSessionTempDir

nst safeCwd = this.currentSessionTempDir
    this.emit('permission-request', permissionRequest);
nst safeCwd = this.currentSessionTempDir
  }
nst safeCwd = this.currentSessionTempDir

nst safeCwd = this.currentSessionTempDir
  private handleProcessExit(code: number | null): void {
nst safeCwd = this.currentSessionTempDir
    this.ptyProcess = null;
nst safeCwd = this.currentSessionTempDir

nst safeCwd = this.currentSessionTempDir
    if (this.wasInterrupted && code === 0 && !this.hasCompleted) {
nst safeCwd = this.currentSessionTempDir
      console.log('[OpenCode CLI] Task was interrupted by user');
nst safeCwd = this.currentSessionTempDir
      this.hasCompleted = true;
nst safeCwd = this.currentSessionTempDir
      this.emit('complete', {
nst safeCwd = this.currentSessionTempDir
        status: 'interrupted',
nst safeCwd = this.currentSessionTempDir
        sessionId: this.currentSessionId || undefined,
nst safeCwd = this.currentSessionTempDir
      });
nst safeCwd = this.currentSessionTempDir
      this.currentTaskId = null;
nst safeCwd = this.currentSessionTempDir
      return;
nst safeCwd = this.currentSessionTempDir
    }
nst safeCwd = this.currentSessionTempDir

nst safeCwd = this.currentSessionTempDir
    if (code === 0 && !this.hasCompleted) {
nst safeCwd = this.currentSessionTempDir
      this.completionEnforcer.handleProcessExit(code).catch((error) => {
nst safeCwd = this.currentSessionTempDir
        console.error('[OpenCode Adapter] Completion enforcer error:', error);
nst safeCwd = this.currentSessionTempDir
        this.hasCompleted = true;
nst safeCwd = this.currentSessionTempDir
        this.emit('complete', {
nst safeCwd = this.currentSessionTempDir
          status: 'error',
nst safeCwd = this.currentSessionTempDir
          sessionId: this.currentSessionId || undefined,
nst safeCwd = this.currentSessionTempDir
          error: `Failed to complete: ${error.message}`,
nst safeCwd = this.currentSessionTempDir
        });
nst safeCwd = this.currentSessionTempDir
      });
nst safeCwd = this.currentSessionTempDir
      return;
nst safeCwd = this.currentSessionTempDir
    }
nst safeCwd = this.currentSessionTempDir

nst safeCwd = this.currentSessionTempDir
    if (!this.hasCompleted) {
nst safeCwd = this.currentSessionTempDir
      if (code !== null && code !== 0) {
nst safeCwd = this.currentSessionTempDir
        this.emit('error', new Error(`OpenCode CLI exited with code ${code}`));
nst safeCwd = this.currentSessionTempDir
      }
nst safeCwd = this.currentSessionTempDir
    }
nst safeCwd = this.currentSessionTempDir

nst safeCwd = this.currentSessionTempDir
    this.currentTaskId = null;
nst safeCwd = this.currentSessionTempDir
  }
nst safeCwd = this.currentSessionTempDir

nst safeCwd = this.currentSessionTempDir
  private async spawnSessionResumption(prompt: string): Promise<void> {
nst safeCwd = this.currentSessionTempDir
    const sessionId = this.currentSessionId;
nst safeCwd = this.currentSessionTempDir
    if (!sessionId) {
nst safeCwd = this.currentSessionTempDir
      throw new Error('No session ID available for session resumption');
nst safeCwd = this.currentSessionTempDir
    }
nst safeCwd = this.currentSessionTempDir

nst safeCwd = this.currentSessionTempDir
    console.log(`[OpenCode Adapter] Starting session resumption with session ${sessionId}`);
nst safeCwd = this.currentSessionTempDir

nst safeCwd = this.currentSessionTempDir
    this.streamParser.reset();
nst safeCwd = this.currentSessionTempDir

nst safeCwd = this.currentSessionTempDir
    const config: TaskConfig = {
nst safeCwd = this.currentSessionTempDir
      prompt,
nst safeCwd = this.currentSessionTempDir
      sessionId: sessionId,
nst safeCwd = this.currentSessionTempDir
      workingDirectory: this.lastWorkingDirectory,
nst safeCwd = this.currentSessionTempDir
    };
nst safeCwd = this.currentSessionTempDir

nst safeCwd = this.currentSessionTempDir
    const cliArgs = await this.options.buildCliArgs({
nst safeCwd = this.currentSessionTempDir
      prompt: config.prompt,
nst safeCwd = this.currentSessionTempDir
      sessionId: config.sessionId,
nst safeCwd = this.currentSessionTempDir
      selectedModel: this.currentModelId ? { provider: 'anthropic', model: this.currentModelId } : null,
nst safeCwd = this.currentSessionTempDir
      attachments: config.attachments,
nst safeCwd = this.currentSessionTempDir
      tempFiles: this.tempFileInfos,
nst safeCwd = this.currentSessionTempDir
    });
nst safeCwd = this.currentSessionTempDir

nst safeCwd = this.currentSessionTempDir
    const { command, args: baseArgs } = this.options.getCliCommand();
nst safeCwd = this.currentSessionTempDir
    console.log('[OpenCode Adapter] Session resumption command:', command, [...baseArgs, ...cliArgs].join(' '));
nst safeCwd = this.currentSessionTempDir

nst safeCwd = this.currentSessionTempDir
    const env = await this.options.buildEnvironment(this.currentTaskId || 'default');
nst safeCwd = this.currentSessionTempDir

nst safeCwd = this.currentSessionTempDir
    const allArgs = [...baseArgs, ...cliArgs];
nst safeCwd = this.currentSessionTempDir
    // Use session temp directory if attachments were created, otherwise use configured working directory
nst safeCwd = this.currentSessionTempDir
    const safeCwd = this.currentSessionTempDir || config.workingDirectory || this.options.tempPath;
nst safeCwd = this.currentSessionTempDir

nst safeCwd = this.currentSessionTempDir
    const fullCommand = this.buildShellCommand(command, allArgs);
nst safeCwd = this.currentSessionTempDir

nst safeCwd = this.currentSessionTempDir
    const shellCmd = this.getPlatformShell();
nst safeCwd = this.currentSessionTempDir
    const shellArgs = this.getShellArgs(fullCommand);
nst safeCwd = this.currentSessionTempDir

nst safeCwd = this.currentSessionTempDir
    this.ptyProcess = pty.spawn(shellCmd, shellArgs, {
nst safeCwd = this.currentSessionTempDir
      name: 'xterm-256color',
nst safeCwd = this.currentSessionTempDir
      cols: 32000,
nst safeCwd = this.currentSessionTempDir
      rows: 30,
nst safeCwd = this.currentSessionTempDir
      cwd: safeCwd,
nst safeCwd = this.currentSessionTempDir
      env: env as { [key: string]: string },
nst safeCwd = this.currentSessionTempDir
    });
nst safeCwd = this.currentSessionTempDir

nst safeCwd = this.currentSessionTempDir
    this.ptyProcess.onData((data: string) => {
nst safeCwd = this.currentSessionTempDir
      const cleanData = data
nst safeCwd = this.currentSessionTempDir
        .replace(/\x1B\[[0-9;?]*[a-zA-Z]/g, '')
nst safeCwd = this.currentSessionTempDir
        .replace(/\x1B\][^\x07]*\x07/g, '')
nst safeCwd = this.currentSessionTempDir
        .replace(/\x1B\][^\x1B]*\x1B\\/g, '');
nst safeCwd = this.currentSessionTempDir
      if (cleanData.trim()) {
nst safeCwd = this.currentSessionTempDir
        const truncated = cleanData.substring(0, 500) + (cleanData.length > 500 ? '...' : '');
nst safeCwd = this.currentSessionTempDir
        console.log('[OpenCode CLI stdout]:', truncated);
nst safeCwd = this.currentSessionTempDir
        this.emit('debug', { type: 'stdout', message: cleanData });
nst safeCwd = this.currentSessionTempDir

nst safeCwd = this.currentSessionTempDir
        this.streamParser.feed(cleanData);
nst safeCwd = this.currentSessionTempDir
      }
nst safeCwd = this.currentSessionTempDir
    });
nst safeCwd = this.currentSessionTempDir

nst safeCwd = this.currentSessionTempDir
    this.ptyProcess.onExit(({ exitCode }) => {
nst safeCwd = this.currentSessionTempDir
      this.handleProcessExit(exitCode);
nst safeCwd = this.currentSessionTempDir
    });
nst safeCwd = this.currentSessionTempDir
  }
nst safeCwd = this.currentSessionTempDir

nst safeCwd = this.currentSessionTempDir
  private generateTaskId(): string {
nst safeCwd = this.currentSessionTempDir
    return `task_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
nst safeCwd = this.currentSessionTempDir
  }
nst safeCwd = this.currentSessionTempDir

nst safeCwd = this.currentSessionTempDir
  private generateMessageId(): string {
nst safeCwd = this.currentSessionTempDir
    return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
nst safeCwd = this.currentSessionTempDir
  }
nst safeCwd = this.currentSessionTempDir

nst safeCwd = this.currentSessionTempDir
  private generateRequestId(): string {
nst safeCwd = this.currentSessionTempDir
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
nst safeCwd = this.currentSessionTempDir
  }
nst safeCwd = this.currentSessionTempDir

nst safeCwd = this.currentSessionTempDir
  private isStartTaskTool(toolName: string): boolean {
nst safeCwd = this.currentSessionTempDir
    return toolName === 'start_task' || toolName.endsWith('_start_task');
nst safeCwd = this.currentSessionTempDir
  }
nst safeCwd = this.currentSessionTempDir

nst safeCwd = this.currentSessionTempDir
  private isExemptTool(toolName: string): boolean {
nst safeCwd = this.currentSessionTempDir
    if (toolName === 'todowrite' || toolName.endsWith('_todowrite')) {
nst safeCwd = this.currentSessionTempDir
      return true;
nst safeCwd = this.currentSessionTempDir
    }
nst safeCwd = this.currentSessionTempDir
    if (this.isStartTaskTool(toolName)) {
nst safeCwd = this.currentSessionTempDir
      return true;
nst safeCwd = this.currentSessionTempDir
    }
nst safeCwd = this.currentSessionTempDir
    return false;
nst safeCwd = this.currentSessionTempDir
  }
nst safeCwd = this.currentSessionTempDir

nst safeCwd = this.currentSessionTempDir
  private emitPlanMessage(input: StartTaskInput, sessionId: string): void {
nst safeCwd = this.currentSessionTempDir
    const verificationSection = input.verification?.length
nst safeCwd = this.currentSessionTempDir
      ? `\n\n**Verification:**\n${input.verification.map((v, i) => `${i + 1}. ${v}`).join('\n')}`
nst safeCwd = this.currentSessionTempDir
      : '';
nst safeCwd = this.currentSessionTempDir
    const skillsSection = input.skills?.length
nst safeCwd = this.currentSessionTempDir
      ? `\n\n**Skills:** ${input.skills.join(', ')}`
nst safeCwd = this.currentSessionTempDir
      : '';
nst safeCwd = this.currentSessionTempDir
    const planText = `**Plan:**\n\n**Goal:** ${input.goal}\n\n**Steps:**\n${input.steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}${verificationSection}${skillsSection}`;
nst safeCwd = this.currentSessionTempDir

nst safeCwd = this.currentSessionTempDir
    const syntheticMessage: OpenCodeMessage = {
nst safeCwd = this.currentSessionTempDir
      type: 'text',
nst safeCwd = this.currentSessionTempDir
      timestamp: Date.now(),
nst safeCwd = this.currentSessionTempDir
      sessionID: sessionId,
nst safeCwd = this.currentSessionTempDir
      part: {
nst safeCwd = this.currentSessionTempDir
        id: this.generateMessageId(),
nst safeCwd = this.currentSessionTempDir
        sessionID: sessionId,
nst safeCwd = this.currentSessionTempDir
        messageID: this.generateMessageId(),
nst safeCwd = this.currentSessionTempDir
        type: 'text',
nst safeCwd = this.currentSessionTempDir
        text: planText,
nst safeCwd = this.currentSessionTempDir
      },
nst safeCwd = this.currentSessionTempDir
    } as import('../common/types/opencode.js').OpenCodeTextMessage;
nst safeCwd = this.currentSessionTempDir

nst safeCwd = this.currentSessionTempDir
    this.emit('message', syntheticMessage);
nst safeCwd = this.currentSessionTempDir
    console.log('[OpenCode Adapter] Emitted synthetic plan message');
nst safeCwd = this.currentSessionTempDir
  }
nst safeCwd = this.currentSessionTempDir

nst safeCwd = this.currentSessionTempDir
  private getPlatformShell(): string {
nst safeCwd = this.currentSessionTempDir
    if (this.options.platform === 'win32') {
nst safeCwd = this.currentSessionTempDir
      return 'cmd.exe';
nst safeCwd = this.currentSessionTempDir
    } else if (this.options.isPackaged && this.options.platform === 'darwin') {
nst safeCwd = this.currentSessionTempDir
      return '/bin/sh';
nst safeCwd = this.currentSessionTempDir
    } else {
nst safeCwd = this.currentSessionTempDir
      const userShell = process.env.SHELL;
nst safeCwd = this.currentSessionTempDir
      if (userShell) {
nst safeCwd = this.currentSessionTempDir
        return userShell;
nst safeCwd = this.currentSessionTempDir
      }
nst safeCwd = this.currentSessionTempDir
      if (fs.existsSync('/bin/bash')) return '/bin/bash';
nst safeCwd = this.currentSessionTempDir
      if (fs.existsSync('/bin/zsh')) return '/bin/zsh';
nst safeCwd = this.currentSessionTempDir
      return '/bin/sh';
nst safeCwd = this.currentSessionTempDir
    }
nst safeCwd = this.currentSessionTempDir
  }
nst safeCwd = this.currentSessionTempDir

nst safeCwd = this.currentSessionTempDir
  private getShellArgs(command: string): string[] {
nst safeCwd = this.currentSessionTempDir
    if (this.options.platform === 'win32') {
nst safeCwd = this.currentSessionTempDir
      return ['/s', '/c', command];
nst safeCwd = this.currentSessionTempDir
    } else {
nst safeCwd = this.currentSessionTempDir
      return ['-c', command];
nst safeCwd = this.currentSessionTempDir
    }
nst safeCwd = this.currentSessionTempDir
  }
nst safeCwd = this.currentSessionTempDir
}
nst safeCwd = this.currentSessionTempDir

nst safeCwd = this.currentSessionTempDir
interface AskUserQuestionInput {
nst safeCwd = this.currentSessionTempDir
  questions?: Array<{
nst safeCwd = this.currentSessionTempDir
    question: string;
nst safeCwd = this.currentSessionTempDir
    header?: string;
nst safeCwd = this.currentSessionTempDir
    options?: Array<{ label: string; description?: string }>;
nst safeCwd = this.currentSessionTempDir
    multiSelect?: boolean;
nst safeCwd = this.currentSessionTempDir
  }>;
nst safeCwd = this.currentSessionTempDir
}
nst safeCwd = this.currentSessionTempDir

nst safeCwd = this.currentSessionTempDir
interface StartTaskInput {
nst safeCwd = this.currentSessionTempDir
  original_request: string;
nst safeCwd = this.currentSessionTempDir
  goal: string;
nst safeCwd = this.currentSessionTempDir
  steps: string[];
nst safeCwd = this.currentSessionTempDir
  verification: string[];
nst safeCwd = this.currentSessionTempDir
  skills: string[];
nst safeCwd = this.currentSessionTempDir
}
nst safeCwd = this.currentSessionTempDir

nst safeCwd = this.currentSessionTempDir
export function createAdapter(options: AdapterOptions, taskId?: string): OpenCodeAdapter {
nst safeCwd = this.currentSessionTempDir
  return new OpenCodeAdapter(options, taskId);
nst safeCwd = this.currentSessionTempDir
}
nst safeCwd = this.currentSessionTempDir
