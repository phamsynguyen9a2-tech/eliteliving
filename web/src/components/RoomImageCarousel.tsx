'use client';

import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';
import { Camera, ChevronLeft, ChevronRight, MoveHorizontal } from 'lucide-react';
import RoomLocationMap from '@/components/RoomLocationMap';

interface RoomImageCarouselProps {
  images: string[];
  roomTitle: string;
  roomCode: string;
  latitude: number;
  longitude: number;
  address: string;
  projectName?: string;
  onOpen: (index: number) => void;
}

type DragState = {
  startX: number;
  lastX: number;
  lastTime: number;
  offset: number;
  velocity: number;
  moved: boolean;
};

type ThumbnailDragState = {
  startX: number;
  scrollLeft: number;
  moved: boolean;
};

const initialDragState = (): DragState => ({
  startX: 0,
  lastX: 0,
  lastTime: 0,
  offset: 0,
  velocity: 0,
  moved: false,
});

export default function RoomImageCarousel({
  images,
  roomTitle,
  roomCode,
  latitude,
  longitude,
  address,
  projectName,
  onOpen,
}: RoomImageCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isThumbnailDragging, setIsThumbnailDragging] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);
  const thumbnailRailRef = useRef<HTMLDivElement>(null);
  const thumbnailRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const dragStateRef = useRef<DragState>(initialDragState());
  const thumbnailDragStateRef = useRef<ThumbnailDragState>({
    startX: 0,
    scrollLeft: 0,
    moved: false,
  });

  const canGoPrevious = activeIndex > 0;
  const canGoNext = activeIndex < images.length - 1;

  useEffect(() => {
    const rail = thumbnailRailRef.current;
    const thumbnail = thumbnailRefs.current[activeIndex];
    if (!rail || !thumbnail) return;

    rail.scrollTo({
      left: thumbnail.offsetLeft - rail.clientWidth / 2 + thumbnail.clientWidth / 2,
      behavior: 'smooth',
    });
  }, [activeIndex]);

  useEffect(() => {
    if (images.length < 2) return;

    const adjacentIndexes = [
      (activeIndex - 1 + images.length) % images.length,
      (activeIndex + 1) % images.length,
    ];

    adjacentIndexes.forEach((index) => {
      const image = new Image();
      image.src = images[index];
    });
  }, [activeIndex, images]);

  const goTo = (index: number) => {
    if (images.length === 0) return;
    setActiveIndex((index + images.length) % images.length);
    setDragOffset(0);
  };

  const scrollThumbnails = (direction: -1 | 1) => {
    thumbnailRailRef.current?.scrollBy({
      left: direction * 260,
      behavior: 'smooth',
    });
  };

  const handleThumbnailPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;

    const rail = event.currentTarget;
    thumbnailDragStateRef.current = {
      startX: event.clientX,
      scrollLeft: rail.scrollLeft,
      moved: false,
    };
    setIsThumbnailDragging(true);
    rail.setPointerCapture(event.pointerId);
  };

  const handleThumbnailPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!isThumbnailDragging) return;

    const rail = event.currentTarget;
    const drag = thumbnailDragStateRef.current;
    const distance = event.clientX - drag.startX;
    drag.moved = drag.moved || Math.abs(distance) > 5;
    rail.scrollLeft = drag.scrollLeft - distance * 1.25;
  };

  const finishThumbnailDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (!isThumbnailDragging) return;
    setIsThumbnailDragging(false);

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handleThumbnailClick = (index: number) => {
    if (thumbnailDragStateRef.current.moved) {
      thumbnailDragStateRef.current.moved = false;
      return;
    }
    goTo(index);
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (images.length < 2 || (event.pointerType === 'mouse' && event.button !== 0)) return;

    dragStateRef.current = {
      startX: event.clientX,
      lastX: event.clientX,
      lastTime: performance.now(),
      offset: 0,
      velocity: 0,
      moved: false,
    };
    setIsDragging(true);
    setDragOffset(0);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;

    const drag = dragStateRef.current;
    const now = performance.now();
    const elapsed = Math.max(now - drag.lastTime, 1);
    const rawOffset = event.clientX - drag.startX;
    const isPullingPastStart = activeIndex === 0 && rawOffset > 0;
    const isPullingPastEnd = activeIndex === images.length - 1 && rawOffset < 0;
    const resistedOffset = isPullingPastStart || isPullingPastEnd ? rawOffset * 0.22 : rawOffset;

    drag.velocity = (event.clientX - drag.lastX) / elapsed;
    drag.lastX = event.clientX;
    drag.lastTime = now;
    drag.offset = resistedOffset;
    drag.moved = drag.moved || Math.abs(rawOffset) > 6;
    setDragOffset(resistedOffset);
  };

  const finishDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;

    const drag = dragStateRef.current;
    const width = viewportRef.current?.clientWidth || 1;
    const distanceThreshold = Math.min(110, width * 0.14);
    const passedDistance = Math.abs(drag.offset) > distanceThreshold;
    const passedVelocity = Math.abs(drag.velocity) > 0.45;

    if ((passedDistance || passedVelocity) && drag.offset < 0 && canGoNext) {
      setActiveIndex((current) => current + 1);
    } else if ((passedDistance || passedVelocity) && drag.offset > 0 && canGoPrevious) {
      setActiveIndex((current) => current - 1);
    }

    setIsDragging(false);
    setDragOffset(0);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handleSlideClick = (index: number) => {
    if (dragStateRef.current.moved) {
      dragStateRef.current.moved = false;
      return;
    }
    onOpen(index);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowLeft' && images.length > 1) {
      event.preventDefault();
      goTo(activeIndex - 1);
    } else if (event.key === 'ArrowRight' && images.length > 1) {
      event.preventDefault();
      goTo(activeIndex + 1);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onOpen(activeIndex);
    }
  };

  return (
    <section className="h-full min-w-0" aria-label={`Bộ ảnh phòng ${roomCode}`}>
      <div className="group flex h-full flex-col overflow-hidden rounded-[28px] border border-[#E5E3DE] bg-[#0F223A] shadow-[0_24px_60px_-28px_rgba(15,34,58,0.55)]">
        <div className="relative">
          <div
            ref={viewportRef}
            role="region"
            aria-roledescription="carousel"
            aria-label={`Ảnh phòng ${roomTitle}. Dùng phím mũi tên hoặc kéo ngang để đổi ảnh.`}
            tabIndex={0}
            onKeyDown={handleKeyDown}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={finishDrag}
            onPointerCancel={finishDrag}
            className={`h-[320px] touch-pan-y overflow-hidden outline-none sm:h-[420px] lg:h-[500px] ${
              isDragging ? 'cursor-grabbing' : 'cursor-grab'
            } focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#B89C66]`}
          >
            <div
              className={`flex h-full will-change-transform motion-reduce:transition-none ${
                isDragging
                  ? 'transition-none'
                  : 'transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]'
              }`}
              style={{
                transform: `translate3d(calc(${-activeIndex * 100}% + ${dragOffset}px), 0, 0)`,
              }}
            >
              {images.map((image, index) => (
                <button
                  key={`${image}-${index}`}
                  type="button"
                  onClick={() => handleSlideClick(index)}
                  tabIndex={-1}
                  aria-label={`Mở ảnh ${index + 1} của ${roomTitle}`}
                  className="relative h-full w-full shrink-0 overflow-hidden bg-[#0F223A] text-left"
                >
                  <img
                    src={image}
                    alt={`${roomTitle} - Ảnh ${index + 1}`}
                    draggable={false}
                    className={`h-full w-full select-none object-cover transition-[transform,filter] duration-500 ease-out motion-reduce:transition-none ${
                      isDragging ? 'scale-[1.025] blur-[1px]' : 'scale-100 group-hover:scale-[1.012]'
                    }`}
                  />

                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0F223A]/60 via-[#0F223A]/5 to-white/5"
                  />
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-[#0F223A]/30 to-transparent backdrop-blur-[1px]"
                  />
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-[#0F223A]/25 to-transparent backdrop-blur-[1px]"
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-4 sm:p-5">
            <div className="flex items-center gap-2 rounded-full border border-white/20 bg-[#0F223A]/55 px-3 py-1.5 text-[11px] font-bold text-white shadow-lg backdrop-blur-md">
              <MoveHorizontal className={`h-4 w-4 text-[#E5D7B7] ${isDragging ? 'animate-pulse' : ''}`} aria-hidden="true" />
              <span>{isDragging ? 'Thả để chuyển ảnh' : 'Kéo ngang để xem ảnh'}</span>
            </div>
            <span aria-live="polite" className="rounded-full border border-white/20 bg-[#0F223A]/55 px-3 py-1.5 text-[11px] font-bold text-white shadow-lg backdrop-blur-md">
              {activeIndex + 1} / {images.length}
            </span>
          </div>

          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => goTo(activeIndex - 1)}
                aria-label="Xem ảnh trước"
                className="absolute left-3 top-1/2 hidden h-11 w-11 -translate-x-1 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-[#0F223A]/55 text-white opacity-0 shadow-xl backdrop-blur-md transition-all duration-300 hover:scale-105 hover:border-[#B89C66]/70 hover:bg-[#0F223A]/80 group-hover:translate-x-0 group-hover:opacity-100 focus-visible:translate-x-0 focus-visible:opacity-100 sm:flex"
              >
                <ChevronLeft className="h-5 w-5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => goTo(activeIndex + 1)}
                aria-label="Xem ảnh tiếp theo"
                className="absolute right-3 top-1/2 hidden h-11 w-11 translate-x-1 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-[#0F223A]/55 text-white opacity-0 shadow-xl backdrop-blur-md transition-all duration-300 hover:scale-105 hover:border-[#B89C66]/70 hover:bg-[#0F223A]/80 group-hover:translate-x-0 group-hover:opacity-100 focus-visible:translate-x-0 focus-visible:opacity-100 sm:flex"
              >
                <ChevronRight className="h-5 w-5" aria-hidden="true" />
              </button>
            </>
          )}

          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4 sm:p-5">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#E5D7B7]">Không gian thực tế</p>
              <p className="mt-1 truncate text-sm font-bold text-white">Ảnh {activeIndex + 1} của phòng {roomCode}</p>
            </div>
            <button
              type="button"
              onClick={() => onOpen(activeIndex)}
              className="pointer-events-auto inline-flex w-fit shrink-0 items-center gap-2 rounded-2xl border border-white/70 bg-white/95 px-3.5 py-2 text-xs font-extrabold text-[#0F223A] shadow-xl backdrop-blur-md transition-all hover:-translate-y-0.5 hover:bg-white"
            >
              <Camera className="h-4 w-4 text-[#B89C66]" aria-hidden="true" />
              <span className="hidden sm:inline">Xem tất cả {images.length} ảnh</span>
              <span className="sm:hidden">Tất cả ảnh</span>
            </button>
          </div>
        </div>

        <div className="group/thumbnails relative border-t border-white/10 bg-[#0F223A] px-3 py-3 sm:px-4" aria-label="Ảnh thu nhỏ">
          {images.length > 3 && (
            <>
              <button
                type="button"
                onClick={() => scrollThumbnails(-1)}
                aria-label="Cuộn danh sách ảnh sang trái"
                className="absolute left-2 top-1/2 z-10 hidden h-8 w-8 -translate-x-1 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-[#0F223A]/80 text-white opacity-0 shadow-lg backdrop-blur-md transition-all hover:border-[#B89C66] hover:bg-[#A38752] group-hover/thumbnails:translate-x-0 group-hover/thumbnails:opacity-100 focus-visible:translate-x-0 focus-visible:opacity-100 sm:flex"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => scrollThumbnails(1)}
                aria-label="Cuộn danh sách ảnh sang phải"
                className="absolute right-2 top-1/2 z-10 hidden h-8 w-8 translate-x-1 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-[#0F223A]/80 text-white opacity-0 shadow-lg backdrop-blur-md transition-all hover:border-[#B89C66] hover:bg-[#A38752] group-hover/thumbnails:translate-x-0 group-hover/thumbnails:opacity-100 focus-visible:translate-x-0 focus-visible:opacity-100 sm:flex"
              >
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </>
          )}

          <div
            ref={thumbnailRailRef}
            onPointerDown={handleThumbnailPointerDown}
            onPointerMove={handleThumbnailPointerMove}
            onPointerUp={finishThumbnailDrag}
            onPointerCancel={finishThumbnailDrag}
            className={`room-gallery-scrollbar flex touch-pan-y gap-2 overflow-x-auto pb-1 ${
              isThumbnailDragging ? 'cursor-grabbing scroll-auto select-none' : 'cursor-grab scroll-smooth'
            }`}
          >
            {images.map((image, index) => (
              <button
                key={`${image}-thumbnail-${index}`}
                ref={(element) => { thumbnailRefs.current[index] = element; }}
                type="button"
                onClick={() => handleThumbnailClick(index)}
                aria-label={`Chuyển đến ảnh ${index + 1}`}
                aria-current={activeIndex === index ? 'true' : undefined}
                className={`relative h-14 w-[76px] shrink-0 overflow-hidden rounded-xl border-2 transition-all duration-300 sm:h-16 sm:w-24 ${
                  activeIndex === index
                    ? 'border-[#B89C66] opacity-100 shadow-[0_0_0_2px_rgba(184,156,102,0.2)]'
                    : 'border-transparent opacity-60 hover:opacity-100'
                }`}
              >
                <img src={image} alt="" draggable={false} className="h-full w-full select-none object-cover" />
                {activeIndex === index && (
                  <span aria-hidden="true" className="absolute inset-0 bg-[#B89C66]/8" />
                )}
              </button>
            ))}
          </div>
        </div>

        <RoomLocationMap
          latitude={latitude}
          longitude={longitude}
          address={address}
          projectName={projectName}
          roomCode={roomCode}
        />
      </div>
    </section>
  );
}
