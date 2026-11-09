'use client';

import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent, TransitionEvent } from 'react';
import { ChevronLeft, ChevronRight, MoveHorizontal } from 'lucide-react';
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
  // Lướt vòng tròn: thêm bản sao ảnh cuối ở đầu dải và ảnh đầu ở cuối dải; position là vị trí trên dải đó
  const loop = images.length > 1;
  const slides = loop ? [images[images.length - 1], ...images, images[0]] : images;
  const [position, setPosition] = useState(loop ? 1 : 0);
  const [instant, setInstant] = useState(false);
  const activeIndex = loop ? (position - 1 + images.length) % images.length : 0;
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

  // Sau khi trượt tới bản sao ở hai đầu, nhảy tức thì về ảnh thật tương ứng rồi bật lại hiệu ứng trượt
  useEffect(() => {
    if (!instant) return;
    let second = 0;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => setInstant(false));
    });
    return () => {
      cancelAnimationFrame(first);
      cancelAnimationFrame(second);
    };
  }, [instant]);

  const handleTrackTransitionEnd = (event: TransitionEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget || event.propertyName !== 'transform' || !loop) return;
    if (position <= 0) {
      setInstant(true);
      setPosition(images.length);
    } else if (position >= images.length + 1) {
      setInstant(true);
      setPosition(1);
    }
  };

  useEffect(() => {
    const rail = thumbnailRailRef.current;
    const thumbnail = thumbnailRefs.current[activeIndex];
    if (!rail || !thumbnail) return;

    rail.scrollTo({
      left: thumbnail.offsetLeft - rail.clientWidth / 2 + thumbnail.clientWidth / 2,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
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

  /** Đến ảnh thật thứ index (0-based) */
  const goTo = (index: number) => {
    if (images.length === 0) return;
    setPosition(loop ? ((index + images.length) % images.length) + 1 : 0);
    setDragOffset(0);
  };

  /** Lùi / tiến delta ảnh, đi qua bản sao ở hai đầu để lướt vòng liên tục */
  const step = (delta: number) => {
    if (!loop) return;
    setPosition((current) => Math.min(images.length + 1, Math.max(0, current + delta)));
    setDragOffset(0);
  };

  const scrollThumbnails = (direction: -1 | 1) => {
    thumbnailRailRef.current?.scrollBy({
      left: direction * 260,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
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
    // Kéo liên tục qua nhiều ảnh; chỉ chặn ở mép dải (bản sao hai đầu)
    const width = viewportRef.current?.clientWidth || 1;
    const resistedOffset = Math.max((position - (images.length + 1)) * width, Math.min(position * width, rawOffset));

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
    const passedVelocity = performance.now() - drag.lastTime < 100 && Math.abs(drag.velocity) > 0.45;

    // Kéo dài bao nhiêu ảnh thì lướt bấy nhiêu ảnh; kéo ngắn mà nhanh vẫn sang 1 ảnh
    let steps = Math.round(-drag.offset / width);
    if (steps === 0 && (passedDistance || passedVelocity)) steps = drag.offset < 0 ? 1 : -1;
    if (steps !== 0) step(steps);

    setIsDragging(false);
    setDragOffset(0);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const cancelDrag = (event: PointerEvent<HTMLDivElement>) => {
    // A vertical touch gesture must not commit an image change.
    setIsDragging(false);
    setDragOffset(0);
    dragStateRef.current = initialDragState();
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
      step(-1);
    } else if (event.key === 'ArrowRight' && images.length > 1) {
      event.preventDefault();
      step(1);
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
            onPointerCancel={cancelDrag}
            className={`h-[320px] touch-pan-y overflow-hidden outline-none sm:h-[420px] lg:h-[500px] ${
              isDragging ? 'cursor-grabbing' : 'cursor-grab'
            } focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#B89C66]`}
          >
            <div
              className={`flex h-full will-change-transform motion-reduce:transition-none ${
                isDragging || instant
                  ? 'transition-none'
                  : 'transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]'
              }`}
              style={{
                transform: `translate3d(calc(${-position * 100}% + ${dragOffset}px), 0, 0)`,
              }}
              onTransitionEnd={handleTrackTransitionEnd}
            >
              {slides.map((image, slideIndex) => {
                const index = loop ? (slideIndex - 1 + images.length) % images.length : slideIndex;
                return (
                <button
                  key={`${image}-${slideIndex}`}
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
                    className="h-full w-full select-none object-cover"
                  />

                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0F223A]/60 via-[#0F223A]/5 to-white/5"
                  />
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-[#0F223A]/30 to-transparent"
                  />
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-[#0F223A]/25 to-transparent"
                  />
                </button>
                );
              })}
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
                onClick={() => step(-1)}
                aria-label="Xem ảnh trước"
                className="absolute left-3 top-1/2 hidden h-11 w-11 -translate-x-1 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-[#0F223A]/55 text-white opacity-0 shadow-xl backdrop-blur-md transition-all duration-300 hover:scale-105 hover:border-[#B89C66]/70 hover:bg-[#0F223A]/80 group-hover:translate-x-0 group-hover:opacity-100 focus-visible:translate-x-0 focus-visible:opacity-100 sm:flex"
              >
                <ChevronLeft className="h-5 w-5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => step(1)}
                aria-label="Xem ảnh tiếp theo"
                className="absolute right-3 top-1/2 hidden h-11 w-11 translate-x-1 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-[#0F223A]/55 text-white opacity-0 shadow-xl backdrop-blur-md transition-all duration-300 hover:scale-105 hover:border-[#B89C66]/70 hover:bg-[#0F223A]/80 group-hover:translate-x-0 group-hover:opacity-100 focus-visible:translate-x-0 focus-visible:opacity-100 sm:flex"
              >
                <ChevronRight className="h-5 w-5" aria-hidden="true" />
              </button>
            </>
          )}

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
