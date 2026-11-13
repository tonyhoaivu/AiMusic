export interface ProcessedAudioResult {
  blob: Blob;
  url: string;
  durationSec: number;
  sampleRate: number;
  channels: number;
}

function getAudioContext(): AudioContext {
  const Ctx = window.AudioContext || (window as any).webkitAudioContext;
  return new Ctx();
}

export async function decodeAudioFile(file: File): Promise<AudioBuffer> {
  const ctx = getAudioContext();
  try {
    const arr = await file.arrayBuffer();
    return await ctx.decodeAudioData(arr);
  } finally {
    await ctx.close().catch(() => {});
  }
}

function encodeWavFromAudioBuffer(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const length = buffer.length;
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const dataSize = length * blockAlign;
  const arrayBuffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(arrayBuffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  const channels: Float32Array[] = [];
  for (let c = 0; c < numChannels; c++) {
    channels.push(buffer.getChannelData(c));
  }

  let offset = 44;
  for (let i = 0; i < length; i++) {
    for (let c = 0; c < numChannels; c++) {
      const sample = Math.max(-1, Math.min(1, channels[c][i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

export async function processSingleAudioFile(
  file: File,
  options: {
    startSec?: number;
    endSec?: number;
    volumePercent?: number;
    normalize?: boolean;
    noiseReduce?: boolean;
  } = {}
): Promise<ProcessedAudioResult> {
  const decoded = await decodeAudioFile(file);
  const sr = decoded.sampleRate;
  const totalSec = decoded.duration;

  const start = Math.max(0, Math.min(options.startSec ?? 0, totalSec));
  const end =
    options.endSec && options.endSec > start
      ? Math.min(options.endSec, totalSec)
      : totalSec;

  const startSample = Math.floor(start * sr);
  const endSample = Math.max(startSample + 1, Math.floor(end * sr));
  const frameCount = endSample - startSample;

  const tempCtx = getAudioContext();
  const sliced = tempCtx.createBuffer(decoded.numberOfChannels, frameCount, sr);
  await tempCtx.close().catch(() => {});

  for (let c = 0; c < decoded.numberOfChannels; c++) {
    const src = decoded.getChannelData(c);
    const dst = sliced.getChannelData(c);
    for (let i = 0; i < frameCount; i++) {
      dst[i] = src[startSample + i] || 0;
    }
  }

  // Optional noise gate smoothing on very quiet hiss floor
  if (options.noiseReduce) {
    const threshold = 0.012;
    for (let c = 0; c < sliced.numberOfChannels; c++) {
      const ch = sliced.getChannelData(c);
      for (let i = 0; i < ch.length; i++) {
        if (Math.abs(ch[i]) < threshold) {
          ch[i] *= 0.15;
        }
      }
    }
  }

  // Render through OfflineAudioContext for filtering & gain
  const offline = new OfflineAudioContext(sliced.numberOfChannels, sliced.length, sr);
  const source = offline.createBufferSource();
  source.buffer = sliced;

  let currentNode: AudioNode = source;

  if (options.noiseReduce) {
    const highpass = offline.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = 85;

    const lowpass = offline.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 14000;

    currentNode.connect(highpass);
    highpass.connect(lowpass);
    currentNode = lowpass;
  }

  let gainFactor = (options.volumePercent ?? 100) / 100;
  if (options.normalize) {
    let peak = 0;
    for (let c = 0; c < sliced.numberOfChannels; c++) {
      const ch = sliced.getChannelData(c);
      for (let i = 0; i < ch.length; i++) {
        const a = Math.abs(ch[i]);
        if (a > peak) peak = a;
      }
    }
    if (peak > 0.001) {
      gainFactor *= 0.92 / peak;
    }
  }

  const gainNode = offline.createGain();
  gainNode.gain.value = Math.min(4, Math.max(0, gainFactor));

  currentNode.connect(gainNode);
  gainNode.connect(offline.destination);
  source.start(0);

  const rendered = await offline.startRendering();
  const blob = encodeWavFromAudioBuffer(rendered);
  const url = URL.createObjectURL(blob);

  return {
    blob,
    url,
    durationSec: rendered.duration,
    sampleRate: rendered.sampleRate,
    channels: rendered.numberOfChannels,
  };
}

export async function mergeTwoAudioFiles(
  fileA: File,
  fileB: File,
  volumePercent = 100
): Promise<ProcessedAudioResult> {
  const [bufA, bufB] = await Promise.all([decodeAudioFile(fileA), decodeAudioFile(fileB)]);
  const targetSr = Math.max(bufA.sampleRate, bufB.sampleRate);
  const numChannels = Math.max(bufA.numberOfChannels, bufB.numberOfChannels);
  const totalSec = bufA.duration + bufB.duration;

  const offline = new OfflineAudioContext(
    numChannels,
    Math.ceil(totalSec * targetSr),
    targetSr
  );

  const gainNode = offline.createGain();
  gainNode.gain.value = Math.min(3, Math.max(0, volumePercent / 100));
  gainNode.connect(offline.destination);

  const srcA = offline.createBufferSource();
  srcA.buffer = bufA;
  srcA.connect(gainNode);
  srcA.start(0);

  const srcB = offline.createBufferSource();
  srcB.buffer = bufB;
  srcB.connect(gainNode);
  srcB.start(bufA.duration);

  const rendered = await offline.startRendering();
  const blob = encodeWavFromAudioBuffer(rendered);
  const url = URL.createObjectURL(blob);

  return {
    blob,
    url,
    durationSec: rendered.duration,
    sampleRate: rendered.sampleRate,
    channels: rendered.numberOfChannels,
  };
}
