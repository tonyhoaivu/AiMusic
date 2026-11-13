import React, { useState } from 'react';
import {
  ArrowLeft,
  Play,
  Pause,
  Heart,
  Download,
  Share2,
  Edit2,
  Trash2,
  Music,
  Clock,
  Sparkles,
  FileText,
  CheckCircle2,
} from 'lucide-react';
import { Song, Language } from '../types';
import { logSongDownload } from '../services/api';

interface SongDetailProps {
  song: Song;
  isPlaying: boolean;
  onPlaySong: (song: Song) => void;
  onToggleFavorite: (id: string) => void;
  onRenameSong: (id: string, newTitle: string) => void;
  onDeleteSong: (id: string) => void;
  onBack: () => void;
  lang: Language;
}

export const SongDetail: React.FC<SongDetailProps> = ({
  song,
  isPlaying,
  onPlaySong,
  onToggleFavorite,
  onRenameSong,
  onDeleteSong,
  onBack,
  lang,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(song.title);
  const [copied, setCopied] = useState(false);

  const handleShare = () => {
    const shareUrl = `${window.location.origin}/?song=${encodeURIComponent(song.id)}`;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!song.audioUrl) {
      alert('Bài hát mẫu Showcase chưa có file audio thật. Hãy tạo nhạc mới bằng AI API thực tế!');
      return;
    }
    logSongDownload(song.id, 'MP3', { title: song.title, audioUrl: song.audioUrl });
    const url = song.audioUrl.startsWith('/')
      ? song.audioUrl
      : `/api/audio/download?url=${encodeURIComponent(song.audioUrl)}&filename=${encodeURIComponent(song.title)}.mp3`;
    const a = document.createElement('a');
    a.href = url;
    a.download = `${song.title.replace(/\s+/g, '_')}_AIMusicStudio.mp3`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleSaveTitle = () => {
    if (editTitle.trim()) {
      onRenameSong(song.id, editTitle.trim());
      setIsEditing(false);
    }
  };

  return (
    <div className="space-y-8 pb-24 max-w-5xl mx-auto">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>{lang === 'vi' ? 'Quay lại' : 'Back'}</span>
      </button>

      {/* Main Song Header Card */}
      <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-purple-900/30 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row gap-8 shadow-sm">
        <div className="w-full md:w-64 shrink-0">
          <img
            src={song.coverUrl || '/images/album_cover_vinahouse_1794018465637.jpg'}
            alt={song.title}
            className="w-full aspect-square rounded-2xl object-cover shadow-xl border border-purple-500/20"
          />
        </div>

        <div className="flex-1 flex flex-col justify-between space-y-5">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 text-xs font-bold">
                {song.genre}
              </span>
              {song.isAiCover && (
                <span className="px-2.5 py-1 rounded-lg bg-cyan-100 dark:bg-cyan-900/50 text-cyan-700 dark:text-cyan-300 text-xs font-bold">
                  AI Cover
                </span>
              )}
              {song.provider && (
                <span className="px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
                  Provider: {song.provider.toUpperCase()}
                </span>
              )}
            </div>

            {isEditing ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="flex-1 bg-slate-50 dark:bg-slate-950 border border-purple-500 rounded-xl px-3 py-2 text-lg font-bold text-slate-900 dark:text-white"
                />
                <button
                  onClick={handleSaveTitle}
                  className="px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-bold"
                >
                  Lưu
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-xs font-semibold"
                >
                  Hủy
                </button>
              </div>
            ) : (
              <h1 className="font-outfit font-extrabold text-2xl md:text-4xl text-slate-900 dark:text-white">
                {song.title}
              </h1>
            )}

            <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">{song.artist}</p>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400 pt-1">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {Math.floor(song.duration / 60)}:{(song.duration % 60).toString().padStart(2, '0')}
              </span>
              {song.bpm && (
                <span className="flex items-center gap-1">
                  <Music className="w-3.5 h-3.5" />
                  {song.bpm} BPM
                </span>
              )}
              {song.mood && <span>Cảm xúc: {song.mood}</span>}
              <span>Lượt nghe: {song.playsCount}</span>
            </div>

            {song.promptStyle && (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-purple-900/30 text-xs text-slate-600 dark:text-slate-300">
                <strong className="text-purple-600 dark:text-purple-400">Style Prompt:</strong>{' '}
                {song.promptStyle}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={() => onPlaySong(song)}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white font-bold text-sm flex items-center gap-2 shadow-lg"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
              <span>{isPlaying ? 'Tạm dừng' : 'Phát nhạc'}</span>
            </button>

            <button
              onClick={handleDownload}
              className="px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs flex items-center gap-1.5"
            >
              <Download className="w-4 h-4" />
              <span>Tải MP3</span>
            </button>

            <button
              onClick={() => onToggleFavorite(song.id)}
              className="px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs flex items-center gap-1.5"
            >
              <Heart className={`w-4 h-4 ${song.isFavorite ? 'fill-rose-500 text-rose-500' : ''}`} />
              <span>Yêu thích</span>
            </button>

            <button
              onClick={handleShare}
              className="px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs flex items-center gap-1.5"
            >
              {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Share2 className="w-4 h-4" />}
              <span>{copied ? 'Đã chép link!' : 'Chia sẻ'}</span>
            </button>

            <button
              onClick={() => setIsEditing(true)}
              className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-purple-500"
              title="Đổi tên"
            >
              <Edit2 className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                if (confirm(`Xóa bài hát "${song.title}"?`)) {
                  onDeleteSong(song.id);
                  onBack();
                }
              }}
              className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-rose-500"
              title="Xóa bài hát"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Lyrics Card */}
      <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-purple-900/30 rounded-3xl p-6 md:p-8 space-y-4 shadow-sm">
        <h2 className="font-outfit font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
          <FileText className="w-5 h-5 text-purple-500" />
          <span>Lời Bài Hát (Lyrics)</span>
        </h2>

        {song.lyrics ? (
          <pre className="whitespace-pre-wrap font-sans text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
            {song.lyrics}
          </pre>
        ) : (
          <p className="text-xs text-slate-500 italic flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-500" />
            <span>Bản nhạc này là nhạc không lời (Instrumental) hoặc chưa có lời đính kèm.</span>
          </p>
        )}
      </div>
    </div>
  );
};
