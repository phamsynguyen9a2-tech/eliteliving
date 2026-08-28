'use client'
import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'nhatrotop_favorites'

export interface FavoriteRoom {
  id: string
  code: string
  name: string
  district: string
  price: number
  size: number
  img: string
  amenities: string[]
}

function readFromStorage(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function writeToStorage(ids: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
  } catch {
    // ignore quota errors
  }
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>([])

  // Đọc từ localStorage khi mount (client-side only)
  useEffect(() => {
    setFavorites(readFromStorage())
  }, [])

  const toggleFavorite = useCallback((roomId: string) => {
    setFavorites(prev => {
      const next = prev.includes(roomId)
        ? prev.filter(id => id !== roomId)
        : [...prev, roomId]
      writeToStorage(next)
      return next
    })
  }, [])

  const isFavorite = useCallback(
    (roomId: string) => favorites.includes(roomId),
    [favorites],
  )

  const clearAll = useCallback(() => {
    setFavorites([])
    writeToStorage([])
  }, [])

  return { favorites, toggleFavorite, isFavorite, clearAll }
}
