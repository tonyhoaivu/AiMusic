import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Repeat,
  Shuffle,
  Download,
  FileText,
  X,
  AlertCircle,
} from 'lucide-react';
import { Song, Language } from '../types';
import { translations } from '../utils/translations';
import { AudioVisualizer } from './AudioVisualizer';

interface MusicPlayerProps {
  currentSong: Song | null;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrev: () => void;
  lang: Language;
  playlist: Song[];
  onSelectSong: (song: Song) => void;
  onOpenSongDetail?: (song: Song) => void;
}

export const MusicPlayer: React.FC<MusicPlayerProps> = ({
  currentSong,
  isPlaying,
  onTogglePlay,
  onNext,
  onPrev,
  lang,
  onOpenSongDetail,
}) => {
  const t = translations[lang].player;

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(180);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  const [audioWarning, setAudioWarning] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const hasRealAudio = Boolean(currentSong?.audioUrl && currentSong.audioUrl.trim().length > 0);

  useEffect(() => {
    if (!currentSong) return;

    setDuration(currentSong.duration || 180);
    setCurrentTime(0);
    setAudioWarning(null);

    if (!audioRef.current) return;

    if (!currentSong.audioUrl) {
      audioRef.current.removeAttribute('src');
      audioRef.current.load();
      if (isPlaying) {
        setAudioWarning(
          lang === 'vi'
            ? 'Bài hát mẫu Showcase chưa có file audio thật. Hãy tạo nhạc mới bằng AI API thực tế!'
            : 'Showcase item has no real AI audio file yet. Generate a real track in Create AI Music!'
        );
      }
      return;
    }

    audioRef.current.src = currentSong.audioUrl;
    if (isPlaying) {
      audioRef.current.play().catch((err) => {
        console.log('Audio playback error:', err);
        setAudioWarning('Trình duyệt chặn tự phát hoặc URL âm thanh không hợp lệ.');
      });
    }
  }, [currentSong]);

  useEffect(() => {
    if (!audioRef.current || !currentSong) return;
    if (!currentSong.audioUrl) {
      if (isPlaying) {
        setAudioWarning(
          lang === 'vi'
            ? 'Bài hát mẫu Showcase chưa có file audio thật. Hãy kết nối API Key và tạo nhạc AI thực tế!'
            : 'No real audio file attached to this showcase item.'
        );
      }
      return;
    }

    if (isPlaying) {
      audioRef.current.play().catch((err) => console.log('Audio play error:', err));
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying, currentSong]);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      if (audioRef.current.duration && !isNaN(audioRef.current.duration)) {
        setDuration(audioRef.current.duration);
      }
    }
  };

  const handleEnded = () => {
    if (isRepeat && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play();
    } else {
      onNext();
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (audioRef.current && hasRealAudio) {
      audioRef.current.currentTime = newTime;
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = parseFloat(e.target.value);
    setVolume(newVol);
    setIsMuted(newVol === 0);
    if (audioRef.current) {
      audioRef.current.volume = newVol;
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      if (isMuted) {
        audioRef.current.volume = volume || 0.8;
        setIsMuted(false);
      } else {
        audioRef.current.volume = 0;
        setIsMuted(true);
      }
    }
  };

  const handleDownload = () => {
    if (!currentSong || !currentSong.audioUrl) {
      setAudioWarning(
        lang === 'vi'
          ? 'Không có file audio thực tế để tải xuống.'
          : 'No real audio stream available to download.'
      );
      return;
    }
    const url = currentSong.audioUrl.startsWith('/')
      ? currentSong.audioUrl
      : `/api/audio/download?url=${encodeURIComponent(currentSong.audioUrl)}&filename=${encodeURIComponent(currentSong.title)}.mp3`;
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentSong.title.replace(/\s+/g, '_')}_AIMusicStudio.mp3`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  if (!currentSong) return null;

  return (
    <>
      <audio ref={audioRef} onTimeUpdate={handleTimeUpdate} onEnded={handleEnded} />

      {audioWarning && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-amber-950/95 border border-amber-500/50 text-amber-200 text-xs px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 max-w-md">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{audioWarning}</span>
          <button onClick={() => setAudioWarning(null)} className="ml-2 text-amber-300 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Bottom Player Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#0d0b1d]/95 backdrop-blur-xl border-t border-slate-200 dark:border-purple-900/30 px-4 py-2.5 transition-all shadow-2xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Track Info (Left) */}
          <div
            onClick={() => onOpenSongDetail && onOpenSongDetail(currentSong)}
            className="flex items-center gap-3 min-w-[160px] max-w-[260px] cursor-pointer group"
          >
            <div className="relative shrink-0">
              <img
                src={currentSong.coverUrl || '/images/album_cover_vinahouse_1794018465637.jpg'}
                alt={currentSong.title}
                className="w-12 h-12 rounded-lg object-cover shadow-md border border-purple-500/20"
              />
              {isPlaying && hasRealAudio && (
                <div className="absolute inset-0 bg-purple-950/60 rounded-lg flex items-center justify-center">
                  <div className="flex items-end gap-0.5 h-4">
                    <span className="w-1 bg-cyan-400 animate-bar-1 rounded-full"></span>
                    <span className="w-1 bg-purple-400 animate-bar-2 rounded-full"></span>
                    <span className="w-1 bg-purple-300 animate-bar-3 rounded-full"></span>
                  </div>
                </div>
              )}
            </div>

            <div className="truncate">
              <h4 className="font-semibold text-sm text-slate-900 dark:text-slate-100 group-hover:text-purple-600 dark:group-hover:text-purple-300 truncate">
                {currentSong.title}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {currentSong.artist}
              </p>
            </div>
          </div>

          {/* Player Controls & Scrubber (Center) */}
          <div className="flex-1 max-w-2xl flex flex-col items-center gap-1">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsShuffle(!isShuffle)}
                className={`p-1.5 rounded-lg text-xs transition-colors ${
                  isShuffle
                    ? 'text-purple-600 dark:text-purple-400'
                    : 'text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Shuffle"
              >
                <Shuffle className="w-4 h-4" />
              </button>

              <button
                onClick={onPrev}
                className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
                title="Previous Track"
              >
                <SkipBack className="w-5 h-5" />
              </button>

              <button
                onClick={onTogglePlay}
                className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white flex items-center justify-center shadow-lg shadow-purple-600/25 transition-transform active:scale-95"
              >
                {isPlaying && hasRealAudio ? (
                  <Pause className="w-5 h-5" />
                ) : (
                  <Play className="w-5 h-5 ml-0.5" />
                )}
              </button>

              <button
                onClick={onNext}
                className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
                title="Next Track"
              >
                <SkipForward className="w-5 h-5" />
              </button>

              <button
                onClick={() => setIsRepeat(!isRepeat)}
                className={`p-1.5 rounded-lg text-xs transition-colors ${
                  isRepeat
                    ? 'text-purple-600 dark:text-purple-400'
                    : 'text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Repeat"
              >
                <Repeat className="w-4 h-4" />
              </button>
            </div>

            <div className="w-full flex items-center gap-3 text-[11px] font-mono text-slate-500 dark:text-slate-400">
              <span>{formatTime(currentTime)}</span>
              <div className="flex-1 relative flex items-center">
                <input
                  type="range"
                  min={0}
                  max={duration || 100}
                  value={currentTime}
                  onChange={handleSeek}
                  className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500 focus:outline-none"
                />
              </div>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Extra Actions (Right) */}
          <div className="hidden lg:flex items-center gap-3 min-w-[200px] justify-end">
            <AudioVisualizer isPlaying={isPlaying && hasRealAudio} className="w-24 h-8" />

            <button
              onClick={() => setShowLyrics(!showLyrics)}
              className={`p-2 rounded-lg text-xs transition-colors border ${
                showLyrics
                  ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-500/40'
                  : 'text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-white'
              }`}
              title={t.lyricsBtn}
            >
              <FileText className="w-4 h-4" />
            </button>

            <button
              onClick={handleDownload}
              className={`p-2 rounded-lg text-xs border transition-colors ${
                hasRealAudio
                  ? 'text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-purple-500'
                  : 'text-slate-400 border-slate-200 dark:border-slate-800 opacity-60'
              }`}
              title={hasRealAudio ? t.downloadBtn : 'Chưa có file audio thật'}
            >
              <Download className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2">
              <button onClick={toggleMute} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
                {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-16 h-1 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Lyrics Drawer */}
      {showLyrics && (
        <div className="fixed bottom-20 right-4 z-50 w-96 max-w-[calc(100vw-2rem)] max-h-[480px] bg-white/95 dark:bg-[#120e29]/95 backdrop-blur-xl border border-slate-200 dark:border-purple-500/30 rounded-2xl p-5 shadow-2xl overflow-y-auto">
          <div className="flex items-center justify-between mb-4 border-b border-slate-200 dark:border-purple-900/30 pb-3">
            <h3 className="font-outfit font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-purple-500 dark:text-purple-400" />
              <span>{t.lyricsBtn}</span>
            </h3>
            <button
              onClick={() => setShowLyrics(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="whitespace-pre-wrap font-sans text-sm text-slate-700 dark:text-slate-200 leading-relaxed space-y-2">
            {currentSong.lyrics || (
              <p className="text-slate-500 italic text-center py-6">
                Chưa có lời cho bài hát này.
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
};
