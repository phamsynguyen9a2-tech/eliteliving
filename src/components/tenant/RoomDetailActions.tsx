'use client'
import FavoriteButton from '@/components/tenant/FavoriteButton'
import { Share2 } from 'lucide-react'

interface RoomActionsProps {
  roomId: string
  roomName: string
}

export default function RoomDetailActions({ roomId, roomName }: RoomActionsProps) {
  function handleShare() {
    if (navigator.share) {
      navigator.share({ title: roomName, url: window.location.href }).catch(() => {})
    } else {
      navigator.clipboard.writeText(window.location.href)
    }
  }

  return (
    <div className="flex gap-2">
      <FavoriteButton roomId={roomId} roomName={roomName} variant="overlay" />
      <button
        id="btn-share-room"
        aria-label="Chia sẻ phòng"
        onClick={handleShare}
        className="btn-icon bg-white/90 backdrop-blur-sm hover:bg-white shadow-md"
      >
        <Share2 className="w-4 h-4 text-slate-600" />
      </button>
    </div>
  )
}
