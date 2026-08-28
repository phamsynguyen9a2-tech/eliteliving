'use client'
import { Heart } from 'lucide-react'
import { useFavorites } from '@/hooks/useFavorites'
import { useState } from 'react'

interface FavoriteButtonProps {
  roomId: string
  roomName?: string
  /** 'overlay' – nổi trên ảnh (trang tìm phòng / chi tiết)
   *  'inline'  – nút thường trong card
   */
  variant?: 'overlay' | 'inline'
  className?: string
}

export default function FavoriteButton({
  roomId,
  roomName,
  variant = 'overlay',
  className = '',
}: FavoriteButtonProps) {
  const { isFavorite, toggleFavorite } = useFavorites()
  const [burst, setBurst] = useState(false)

  const liked = isFavorite(roomId)

  function handleClick(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()

    // Trigger micro-animation
    setBurst(true)
    setTimeout(() => setBurst(false), 300)

    toggleFavorite(roomId)
  }

  if (variant === 'overlay') {
    return (
      <button
        id={`btn-favorite-${roomId}`}
        aria-label={liked ? `Bỏ yêu thích ${roomName ?? ''}` : `Yêu thích ${roomName ?? ''}`}
        onClick={handleClick}
        className={`
          btn-icon bg-white/90 backdrop-blur-sm hover:bg-white shadow-md
          transition-transform duration-150
          ${burst ? 'scale-125' : 'scale-100'}
          ${className}
        `}
      >
        <Heart
          className={`w-4 h-4 transition-colors duration-200 ${
            liked
              ? 'text-red-500 fill-red-500'
              : 'text-slate-400 hover:text-red-400'
          }`}
        />
      </button>
    )
  }

  // inline variant
  return (
    <button
      id={`btn-favorite-${roomId}`}
      aria-label={liked ? `Bỏ yêu thích ${roomName ?? ''}` : `Yêu thích ${roomName ?? ''}`}
      onClick={handleClick}
      className={`
        flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl
        border text-sm font-medium transition-all duration-200
        ${liked
          ? 'border-red-200 text-red-500 bg-red-50 hover:bg-red-100'
          : 'border-slate-200 text-slate-500 hover:border-red-200 hover:text-red-400 hover:bg-red-50'
        }
        ${burst ? 'scale-95' : 'scale-100'}
        ${className}
      `}
    >
      <Heart
        className={`w-4 h-4 transition-all duration-200 ${
          liked ? 'fill-red-500 text-red-500' : ''
        }`}
      />
      {liked ? 'Đã lưu' : 'Lưu'}
    </button>
  )
}
