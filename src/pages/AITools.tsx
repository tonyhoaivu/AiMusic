import React, { useState, useEffect, useRef } from 'react';
import {
  Sliders,
  FileText,
  Shuffle,
  Music,
  Scissors,
  Layers,
  Sparkles,
  Play,
  Download,
  AlertTriangle,
  Upload,
  Volume2,
  Waves,
  FileAudio,
  GitMerge,
  RefreshCw,
} from 'lucide-react';
import { Language, Song, MusicGenerationTask } from '../types';
import { translations } from '../utils/translations';
import {
  requestGenerateLyrics,
  requestAnalyzeMusicStyle,
  generateRealAIMusic,
  requestStemsSeparation,
  pollMusicTask,
  fetchProviderStatus,
  uploadAudioFile,
  logSongDownload,
} from '../services/api';
import {
  processSingleAudioFile,
  mergeTwoAudioFiles,
  ProcessedAudioResult,
} from '../services/audioProcessor';

interface AIToolsProps {
  onSongCreated: (song: Song) => void;
  onPlaySong: (song: Song) => void;
  lang: Language;
}

type ToolId =
  | 'stems'
  | 'convert'
  | 'trim'
  | 'merge'
  | 'volume'
  | 'beat'
  | 'denoise'
  | 'lyrics'
  | 'style';

export const AITools: React.FC<AIToolsProps> = ({
  onSongCreated,
  onPlaySong,
  lang,
}) => {
  const t = translations[lang].tools;

  const [activeTool, setActiveTool] = useState<ToolId>('stems');
  const [inputPrompt, setInputPrompt] = useState<string>('');
  const [genre, setGenre] = useState<string>('Pop');
  const [outputText, setOutputText] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [generatedSongResult, setGeneratedSongResult] = useState<Song | null>(null);
  const [stemsTask, setStemsTask] = useState<MusicGenerationTask | null>(null);

  // Real upload + DSP state
  const [audioFileA, setAudioFileA] = useState<File | null>(null);
  const [audioFileB, setAudioFileB] = useState<File | null>(null);
  const [uploadedAudioUrl, setUploadedAudioUrl] = useState<string>('');
  const [startSec, setStartSec] = useState<number>(0);
  const [endSec, setEndSec] = useState<number>(30);
  const [volumePercent, setVolumePercent] = useState<number>(120);
  const [normalizeVolume, setNormalizeVolume] = useState<boolean>(false);
  const [processedAudio, setProcessedAudio] = useState<ProcessedAudioResult | null>(null);

  const [isMusicProviderConfigured, setIsMusicProviderConfigured] = useState<boolean>(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetchProviderStatus().then((s) => {
      if (s) setIsMusicProviderConfigured(s.isConfigured);
    });
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const toolsList: Array<{
    id: ToolId;
    name: string;
    icon: any;
    desc: string;
    badge: string;
  }> = [
    {
      id: 'stems',
      name: 'Tách Vocal & Instrumental',
      icon: Layers,
      desc: 'Tách giọng hát, nhạc nền, trống, bass qua AI (Demucs)',
      badge: 'AI API',
    },
    {
      id: 'convert',
      name: 'Chuyển Đổi Định Dạng',
      icon: FileAudio,
      desc: 'Giải mã MP3/OGG/M4A và xuất chuẩn WAV PCM 16-bit',
      badge: 'Audio DSP',
    },
    {
      id: 'trim',
      name: 'Cắt Nhạc (Trim Audio)',
      icon: Scissors,
      desc: 'Cắt đoạn âm thanh theo thời gian giây chính xác',
      badge: 'Audio DSP',
    },
    {
      id: 'merge',
      name: 'Ghép 2 File Nhạc',
      icon: GitMerge,
      desc: 'Ghép nối tiếp 2 bản nhạc thành một file âm thanh liền mạch',
      badge: 'Audio DSP',
    },
    {
      id: 'volume',
      name: 'Điều Chỉnh Âm Lượng',
      icon: Volume2,
      desc: 'Tăng/giảm Gain (%) và chuẩn hóa Peak Normalize',
      badge: 'Audio DSP',
    },
    {
      id: 'beat',
      name: 'Tạo Beat / Instrumental',
      icon: Music,
      desc: 'Sáng tác beat không lời qua API tạo nhạc AI thực tế',
      badge: 'AI API',
    },
    {
      id: 'denoise',
      name: 'Xóa Tạp Âm (Noise Reduction)',
      icon: Waves,
      desc: 'Lọc tiếng ù nền <85Hz, lọc rít và Noise Gate làm sạch âm',
      badge: 'Audio DSP',
    },
    {
      id: 'lyrics',
      name: t.lyricsTitle,
      icon: FileText,
      desc: 'Sáng tác lời bài hát tự động bằng Gemini AI',
      badge: 'Gemini AI',
    },
    {
      id: 'style',
      name: t.styleTitle,
      icon: Shuffle,
      desc: 'Phân tích phong cách, BPM & nhạc cụ bằng Gemini AI',
      badge: 'Gemini AI',
    },
  ];

  const isDspTool = ['convert', 'trim', 'merge', 'volume', 'denoise'].includes(activeTool);
  const isTextTool = ['lyrics', 'style'].includes(activeTool);

  const handleSelectFileA = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAudioFileA(file);
    setProcessedAudio(null);
    setErrorMessage(null);
  };

  const handleSelectFileB = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAudioFileB(file);
    setProcessedAudio(null);
    setErrorMessage(null);
  };

  const handleExecuteTool = async () => {
    setErrorMessage(null);
    setOutputText('');
    setGeneratedSongResult(null);
    setStemsTask(null);
    setProcessedAudio(null);
    setIsProcessing(true);

    try {
      // 1. Gemini Text Tools
      if (activeTool === 'lyrics') {
        const res = await requestGenerateLyrics({
          prompt: inputPrompt || 'Bài hát về mùa thu và kỷ niệm đẹp',
          genre,
          mood: 'Sâu lắng',
          language: lang,
        });
        if (!res.success) setErrorMessage(res.error || 'Chưa cấu hình GEMINI_API_KEY.');
        else setOutputText(res.lyrics);
        setIsProcessing(false);
        return;
      }

      if (activeTool === 'style') {
        const res = await requestAnalyzeMusicStyle(
          inputPrompt || `Nhạc ${genre} hiện đại giàu cảm xúc`,
          genre
        );
        if (!res.success) setErrorMessage(res.error || 'Chưa cấu hình GEMINI_API_KEY.');
        else setOutputText(res.analysis || '');
        setIsProcessing(false);
        return;
      }

      // 2. Real Client-Side Audio DSP Tools
      if (isDspTool) {
        if (!audioFileA) {
          setIsProcessing(false);
          setErrorMessage('Vui lòng chọn file âm thanh (MP3/WAV) từ máy tính của bạn trước.');
          return;
        }

        if (activeTool === 'merge') {
          if (!audioFileB) {
            setIsProcessing(false);
            setErrorMessage('Vui lòng chọn thêm File Nhạc Thứ 2 để ghép nối.');
            return;
          }
          const merged = await mergeTwoAudioFiles(audioFileA, audioFileB, volumePercent);
          setProcessedAudio(merged);
          setIsProcessing(false);
          return;
        }

        const result = await processSingleAudioFile(audioFileA, {
          startSec: activeTool === 'trim' ? startSec : undefined,
          endSec: activeTool === 'trim' ? endSec : undefined,
          volumePercent: activeTool === 'volume' ? volumePercent : 100,
          normalize: activeTool === 'volume' ? normalizeVolume : false,
          noiseReduce: activeTool === 'denoise',
        });
        setProcessedAudio(result);
        setIsProcessing(false);
        return;
      }

      // 3. Stems Separation via Real Backend AI Provider (Demucs)
      if (activeTool === 'stems') {
        let targetUrl = uploadedAudioUrl.trim();
        if (!targetUrl && audioFileA) {
          const uploadRes = await uploadAudioFile(audioFileA);
          if (!uploadRes.success || !uploadRes.url) {
            setIsProcessing(false);
            setErrorMessage(uploadRes.error || 'Không thể tải file lên máy chủ.');
            return;
          }
          targetUrl = uploadRes.url;
          setUploadedAudioUrl(targetUrl);
        }

        if (!targetUrl) {
          setIsProcessing(false);
          setErrorMessage('Vui lòng tải lên file MP3/WAV hoặc dán URL âm thanh công khai để tách Vocal & Instrumental.');
          return;
        }

        const stemsRes = await requestStemsSeparation(
          audioFileA?.name || 'Tách Vocal & Instrumental',
          targetUrl
        );
        if (!stemsRes.success || !stemsRes.task) {
          setIsProcessing(false);
          setErrorMessage(stemsRes.error || 'Không thể bắt đầu tách stems.');
          return;
        }

        setStemsTask(stemsRes.task);
        pollingRef.current = setInterval(async () => {
          const poll = await pollMusicTask(stemsRes.task!.id);
          if (poll.success && poll.task) {
            setStemsTask(poll.task);
            if (poll.task.status === 'completed') {
              if (pollingRef.current) clearInterval(pollingRef.current);
              setIsProcessing(false);
            } else if (poll.task.status === 'failed') {
              if (pollingRef.current) clearInterval(pollingRef.current);
              setIsProcessing(false);
              setErrorMessage(poll.task.error || 'Tách Vocal thất bại.');
            }
          }
        }, 2500);
        return;
      }

      // 4. AI Beat Creation (Real AI Music API with instrumental mode)
      const res = await generateRealAIMusic({
        title: `Beat ${genre} - ${inputPrompt ? inputPrompt.slice(0, 24) : 'Studio'}`,
        lyrics: '',
        genre,
        promptStyle: `${genre} instrumental beat, ${inputPrompt || 'clean punchy drums, bass, studio mix'}`,
        vocalType: 'instrumental',
        duration: 120,
        bpm: genre === 'Vinahouse' ? 138 : genre === 'Rap' ? 95 : 120,
      });

      if (!res.success || !res.task) {
        setIsProcessing(false);
        setErrorMessage(
          res.error || 'Chưa cấu hình API Key dịch vụ AI Music thực tế trong trang Admin.'
        );
        return;
      }

      const taskId = res.task.id;
      pollingRef.current = setInterval(async () => {
        const poll = await pollMusicTask(taskId);
        if (poll.success && poll.task) {
          if (poll.task.status === 'completed' && poll.task.songData) {
            if (pollingRef.current) clearInterval(pollingRef.current);
            setIsProcessing(false);
            onSongCreated(poll.task.songData);
            setGeneratedSongResult(poll.task.songData);
            onPlaySong(poll.task.songData);
          } else if (poll.task.status === 'failed') {
            if (pollingRef.current) clearInterval(pollingRef.current);
            setIsProcessing(false);
            setErrorMessage(poll.task.error || 'Tạo Beat thất bại.');
          }
        }
      }, 2500);
    } catch (err: any) {
      setIsProcessing(false);
      setErrorMessage(err.message || 'Lỗi xử lý âm thanh.');
    }
  };

  const handleDownloadSong = (song: Song) => {
    logSongDownload(song.id, 'MP3', { title: song.title, audioUrl: song.audioUrl });
    const a = document.createElement('a');
    a.href = `/api/audio/download?url=${encodeURIComponent(song.audioUrl)}&filename=${encodeURIComponent(song.title)}.mp3`;
    a.download = `${song.title.replace(/\s+/g, '_')}_Beat.mp3`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDownloadWav = () => {
    if (!processedAudio) return;
    const baseName = (audioFileA?.name || 'audio').replace(/\.[^/.]+$/, '');
    const a = document.createElement('a');
    a.href = processedAudio.url;
    a.download = `${baseName}_${activeTool}_AIMusicStudio.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-8 pb-24">
      <div className="border-b border-slate-200 dark:border-purple-900/30 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-purple-100 dark:bg-purple-600/20 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-500/30">
            <Sliders className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-outfit font-extrabold text-2xl md:text-3xl text-slate-900 dark:text-white">
              {t.title}
            </h1>
            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">
              Tách Vocal, Tạo Beat AI, Chuyển định dạng, Cắt ghép, Điều chỉnh âm lượng & Xóa tạp âm thực tế
            </p>
          </div>
        </div>
      </div>

      {/* Tools Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {toolsList.map((tool) => {
          const Icon = tool.icon;
          const isSelected = activeTool === tool.id;

          return (
            <button
              key={tool.id}
              onClick={() => {
                setActiveTool(tool.id);
                setGeneratedSongResult(null);
                setStemsTask(null);
                setProcessedAudio(null);
                setOutputText('');
                setErrorMessage(null);
              }}
              className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                isSelected
                  ? 'bg-purple-600 border-purple-500 shadow-lg text-white'
                  : 'bg-white dark:bg-slate-900/60 border-slate-200 dark:border-purple-900/30 text-slate-700 dark:text-slate-300 hover:border-purple-400'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Icon
                    className={`w-5 h-5 ${
                      isSelected ? 'text-white' : 'text-purple-500 dark:text-cyan-400'
                    }`}
                  />
                  <span
                    className={`text-[9px] font-bold px-2 py-0.5 rounded-md ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {tool.badge}
                  </span>
                </div>
                <h4 className="font-outfit font-bold text-xs leading-snug">{tool.name}</h4>
              </div>
              <p
                className={`text-[10px] mt-1.5 line-clamp-2 ${
                  isSelected ? 'text-purple-100' : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {tool.desc}
              </p>
            </button>
          );
        })}
      </div>

      {/* Tool Workspace */}
      <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-purple-900/30 rounded-3xl p-6 md:p-8 space-y-6 shadow-sm">
        <h3 className="font-outfit font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-cyan-500" />
          <span>{toolsList.find((item) => item.id === activeTool)?.name}</span>
        </h3>

        {(activeTool === 'stems' || activeTool === 'beat') && !isMusicProviderConfigured && (
          <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-500/40 text-amber-800 dark:text-amber-200 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>
              Chức năng AI Backend yêu cầu Admin cấu hình API Key thực tế (Replicate API Token cho Demucs tách Vocal, hoặc Suno/FAL/MiniMax cho Tạo Beat).
            </span>
          </div>
        )}

        {errorMessage && (
          <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-500/50 text-rose-800 dark:text-rose-200 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Controls per tool type */}
        {(isDspTool || activeTool === 'stems') && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="border-2 border-dashed border-slate-300 dark:border-purple-900/50 hover:border-purple-500 rounded-2xl p-5 flex flex-col items-center justify-center text-center cursor-pointer bg-slate-50 dark:bg-slate-950/60">
                <Upload className="w-7 h-7 text-purple-500 mb-2" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {audioFileA ? audioFileA.name : 'Chọn file âm thanh gốc (MP3, WAV, OGG...)'}
                </span>
                <span className="text-[11px] text-slate-500 mt-1">
                  {audioFileA
                    ? `${(audioFileA.size / (1024 * 1024)).toFixed(2)} MB`
                    : 'Tải từ thiết bị của bạn'}
                </span>
                <input type="file" accept="audio/*" onChange={handleSelectFileA} className="hidden" />
              </label>

              {activeTool === 'merge' ? (
                <label className="border-2 border-dashed border-cyan-300 dark:border-cyan-800 hover:border-cyan-500 rounded-2xl p-5 flex flex-col items-center justify-center text-center cursor-pointer bg-slate-50 dark:bg-slate-950/60">
                  <Upload className="w-7 h-7 text-cyan-500 mb-2" />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {audioFileB ? audioFileB.name : 'Chọn file nhạc thứ 2 để ghép nối tiếp'}
                  </span>
                  <span className="text-[11px] text-slate-500 mt-1">
                    {audioFileB
                      ? `${(audioFileB.size / (1024 * 1024)).toFixed(2)} MB`
                      : 'Ghép nối tiếp ngay sau file 1'}
                  </span>
                  <input type="file" accept="audio/*" onChange={handleSelectFileB} className="hidden" />
                </label>
              ) : activeTool === 'stems' ? (
                <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-purple-900/40 rounded-2xl p-5 flex flex-col justify-center">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Hoặc dán Audio URL công khai (https://...)
                  </label>
                  <input
                    type="url"
                    value={uploadedAudioUrl}
                    onChange={(e) => setUploadedAudioUrl(e.target.value)}
                    placeholder="https://example.com/song.mp3"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-purple-900/40 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-200"
                  />
                </div>
              ) : null}
            </div>

            {activeTool === 'trim' && (
              <div className="grid grid-cols-2 gap-4 max-w-md">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Từ giây thứ (Start Sec)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    value={startSec}
                    onChange={(e) => setStartSec(Number(e.target.value) || 0)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-purple-900/40 rounded-xl px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Đến giây thứ (End Sec)
                  </label>
                  <input
                    type="number"
                    min={1}
                    step={0.5}
                    value={endSec}
                    onChange={(e) => setEndSec(Number(e.target.value) || 30)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-purple-900/40 rounded-xl px-3 py-2 text-xs"
                  />
                </div>
              </div>
            )}

            {(activeTool === 'volume' || activeTool === 'merge') && (
              <div className="space-y-3 max-w-md">
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span>Mức âm lượng đầu ra (Gain)</span>
                    <span className="font-mono text-purple-600 dark:text-cyan-400">{volumePercent}%</span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={250}
                    value={volumePercent}
                    onChange={(e) => setVolumePercent(Number(e.target.value))}
                    className="w-full accent-purple-600"
                  />
                </div>
                {activeTool === 'volume' && (
                  <label className="flex items-center gap-2 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={normalizeVolume}
                      onChange={(e) => setNormalizeVolume(e.target.checked)}
                    />
                    <span>Chuẩn hóa âm lượng cực đại tự động (Peak Normalize -0.7dB)</span>
                  </label>
                )}
              </div>
            )}
          </div>
        )}

        {(isTextTool || activeTool === 'beat') && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Chọn Thể Loại
              </label>
              <select
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-purple-900/40 rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:border-purple-500"
              >
                <option value="Nhạc trẻ">Nhạc trẻ</option>
                <option value="Pop">Pop</option>
                <option value="Ballad">Ballad</option>
                <option value="Bolero">Bolero</option>
                <option value="Vinahouse">Vinahouse</option>
                <option value="EDM">EDM</option>
                <option value="Remix">Remix</option>
                <option value="Rap">Rap / Hip-Hop Beat</option>
                <option value="Nhạc dân tộc Việt Nam">Nhạc dân tộc Việt Nam</option>
                <option value="Lofi">Lofi Chill</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isTextTool ? 'Chủ đề hoặc mô tả ý tưởng' : 'Mô tả phong cách Beat / Nhạc cụ'}
              </label>
              <input
                type="text"
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                placeholder="VD: Giai điệu sâu lắng, piano kết hợp 808 bass..."
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-purple-900/40 rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>
        )}

        <button
          onClick={handleExecuteTool}
          disabled={isProcessing}
          className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white font-bold text-xs shadow-lg flex items-center gap-2 transition-all disabled:opacity-50"
        >
          {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          <span>{isProcessing ? 'Đang xử lý âm thanh...' : 'Thực Hiện Xử Lý Ngay'}</span>
        </button>

        {/* Output: Processed Client Web Audio WAV */}
        {processedAudio && (
          <div className="bg-slate-50 dark:bg-slate-950 border border-emerald-400/50 rounded-2xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h4 className="font-bold text-sm text-emerald-700 dark:text-emerald-300">
                  Xử Lý Âm Thanh Thành Công (WAV Studio Master)
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                  Thời lượng: {processedAudio.durationSec.toFixed(1)}s • {processedAudio.sampleRate}Hz • {processedAudio.channels} kênh
                </p>
              </div>
              <button
                onClick={handleDownloadWav}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5"
              >
                <Download className="w-4 h-4" />
                <span>Tải File WAV</span>
              </button>
            </div>
            <audio controls src={processedAudio.url} className="w-full" />
          </div>
        )}

        {/* Output: Stems Separation (Demucs) */}
        {stemsTask && stemsTask.resultStems && (
          <div className="bg-slate-50 dark:bg-slate-950 border border-cyan-400/50 rounded-2xl p-5 space-y-4">
            <h4 className="font-bold text-sm text-cyan-700 dark:text-cyan-300">
              Kết Quả Tách Vocal & Nhạc Nền (Demucs 4 Stems)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(stemsTask.resultStems).map(([stemName, stemUrl]) =>
                stemUrl ? (
                  <div
                    key={stemName}
                    className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-purple-900/30 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase text-purple-600 dark:text-cyan-300">
                        {stemName}
                      </span>
                      <a
                        href={`/api/audio/download?url=${encodeURIComponent(stemUrl)}&filename=${stemName}.wav`}
                        className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 hover:underline"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Tải xuống
                      </a>
                    </div>
                    <audio controls src={stemUrl} className="w-full h-9" />
                  </div>
                ) : null
              )}
            </div>
          </div>
        )}

        {/* Output: Gemini Text */}
        {outputText && (
          <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-purple-900/40 rounded-2xl p-5 mt-4 space-y-2">
            <h4 className="text-xs font-bold text-purple-600 dark:text-purple-300 uppercase">
              Kết Quả Từ Gemini AI:
            </h4>
            <pre className="whitespace-pre-wrap font-sans text-sm text-slate-800 dark:text-slate-200 leading-relaxed">
              {outputText}
            </pre>
          </div>
        )}

        {/* Output: AI Beat */}
        {generatedSongResult && (
          <div className="bg-slate-50 dark:bg-slate-950 border border-emerald-400/50 rounded-2xl p-5 mt-4 flex items-center justify-between gap-4">
            <div>
              <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                {generatedSongResult.title}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {generatedSongResult.artist}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => onPlaySong(generatedSongResult)}
                className="w-9 h-9 rounded-full bg-purple-600 text-white flex items-center justify-center"
              >
                <Play className="w-4 h-4 ml-0.5" />
              </button>
              <button
                onClick={() => handleDownloadSong(generatedSongResult)}
                className="p-2 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
