import React, { useState, useEffect, useRef } from 'react';
import {
  Mic2,
  Upload,
  Link as LinkIcon,
  Sliders,
  Play,
  Download,
  Music2,
  RefreshCw,
  Layers,
  AlertTriangle,
  ExternalLink,
  CheckCircle2,
} from 'lucide-react';
import { Song, Language, VoiceModel, MusicGenerationTask } from '../types';
import { translations } from '../utils/translations';
import { INITIAL_VOICE_MODELS } from '../services/mockData';
import {
  generateRealAICover,
  pollCoverTask,
  fetchProviderStatus,
  uploadAudioFile,
  logSongDownload,
} from '../services/api';

interface AICoverProps {
  onSongCreated: (song: Song) => void;
  onPlaySong: (song: Song) => void;
  onNavigate: (tab: string) => void;
  lang: Language;
}

export const AICover: React.FC<AICoverProps> = ({
  onSongCreated,
  onPlaySong,
  onNavigate,
  lang,
}) => {
  const t = translations[lang].cover;

  const [voiceModels] = useState<VoiceModel[]>(INITIAL_VOICE_MODELS);
  const [selectedModelId, setSelectedModelId] = useState<string>(INITIAL_VOICE_MODELS[0].id);
  const [genderFilter, setGenderFilter] = useState<'all' | 'male' | 'female'>('all');

  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [audioUrlInput, setAudioUrlInput] = useState<string>('');
  const [customVoiceFileName, setCustomVoiceFileName] = useState<string>('');

  const [similarity, setSimilarity] = useState<number>(85);
  const [pitchShift, setPitchShift] = useState<number>(0);
  const [volumeBalance, setVolumeBalance] = useState<number>(70);
  const [keepOriginalInst, setKeepOriginalInst] = useState<boolean>(true);
  const [separateVocals, setSeparateVocals] = useState<boolean>(true);

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [currentTask, setCurrentTask] = useState<MusicGenerationTask | null>(null);
  const [coverVersions, setCoverVersions] = useState<Song[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isApiConfigured, setIsApiConfigured] = useState<boolean>(false);
  const [activeProviderName, setActiveProviderName] = useState<string>('REPLICATE / SUNO');

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetchProviderStatus().then((status) => {
      if (status) {
        setIsApiConfigured(status.isConfigured);
        setActiveProviderName(status.provider.toUpperCase());
      }
    });

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const filteredModels = voiceModels.filter((m) =>
    genderFilter === 'all' ? true : m.gender === genderFilter
  );

  const selectedModel = voiceModels.find((m) => m.id === selectedModelId) || voiceModels[0];

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage(null);
    setIsUploading(true);
    try {
      const uploadRes = await uploadAudioFile(file);
      if (!uploadRes.success || !uploadRes.url) {
        setErrorMessage(uploadRes.error || 'Tải file lên máy chủ thất bại.');
        return;
      }
      setUploadedFileName(file.name);
      setAudioUrlInput(uploadRes.url);
    } finally {
      setIsUploading(false);
    }
  };

  const handleCustomVoiceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCustomVoiceFileName(file.name);
  };

  const handleStartCover = async () => {
    if (!audioUrlInput.trim()) {
      setErrorMessage(
        'Vui lòng tải lên file âm thanh bài hát (MP3/WAV) hoặc dán đường dẫn URL âm thanh công khai!'
      );
      return;
    }

    setErrorMessage(null);
    setIsProcessing(true);
    setCurrentTask(null);

    const songTitle = uploadedFileName
      ? uploadedFileName.replace(/\.[^/.]+$/, '')
      : 'Bản Nhạc Gốc';

    const res = await generateRealAICover({
      title: `${songTitle} (AI Cover ${selectedModel.name})`,
      audioInputUrl: audioUrlInput.trim(),
      voiceModelId: selectedModel.id,
      similarity,
      pitchShift,
      volumeBalance,
      keepOriginalInst,
      separateVocals,
      genre: 'Pop',
      vocalType: selectedModel.gender,
    });

    if (!res.success) {
      setIsProcessing(false);
      setErrorMessage(res.error || 'Không thể bắt đầu tác vụ AI Cover.');
      return;
    }

    if (res.task) {
      setCurrentTask(res.task);

      pollingRef.current = setInterval(async () => {
        const pollRes = await pollCoverTask(res.task!.id);
        if (pollRes.success && pollRes.task) {
          setCurrentTask(pollRes.task);

          if (pollRes.task.status === 'completed') {
            if (pollingRef.current) clearInterval(pollingRef.current);
            setIsProcessing(false);

            if (pollRes.task.songData) {
              onSongCreated(pollRes.task.songData);
              setCoverVersions((prev) => [pollRes.task!.songData!, ...prev]);
              onPlaySong(pollRes.task.songData);
            }
          } else if (pollRes.task.status === 'failed') {
            if (pollingRef.current) clearInterval(pollingRef.current);
            setIsProcessing(false);
            setErrorMessage(pollRes.task.error || 'Xử lý AI Cover thất bại.');
          }
        }
      }, 2500);
    }
  };

  const handleDownload = (song: Song) => {
    logSongDownload(song.id, 'MP3', { title: song.title, audioUrl: song.audioUrl });
    const a = document.createElement('a');
    a.href = `/api/audio/download?url=${encodeURIComponent(song.audioUrl)}&filename=${encodeURIComponent(song.title)}.mp3`;
    a.download = `${song.title.replace(/\s+/g, '_')}_AICover.mp3`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-8 pb-24">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-purple-900/30 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-cyan-100 dark:bg-cyan-600/20 text-cyan-600 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-500/30">
            <Mic2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-outfit font-extrabold text-2xl md:text-3xl text-slate-900 dark:text-white">
              {t.title}
            </h1>
            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">{t.subtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 ${
              isApiConfigured
                ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-300'
                : 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-500/40 text-amber-800 dark:text-amber-300'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isApiConfigured ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
            ></span>
            <span>Cover Engine: {activeProviderName}</span>
          </div>

          <button
            onClick={() => onNavigate('admin')}
            className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-purple-900/40 hover:border-purple-500 text-xs text-slate-700 dark:text-slate-300 flex items-center gap-1 transition-colors"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Cấu hình API</span>
          </button>
        </div>
      </div>

      <div className="p-3.5 rounded-2xl bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-500/30 text-xs text-cyan-800 dark:text-cyan-200">
        <strong>Bản quyền & Quyền sử dụng giọng hát:</strong> Hệ thống chỉ sử dụng các mô hình giọng AI được cấp phép hoặc giọng mẫu do chính bạn tải lên và sở hữu quyền sử dụng hợp pháp.
      </div>

      {!isApiConfigured && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-500/40 text-amber-900 dark:text-amber-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Chưa cấu hình API Key dịch vụ AI Cover (Replicate RVC / Suno API)</p>
              <p className="opacity-90 mt-0.5 leading-relaxed">
                Để tách giọng thực tế (Demucs) và chuyển đổi giọng hát bằng RVC Voice Conversion, vui lòng cấu hình API Key trong trang Admin.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('admin')}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shrink-0 flex items-center gap-1.5 self-start sm:self-auto transition-colors"
          >
            <span>Cấu hình API ngay</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-500/50 text-rose-800 dark:text-rose-200 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-xs underline font-semibold">
            Đóng
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-purple-900/30 rounded-2xl p-5 space-y-4 shadow-sm">
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Upload className="w-4 h-4 text-purple-500" />
              <span>1. Tải lên bài hát gốc hoặc dán đường dẫn</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="border-2 border-dashed border-slate-300 dark:border-purple-900/50 hover:border-purple-500 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer bg-slate-50 dark:bg-slate-950/60 transition-colors">
                {isUploading ? (
                  <RefreshCw className="w-8 h-8 text-purple-500 mb-2 animate-spin" />
                ) : (
                  <Upload className="w-8 h-8 text-purple-500 mb-2" />
                )}
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  {isUploading ? 'Đang tải file lên máy chủ...' : t.uploadSong}
                </span>
                <span className="text-[11px] text-slate-500 mt-1">MP3, WAV (Tối đa 25MB)</span>
                {uploadedFileName && (
                  <span className="mt-3 px-3 py-1 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded-full text-xs font-mono font-semibold truncate max-w-full flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {uploadedFileName}
                  </span>
                )}
                <input type="file" accept="audio/*" onChange={handleFileUpload} className="hidden" />
              </label>

              <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-purple-900/40 rounded-2xl p-5 flex flex-col justify-between">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                    <LinkIcon className="w-3.5 h-3.5 text-cyan-500" />
                    <span>{t.audioUrlInput}</span>
                  </label>
                  <input
                    type="url"
                    value={audioUrlInput}
                    onChange={(e) => setAudioUrlInput(e.target.value)}
                    placeholder="https://example.com/song.mp3"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-purple-900/40 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div className="pt-3 border-t border-slate-200 dark:border-purple-900/20">
                  <label className="cursor-pointer text-[11px] text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1">
                    <Music2 className="w-3.5 h-3.5" />
                    <span>{t.uploadVoiceSample}</span>
                    <input
                      type="file"
                      accept="audio/*"
                      onChange={handleCustomVoiceUpload}
                      className="hidden"
                    />
                  </label>
                  {customVoiceFileName && (
                    <p className="text-[10px] text-cyan-600 dark:text-cyan-400 font-mono mt-1">
                      Giọng mẫu: {customVoiceFileName}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-purple-900/30 rounded-2xl p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Mic2 className="w-4 h-4 text-cyan-500" />
                <span>2. {t.selectModel}</span>
              </h3>

              <div className="flex gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl text-xs font-semibold">
                {(['all', 'male', 'female'] as const).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGenderFilter(g)}
                    className={`px-3 py-1 rounded-lg transition-colors ${
                      genderFilter === g
                        ? 'bg-purple-600 text-white'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {g === 'all' ? 'Tất cả' : g === 'male' ? 'Nam' : 'Nữ'}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-h-72 overflow-y-auto pr-1">
              {filteredModels.map((model) => {
                const isSelected = selectedModelId === model.id;
                return (
                  <div
                    key={model.id}
                    onClick={() => setSelectedModelId(model.id)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col items-center text-center space-y-2 ${
                      isSelected
                        ? 'bg-purple-50 dark:bg-purple-950/60 border-purple-500 shadow-md'
                        : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-purple-900/20 hover:border-purple-400'
                    }`}
                  >
                    <img
                      src={model.avatarUrl}
                      alt={model.name}
                      className="w-14 h-14 rounded-full object-cover ring-2 ring-purple-500/30"
                    />
                    <div className="truncate w-full">
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                        {model.name}
                      </p>
                      <span className="text-[10px] text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/40 px-2 py-0.5 rounded-full inline-block mt-0.5">
                        {model.category}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-purple-900/30 rounded-2xl p-5 space-y-5 shadow-sm">
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Sliders className="w-4 h-4 text-purple-500" />
              <span>3. Tinh chỉnh thông số AI Cover</span>
            </h3>

            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                <span>{t.similarity}</span>
                <span className="font-mono text-cyan-600 dark:text-cyan-400">{similarity}%</span>
              </div>
              <input
                type="range"
                min={10}
                max={100}
                value={similarity}
                onChange={(e) => setSimilarity(parseInt(e.target.value))}
                className="w-full h-2 bg-slate-200 dark:bg-slate-950 rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                <span>{t.pitchShift}</span>
                <span className="font-mono text-purple-600 dark:text-purple-300">
                  {pitchShift > 0 ? `+${pitchShift}` : pitchShift} st
                </span>
              </div>
              <input
                type="range"
                min={-12}
                max={12}
                value={pitchShift}
                onChange={(e) => setPitchShift(parseInt(e.target.value))}
                className="w-full h-2 bg-slate-200 dark:bg-slate-950 rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                <span>{t.volumeBalance}</span>
                <span className="font-mono text-cyan-600 dark:text-cyan-400">
                  {volumeBalance}% Voice
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={volumeBalance}
                onChange={(e) => setVolumeBalance(parseInt(e.target.value))}
                className="w-full h-2 bg-slate-200 dark:bg-slate-950 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
            </div>

            <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-purple-900/20 text-xs">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={keepOriginalInst}
                  onChange={(e) => setKeepOriginalInst(e.target.checked)}
                  className="w-4 h-4 rounded text-purple-600 focus:ring-0"
                />
                <span className="text-slate-700 dark:text-slate-300">{t.keepOriginalInst}</span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={separateVocals}
                  onChange={(e) => setSeparateVocals(e.target.checked)}
                  className="w-4 h-4 rounded text-purple-600 focus:ring-0"
                />
                <span className="text-slate-700 dark:text-slate-300">{t.separateVocals}</span>
              </label>
            </div>
          </div>

          <button
            type="button"
            onClick={handleStartCover}
            disabled={isProcessing}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-cyan-600 via-purple-600 to-purple-500 hover:from-cyan-500 hover:to-purple-400 text-white font-extrabold text-base shadow-xl shadow-cyan-600/25 flex items-center justify-center gap-2 transition-all transform active:scale-95 disabled:opacity-50"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="w-5 h-5 text-white animate-spin" />
                <span>Đang xử lý Cover qua AI...</span>
              </>
            ) : (
              <>
                <Mic2 className="w-5 h-5 text-cyan-200" />
                <span>{t.btnStartCover}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {isProcessing && currentTask && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#100d2b] border border-cyan-500/40 rounded-3xl p-6 md:p-8 w-full max-w-xl shadow-2xl space-y-6 text-center">
            <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-cyan-200 dark:border-cyan-900 border-t-cyan-400 animate-spin"></div>
              <RefreshCw className="w-8 h-8 text-purple-500 animate-spin" />
            </div>

            <div>
              <h3 className="font-outfit font-extrabold text-xl text-slate-900 dark:text-white">
                Đang Thực Hiện AI Cover Với {selectedModel.name}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Tác vụ: <span className="font-mono text-cyan-600 dark:text-cyan-300 font-bold">{currentTask.id}</span>
              </p>
            </div>

            <div className="space-y-2">
              <div className="w-full bg-slate-200 dark:bg-slate-900 rounded-full h-3 overflow-hidden p-0.5">
                <div
                  className="bg-gradient-to-r from-cyan-500 to-purple-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${currentTask.progress}%` }}
                ></div>
              </div>
              <p className="text-xs font-mono text-cyan-600 dark:text-cyan-300 font-bold">
                {currentTask.progress}%
              </p>
            </div>

            <div className="text-left bg-slate-950 p-4 rounded-2xl border border-cyan-900/40 max-h-48 overflow-y-auto space-y-1.5 font-mono text-xs">
              {currentTask.logs.map((log, idx) => (
                <p key={idx} className="text-slate-300 leading-relaxed text-[11px]">
                  {log}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}

      {coverVersions.length > 0 && (
        <div className="space-y-4 pt-6 border-t border-slate-200 dark:border-purple-900/30">
          <h2 className="font-outfit font-extrabold text-xl text-slate-900 dark:text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-cyan-500" />
            <span>Các Phiên Bản AI Cover Đã Tạo Thực Tế</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {coverVersions.map((song) => (
              <div
                key={song.id}
                className="bg-white dark:bg-slate-900/80 border border-cyan-400/60 rounded-2xl p-4 flex items-center justify-between gap-4 shadow-md"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <img
                    src={song.coverUrl || '/images/album_cover_ai_cover_1794018468271.jpg'}
                    alt={song.title}
                    className="w-14 h-14 rounded-xl object-cover shrink-0 ring-1 ring-cyan-500/50"
                  />
                  <div className="truncate">
                    <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">
                      {song.title}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {song.artist}
                    </p>
                    <span className="text-[10px] font-semibold text-cyan-700 dark:text-cyan-300 bg-cyan-100 dark:bg-cyan-950/60 border border-cyan-300 dark:border-cyan-500/30 px-2 py-0.5 rounded-md inline-block mt-1">
                      Real AI Vocal Conversion
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => onPlaySong(song)}
                    className="w-10 h-10 rounded-full bg-cyan-600 hover:bg-cyan-500 text-white flex items-center justify-center shadow-lg transition-transform active:scale-95"
                  >
                    <Play className="w-5 h-5 ml-0.5" />
                  </button>
                  <button
                    onClick={() => handleDownload(song)}
                    className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
