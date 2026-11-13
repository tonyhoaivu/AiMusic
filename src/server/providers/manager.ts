import {
  AIProviderId,
  MusicGenerationTask,
  TaskLog,
  Song,
  ProviderConfig,
  ProviderItemStatus,
} from '../../types/index.js';
import { db } from '../db.js';
import { ProviderAdapter, AdapterGenerationParams } from './adapters/types.js';
import { sunoAdapter } from './adapters/sunoAdapter.js';
import { replicateAdapter } from './adapters/replicateAdapter.js';
import { minimaxAdapter } from './adapters/minimaxAdapter.js';
import { falAdapter } from './adapters/falAdapter.js';
import { customAdapter } from './adapters/customAdapter.js';

const ADAPTERS: Record<AIProviderId, ProviderAdapter> = {
  suno: sunoAdapter,
  replicate: replicateAdapter,
  minimax: minimaxAdapter,
  fal: falAdapter,
  custom: customAdapter,
};

export interface GenerationParams extends AdapterGenerationParams {
  userId?: string;
  userName?: string;
  providerOverride?: AIProviderId;
}

class MusicProviderManager {
  private maskKey(key: string): string {
    if (!key) return '';
    if (key.length <= 8) return '••••••••';
    return `${key.slice(0, 4)}••••••••${key.slice(-4)}`;
  }

  public getConfig(): ProviderConfig {
    const state = db.getState();
    const activeId = state.activeProvider || 'suno';
    const activeEntry = state.providers[activeId];
    const adapter = ADAPTERS[activeId];

    const providersMap = {} as Record<AIProviderId, ProviderItemStatus>;
    (Object.keys(ADAPTERS) as AIProviderId[]).forEach((pid) => {
      const entry = state.providers[pid];
      const ad = ADAPTERS[pid];
      providersMap[pid] = {
        id: pid,
        name: ad.displayName,
        enabled: entry.enabled,
        isConfigured: Boolean(entry.apiKey || (pid === 'custom' && entry.baseUrl)),
        apiKeyMasked: this.maskKey(entry.apiKey),
        baseUrl: entry.baseUrl || ad.defaultBaseUrl,
        model: entry.model || ad.defaultModel,
        capabilities: ad.capabilities,
      };
    });

    const isConfigured = Boolean(activeEntry.apiKey || (activeId === 'custom' && activeEntry.baseUrl));
    const status: ProviderConfig['status'] = !activeEntry.enabled
      ? 'disabled'
      : isConfigured
      ? 'connected'
      : 'unconfigured';

    return {
      provider: activeId,
      apiKeyMasked: this.maskKey(activeEntry.apiKey),
      baseUrl: activeEntry.baseUrl || adapter.defaultBaseUrl,
      model: activeEntry.model || adapter.defaultModel,
      isConfigured,
      enabled: activeEntry.enabled,
      status,
      isServerless: !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME),
      capabilities: adapter.capabilities,
      providers: providersMap,
    };
  }

  public updateConfig(newConfig: {
    provider?: AIProviderId;
    apiKey?: string;
    baseUrl?: string;
    model?: string;
    enabled?: boolean;
    setActive?: boolean;
  }): ProviderConfig {
    const state = db.getState();
    const targetId = newConfig.provider || state.activeProvider;
    const entry = state.providers[targetId];

    if (!entry) {
      throw new Error(`Provider không hợp lệ: ${targetId}`);
    }

    if (newConfig.enabled !== undefined) {
      entry.enabled = Boolean(newConfig.enabled);
    }
    if (newConfig.apiKey !== undefined && newConfig.apiKey !== '' && newConfig.apiKey !== '***') {
      entry.apiKey = newConfig.apiKey.trim();
    }
    if (newConfig.baseUrl !== undefined && newConfig.baseUrl.trim()) {
      entry.baseUrl = newConfig.baseUrl.trim();
    }
    if (newConfig.model !== undefined && newConfig.model.trim()) {
      entry.model = newConfig.model.trim();
    }

    if (newConfig.setActive !== false && newConfig.provider) {
      state.activeProvider = targetId;
    }

    const activeEntry = state.providers[state.activeProvider];
    state.providerConfig = {
      provider: state.activeProvider,
      apiKey: activeEntry.apiKey,
      baseUrl: activeEntry.baseUrl,
      model: activeEntry.model,
    };

    db.save();
    this.addLog(
      'admin',
      'info',
      `Admin cập nhật nhà cung cấp ${targetId.toUpperCase()} (enabled=${entry.enabled}, active=${state.activeProvider.toUpperCase()})`
    );
    return this.getConfig();
  }

  public toggleProviderEnabled(providerId: AIProviderId, enabled: boolean): ProviderConfig {
    return this.updateConfig({ provider: providerId, enabled, setActive: false });
  }

  public getLogs(limit = 80): TaskLog[] {
    return db.getState().logs.slice(-limit).reverse();
  }

  public getFailedTasks(limit = 30): MusicGenerationTask[] {
    return Object.values(db.getState().tasks)
      .filter((t) => t.status === 'failed')
      .slice(-limit)
      .reverse();
  }

  public getTask(id: string): MusicGenerationTask | undefined {
    return db.getState().tasks[id];
  }

  public getAllTasks(): MusicGenerationTask[] {
    return Object.values(db.getState().tasks).reverse();
  }

  public addLog(
    taskId: string,
    level: 'info' | 'warn' | 'error' | 'success',
    message: string,
    provider?: string
  ) {
    const state = db.getState();
    const logItem: TaskLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      taskId,
      timestamp: new Date().toLocaleTimeString(),
      level,
      message,
      provider: provider || state.activeProvider,
    };
    state.logs.push(logItem);
    if (state.logs.length > 300) state.logs.shift();
    db.save();
  }

  public async testConnection(
    providerOverride?: AIProviderId,
    apiKeyOverride?: string,
    baseUrlOverride?: string
  ) {
    const state = db.getState();
    const providerId = providerOverride || state.activeProvider;
    const entry = state.providers[providerId];
    const adapter = ADAPTERS[providerId];

    const effectiveCfg = {
      enabled: entry.enabled,
      apiKey:
        apiKeyOverride && apiKeyOverride !== '***' ? apiKeyOverride.trim() : entry.apiKey,
      baseUrl: baseUrlOverride?.trim() || entry.baseUrl || adapter.defaultBaseUrl,
      model: entry.model || adapter.defaultModel,
    };

    if (!effectiveCfg.apiKey && providerId !== 'custom') {
      return {
        success: false,
        provider: providerId,
        latencyMs: 0,
        message: `Chưa có API Key cho ${adapter.displayName}. Vui lòng nhập API Key để kiểm tra.`,
      };
    }

    try {
      const result = await adapter.testConnection(effectiveCfg);
      this.addLog(
        'test',
        result.success ? 'success' : 'error',
        `Test ${providerId.toUpperCase()}: ${result.message}`,
        providerId
      );
      return result;
    } catch (err: any) {
      const msg = `Không thể kết nối đến ${effectiveCfg.baseUrl}: ${err.message}`;
      this.addLog('test', 'error', msg, providerId);
      return {
        success: false,
        provider: providerId,
        latencyMs: 0,
        message: msg,
      };
    }
  }

  private resolveAdapterForCapability(
    preferred: AIProviderId,
    requiredCap: 'supportsMusicGeneration' | 'supportsCover' | 'supportsStemSeparation'
  ): { providerId: AIProviderId; adapter: ProviderAdapter } | { error: string } {
    const state = db.getState();
    const prefEntry = state.providers[preferred];
    const prefAdapter = ADAPTERS[preferred];

    if (!prefEntry.enabled) {
      return {
        error: `Nhà cung cấp ${prefAdapter.displayName} hiện đang bị TẮT bởi Quản trị viên.`,
      };
    }

    if (prefAdapter.capabilities[requiredCap]) {
      if (!prefEntry.apiKey && preferred !== 'custom') {
        return {
          error: `Chưa cấu hình API Key cho ${prefAdapter.displayName}. Vui lòng vào Trang Quản Trị Admin > AI Music API để nhập API Key thực tế.`,
        };
      }
      return { providerId: preferred, adapter: prefAdapter };
    }

    // If preferred doesn't support cover/stems (e.g. minimax/fal), check if another enabled & configured provider supports it
    const fallbackId = (Object.keys(ADAPTERS) as AIProviderId[]).find((pid) => {
      const e = state.providers[pid];
      return e.enabled && Boolean(e.apiKey) && ADAPTERS[pid].capabilities[requiredCap];
    });

    if (fallbackId) {
      return { providerId: fallbackId, adapter: ADAPTERS[fallbackId] };
    }

    const capLabel =
      requiredCap === 'supportsCover'
        ? 'AI Cover (Chuyển đổi giọng hát)'
        : requiredCap === 'supportsStemSeparation'
        ? 'Tách giọng & nhạc nền (Demucs)'
        : 'Tạo nhạc AI';

    return {
      error: `Nhà cung cấp ${prefAdapter.displayName} không hỗ trợ chức năng "${capLabel}". Vui lòng bật và cấu hình API Key cho nhà cung cấp hỗ trợ (VD: Replicate cho RVC/Demucs hoặc Suno API).`,
    };
  }

  public async createMusicTask(params: GenerationParams): Promise<MusicGenerationTask> {
    const state = db.getState();
    const preferred = params.providerOverride || state.activeProvider;
    const taskId = `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const resolved = this.resolveAdapterForCapability(preferred, 'supportsMusicGeneration');

    const task: MusicGenerationTask = {
      id: taskId,
      provider: 'providerId' in resolved ? resolved.providerId : preferred,
      type: 'music',
      status: 'pending',
      progress: 5,
      title: params.title || 'Untitled Song',
      promptStyle: params.promptStyle || params.genre,
      lyrics: params.lyrics,
      genre: params.genre as any,
      vocalType: params.vocalType as any,
      vocalLanguage: (params.vocalLanguage as any) || 'vi',
      bpm: params.bpm || 120,
      userId: params.userId,
      logs: [`[${new Date().toLocaleTimeString()}] Khởi tạo tác vụ tạo nhạc AI: "${params.title}"`],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    state.tasks[taskId] = task;
    state.apiUsage.totalRequests += 1;

    if ('error' in resolved) {
      task.status = 'failed';
      task.progress = 0;
      task.error = resolved.error;
      task.logs.push(`[${new Date().toLocaleTimeString()}] THẤT BẠI: ${resolved.error}`);
      state.apiUsage.failedRequests += 1;
      db.save();
      this.addLog(taskId, 'error', resolved.error, preferred);
      return task;
    }

    const { providerId, adapter } = resolved;
    // Honest capability enforcement for vocals/lyrics
    if (
      params.vocalType !== 'instrumental' &&
      !adapter.capabilities.supportsVocals
    ) {
      const capErr = `${adapter.displayName} chỉ hỗ trợ nhạc không lời (Instrumental), không hỗ trợ hát giọng ca sĩ AI. Hãy chọn "Nhạc Không Lời" hoặc chuyển nhà cung cấp sang Suno API / MiniMax Music-01.`;
      task.status = 'failed';
      task.progress = 0;
      task.error = capErr;
      task.logs.push(`[${new Date().toLocaleTimeString()}] TỪ CHỐI: ${capErr}`);
      state.apiUsage.failedRequests += 1;
      db.save();
      this.addLog(taskId, 'warn', capErr, providerId);
      return task;
    }

    db.save();
    const resolvedParams = {
      ...params,
      callbackUrl: params.callbackUrl?.replace('__TASK_ID__', taskId),
    };
    this.runAsyncSubmission(task, adapter, state.providers[providerId], resolvedParams, 'music');
    return task;
  }

  public async createCoverTask(params: GenerationParams): Promise<MusicGenerationTask> {
    const state = db.getState();
    const preferred = params.providerOverride || state.activeProvider;
    const taskId = `cover-task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const resolved = this.resolveAdapterForCapability(preferred, 'supportsCover');

    const task: MusicGenerationTask = {
      id: taskId,
      provider: 'providerId' in resolved ? resolved.providerId : preferred,
      type: 'cover',
      status: 'pending',
      progress: 5,
      title: params.title || 'AI Cover Track',
      promptStyle: `AI Cover (${params.voiceModelId || 'voice'})`,
      genre: (params.genre || 'Pop') as any,
      vocalType: (params.vocalType || 'female') as any,
      voiceModelId: params.voiceModelId,
      userId: params.userId,
      logs: [`[${new Date().toLocaleTimeString()}] Khởi tạo tác vụ AI Cover: "${params.title}"`],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    state.tasks[taskId] = task;
    state.apiUsage.totalRequests += 1;

    if ('error' in resolved) {
      task.status = 'failed';
      task.progress = 0;
      task.error = resolved.error;
      task.logs.push(`[${new Date().toLocaleTimeString()}] THẤT BẠI: ${resolved.error}`);
      state.apiUsage.failedRequests += 1;
      db.save();
      this.addLog(taskId, 'error', resolved.error, preferred);
      return task;
    }

    db.save();
    const resolvedParams = {
      ...params,
      callbackUrl: params.callbackUrl?.replace('__TASK_ID__', taskId),
    };
    this.runAsyncSubmission(
      task,
      resolved.adapter,
      state.providers[resolved.providerId],
      resolvedParams,
      'cover'
    );
    return task;
  }

  public async createStemsTask(params: {
    title: string;
    audioInputUrl: string;
    userId?: string;
    userName?: string;
  }): Promise<MusicGenerationTask> {
    const state = db.getState();
    const preferred = state.activeProvider;
    const taskId = `stems-task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const resolved = this.resolveAdapterForCapability(preferred, 'supportsStemSeparation');

    const task: MusicGenerationTask = {
      id: taskId,
      provider: 'providerId' in resolved ? resolved.providerId : 'replicate',
      type: 'stems',
      status: 'pending',
      progress: 5,
      title: params.title || 'Tách Vocal & Instrumental',
      promptStyle: 'Demucs Stem Separation',
      genre: 'Pop',
      vocalType: 'duet',
      userId: params.userId,
      logs: [`[${new Date().toLocaleTimeString()}] Khởi tạo tách Vocal & Nhạc nền (Demucs)...`],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    state.tasks[taskId] = task;
    state.apiUsage.totalRequests += 1;

    if ('error' in resolved) {
      task.status = 'failed';
      task.error = resolved.error;
      task.logs.push(`[${new Date().toLocaleTimeString()}] THẤT BẠI: ${resolved.error}`);
      state.apiUsage.failedRequests += 1;
      db.save();
      this.addLog(taskId, 'error', resolved.error, 'replicate');
      return task;
    }

    db.save();
    this.runAsyncSubmission(
      task,
      resolved.adapter,
      state.providers[resolved.providerId],
      {
        title: task.title,
        lyrics: '',
        genre: 'Pop',
        promptStyle: 'Demucs',
        vocalType: 'duet',
        audioInputUrl: params.audioInputUrl,
        userId: params.userId,
        userName: params.userName,
      },
      'stems'
    );
    return task;
  }

  private async runAsyncSubmission(
    task: MusicGenerationTask,
    adapter: ProviderAdapter,
    cfg: any,
    params: GenerationParams,
    mode: 'music' | 'cover' | 'stems'
  ) {
    try {
      task.status = 'processing';
      task.progress = 20;
      task.logs.push(
        `[${new Date().toLocaleTimeString()}] Đang kết nối ${adapter.displayName} (${cfg.model})...`
      );
      db.save();
      this.addLog(task.id, 'info', `Submitting ${mode} task to ${adapter.id}`, adapter.id);

      let submitRes;
      if (mode === 'cover') {
        if (!adapter.submitCover) {
          throw new Error(`${adapter.displayName} không hỗ trợ AI Cover.`);
        }
        submitRes = await adapter.submitCover(cfg, params);
      } else if (mode === 'stems') {
        if (!adapter.submitStems || !params.audioInputUrl) {
          throw new Error(`${adapter.displayName} không hỗ trợ tách Stems hoặc thiếu audio URL.`);
        }
        submitRes = await adapter.submitStems(cfg, params.audioInputUrl);
      } else {
        submitRes = await adapter.submitMusic(cfg, params);
      }

      task.logs.push(`[${new Date().toLocaleTimeString()}] ${submitRes.progressLog}`);

      if (submitRes.immediateStems) {
        this.finalizeStemsSuccess(task, submitRes.immediateStems);
        return;
      }

      if (submitRes.immediateTracks && submitRes.immediateTracks.length > 0) {
        this.finalizeTracksSuccess(task, submitRes.immediateTracks, params, adapter.id);
        return;
      }

      if (!submitRes.externalTaskId || !adapter.pollTask) {
        throw new Error('Provider không trả về Task ID để theo dõi tiến trình.');
      }

      task.externalTaskId = submitRes.externalTaskId;
      task.progress = 35;
      db.save();

      this.startPolling(task, adapter, cfg, submitRes.externalTaskId, params, mode);
    } catch (err: any) {
      task.status = 'failed';
      task.progress = 0;
      task.error = err.message || 'Lỗi không xác định khi gọi API tạo nhạc.';
      task.logs.push(`[${new Date().toLocaleTimeString()}] LỖI: ${task.error}`);
      db.getState().apiUsage.failedRequests += 1;
      db.save();
      this.addLog(task.id, 'error', `${mode} failed: ${task.error}`, adapter.id);
    }
  }

  private startPolling(
    task: MusicGenerationTask,
    adapter: ProviderAdapter,
    cfg: any,
    externalId: string,
    params: GenerationParams,
    mode: 'music' | 'cover' | 'stems'
  ) {
    let attempts = 0;
    const maxAttempts = 60;

    const timer = setInterval(async () => {
      attempts++;
      if (task.status === 'completed' || task.status === 'failed') {
        clearInterval(timer);
        return;
      }
      if (attempts > maxAttempts) {
        clearInterval(timer);
        task.status = 'failed';
        task.error = 'Quá thời gian chờ phản hồi từ nhà cung cấp API (Timeout).';
        task.logs.push(`[${new Date().toLocaleTimeString()}] LỖI: Timeout.`);
        db.getState().apiUsage.failedRequests += 1;
        db.save();
        this.addLog(task.id, 'error', `Task ${task.id} polling timeout`, adapter.id);
        return;
      }

      try {
        const pollRes = await adapter.pollTask!(cfg, externalId, mode);
        if (pollRes.log) {
          task.logs.push(`[${new Date().toLocaleTimeString()}] ${pollRes.log}`);
        }
        if (pollRes.progress) {
          task.progress = Math.max(task.progress, pollRes.progress);
        }

        if (pollRes.status === 'completed') {
          clearInterval(timer);
          if (mode === 'stems' && pollRes.stems) {
            this.finalizeStemsSuccess(task, pollRes.stems);
          } else if (pollRes.tracks && pollRes.tracks.length > 0) {
            this.finalizeTracksSuccess(task, pollRes.tracks, params, adapter.id);
          } else {
            task.status = 'failed';
            task.error = 'Nhà cung cấp báo hoàn thành nhưng không có file âm thanh trả về.';
            db.getState().apiUsage.failedRequests += 1;
            db.save();
          }
        } else if (pollRes.status === 'failed') {
          clearInterval(timer);
          task.status = 'failed';
          task.error = pollRes.error || 'Tác vụ API thất bại.';
          db.getState().apiUsage.failedRequests += 1;
          db.save();
          this.addLog(task.id, 'error', `Task ${task.id} failed: ${task.error}`, adapter.id);
        } else {
          db.save();
        }
      } catch (e: any) {
        console.error('Polling error:', e);
      }
    }, 2500);
  }

  public handleWebhookCallback(taskId: string, payload: any) {
    const task = db.getState().tasks[taskId];
    if (!task) return false;
    const tracks = payload?.data?.data || payload?.tracks || [];
    if (Array.isArray(tracks) && tracks.length > 0) {
      const normalized = tracks
        .map((t: any) => ({
          audioUrl: t.audio_url || t.audioUrl,
          coverUrl: t.image_url || t.coverUrl,
          title: t.title,
        }))
        .filter((t: any) => Boolean(t.audioUrl));
      if (normalized.length > 0) {
        this.finalizeTracksSuccess(
          task,
          normalized,
          {
            title: task.title,
            lyrics: task.lyrics || '',
            genre: task.genre,
            promptStyle: task.promptStyle,
            vocalType: task.vocalType,
            bpm: task.bpm,
            userId: task.userId,
          },
          task.provider
        );
        return true;
      }
    }
    return false;
  }

  private finalizeStemsSuccess(
    task: MusicGenerationTask,
    stems: { vocals?: string; instrumental?: string; drums?: string; bass?: string }
  ) {
    task.status = 'completed';
    task.progress = 100;
    task.resultStems = stems;
    task.resultAudioUrl = stems.vocals || stems.instrumental;
    task.updatedAt = new Date().toISOString();
    task.logs.push(`[${new Date().toLocaleTimeString()}] Tách Vocal & Instrumental thành công!`);
    db.getState().apiUsage.successfulGenerations += 1;
    db.save();
    this.addLog(task.id, 'success', `Separated stems for task ${task.id}`, task.provider);
  }

  private finalizeTracksSuccess(
    task: MusicGenerationTask,
    tracks: Array<{ audioUrl: string; coverUrl?: string; title?: string }>,
    params: GenerationParams,
    providerId: AIProviderId
  ) {
    const state = db.getState();
    const versionLimit = Math.max(1, Math.min(2, params.versionCount || tracks.length));
    const selectedTracks = tracks.slice(0, versionLimit);

    const createdSongs: Song[] = selectedTracks.map((tr, idx) => ({
      id: `song-${Date.now()}-${idx + 1}`,
      title:
        tr.title ||
        (selectedTracks.length > 1 ? `${task.title} (Phiên bản ${idx + 1})` : task.title),
      artist: `AI Artist (${providerId.toUpperCase()})`,
      genre: task.genre,
      vocalType: task.vocalType,
      vocalLanguage: task.vocalLanguage,
      duration: params.duration || 180,
      coverUrl: tr.coverUrl || '/images/album_cover_vinahouse_1794018465637.jpg',
      audioUrl: tr.audioUrl,
      lyrics: task.lyrics || '',
      promptStyle: task.promptStyle,
      bpm: task.bpm,
      createdAt: new Date().toISOString(),
      isFavorite: false,
      playsCount: 1,
      likesCount: 0,
      downloadsCount: 0,
      userId: params.userId || 'user-demo',
      userName: params.userName || 'Thành Viên',
      provider: providerId,
      taskId: task.id,
      isRealAiGenerated: true,
      isAiCover: task.type === 'cover',
      voiceModelId: params.voiceModelId,
    }));

    task.status = 'completed';
    task.progress = 100;
    task.resultAudioUrl = createdSongs[0].audioUrl;
    task.resultCoverUrl = createdSongs[0].coverUrl;
    task.songData = createdSongs[0];
    task.songsData = createdSongs;
    task.updatedAt = new Date().toISOString();
    task.logs.push(
      `[${new Date().toLocaleTimeString()}] HOÀN TẤT! Đã nhận ${createdSongs.length} file âm thanh thật từ ${providerId.toUpperCase()}.`
    );

    createdSongs.slice().reverse().forEach((s) => state.songs.unshift(s));
    state.apiUsage.successfulGenerations += 1;
    state.apiUsage.estimatedCostUsd = Number((state.apiUsage.estimatedCostUsd + 0.04 * createdSongs.length).toFixed(2));

    if (params.userId) {
      const u = state.users.find((user) => user.id === params.userId);
      if (u) {
        if (task.type === 'cover') u.coversCount += createdSongs.length;
        else u.savedSongsCount += createdSongs.length;
      }
    }

    db.save();
    this.addLog(
      task.id,
      'success',
      `Generated ${createdSongs.length} real track(s) via ${providerId}`,
      providerId
    );
  }
}

export const providerManager = new MusicProviderManager();
