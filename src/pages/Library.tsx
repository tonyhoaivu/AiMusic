import React, { useState } from 'react';
import {
  Library as LibraryIcon,
  Search,
  Play,
  Heart,
  Download,
  Trash2,
  Edit2,
  Share2,
  X,
  Info,
} from 'lucide-react';
import { Song, Language } from '../types';

interface LibraryProps {
  songs: Song[];
  currentSong: Song | null;
  isPlaying: boolean;
  onPlaySong: (song: Song) => void;
  onOpenSongDetail: (song: Song) => void;
  onToggleFavorite: (id: string) => void;
  onDeleteSong: (id: string) => void;
  onRenameSong: (id: string, newTitle: string) => void;
  lang: Language;
  defaultTab?: 'all' | 'covers' | 'favorites';
}

export const Library: React.FC<LibraryProps> = ({
  songs,
  currentSong,
  onPlaySong,
  onOpenSongDetail,
  onToggleFavorite,
  onDeleteSong,
  onRenameSong,
  defaultTab = 'all',
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'covers' | 'favorites'>(defaultTab);
  const [searchQuery, setSearchQuery] = useState('');

  const [editingSong, setEditingSong] = useState<Song | null>(null);
  const [editTitleInput, setEditTitleInput] = useState('');

  const filteredSongs = songs.filter((s) => {
    if (activeTab === 'covers' && !s.isAiCover) return false;
    if (activeTab === 'favorites' && !s.isFavorite) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        s.title.toLowerCase().includes(q) ||
        s.artist.toLowerCase().includes(q) ||
        s.genre.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleOpenEdit = (song: Song, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSong(song);
    setEditTitleInput(song.title);
  };

  const handleSaveEdit = () => {
    if (editingSong && editTitleInput.trim()) {
      onRenameSong(editingSong.id, editTitleInput.trim());
      setEditingSong(null);
    }
  };

  const handleShare = (song: Song, e: React.MouseEvent) => {
    e.stopPropagation();
    const shareUrl = `${window.location.origin}/?song=${encodeURIComponent(song.id)}`;
    navigator.clipboard.writeText(shareUrl);
    alert(`Đã sao chép đường dẫn chia sẻ bài hát "${song.title}"!`);
  };

  const handleDownload = (song: Song, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!song.audioUrl) {
      alert('Bài hát mẫu Showcase chưa có file audio thật. Hãy tạo nhạc mới bằng AI API thực tế!');
      return;
    }
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

  return (
    <div className="space-y-8 pb-24">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-purple-900/30 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-purple-100 dark:bg-purple-600/20 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-500/30">
            <LibraryIcon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-outfit font-extrabold text-2xl md:text-3xl text-slate-900 dark:text-white">
              Thư Viện Nhạc & Lịch Sử
            </h1>
            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">
              Quản lý danh sách bài hát đã tạo, các bản AI Cover và bài hát yêu thích
            </p>
          </div>
        </div>

        <div className="flex p-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-purple-900/40 rounded-2xl">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
              activeTab === 'all'
                ? 'bg-purple-600 text-white'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Tất cả ({songs.length})
          </button>
          <button
            onClick={() => setActiveTab('covers')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
              activeTab === 'covers'
                ? 'bg-purple-600 text-white'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            AI Covers ({songs.filter((s) => s.isAiCover).length})
          </button>
          <button
            onClick={() => setActiveTab('favorites')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
              activeTab === 'favorites'
                ? 'bg-purple-600 text-white'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Yêu thích ({songs.filter((s) => s.isFavorite).length})
          </button>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Tìm bài hát trong thư viện..."
          className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-purple-900/30 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-purple-500"
        />
      </div>

      {filteredSongs.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredSongs.map((song) => {
            const isCurrent = currentSong?.id === song.id;

            return (
              <div
                key={song.id}
                onClick={() => onOpenSongDetail(song)}
                className={`bg-white dark:bg-slate-900/60 border rounded-2xl p-4 transition-all cursor-pointer group shadow-sm hover:shadow-md ${
                  isCurrent
                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/40'
                    : 'border-slate-200 dark:border-purple-900/30 hover:border-purple-400'
                }`}
              >
                <div className="flex items-center gap-3.5 mb-3">
                  <img
                    src={song.coverUrl || '/images/album_cover_vinahouse_1794018465637.jpg'}
                    alt={song.title}
                    className="w-16 h-16 rounded-xl object-cover shrink-0"
                  />
                  <div className="truncate">
                    <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate group-hover:text-purple-600 dark:group-hover:text-purple-300">
                      {song.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {song.artist}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-[10px] font-semibold text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/40 px-2 py-0.5 rounded-md">
                        {song.genre}
                      </span>
                      {song.audioUrl && (
                        <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md">
                          MP3
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-purple-900/20 text-xs">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onPlaySong(song);
                    }}
                    className="flex items-center gap-1.5 font-semibold text-purple-600 dark:text-purple-400 hover:underline"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>Nghe</span>
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenSongDetail(song);
                      }}
                      className="p-1.5 text-slate-400 hover:text-purple-500"
                      title="Chi tiết bài hát"
                    >
                      <Info className="w-4 h-4" />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite(song.id);
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-500"
                      title="Yêu thích"
                    >
                      <Heart
                        className={`w-4 h-4 ${
                          song.isFavorite ? 'fill-rose-500 text-rose-500' : ''
                        }`}
                      />
                    </button>

                    <button
                      onClick={(e) => handleOpenEdit(song, e)}
                      className="p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white"
                      title="Đổi tên"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={(e) => handleShare(song, e)}
                      className="p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white"
                      title="Chia sẻ"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={(e) => handleDownload(song, e)}
                      className="p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white"
                      title="Tải MP3"
                    >
                      <Download className="w-4 h-4" />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Bạn có chắc muốn xóa bài hát "${song.title}"?`)) {
                          onDeleteSong(song.id);
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-500"
                      title="Xóa"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-purple-900/30 rounded-2xl p-12 text-center text-slate-500">
          <p className="text-sm">Không tìm thấy bài hát nào trong mục này.</p>
        </div>
      )}

      {editingSong && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#100d26] border border-slate-200 dark:border-purple-500/30 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-purple-900/30 pb-3">
              <h3 className="font-outfit font-bold text-base text-slate-900 dark:text-white">
                Đổi Tên Bài Hát
              </h3>
              <button
                onClick={() => setEditingSong(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Tên bài hát mới
              </label>
              <input
                type="text"
                value={editTitleInput}
                onChange={(e) => setEditTitleInput(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-purple-900/40 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setEditingSong(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold"
              >
                Hủy
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold"
              >
                Lưu Thay Đổi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
