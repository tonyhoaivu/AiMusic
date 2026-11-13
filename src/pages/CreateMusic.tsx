import React, { useState, useEffect, useRef } from 'react';
import {
  Wand2,
  Sparkles,
  Play,
  Download,
  Flame,
  AlertTriangle,
  RefreshCw,
  Sliders,
  ExternalLink,
} from 'lucide-react';
import { Song, Language, MusicGenre, VocalType, MusicGenerationTask, ProviderCapabilities } from '../types';
import { translations } from '../utils/translations';
import {
  requestGenerateLyrics,
  generateRealAIMusic,
  pollMusicTask,
  fetchProviderStatus,
  logSongDownload,
} from '../services/api';

interface CreateMusicProps {
  onSongCreated: (song: Song) => void;
  onSongsCreated?: (songs: Song[]) => void;
  onPlaySong: (song: Song) => void;
  onToggleFavorite: (id: string) => void;
  onNavigate: (tab: string) => void;
  lang: Language;
}

const GENRES: MusicGenre[] = [
  'Nhạc trẻ',
  'EDM',
  'Remix',
  'Dance',
  'Pop',
  'Ballad',
  'Bolero',
  'Rap',
  'Rock',
  'Nhạc dân tộc Việt Nam',
  'Nhạc trữ tình',
  'Nhạc thiếu nhi',
  'Vinahouse',
  'Dân ca Việt Nam',
  'Nhạc Tây Bắc',
  'Nhạc dân tộc Lào Cai',
  'Acoustic',
  'Lofi',
];

const MOODS = [
  'Vui tươi',
  'Sôi động',
  'Sâu lắng',
  'Trầm buồn',
  'Trữ tình',
  'Epic / Hùng tráng',
  'Chill / Thư giãn',
];
const INSTRUMENTS = [
  'Synthesizer',
  'Piano',
  'Acoustic Guitar',
  'Electric Bass',
  'Khèn Tây Bắc',
  'Đàn Bầu',
  'Drums',
];

export const CreateMusic: React.FC<CreateMusicProps> = ({
  onSongCreated,
  onSongsCreated,
  onPlaySong,
  onNavigate,
  lang,
}) => {
  const t = translations[lang].create;

  const [title, setTitle] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [promptStyle, setPromptStyle] = useState('');
  const [genre, setGenre] = useState<MusicGenre>('Nhạc trẻ');
  const [vocalType, setVocalType] = useState<VocalType>('male');
  const [vocalLanguage, setVocalLanguage] = useState<Language | 'auto'>(lang);
  const [bpm, setBpm] = useState(125);
  const [mood, setMood] = useState('Sôi động');
  const [selectedInstruments, setSelectedInstruments] = useState<string[]>(['Synthesizer', 'Drums']);
  const [duration, setDuration] = useState(120);
  const [versionCount, setVersionCount] = useState<1 | 2>(2);

  const [isGeneratingLyrics, setIsGeneratingLyrics] = useState(false);
  const [isGeneratingMusic, setIsGeneratingMusic] = useState(false);
  const [currentTask, setCurrentTask] = useState<MusicGenerationTask | null>(null);
  const [createdSongs, setCreatedSongs] = useState<Song[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isApiConfigured, setIsApiConfigured] = useState<boolean>(false);
  const [isProviderEnabled, setIsProviderEnabled] = useState<boolean>(true);
  const [activeProviderName, setActiveProviderName] = useState<string>('SUNO');
  const [capabilities, setCapabilities] = useState<ProviderCapabilities | null>(null);

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetchProviderStatus().then((status) => {
      if (status) {
        setIsApiConfigured(status.isConfigured);
        setIsProviderEnabled(status.enabled !== false);
        setActiveProviderName(status.provider.toUpperCase());
        if (status.capabilities) setCapabilities(status.capabilities);
      }
    });

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const handleAutoLyrics = async () => {
    setIsGeneratingLyrics(true);
    setStatusMessage(null);
    setErrorMessage(null);
    try {
      const res = await requestGenerateLyrics({
        prompt: title || promptStyle || 'Bài hát âm nhạc hiện đại',
        genre,
        mood,
        language: lang,
      });
      if (!res.success) {
        setErrorMessage(res.error || 'Chưa cấu hình GEMINI_API_KEY để tự động viết lời.');
        return;
      }
      setLyrics(res.lyrics);
      setStatusMessage('Đã tạo lời bài hát bằng Gemini AI thành công!');
    } finally {
      setIsGeneratingLyrics(false);
    }
  };

  const toggleInstrument = (inst: string) => {
    if (selectedInstruments.includes(inst)) {
      setSelectedInstruments(selectedInstruments.filter((i) => i !== inst));
    } else {
      setSelectedInstruments([...selectedInstruments, inst]);
    }
  };

  const handleGenerateMusic = async () => {
    if (!title.trim()) {
      setErrorMessage('Vui lòng nhập tên bài hát trước khi tạo nhạc!');
      return;
    }

    setErrorMessage(null);
    setStatusMessage(null);
    setIsGeneratingMusic(true);
    setCurrentTask(null);

    const res = await generateRealAIMusic({
      title: title.trim(),
      lyrics: lyrics.trim(),
      genre,
      promptStyle: promptStyle || `${genre}, ${mood}, ${selectedInstruments.join(', ')}`,
      vocalType,
      vocalLanguage,
      duration,
      bpm,
      versionCount,
    });

    if (!res.success) {
      setIsGeneratingMusic(false);
      setErrorMessage(res.error || 'Không thể gửi yêu cầu tạo nhạc AI.');
      return;
    }

    if (res.task) {
      setCurrentTask(res.task);

      pollingRef.current = setInterval(async () => {
        const pollRes = await pollMusicTask(res.task!.id);
        if (pollRes.success && pollRes.task) {
          setCurrentTask(pollRes.task);

          if (pollRes.task.status === 'completed') {
            if (pollingRef.current) clearInterval(pollingRef.current);
            setIsGeneratingMusic(false);

            const generatedList =
              pollRes.task.songsData && pollRes.task.songsData.length > 0
                ? pollRes.task.songsData
                : pollRes.task.songData
                ? [pollRes.task.songData]
                : [];

            if (generatedList.length > 0) {
              if (onSongsCreated) {
                onSongsCreated(generatedList);
              } else {
                generatedList.slice().reverse().forEach((s) => onSongCreated(s));
              }
              setCreatedSongs((prev) => [...generatedList, ...prev]);
              onPlaySong(generatedList[0]);
            }
          } else if (pollRes.task.status === 'failed') {
            if (pollingRef.current) clearInterval(pollingRef.current);
            setIsGeneratingMusic(false);
            setErrorMessage(pollRes.task.error || 'Quá trình tạo nhạc AI thất bại.');
          }
        }
      }, 2500);
    }
  };

  const handleDownload = (song: Song) => {
    logSongDownload(song.id, 'MP3', { title: song.title, audioUrl: song.audioUrl });
    const a = document.createElement('a');
    a.href = `/api/audio/download?url=${encodeURIComponent(song.audioUrl)}&filename=${encodeURIComponent(song.title)}.mp3`;
    a.download = `${song.title.replace(/\s+/g, '_')}_AIMusicStudio.mp3`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-8 pb-24">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-purple-900/30 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-purple-100 dark:bg-purple-600/20 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-500/30">
            <Wand2 className="w-6 h-6" />
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
            <span>
              API: {activeProviderName} ({isApiConfigured ? 'Sẵn sàng' : 'Chưa nhập Key'})
            </span>
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

      {(!isApiConfigured || !isProviderEnabled) && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-500/40 text-amber-900 dark:text-amber-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">
                {!isProviderEnabled
                  ? `Nhà cung cấp ${activeProviderName} hiện đang bị TẮT bởi Quản trị viên`
                  : 'Chưa cấu hình API Key dịch vụ AI Music thực tế'}
              </p>
              <p className="opacity-90 mt-0.5 leading-relaxed">
                Hệ thống không sử dụng file nhạc mẫu giả lập. Vui lòng đăng nhập Admin để bật nhà cung cấp và nhập API Key của Suno, MiniMax, Replicate hoặc FAL.ai để tạo file MP3/WAV thật.
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

      {capabilities && (
        <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-purple-900/30 text-[11px] text-slate-600 dark:text-slate-300 flex flex-wrap items-center justify-between gap-2">
          <span>
            <strong className="text-purple-600 dark:text-cyan-400">{activeProviderName}:</strong>{' '}
            {capabilities.notes}
          </span>
          <div className="flex flex-wrap gap-2 font-mono">
            <span className={capabilities.supportsVocals ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600'}>
              {capabilities.supportsVocals ? '✓ Có giọng hát' : '• Chỉ nhạc không lời'}
            </span>
            <span>|</span>
            <span>Tối đa {capabilities.maxDurationSec}s</span>
            {capabilities.supportsTwoVersions && (
              <>
                <span>|</span>
                <span className="text-emerald-600 dark:text-emerald-400">✓ Hỗ trợ 2 phiên bản</span>
              </>
            )}
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-500/50 text-rose-800 dark:text-rose-200 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-xs underline font-semibold"
          >
            Đóng
          </button>
        </div>
      )}

      {statusMessage && (
        <div className="p-3.5 rounded-2xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-500/40 text-xs text-purple-800 dark:text-purple-200 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-cyan-500 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-purple-900/30 rounded-2xl p-5 space-y-2 shadow-sm">
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              1. {t.songTitle} <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t.songTitlePlaceholder}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-purple-900/40 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-purple-500"
            />
          </div>

          <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-purple-900/30 rounded-2xl p-5 space-y-3 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                2. {t.lyricsInput}
              </label>
              <button
                type="button"
                onClick={handleAutoLyrics}
                disabled={isGeneratingLyrics}
                className="px-3 py-1.5 rounded-xl bg-purple-100 dark:bg-purple-900/60 hover:bg-purple-200 dark:hover:bg-purple-800 border border-purple-200 dark:border-purple-500/40 text-purple-800 dark:text-purple-200 font-semibold text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5 text-cyan-500" />
                <span>{isGeneratingLyrics ? t.generatingLyrics : t.autoLyricsBtn}</span>
              </button>
            </div>

            <textarea
              rows={6}
              value={lyrics}
              onChange={(e) => setLyrics(e.target.value)}
              placeholder={t.lyricsPlaceholder}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-purple-900/40 rounded-xl p-4 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 font-mono focus:outline-none focus:border-purple-500 leading-relaxed"
            />
          </div>

          <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-purple-900/30 rounded-2xl p-5 space-y-2 shadow-sm">
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              3. {t.styleLabel}
            </label>
            <input
              type="text"
              value={promptStyle}
              onChange={(e) => setPromptStyle(e.target.value)}
              placeholder={t.stylePlaceholder}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-purple-900/40 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-purple-500"
            />
          </div>
        </div>

        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-purple-900/30 rounded-2xl p-5 space-y-3 shadow-sm">
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              4. {t.genreLabel}
            </label>
            <div className="flex flex-wrap gap-2 max-h-52 overflow-y-auto pr-1">
              {GENRES.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGenre(g)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    genre === g
                      ? 'bg-gradient-to-r from-purple-600 to-cyan-500 text-white shadow-md'
                      : 'bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-purple-900/30'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-purple-900/30 rounded-2xl p-5 space-y-4 shadow-sm">
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              5. {t.vocalLabel} & Ngôn ngữ hát
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { type: 'male', label: t.vocalMale },
                { type: 'female', label: t.vocalFemale },
                { type: 'duet', label: t.vocalDuet },
                { type: 'instrumental', label: t.vocalInstrumental },
              ].map((v) => (
                <button
                  key={v.type}
                  type="button"
                  onClick={() => setVocalType(v.type as VocalType)}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all ${
                    vocalType === v.type
                      ? 'bg-purple-600 text-white border border-purple-400'
                      : 'bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-purple-900/30'
                  }`}
                >
                  {v.label}
                </button>
              ))}
            </div>

            {vocalType !== 'instrumental' && (
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                  Ngôn ngữ giọng hát (Vocal Language)
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'vi', label: 'Tiếng Việt' },
                    { id: 'en', label: 'English' },
                    { id: 'auto', label: 'Tự động' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setVocalLanguage(item.id as any)}
                      className={`py-1.5 px-2 rounded-lg text-xs font-semibold ${
                        vocalLanguage === item.id
                          ? 'bg-cyan-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-purple-900/30'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-purple-900/30 rounded-2xl p-5 space-y-4 shadow-sm">
            <div>
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                <span>{t.bpmLabel}</span>
                <span className="font-mono text-purple-600 dark:text-purple-300">{bpm} BPM</span>
              </div>
              <input
                type="range"
                min={70}
                max={160}
                value={bpm}
                onChange={(e) => setBpm(parseInt(e.target.value))}
                className="w-full h-2 bg-slate-200 dark:bg-slate-950 rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {t.moodLabel}
              </label>
              <select
                value={mood}
                onChange={(e) => setMood(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-purple-900/40 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-purple-500"
              >
                {MOODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {t.instrumentsLabel}
              </label>
              <div className="flex flex-wrap gap-1.5">
                {INSTRUMENTS.map((inst) => {
                  const isSel = selectedInstruments.includes(inst);
                  return (
                    <button
                      key={inst}
                      type="button"
                      onClick={() => toggleInstrument(inst)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                        isSel
                          ? 'bg-cyan-100 dark:bg-cyan-500/20 text-cyan-800 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-500/40'
                          : 'bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-purple-900/20'
                      }`}
                    >
                      {inst}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {t.durationLabel}
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {[60, 120, 180, 240].map((sec) => (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => setDuration(sec)}
                      className={`py-1.5 rounded-lg text-xs font-semibold ${
                        duration === sec
                          ? 'bg-purple-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {sec}s
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Số phiên bản
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {([1, 2] as const).map((cnt) => (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() => setVersionCount(cnt)}
                      className={`py-1.5 rounded-lg text-xs font-semibold ${
                        versionCount === cnt
                          ? 'bg-cyan-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {cnt} bản
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGenerateMusic}
            disabled={isGeneratingMusic}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-purple-600 via-purple-500 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white font-extrabold text-base shadow-xl shadow-purple-600/25 flex items-center justify-center gap-2 transition-all transform active:scale-95 disabled:opacity-50"
          >
            {isGeneratingMusic ? (
              <>
                <RefreshCw className="w-5 h-5 text-white animate-spin" />
                <span>Đang gửi đến {activeProviderName}...</span>
              </>
            ) : (
              <>
                <Flame className="w-5 h-5 text-amber-300" />
                <span>{t.btnGenerate}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Live Task Progress Modal */}
      {isGeneratingMusic && currentTask && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#120e2d] border border-slate-200 dark:border-purple-500/40 rounded-3xl p-6 md:p-8 w-full max-w-xl shadow-2xl space-y-6 text-center">
            <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-purple-200 dark:border-purple-900 border-t-purple-500 animate-spin"></div>
              <Sparkles className="w-8 h-8 text-cyan-500" />
            </div>

            <div>
              <h3 className="font-outfit font-extrabold text-xl text-slate-900 dark:text-white">
                Đang Tạo Nhạc Qua {activeProviderName}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Tác vụ: <span className="font-mono text-purple-600 dark:text-purple-300 font-bold">{currentTask.id}</span>
              </p>
            </div>

            <div className="space-y-2">
              <div className="w-full bg-slate-200 dark:bg-slate-900 rounded-full h-3 overflow-hidden p-0.5">
                <div
                  className="bg-gradient-to-r from-purple-600 to-cyan-400 h-full rounded-full transition-all duration-500"
                  style={{ width: `${currentTask.progress}%` }}
                ></div>
              </div>
              <p className="text-xs font-mono text-purple-600 dark:text-purple-300 font-bold">
                {currentTask.progress}%
              </p>
            </div>

            <div className="text-left bg-slate-950 p-4 rounded-2xl border border-purple-900/40 max-h-48 overflow-y-auto space-y-1.5 font-mono text-xs">
              {currentTask.logs.map((log, idx) => (
                <p key={idx} className="text-slate-300 leading-relaxed text-[11px]">
                  {log}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}

      {createdSongs.length > 0 && (
        <div className="space-y-4 pt-6 border-t border-slate-200 dark:border-purple-900/30">
          <h2 className="font-outfit font-extrabold text-xl text-slate-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-500" />
            <span>Bài Hát Đã Tạo Thành Công Từ API Thật</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {createdSongs.map((song) => (
              <div
                key={song.id}
                className="bg-white dark:bg-slate-900/80 border border-emerald-400/60 rounded-2xl p-4 flex items-center justify-between gap-4 shadow-md"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <img
                    src={song.coverUrl || '/images/album_cover_vinahouse_1794018465637.jpg'}
                    alt={song.title}
                    className="w-14 h-14 rounded-xl object-cover shrink-0 ring-1 ring-emerald-500/50"
                  />
                  <div className="truncate">
                    <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">
                      {song.title}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {song.artist}
                    </p>
                    <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-500/40 px-2 py-0.5 rounded-md inline-block mt-1">
                      Real AI Audio Stream
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => onPlaySong(song)}
                    className="w-10 h-10 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center shadow-lg transition-transform active:scale-95"
                    title="Phát bài hát"
                  >
                    <Play className="w-5 h-5 ml-0.5" />
                  </button>
                  <button
                    onClick={() => handleDownload(song)}
                    className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                    title="Tải MP3 thực tế"
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
