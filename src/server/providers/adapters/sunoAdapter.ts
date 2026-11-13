import {
  ProviderAdapter,
  ProviderEntryConfig,
  AdapterGenerationParams,
  AdapterTestResult,
  AdapterSubmitResult,
  AdapterPollResult,
} from './types.js';

export const sunoAdapter: ProviderAdapter = {
  id: 'suno',
  displayName: 'Suno API (Suno v3.5 / v4)',
  defaultBaseUrl: 'https://api.sunoapi.org',
  defaultModel: 'V3_5',
  capabilities: {
    supportsMusicGeneration: true,
    supportsVocals: true,
    supportsLyrics: true,
    supportsTwoVersions: true,
    supportsCover: true,
    supportsStemSeparation: false,
    supportsInstrumental: true,
    maxDurationSec: 240,
    notes: 'Hỗ trợ tạo bài hát có lời + giọng hát AI, trả về tối đa 2 phiên bản mỗi lượt.',
  },

  async testConnection(cfg: ProviderEntryConfig): Promise<AdapterTestResult> {
    const start = Date.now();
    const base = cfg.baseUrl.replace(/\/$/, '');
    const probePaths = [
      `${base}/api/v1/generate/credit`,
      `${base}/api/v1/gateway/feed?page=1&limit=1`,
    ];

    let lastStatus = 0;
    let lastBody = '';

    for (const url of probePaths) {
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${cfg.apiKey}`,
          'Content-Type': 'application/json',
        },
      });
      lastStatus = res.status;
      lastBody = await res.text();

      if (res.status === 200) {
        return {
          success: true,
          provider: 'suno',
          statusCode: 200,
          latencyMs: Date.now() - start,
          message: `Kết nối thành công tới Suno API (${Date.now() - start}ms). API Key hợp lệ.`,
        };
      }
      if (res.status === 401 || res.status === 403) {
        return {
          success: false,
          provider: 'suno',
          statusCode: res.status,
          latencyMs: Date.now() - start,
          message: `Xác thực Suno API thất bại (HTTP ${res.status}): API Key không hợp lệ hoặc hết quyền.`,
        };
      }
    }

    return {
      success: false,
      provider: 'suno',
      statusCode: lastStatus,
      latencyMs: Date.now() - start,
      message: `Suno API phản hồi HTTP ${lastStatus}: ${lastBody.slice(0, 160)}`,
    };
  },

  async submitMusic(
    cfg: ProviderEntryConfig,
    params: AdapterGenerationParams
  ): Promise<AdapterSubmitResult> {
    const base = cfg.baseUrl.replace(/\/$/, '');
    const vocalTag =
      params.vocalType === 'instrumental'
        ? 'instrumental'
        : params.vocalType === 'female'
        ? 'female vocal'
        : params.vocalType === 'duet'
        ? 'male and female duet'
        : 'male vocal';
    const langTag =
      params.vocalLanguage === 'en'
        ? 'English'
        : params.vocalLanguage === 'vi'
        ? 'Vietnamese'
        : '';

    const tags = [params.genre, params.promptStyle, vocalTag, langTag, params.bpm ? `${params.bpm} BPM` : '']
      .filter(Boolean)
      .join(', ');

    // Support both sunoapi.org v1 (/api/v1/generate) and gateway (/api/v1/gateway/generate/music)
    const isGatewayUrl = base.includes('gateway');
    const endpoint = isGatewayUrl
      ? `${base}/api/v1/gateway/generate/music`
      : `${base}/api/v1/generate`;

    const payload = {
      customMode: true,
      instrumental: params.vocalType === 'instrumental',
      make_instrumental: params.vocalType === 'instrumental',
      prompt: params.lyrics || params.promptStyle || params.title,
      style: tags,
      tags,
      title: params.title,
      model: cfg.model || 'V3_5',
      mv: cfg.model || 'chirp-v3-5',
      ...(params.callbackUrl ? { callBackUrl: params.callbackUrl } : {}),
    };

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cfg.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Suno API lỗi HTTP ${res.status}: ${text.slice(0, 220)}`);
    }

    const data = await res.json();
    if (data.code && data.code !== 200) {
      throw new Error(`Suno API từ chối yêu cầu (code ${data.code}): ${data.msg || JSON.stringify(data)}`);
    }

    const taskId = data.data?.taskId || data.data?.task_id || data.task_id || data.id;
    if (!taskId) {
      throw new Error(`Suno API không trả về taskId hợp lệ: ${JSON.stringify(data).slice(0, 200)}`);
    }

    return {
      externalTaskId: String(taskId),
      progressLog: `Đã gửi tác vụ tới Suno API (Task ID: ${taskId}).`,
    };
  },

  async submitCover(
    cfg: ProviderEntryConfig,
    params: AdapterGenerationParams
  ): Promise<AdapterSubmitResult> {
    if (!params.audioInputUrl || !/^https?:\/\//i.test(params.audioInputUrl)) {
      throw new Error('Suno Upload-Cover yêu cầu đường dẫn audio URL công khai (https://...).');
    }

    const base = cfg.baseUrl.replace(/\/$/, '');
    const res = await fetch(`${base}/api/v1/generate/upload-cover`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cfg.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        uploadUrl: params.audioInputUrl,
        customMode: true,
        instrumental: false,
        title: params.title,
        style: `${params.genre}, AI Cover, ${params.voiceModelId || 'vocal'}`,
        prompt: params.lyrics || `Cover in style of ${params.voiceModelId}`,
        model: cfg.model || 'V3_5',
        ...(params.callbackUrl ? { callBackUrl: params.callbackUrl } : {}),
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Suno Cover API lỗi HTTP ${res.status}: ${errText.slice(0, 200)}`);
    }

    const data = await res.json();
    const taskId = data.data?.taskId || data.task_id || data.id;
    if (!taskId) {
      throw new Error(`Suno Cover API không trả về taskId: ${JSON.stringify(data).slice(0, 200)}`);
    }

    return {
      externalTaskId: String(taskId),
      progressLog: `Đã gửi yêu cầu Upload-Cover tới Suno API (${taskId}).`,
    };
  },

  async pollTask(cfg: ProviderEntryConfig, externalTaskId: string): Promise<AdapterPollResult> {
    const base = cfg.baseUrl.replace(/\/$/, '');
    const endpoints = [
      `${base}/api/v1/generate/record-info?taskId=${encodeURIComponent(externalTaskId)}`,
      `${base}/api/v1/gateway/query?task_id=${encodeURIComponent(externalTaskId)}`,
    ];

    for (const url of endpoints) {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${cfg.apiKey}` },
      });
      if (!res.ok) continue;

      const json = await res.json();
      const body = json.data || json;
      const rawStatus = String(body.status || '').toUpperCase();

      if (rawStatus === 'SUCCESS' || rawStatus === 'COMPLETED') {
        const sunoList = body.response?.sunoData || body.data || (Array.isArray(body) ? body : [body]);
        const tracks = (Array.isArray(sunoList) ? sunoList : [sunoList])
          .map((item: any, idx: number) => ({
            audioUrl: item?.audioUrl || item?.audio_url || '',
            coverUrl: item?.imageUrl || item?.image_url || undefined,
            title: item?.title ? `${item.title}${sunoList.length > 1 ? ` (v${idx + 1})` : ''}` : undefined,
          }))
          .filter((t) => Boolean(t.audioUrl));

        if (tracks.length === 0) {
          return {
            status: 'failed',
            error: 'Suno API báo hoàn thành nhưng không trả về audio_url.',
          };
        }
        return {
          status: 'completed',
          progress: 100,
          tracks,
          log: `Nhận thành công ${tracks.length} phiên bản MP3 từ Suno API.`,
        };
      }

      if (
        rawStatus === 'CREATE_TASK_FAILED' ||
        rawStatus === 'GENERATE_AUDIO_FAILED' ||
        rawStatus === 'FAILED' ||
        rawStatus === 'ERROR'
      ) {
        return {
          status: 'failed',
          error: body.errorMessage || body.error_message || json.msg || 'Suno API xử lý thất bại.',
        };
      }

      return {
        status: 'processing',
        progress: rawStatus === 'TEXT_SUCCESS' || rawStatus === 'FIRST_SUCCESS' ? 70 : 40,
        log: `Trạng thái Suno API: ${rawStatus || 'PROCESSING'}...`,
      };
    }

    return {
      status: 'processing',
      progress: 35,
      log: 'Đang chờ phản hồi trạng thái từ Suno API...',
    };
  },
};
