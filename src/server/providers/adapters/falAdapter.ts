import {
  ProviderAdapter,
  ProviderEntryConfig,
  AdapterGenerationParams,
  AdapterTestResult,
  AdapterSubmitResult,
  AdapterPollResult,
} from './types.js';

export const falAdapter: ProviderAdapter = {
  id: 'fal',
  displayName: 'FAL.ai (Stable Audio)',
  defaultBaseUrl: 'https://queue.fal.run',
  defaultModel: 'fal-ai/stable-audio',
  capabilities: {
    supportsMusicGeneration: true,
    supportsVocals: false,
    supportsLyrics: false,
    supportsTwoVersions: false,
    supportsCover: false,
    supportsStemSeparation: false,
    supportsInstrumental: true,
    maxDurationSec: 47,
    notes: 'Tạo nhạc không lời (Instrumental) tốc độ cao tối đa 47s qua Stable Audio.',
  },

  async testConnection(cfg: ProviderEntryConfig): Promise<AdapterTestResult> {
    const start = Date.now();
    const res = await fetch(`${cfg.baseUrl.replace(/\/$/, '')}/${cfg.model || 'fal-ai/stable-audio'}`, {
      method: 'POST',
      headers: {
        Authorization: `Key ${cfg.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });
    const latencyMs = Date.now() - start;

    if (res.status === 401 || res.status === 403) {
      return {
        success: false,
        provider: 'fal',
        statusCode: res.status,
        latencyMs,
        message: `FAL_KEY không hợp lệ hoặc hết quyền truy cập (HTTP ${res.status}).`,
      };
    }

    return {
      success: res.status < 500,
      provider: 'fal',
      statusCode: res.status,
      latencyMs,
      message: `Kết nối FAL.ai Audio Queue thành công (HTTP ${res.status}, ${latencyMs}ms).`,
    };
  },

  async submitMusic(
    cfg: ProviderEntryConfig,
    params: AdapterGenerationParams
  ): Promise<AdapterSubmitResult> {
    const modelPath = cfg.model || 'fal-ai/stable-audio';
    const res = await fetch(`${cfg.baseUrl.replace(/\/$/, '')}/${modelPath}`, {
      method: 'POST',
      headers: {
        Authorization: `Key ${cfg.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: `${params.genre}, ${params.promptStyle || params.title}`,
        seconds_total: Math.min(47, params.duration || 30),
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`FAL.ai lỗi HTTP ${res.status}: ${err.slice(0, 200)}`);
    }

    const data = await res.json();
    if (!data.request_id) {
      throw new Error(`FAL.ai không trả về request_id: ${JSON.stringify(data).slice(0, 200)}`);
    }

    return {
      externalTaskId: data.request_id,
      progressLog: `FAL.ai Queue Request ID: ${data.request_id}`,
    };
  },

  async pollTask(cfg: ProviderEntryConfig, externalTaskId: string): Promise<AdapterPollResult> {
    const modelPath = cfg.model || 'fal-ai/stable-audio';
    const base = cfg.baseUrl.replace(/\/$/, '');
    const res = await fetch(`${base}/${modelPath}/requests/${externalTaskId}`, {
      headers: { Authorization: `Key ${cfg.apiKey}` },
    });

    if (!res.ok) {
      return { status: 'processing', progress: 45 };
    }

    const data = await res.json();
    const audioUrl = data.audio_file?.url || data.audio?.url;
    if (audioUrl) {
      return {
        status: 'completed',
        progress: 100,
        tracks: [{ audioUrl }],
        log: 'FAL.ai đã render audio thành công.',
      };
    }

    if (data.status === 'FAILED') {
      return { status: 'failed', error: data.error || 'FAL.ai task failed' };
    }

    return { status: 'processing', progress: 60 };
  },
};
