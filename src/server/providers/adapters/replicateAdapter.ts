import {
  ProviderAdapter,
  ProviderEntryConfig,
  AdapterGenerationParams,
  AdapterTestResult,
  AdapterSubmitResult,
  AdapterPollResult,
} from './types.js';

export const replicateAdapter: ProviderAdapter = {
  id: 'replicate',
  displayName: 'Replicate (MusicGen + Demucs + RVC)',
  defaultBaseUrl: 'https://api.replicate.com/v1',
  defaultModel: 'meta/musicgen',
  capabilities: {
    supportsMusicGeneration: true,
    supportsVocals: false,
    supportsLyrics: false,
    supportsTwoVersions: false,
    supportsCover: true,
    supportsStemSeparation: true,
    supportsInstrumental: true,
    maxDurationSec: 30,
    notes:
      'MusicGen tạo nhạc nền/giai điệu (tối đa 30s, không hát theo lời). Demucs tách vocal/instrumental và RVC thực hiện AI Cover.',
  },

  async testConnection(cfg: ProviderEntryConfig): Promise<AdapterTestResult> {
    const start = Date.now();
    const res = await fetch('https://api.replicate.com/v1/models/meta/musicgen', {
      headers: { Authorization: `Bearer ${cfg.apiKey}` },
    });
    const latencyMs = Date.now() - start;

    if (res.ok) {
      return {
        success: true,
        provider: 'replicate',
        statusCode: 200,
        latencyMs,
        message: `Kết nối Replicate thành công (${latencyMs}ms). Sẵn sàng MusicGen, Demucs & RVC.`,
      };
    }
    return {
      success: false,
      provider: 'replicate',
      statusCode: res.status,
      latencyMs,
      message: `Lỗi xác thực Replicate (HTTP ${res.status}): Vui lòng kiểm tra REPLICATE_API_TOKEN.`,
    };
  },

  async submitMusic(
    cfg: ProviderEntryConfig,
    params: AdapterGenerationParams
  ): Promise<AdapterSubmitResult> {
    const res = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cfg.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: '671ac645ce5e552cc63a87071830167b57022e4057d1bc22f4f60f7763c29437',
        input: {
          prompt: `${params.genre}, ${params.promptStyle || params.title}, ${
            params.bpm ? `${params.bpm} BPM` : ''
          }`.trim(),
          duration: Math.min(30, params.duration || 30),
          model_version: 'stereo-melody-large',
        },
        ...(params.callbackUrl ? { webhook: params.callbackUrl } : {}),
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`Replicate MusicGen lỗi HTTP ${res.status}: ${err.detail || JSON.stringify(err)}`);
    }

    const data = await res.json();
    return {
      externalTaskId: data.id,
      progressLog: `Replicate MusicGen Prediction ID: ${data.id}`,
    };
  },

  async submitCover(
    cfg: ProviderEntryConfig,
    params: AdapterGenerationParams
  ): Promise<AdapterSubmitResult> {
    if (!params.audioInputUrl || !/^https?:\/\//i.test(params.audioInputUrl)) {
      throw new Error('Replicate RVC yêu cầu URL file âm thanh công khai (https://...).');
    }
    if (/localhost|127\.0\.0\.1/i.test(params.audioInputUrl)) {
      throw new Error(
        'Replicate Cloud không thể tải file từ localhost. Hãy triển khai lên domain HTTPS hoặc nhập URL audio công khai.'
      );
    }

    const res = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cfg.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: '0a9c7c558af4c0f20667c1bd1260ce32a2879944a0b9e44e1398660c077b1550',
        input: {
          song_input: params.audioInputUrl,
          rvc_model: 'Squidward',
          pitch_change: params.pitchShift || 0,
          index_rate: Math.min(1, Math.max(0, (params.similarity || 85) / 100)),
          main_vocals_volume_change: Math.round(((params.volumeBalance ?? 70) - 50) / 5),
        },
        ...(params.callbackUrl ? { webhook: params.callbackUrl } : {}),
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`Replicate RVC lỗi HTTP ${res.status}: ${err.detail || JSON.stringify(err)}`);
    }

    const data = await res.json();
    return {
      externalTaskId: data.id,
      progressLog: `Replicate RVC AI Cover Prediction ID: ${data.id}`,
    };
  },

  async submitStems(cfg: ProviderEntryConfig, audioInputUrl: string): Promise<AdapterSubmitResult> {
    if (!audioInputUrl || !/^https?:\/\//i.test(audioInputUrl)) {
      throw new Error('Replicate Demucs yêu cầu URL file âm thanh công khai (https://...).');
    }
    if (/localhost|127\.0\.0\.1/i.test(audioInputUrl)) {
      throw new Error(
        'Replicate Cloud không thể truy cập localhost. Hãy dùng URL công khai hoặc triển khai lên domain thật.'
      );
    }

    const res = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cfg.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: '25a173108cff36ef9f80f854c162d01df9e6528be175794b81158fa03836d953',
        input: {
          audio: audioInputUrl,
        },
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`Replicate Demucs lỗi HTTP ${res.status}: ${err.detail || JSON.stringify(err)}`);
    }

    const data = await res.json();
    return {
      externalTaskId: data.id,
      progressLog: `Replicate Demucs Stem Separation ID: ${data.id}`,
    };
  },

  async pollTask(
    cfg: ProviderEntryConfig,
    externalTaskId: string,
    taskType: 'music' | 'cover' | 'stems'
  ): Promise<AdapterPollResult> {
    const res = await fetch(`https://api.replicate.com/v1/predictions/${externalTaskId}`, {
      headers: { Authorization: `Bearer ${cfg.apiKey}` },
    });

    if (!res.ok) {
      return { status: 'processing', progress: 30 };
    }

    const data = await res.json();
    if (data.status === 'succeeded') {
      if (taskType === 'stems' && data.output && typeof data.output === 'object') {
        return {
          status: 'completed',
          progress: 100,
          stems: {
            vocals: data.output.vocals,
            instrumental: data.output.other || data.output.no_vocals,
            drums: data.output.drums,
            bass: data.output.bass,
          },
          tracks: data.output.vocals ? [{ audioUrl: data.output.vocals }] : undefined,
          log: 'Tách Vocal & Stems bằng Demucs thành công!',
        };
      }

      const audioUrl = Array.isArray(data.output) ? data.output[0] : data.output;
      if (!audioUrl) {
        return { status: 'failed', error: 'Replicate thành công nhưng không có output audio URL.' };
      }
      return {
        status: 'completed',
        progress: 100,
        tracks: [{ audioUrl: String(audioUrl) }],
        log: 'Replicate xử lý audio hoàn tất!',
      };
    }

    if (data.status === 'failed' || data.status === 'canceled') {
      return {
        status: 'failed',
        error: data.error || `Replicate task ${data.status}`,
      };
    }

    return {
      status: 'processing',
      progress: data.status === 'processing' ? 65 : 25,
      log: `Replicate GPU status: ${data.status}`,
    };
  },
};
