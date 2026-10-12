'use client';

import { useMemo, useState } from 'react';
import { Crosshair, ExternalLink, MapPin, Navigation } from 'lucide-react';

interface RoomLocationMapProps {
  latitude: number;
  longitude: number;
  address: string;
  projectName?: string;
  roomCode: string;
}

export default function RoomLocationMap({
  latitude,
  longitude,
  address,
  projectName,
  roomCode,
}: RoomLocationMapProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const hasValidCoordinates =
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180 &&
    !(latitude === 0 && longitude === 0);

  const mapUrl = useMemo(() => {
    if (!hasValidCoordinates) return '';

    const latitudeSpan = 0.0042;
    const longitudeSpan = 0.0062;
    const bounds = [
      longitude - longitudeSpan,
      latitude - latitudeSpan,
      longitude + longitudeSpan,
      latitude + latitudeSpan,
    ].join(',');

    return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bounds)}&layer=mapnik&marker=${encodeURIComponent(`${latitude},${longitude}`)}`;
  }, [hasValidCoordinates, latitude, longitude]);

  const directionsUrl = hasValidCoordinates
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${latitude},${longitude}`)}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

  return (
    <section className="relative min-h-[300px] flex-1 overflow-hidden border-t border-white/10 bg-[#0F223A]" aria-label={`Bản đồ vị trí phòng ${roomCode}`}>
      {hasValidCoordinates ? (
        <>
          <div
            aria-hidden="true"
            className={`absolute inset-0 bg-[linear-gradient(105deg,#162D49_20%,#29425D_42%,#162D49_64%)] bg-[length:220%_100%] transition-opacity duration-500 ${
              isLoaded ? 'pointer-events-none opacity-0' : 'animate-pulse opacity-100'
            }`}
          />
          <iframe
            src={mapUrl}
            title={`Vị trí chính xác của phòng ${roomCode}`}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            onLoad={() => setIsLoaded(true)}
            className={`absolute inset-0 h-full w-full border-0 transition-[opacity,transform,filter] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
              isLoaded
                ? 'scale-100 opacity-100 saturate-[0.82] contrast-[0.96]'
                : 'scale-[1.035] opacity-0 blur-sm'
            }`}
          />

          <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-[#0F223A]/38 to-transparent" />
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#0F223A]/75 via-[#0F223A]/25 to-transparent" />
        </>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_50%_45%,#263D58_0%,#0F223A_72%)] px-6 text-center">
          <div>
            <MapPin className="mx-auto h-9 w-9 text-[#B89C66]" aria-hidden="true" />
            <p className="mt-3 text-sm font-extrabold text-white">Tọa độ đang được cập nhật</p>
            <p className="mt-1 text-xs text-slate-300">Bạn vẫn có thể mở địa chỉ bằng Google Maps.</p>
          </div>
        </div>
      )}

      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-3 p-4 sm:p-5">
        <div className="pointer-events-auto max-w-[72%] rounded-2xl border border-white/25 bg-[#0F223A]/82 px-3.5 py-3 text-white shadow-[0_14px_32px_-16px_rgba(15,34,58,0.9)] backdrop-blur-xl sm:max-w-sm">
          <div className="flex items-center gap-2">
            <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#B89C66] text-white shadow-lg shadow-[#B89C66]/25">
              {hasValidCoordinates && <span className="absolute inset-0 animate-ping rounded-xl bg-[#B89C66]/35 motion-reduce:hidden" aria-hidden="true" />}
              <MapPin className="relative h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#E5D7B7]">Vị trí phòng</p>
              <p className="mt-0.5 truncate text-xs font-extrabold">{projectName || `Phòng ${roomCode}`}</p>
            </div>
          </div>
        </div>

        <a
          href={directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="pointer-events-auto inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl border border-white/55 bg-white/95 px-3 text-[11px] font-extrabold text-[#0F223A] shadow-xl backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:border-[#B89C66] hover:text-[#8C6D37] focus-visible:ring-2 focus-visible:ring-[#B89C66]"
        >
          <Navigation className="h-4 w-4 text-[#B89C66]" aria-hidden="true" />
          <span className="hidden sm:inline">Chỉ đường</span>
          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
        </a>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 p-4 sm:p-5">
        <div className="flex items-end justify-between gap-4 text-white">
          <div className="min-w-0">
            <p className="line-clamp-2 max-w-2xl text-xs font-semibold leading-relaxed drop-shadow-md">{address}</p>
            {hasValidCoordinates && (
              <p className="mt-1.5 flex items-center gap-1.5 text-[10px] font-bold tracking-wide text-[#E5D7B7]">
                <Crosshair className="h-3.5 w-3.5" aria-hidden="true" />
                {latitude.toFixed(6)}, {longitude.toFixed(6)}
              </p>
            )}
          </div>
          <span className="hidden shrink-0 rounded-full border border-white/20 bg-[#0F223A]/60 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-200 backdrop-blur-md sm:inline-flex">
            Bản đồ tương tác
          </span>
        </div>
      </div>
    </section>
  );
}
