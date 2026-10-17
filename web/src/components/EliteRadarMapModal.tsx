'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  X,
  Compass,
  MapPin,
  Users,
  Navigation,
  Building2,
  Sparkles,
  Plus,
  Trash2,
  Eye,
  ExternalLink,
  Layers,
  LocateFixed,
  Route,
  ChevronRight,
  Search,
} from 'lucide-react';
import type { Building } from '@/lib/types';
import EliteSelect, { type EliteSelectOption } from './EliteSelect';

interface HcmcPresetLocation {
  id: string;
  name: string;
  district: string;
  lat: number;
  lng: number;
  category: string;
}

const HCMC_PRESET_LOCATIONS: HcmcPresetLocation[] = [
  // Quận Tân Phú
  { id: 'le-thuc-hoach', name: 'Đường Lê Thúc Hoạch, Phú Thọ Hòa', district: 'Quận Tân Phú', lat: 10.7832, lng: 106.6258, category: 'Quận Tân Phú' },
  { id: 'huit', name: 'ĐH Công Thương TP.HCM (HUIT) - 140 Lê Trọng Tấn', district: 'Quận Tân Phú', lat: 10.8063, lng: 106.6286, category: 'Quận Tân Phú' },
  { id: 'aeon-tan-phu', name: 'Aeon Mall Tân Phú Celadon - Bờ Bao Tân Thắng', district: 'Quận Tân Phú', lat: 10.8016, lng: 106.6177, category: 'Quận Tân Phú' },
  { id: 'tay-thanh', name: 'Trục đường Tây Thạnh - KCN Tân Bình', district: 'Quận Tân Phú', lat: 10.8118, lng: 106.6295, category: 'Quận Tân Phú' },
  { id: 'tan-ky-tan-quy', name: 'Đường Tân Kỳ Tân Quý - Tân Sơn Nhì', district: 'Quận Tân Phú', lat: 10.8005, lng: 106.6312, category: 'Quận Tân Phú' },
  { id: 'luy-ban-bich', name: 'Đường Lũy Bán Bích - Hòa Thạnh', district: 'Quận Tân Phú', lat: 10.7798, lng: 106.6352, category: 'Quận Tân Phú' },

  // Quận Tân Bình
  { id: 'etown-cong-hoa', name: 'Tòa nhà Etown Cộng Hòa - Phường 13', district: 'Quận Tân Bình', lat: 10.8019, lng: 106.6417, category: 'Quận Tân Bình' },
  { id: 'bv-thong-nhat', name: 'Bệnh viện Thống Nhất - Ngã tư Bảy Hiền', district: 'Quận Tân Bình', lat: 10.7918, lng: 106.6531, category: 'Quận Tân Bình' },
  { id: 'san-bay-tsn', name: 'Sân bay Tân Sơn Nhất - Trường Sơn', district: 'Quận Tân Bình', lat: 10.8132, lng: 106.6625, category: 'Quận Tân Bình' },
  { id: 'bau-cat', name: 'Khu Bàu Cát - Đồng Đen', district: 'Quận Tân Bình', lat: 10.7915, lng: 106.6430, category: 'Quận Tân Bình' },

  // Quận Bình Tân
  { id: 'aeon-binh-tan', name: 'Aeon Mall Bình Tân - Khu Tên Lửa', district: 'Quận Bình Tân', lat: 10.7428, lng: 106.6119, category: 'Quận Bình Tân' },
  { id: 'le-van-quoi', name: 'Đường Lê Văn Quới - Bình Hưng Hòa A', district: 'Quận Bình Tân', lat: 10.7752, lng: 106.6038, category: 'Quận Bình Tân' },

  // Quận Gò Vấp
  { id: 'iuh-go-vap', name: 'ĐH Công Nghiệp TP.HCM (IUH) - Nguyễn Văn Bảo', district: 'Quận Gò Vấp', lat: 10.8221, lng: 106.6868, category: 'Quận Gò Vấp' },
  { id: 'le-duc-tho', name: 'Trục Lê Đức Thọ - Phạm Văn Chiêu', district: 'Quận Gò Vấp', lat: 10.8442, lng: 106.6635, category: 'Quận Gò Vấp' },
  { id: 'emart-phan-van-tri', name: 'Emart Phan Văn Trị - Cityland Park Hills', district: 'Quận Gò Vấp', lat: 10.8285, lng: 106.6912, category: 'Quận Gò Vấp' },

  // Quận Bình Thạnh
  { id: 'hutech-d2', name: 'ĐH HUTECH / Đường D2 (Nguyễn Gia Trí)', district: 'Quận Bình Thạnh', lat: 10.8018, lng: 106.7145, category: 'Quận Bình Thạnh' },
  { id: 'hang-xanh', name: 'Ngã tư Hàng Xanh - Điện Biên Phủ (UEF / Hồng Bàng)', district: 'Quận Bình Thạnh', lat: 10.8012, lng: 106.7112, category: 'Quận Bình Thạnh' },
  { id: 'van-lang', name: 'ĐH Văn Lang Cơ sở 3 - Phan Văn Trị / Đặng Thùy Trâm', district: 'Quận Bình Thạnh', lat: 10.8271, lng: 106.6995, category: 'Quận Bình Thạnh' },

  // TP. Thủ Đức
  { id: 'thao-dien', name: 'Khu Thảo Điền - Nguyễn Văn Hưởng / Quốc Hương', district: 'TP. Thủ Đức', lat: 10.8092, lng: 106.7335, category: 'TP. Thủ Đức' },
  { id: 'spkt-thu-duc', name: 'Ngã tư Thủ Đức - ĐH Sư Phạm Kỹ Thuật (HCMUTE)', district: 'TP. Thủ Đức', lat: 10.8506, lng: 106.7719, category: 'TP. Thủ Đức' },
  { id: 'gigamall', name: 'Gigamall Phạm Văn Đồng - Hiệp Bình Chánh', district: 'TP. Thủ Đức', lat: 10.8278, lng: 106.7214, category: 'TP. Thủ Đức' },

  // Quận 7
  { id: 'tdtu-rmit', name: 'ĐH Tôn Đức Thắng (TDTU) & RMIT - Nguyễn Hữu Thọ', district: 'Quận 7', lat: 10.7326, lng: 106.6998, category: 'Quận 7' },
  { id: 'lotte-q7', name: 'Lotte Mart Quận 7 - Lê Văn Lương / Nguyễn Thị Thập', district: 'Quận 7', lat: 10.7412, lng: 106.7021, category: 'Quận 7' },
  { id: 'crescent-mall', name: 'Khu đô thị Phú Mỹ Hưng - Crescent Mall', district: 'Quận 7', lat: 10.7291, lng: 106.7185, category: 'Quận 7' },

  // Quận 10 & Phú Nhuận
  { id: 'bach-khoa-q10', name: 'ĐH Bách Khoa (HCMUT) - Tô Hiến Thành', district: 'Quận 10', lat: 10.7726, lng: 106.6579, category: 'Quận 10 & Phú Nhuận' },
  { id: 'van-hanh-mall', name: 'Vạn Hạnh Mall - Sư Vạn Hạnh (ĐH HUFLIT / Y Phạm Ngọc Thạch)', district: 'Quận 10', lat: 10.7708, lng: 106.6698, category: 'Quận 10 & Phú Nhuận' },
  { id: 'phan-xich-long', name: 'Phố ẩm thực Phan Xích Long - Phú Nhuận', district: 'Quận Phú Nhuận', lat: 10.7982, lng: 106.6895, category: 'Quận 10 & Phú Nhuận' },

  // Quận 1, Quận 3, Quận 6, Quận 8, Quận 12
  { id: 'tan-dinh-q1', name: 'Chợ Tân Định - Hai Bà Trưng / Trần Quang Khải', district: 'Quận 1', lat: 10.7905, lng: 106.6902, category: 'Trung Tâm & Khác' },
  { id: 'le-van-sy-q3', name: 'Trục Lê Văn Sỹ - Cách Mạng Tháng 8 (Quận 3)', district: 'Quận 3', lat: 10.7852, lng: 106.6785, category: 'Trung Tâm & Khác' },
  { id: 'duong-ba-trac-q8', name: 'Cầu Nguyễn Văn Cừ - Dương Bá Trạc (Quận 8)', district: 'Quận 8', lat: 10.7458, lng: 106.6875, category: 'Trung Tâm & Khác' },
  { id: 'phu-lam-q6', name: 'Vòng xoay Phú Lâm - Tân Hòa Đông (Quận 6)', district: 'Quận 6', lat: 10.7525, lng: 106.6285, category: 'Trung Tâm & Khác' },
  { id: 'cvpm-quang-trung', name: 'CVPM Quang Trung - Tô Ký (Quận 12)', district: 'Quận 12', lat: 10.8552, lng: 106.6285, category: 'Trung Tâm & Khác' },
];

const RADIUS_OPTIONS: EliteSelectOption[] = [
  { value: '0.5', label: 'Bán kính: 0.5 km (Đi bộ 5 phút)', badge: 'Rất gần' },
  { value: '1', label: 'Bán kính: 1 km (Mặc định)', badge: 'Chuẩn' },
  { value: '1.5', label: 'Bán kính: 1.5 km (~3 phút xe)', badge: '1.5 km' },
  { value: '2', label: 'Bán kính: 2 km (~5 phút xe)', badge: 'Phổ biến' },
  { value: '3', label: 'Bán kính: 3 km (~8 phút xe)', badge: 'Rộng' },
  { value: '5', label: 'Bán kính: 5 km (Liên quận)', badge: '5 km' },
  { value: '8', label: 'Bán kính: 8 km (Mở rộng)', badge: '8 km' },
];

function calculateHaversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
}

interface PersonPoint {
  id: string;
  label: string;
  presetId: string;
  lat: number;
  lng: number;
  address: string;
}

interface EliteRadarMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  buildings: Building[];
  onSelectBuilding: (building: Building) => void;
  initialQuery?: string;
}

export default function EliteRadarMapModal({
  isOpen,
  onClose,
  buildings,
  onSelectBuilding,
  initialQuery = '',
}: EliteRadarMapModalProps) {
  const [mode, setMode] = useState<'SINGLE' | 'MIDPOINT'>('SINGLE');
  const [radiusKm, setRadiusKm] = useState<number>(1.5);
  const [minPriceTr, setMinPriceTr] = useState<string>('');
  const [maxPriceTr, setMaxPriceTr] = useState<string>('');

  // Single-point state
  const [addressQuery, setAddressQuery] = useState<string>(initialQuery || 'Đường Lê Thúc Hoạch, Phú Thọ Hòa');
  const [centerPoint, setCenterPoint] = useState<{ lat: number; lng: number; label: string }>({
    lat: 10.7832,
    lng: 106.6258,
    label: 'Đường Lê Thúc Hoạch, Phú Thọ Hòa, Quận Tân Phú',
  });
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);

  // Multi-point (Ở giữa 2+ người) state
  const [personPoints, setPersonPoints] = useState<PersonPoint[]>([
    {
      id: 'p1',
      label: 'Người 1',
      presetId: 'huit',
      lat: 10.8063,
      lng: 106.6286,
      address: 'ĐH Công Thương TP.HCM (HUIT) - Tân Phú',
    },
    {
      id: 'p2',
      label: 'Người 2',
      presetId: 'bach-khoa-q10',
      lat: 10.7726,
      lng: 106.6579,
      address: 'ĐH Bách Khoa (HCMUT) - Quận 10',
    },
  ]);

  const [activeBuildingCode, setActiveBuildingCode] = useState<string | null>(null);
  const [mapStyle, setMapStyle] = useState<'google_streets' | 'google_hybrid' | 'carto_light'>('google_streets');
  const [leafletReady, setLeafletReady] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tileLayerRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const overlaysGroupRef = useRef<any>(null);

  // Compute effective center (Single point vs Midpoint Centroid)
  const effectiveCenter = useMemo(() => {
    if (mode === 'SINGLE') {
      return centerPoint;
    }
    const count = personPoints.length || 1;
    const sumLat = personPoints.reduce((acc, p) => acc + p.lat, 0);
    const sumLng = personPoints.reduce((acc, p) => acc + p.lng, 0);
    return {
      lat: Number((sumLat / count).toFixed(5)),
      lng: Number((sumLng / count).toFixed(5)),
      label: `Điểm giữa cân bằng (${personPoints.length} người)`,
    };
  }, [mode, centerPoint, personPoints]);

  // Filter buildings within radius & price range
  const matchedBuildings = useMemo(() => {
    const minVnd = minPriceTr ? Number(minPriceTr) * 1_000_000 : 0;
    const maxVnd = maxPriceTr ? Number(maxPriceTr) * 1_000_000 : Infinity;

    return buildings
      .map((b) => {
        const dist = calculateHaversineKm(
          effectiveCenter.lat,
          effectiveCenter.lng,
          b.latitude,
          b.longitude
        );
        return {
          ...b,
          radarDistanceKm: dist,
        };
      })
      .filter((b) => {
        const withinRadius = b.radarDistanceKm <= radiusKm;
        const matchMin = b.max_price >= minVnd;
        const matchMax = b.min_price <= maxVnd;
        return withinRadius && matchMin && matchMax;
      })
      .sort((a, b) => a.radarDistanceKm - b.radarDistanceKm);
  }, [buildings, effectiveCenter, radiusKm, minPriceTr, maxPriceTr]);

  const activeBuilding = useMemo(
    () => matchedBuildings.find((b) => b.code === activeBuildingCode) || null,
    [matchedBuildings, activeBuildingCode]
  );

  // Combined autocomplete suggestions from presets + actual buildings
  const addressSuggestions = useMemo(() => {
    const q = addressQuery.trim().toLowerCase();
    const buildingPresets: HcmcPresetLocation[] = buildings.map((b) => ({
      id: `b-${b.code}`,
      name: `${b.address} (${b.name})`,
      district: b.district,
      lat: b.latitude,
      lng: b.longitude,
      category: 'Tòa nhà Elite Living',
    }));
    const all = [...HCMC_PRESET_LOCATIONS, ...buildingPresets];
    if (!q) return HCMC_PRESET_LOCATIONS.slice(0, 10);
    return all
      .filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.district.toLowerCase().includes(q)
      )
      .slice(0, 10);
  }, [addressQuery, buildings]);

  const presetSelectOptions: EliteSelectOption[] = useMemo(
    () =>
      HCMC_PRESET_LOCATIONS.map((loc) => ({
        value: loc.id,
        label: loc.name,
        sublabel: loc.district,
        group: loc.category,
        badge: loc.district.replace('Quận ', 'Q.').replace('Thành phố ', 'TP.'),
      })),
    []
  );

  // Geocode arbitrary HCMC address via Nominatim or local match
  const handleSearchLocation = useCallback(async () => {
    const q = addressQuery.trim();
    if (!q) return;

    // 1. Check local match first
    const localMatch = addressSuggestions[0];
    if (localMatch && localMatch.name.toLowerCase().includes(q.toLowerCase())) {
      setCenterPoint({
        lat: localMatch.lat,
        lng: localMatch.lng,
        label: localMatch.name,
      });
      setActiveBuildingCode(null);
      setShowSuggestions(false);
      return;
    }

    // 2. Fallback to OpenStreetMap Nominatim in HCMC
    setIsGeocoding(true);
    try {
      const searchQ = q.toLowerCase().includes('hồ chí minh')
        ? q
        : `${q}, Hồ Chí Minh, Việt Nam`;
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(searchQ)}`
      );
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const hit = data[0];
        setCenterPoint({
          lat: Number(hit.lat),
          lng: Number(hit.lon),
          label: q,
        });
        setActiveBuildingCode(null);
      }
    } catch {
      // Keep current center if offline
    } finally {
      setIsGeocoding(false);
      setShowSuggestions(false);
    }
  }, [addressQuery, addressSuggestions]);

  // GPS locate user
  const handleLocateMe = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setMode('SINGLE');
        setAddressQuery('Vị trí GPS hiện tại của bạn');
        setCenterPoint({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          label: 'Vị trí GPS hiện tại của bạn',
        });
        setActiveBuildingCode(null);
      },
      () => {
        // Fallback to HUIT Tân Phú if denied
      }
    );
  };

  // Load Leaflet CSS & JS dynamically on client
  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((window as any).L) {
      setLeafletReady(true);
      return;
    }

    if (!document.getElementById('elite-leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'elite-leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    const existingScript = document.getElementById('elite-leaflet-js') as HTMLScriptElement | null;
    if (existingScript) {
      existingScript.addEventListener('load', () => setLeafletReady(true));
      return;
    }

    const script = document.createElement('script');
    script.id = 'elite-leaflet-js';
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.async = true;
    script.onload = () => setLeafletReady(true);
    document.body.appendChild(script);
  }, [isOpen]);

  // Initialize Leaflet Map instance
  useEffect(() => {
    if (!isOpen || !leafletReady || !mapContainerRef.current) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const L = (window as any).L;
    if (!L) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [effectiveCenter.lat, effectiveCenter.lng],
        zoom: 15,
        zoomControl: false,
      });

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      const tileUrl = 'https://mt1.google.com/vt/lyrs=m&hl=vi&x={x}&y={y}&z={z}';
      tileLayerRef.current = L.tileLayer(tileUrl, {
        maxZoom: 20,
        attribution: '&copy; Google Maps &bull; Elite Living Spatial Radar',
      }).addTo(map);

      overlaysGroupRef.current = L.layerGroup().addTo(map);

      // Click on map to relocate radar center in SINGLE mode
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      map.on('click', (e: any) => {
        if (e.originalEvent?.target?.closest?.('.elite-estate-pin')) return;
        const { lat, lng } = e.latlng;
        setCenterPoint({
          lat: Number(lat.toFixed(5)),
          lng: Number(lng.toFixed(5)),
          label: `Điểm chọn trên bản đồ (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
        });
      });

      mapInstanceRef.current = map;
      setTimeout(() => map.invalidateSize(), 150);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        tileLayerRef.current = null;
        overlaysGroupRef.current = null;
      }
    };
  }, [isOpen, leafletReady]);

  // Switch map tile style
  useEffect(() => {
    if (!mapInstanceRef.current || !tileLayerRef.current) return;
    const urls: Record<typeof mapStyle, string> = {
      google_streets: 'https://mt1.google.com/vt/lyrs=m&hl=vi&x={x}&y={y}&z={z}',
      google_hybrid: 'https://mt1.google.com/vt/lyrs=y&hl=vi&x={x}&y={y}&z={z}',
      carto_light: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    };
    tileLayerRef.current.setUrl(urls[mapStyle]);
  }, [mapStyle]);

  // Render Radar Circle, Center/Person Pins, Architectural Building Pins & Route Line
  useEffect(() => {
    if (!isOpen || !leafletReady || !mapInstanceRef.current || !overlaysGroupRef.current) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const L = (window as any).L;
    if (!L) return;

    const map = mapInstanceRef.current;
    const group = overlaysGroupRef.current;
    group.clearLayers();

    // 1. Draw Radar Circle in Elite Living Champagne Gold & Deep Navy
    const radarCircle = L.circle([effectiveCenter.lat, effectiveCenter.lng], {
      radius: radiusKm * 1000,
      color: '#0F223A',
      weight: 2.5,
      dashArray: '8, 8',
      fillColor: '#B89C66',
      fillOpacity: 0.13,
    });
    group.addLayer(radarCircle);

    // Inner subtle ring (50% radius)
    const innerCircle = L.circle([effectiveCenter.lat, effectiveCenter.lng], {
      radius: radiusKm * 500,
      color: '#B89C66',
      weight: 1.2,
      dashArray: '4, 6',
      fillOpacity: 0.04,
    });
    group.addLayer(innerCircle);

    // 2. If in MIDPOINT mode, draw Person pins and vector lines to centroid
    if (mode === 'MIDPOINT') {
      personPoints.forEach((p, idx) => {
        const line = L.polyline(
          [
            [p.lat, p.lng],
            [effectiveCenter.lat, effectiveCenter.lng],
          ],
          {
            color: '#0F223A',
            weight: 2,
            dashArray: '5, 6',
            opacity: 0.75,
          }
        );
        group.addLayer(line);

        const distToMid = calculateHaversineKm(
          p.lat,
          p.lng,
          effectiveCenter.lat,
          effectiveCenter.lng
        );

        const personIcon = L.divIcon({
          className: 'elite-leaflet-pin-wrapper',
          iconSize: [110, 44],
          iconAnchor: [55, 22],
          html: `
            <div style="display:flex;flex-direction:column;align-items:center;">
              <div style="background:#0F223A;color:#FAF0DC;border:1.5px solid #B89C66;padding:2px 8px;border-radius:999px;font-size:10px;font-weight:800;white-space:nowrap;box-shadow:0 4px 10px rgba(15,34,58,0.3);">
                Người ${idx + 1} &bull; ${distToMid}km
              </div>
              <div style="width:12px;height:12px;border-radius:999px;background:#B89C66;border:2.5px solid #0F223A;margin-top:3px;"></div>
            </div>
          `,
        });
        L.marker([p.lat, p.lng], { icon: personIcon }).addTo(group);
      });
    }

    // 3. Draw Target / Midpoint Center Pin (Crimson/Gold Beacon)
    const centerIcon = L.divIcon({
      className: 'elite-leaflet-pin-wrapper',
      iconSize: [44, 52],
      iconAnchor: [22, 44],
      html: `
        <div style="position:relative;display:flex;flex-direction:column;align-items:center;">
          <div style="position:absolute;bottom:2px;width:34px;height:34px;border-radius:999px;background:rgba(225,29,72,0.32);animation:elitePulseGold 1.8s infinite;"></div>
          <div style="width:36px;height:36px;border-radius:12px;background:linear-gradient(135deg,#E11D48 0%,#9F1239 100%);border:2.5px solid #FFFFFF;box-shadow:0 8px 20px rgba(225,29,72,0.45);display:flex;align-items:center;justify-content:center;color:#FFFFFF;z-index:2;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="10" r="3"/>
              <path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 6.9 8 11.7z"/>
            </svg>
          </div>
        </div>
      `,
    });
    L.marker([effectiveCenter.lat, effectiveCenter.lng], {
      icon: centerIcon,
      zIndexOffset: 900,
    })
      .bindTooltip(effectiveCenter.label, {
        direction: 'top',
        offset: [0, -38],
      })
      .addTo(group);

    // 4. Draw Architectural Estate Shield Markers for each matched building
    matchedBuildings.forEach((b) => {
      const isSelected = b.code === activeBuildingCode;
      const minTr = (b.min_price / 1_000_000).toFixed(1).replace('.0', '');
      const maxTr = (b.max_price / 1_000_000).toFixed(1).replace('.0', '');
      const priceLabel = minTr === maxTr ? `${minTr}Tr` : `${minTr} - ${maxTr}Tr`;

      // Architectural Hexagonal Shield + Roof Icon (replacing EzHouse's plain green circle)
      const buildingIcon = L.divIcon({
        className: 'elite-leaflet-pin-wrapper',
        iconSize: [96, 74],
        iconAnchor: [48, 68],
        html: `
          <div class="elite-estate-pin ${isSelected ? 'is-active' : ''}" title="${b.name}">
            <div class="elite-estate-pulse"></div>
            <div class="elite-estate-price-tag">${priceLabel}</div>
            <div class="elite-estate-shield">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.9;margin-bottom:1px;">
                <path d="M3 21h18"/>
                <path d="M5 21V7l7-4 7 4v14"/>
                <path d="M9 9h1"/><path d="M14 9h1"/>
                <path d="M9 13h1"/><path d="M14 13h1"/>
                <path d="M10 21v-4h4v4"/>
              </svg>
              <span style="font-size:11px;font-weight:900;line-height:1;">${b.available_rooms}</span>
            </div>
          </div>
        `,
      });

      const marker = L.marker([b.latitude, b.longitude], {
        icon: buildingIcon,
        zIndexOffset: isSelected ? 1000 : 500,
      });

      marker.on('click', () => {
        setActiveBuildingCode(b.code);
      });

      marker.addTo(group);
    });

    // 5. If a building is active, draw a Route Polyline & Distance Badge from Center to Building
    if (activeBuilding) {
      const routeLine = L.polyline(
        [
          [effectiveCenter.lat, effectiveCenter.lng],
          [activeBuilding.latitude, activeBuilding.longitude],
        ],
        {
          color: '#B89C66',
          weight: 4,
          dashArray: '8, 6',
          opacity: 0.95,
        }
      );
      group.addLayer(routeLine);

      const midLat = (effectiveCenter.lat + activeBuilding.latitude) / 2;
      const midLng = (effectiveCenter.lng + activeBuilding.longitude) / 2;
      const bikeMin = Math.max(1, Math.round(activeBuilding.radarDistanceKm * 3));

      const routeBadge = L.divIcon({
        className: 'elite-leaflet-pin-wrapper',
        iconSize: [140, 28],
        iconAnchor: [70, 14],
        html: `
          <div style="background:#0F223A;color:#B89C66;border:1.5px solid #B89C66;padding:3px 10px;border-radius:999px;font-size:10px;font-weight:800;white-space:nowrap;box-shadow:0 6px 16px rgba(15,34,58,0.35);text-align:center;">
            ${activeBuilding.radarDistanceKm} km &bull; ~${bikeMin} phút xe
          </div>
        `,
      });
      L.marker([midLat, midLng], { icon: routeBadge, zIndexOffset: 950 }).addTo(group);
    }
  }, [
    isOpen,
    leafletReady,
    effectiveCenter,
    radiusKm,
    mode,
    personPoints,
    matchedBuildings,
    activeBuildingCode,
    activeBuilding,
  ]);

  // Fit bounds when center or radius changes
  useEffect(() => {
    if (!isOpen || !leafletReady || !mapInstanceRef.current) return;
    const map = mapInstanceRef.current;
    const zoomByRadius =
      radiusKm <= 0.5
        ? 16
        : radiusKm <= 1.5
        ? 15
        : radiusKm <= 3
        ? 14
        : radiusKm <= 5
        ? 13
        : 12;
    map.flyTo([effectiveCenter.lat, effectiveCenter.lng], zoomByRadius, {
      duration: 0.65,
    });
  }, [isOpen, leafletReady, effectiveCenter.lat, effectiveCenter.lng, radiusKm]);

  if (!isOpen) return null;

  const totalAvailableUnits = matchedBuildings.reduce(
    (sum, b) => sum + b.available_rooms,
    0
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-[#0F223A]/60 backdrop-blur-md animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-label="Bản đồ Radar Tìm Phòng Xung Quanh Elite Living"
    >
      <div className="relative w-full max-w-[1360px] h-[92vh] max-h-[860px] bg-[#0F223A] rounded-[28px] border border-[#B89C66]/40 shadow-[0_30px_90px_rgba(15,34,58,0.65)] overflow-hidden flex flex-col lg:flex-row">
        {/* ========================================================= */}
        {/* LEFT CONTROL SIDEBAR (ELITE LIVING DEEP NAVY & CHAMPAGNE) */}
        {/* ========================================================= */}
        <aside className="w-full lg:w-[390px] xl:w-[410px] bg-gradient-to-b from-[#0F223A] via-[#122844] to-[#0B192C] text-white border-b lg:border-b-0 lg:border-r border-[#B89C66]/25 flex flex-col shrink-0 max-h-[46vh] lg:max-h-full overflow-y-auto custom-scrollbar">
          {/* Top Header & Mode Switcher */}
          <div className="p-4 sm:p-5 border-b border-slate-800/80 space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#B89C66]/20 border border-[#B89C66]/40 flex items-center justify-center text-[#B89C66]">
                  <Compass className="w-4.5 h-4.5 animate-spin" style={{ animationDuration: '10s' }} />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#B89C66] block">
                    Elite Spatial Radar 2.0
                  </span>
                  <h2 className="text-sm sm:text-base font-black text-white leading-tight">
                    Bản Đồ Quét Tòa Nhà Xung Quanh
                  </h2>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="lg:hidden p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 cursor-pointer"
                aria-label="Đóng bản đồ"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 2 Mode Tabs: 1 Địa điểm vs Ở giữa (2+ người) */}
            <div className="grid grid-cols-2 gap-1.5 p-1.5 bg-[#091526] rounded-2xl border border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setMode('SINGLE');
                  setActiveBuildingCode(null);
                }}
                className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                  mode === 'SINGLE'
                    ? 'bg-[#B89C66] text-[#0F223A] shadow-md shadow-[#B89C66]/25'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>1 Địa điểm</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode('MIDPOINT');
                  setRadiusKm((r) => (r < 2 ? 3 : r));
                  setActiveBuildingCode(null);
                }}
                className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                  mode === 'MIDPOINT'
                    ? 'bg-[#B89C66] text-[#0F223A] shadow-md shadow-[#B89C66]/25'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Ở giữa (2+ người)</span>
              </button>
            </div>
          </div>

          {/* Filter Controls Body */}
          <div className="p-4 sm:p-5 space-y-4 flex-1">
            {/* BÁN KÍNH & KHOẢNG GIÁ */}
            <div className="space-y-2.5">
              <label className="block text-[11px] font-black uppercase tracking-wider text-[#E5D7B7]">
                Bán Kính Quét &amp; Khoảng Giá (Triệu/Tháng)
              </label>

              <EliteSelect
                value={String(radiusKm)}
                onChange={(val) => setRadiusKm(Number(val))}
                options={RADIUS_OPTIONS}
                variant="navy"
                ariaLabel="Chọn bán kính quét xung quanh"
              />

              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    placeholder="Từ (Min Tr)..."
                    value={minPriceTr}
                    onChange={(e) => setMinPriceTr(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#142A45]/90 border border-slate-700/80 focus:border-[#B89C66] text-xs font-bold text-white placeholder:text-slate-400 outline-none"
                  />
                  {minPriceTr && (
                    <span className="absolute right-3 top-2.5 text-[10px] font-bold text-[#B89C66]">
                      Tr
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    placeholder="Đến (Max Tr)..."
                    value={maxPriceTr}
                    onChange={(e) => setMaxPriceTr(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#142A45]/90 border border-slate-700/80 focus:border-[#B89C66] text-xs font-bold text-white placeholder:text-slate-400 outline-none"
                  />
                  {maxPriceTr && (
                    <span className="absolute right-3 top-2.5 text-[10px] font-bold text-[#B89C66]">
                      Tr
                    </span>
                  )}
                </div>
              </div>

              {/* Quick Price Chips */}
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: 'Tất cả giá', min: '', max: '' },
                  { label: '< 3.5Tr', min: '', max: '3.5' },
                  { label: '3.5 - 4.5Tr', min: '3.5', max: '4.5' },
                  { label: '4.5 - 6Tr', min: '4.5', max: '6' },
                ].map((chip) => {
                  const active = minPriceTr === chip.min && maxPriceTr === chip.max;
                  return (
                    <button
                      key={chip.label}
                      type="button"
                      onClick={() => {
                        setMinPriceTr(chip.min);
                        setMaxPriceTr(chip.max);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                        active
                          ? 'bg-[#B89C66]/25 border-[#B89C66] text-[#FAF0DC]'
                          : 'bg-[#0B192C] border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                      }`}
                    >
                      {chip.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* MODE 1: SINGLE LOCATION INPUT */}
            {mode === 'SINGLE' ? (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-black uppercase tracking-wider text-[#E5D7B7]">
                    Địa Chỉ Điểm Cần Tìm Phòng Xung Quanh
                  </label>
                  <button
                    type="button"
                    onClick={handleLocateMe}
                    className="inline-flex items-center gap-1 text-[10px] font-bold text-[#B89C66] hover:underline cursor-pointer"
                  >
                    <LocateFixed className="w-3 h-3" />
                    <span>Vị trí GPS</span>
                  </button>
                </div>

                <div className="relative">
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[#142A45] border border-[#B89C66]/45 focus-within:border-[#B89C66] focus-within:ring-2 focus-within:ring-[#B89C66]/20">
                    <span className="w-6 h-6 rounded-lg bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <MapPin className="w-3.5 h-3.5" />
                    </span>
                    <input
                      type="text"
                      value={addressQuery}
                      onFocus={() => setShowSuggestions(true)}
                      onChange={(e) => {
                        setAddressQuery(e.target.value);
                        setShowSuggestions(true);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSearchLocation();
                        }
                      }}
                      placeholder="Nhập tên đường, trường ĐH, tòa nhà..."
                      className="w-full bg-transparent text-xs sm:text-sm font-bold text-white placeholder:text-slate-400 outline-none"
                    />
                    {addressQuery && (
                      <button
                        type="button"
                        onClick={() => setAddressQuery('')}
                        className="text-slate-400 hover:text-white p-1 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Autocomplete Dropdown */}
                  {showSuggestions && addressSuggestions.length > 0 && (
                    <div className="absolute left-0 right-0 mt-1.5 bg-[#0B192C] border border-[#B89C66]/40 rounded-xl shadow-2xl z-30 max-h-56 overflow-y-auto p-1.5 space-y-0.5">
                      {addressSuggestions.map((sug) => (
                        <button
                          key={sug.id}
                          type="button"
                          onClick={() => {
                            setAddressQuery(sug.name);
                            setCenterPoint({
                              lat: sug.lat,
                              lng: sug.lng,
                              label: sug.name,
                            });
                            setActiveBuildingCode(null);
                            setShowSuggestions(false);
                          }}
                          className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-left text-xs hover:bg-[#193354] transition-colors cursor-pointer"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-white truncate">{sug.name}</p>
                            <p className="text-[10px] text-slate-400">{sug.district}</p>
                          </div>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#B89C66]/20 text-[#E5D7B7] shrink-0">
                            {sug.district.replace('Quận ', 'Q.')}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Quick Hotspot Chips */}
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {[
                    { label: 'Lê Thúc Hoạch', id: 'le-thuc-hoach' },
                    { label: 'ĐH HUIT Tân Phú', id: 'huit' },
                    { label: 'Etown Cộng Hòa', id: 'etown-cong-hoa' },
                    { label: 'ĐH IUH Gò Vấp', id: 'iuh-go-vap' },
                    { label: 'HUTECH Bình Thạnh', id: 'hutech-d2' },
                    { label: 'ĐH Bách Khoa Q.10', id: 'bach-khoa-q10' },
                    { label: 'TDTU / RMIT Q.7', id: 'tdtu-rmit' },
                    { label: 'Thảo Điền Thủ Đức', id: 'thao-dien' },
                  ].map((chip) => {
                    const preset = HCMC_PRESET_LOCATIONS.find((p) => p.id === chip.id);
                    if (!preset) return null;
                    const isSelected =
                      Math.abs(centerPoint.lat - preset.lat) < 0.0005 &&
                      Math.abs(centerPoint.lng - preset.lng) < 0.0005;
                    return (
                      <button
                        key={chip.id}
                        type="button"
                        onClick={() => {
                          setAddressQuery(preset.name);
                          setCenterPoint({
                            lat: preset.lat,
                            lng: preset.lng,
                            label: preset.name,
                          });
                          setActiveBuildingCode(null);
                          setShowSuggestions(false);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#B89C66] text-[#0F223A] border-[#B89C66]'
                            : 'bg-[#142A45]/70 border-slate-700/80 text-slate-300 hover:border-[#B89C66]/60 hover:text-white'
                        }`}
                      >
                        {chip.label}
                      </button>
                    );
                  })}
                </div>

                {/* Primary CTA Button */}
                <button
                  type="button"
                  onClick={handleSearchLocation}
                  disabled={isGeocoding}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#B89C66] via-[#C9AE78] to-[#A38752] hover:brightness-105 text-[#0F223A] font-black text-xs sm:text-sm uppercase tracking-wider shadow-lg shadow-[#B89C66]/25 flex items-center justify-center gap-2 transition-all active:scale-[0.99] cursor-pointer"
                >
                  <Compass className="w-4 h-4" />
                  <span>{isGeocoding ? 'Đang định vị tọa độ...' : 'Tìm Dự Án Xung Quanh'}</span>
                </button>
              </div>
            ) : (
              /* MODE 2: MULTI-POINT CENTROID ("Ở GIỮA 2+ NGƯỜI") */
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-black uppercase tracking-wider text-[#E5D7B7]">
                    Điểm Học Tập / Làm Việc Của Từng Người
                  </label>
                  {personPoints.length < 4 && (
                    <button
                      type="button"
                      onClick={() => {
                        const nextIdx = personPoints.length + 1;
                        const fallback =
                          HCMC_PRESET_LOCATIONS[(nextIdx * 3) % HCMC_PRESET_LOCATIONS.length];
                        setPersonPoints([
                          ...personPoints,
                          {
                            id: `p-${Date.now()}`,
                            label: `Người ${nextIdx}`,
                            presetId: fallback.id,
                            lat: fallback.lat,
                            lng: fallback.lng,
                            address: fallback.name,
                          },
                        ]);
                      }}
                      className="inline-flex items-center gap-1 text-[10px] font-bold text-[#B89C66] hover:underline cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Thêm người ({personPoints.length}/4)</span>
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  {personPoints.map((person, idx) => (
                    <div
                      key={person.id}
                      className="p-2.5 rounded-xl bg-[#0B192C] border border-slate-800 space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-extrabold text-[#B89C66] flex items-center gap-1.5">
                          <span className="w-4 h-4 rounded-full bg-[#B89C66] text-[#0F223A] text-[10px] font-black flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <span>Vị trí Người {idx + 1}</span>
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-400">
                            Cách điểm giữa:{' '}
                            <strong className="text-white">
                              {calculateHaversineKm(
                                person.lat,
                                person.lng,
                                effectiveCenter.lat,
                                effectiveCenter.lng
                              )}{' '}
                              km
                            </strong>
                          </span>
                          {personPoints.length > 2 && (
                            <button
                              type="button"
                              onClick={() =>
                                setPersonPoints(personPoints.filter((item) => item.id !== person.id))
                              }
                              className="text-rose-400 hover:text-rose-300 p-0.5 cursor-pointer"
                              aria-label={`Xóa người ${idx + 1}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      <EliteSelect
                        value={person.presetId}
                        onChange={(presetId) => {
                          const found = HCMC_PRESET_LOCATIONS.find((l) => l.id === presetId);
                          if (!found) return;
                          setPersonPoints(
                            personPoints.map((item) =>
                              item.id === person.id
                                ? {
                                    ...item,
                                    presetId: found.id,
                                    lat: found.lat,
                                    lng: found.lng,
                                    address: found.name,
                                  }
                                : item
                            )
                          );
                        }}
                        options={presetSelectOptions}
                        searchable
                        searchPlaceholder="Gõ trường ĐH, tên đường, quận..."
                        variant="navy"
                        size="sm"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* MATCHED PROJECTS SUMMARY & INTERACTIVE MINI-LIST          */}
            {/* ========================================================= */}
            <div className="p-3.5 rounded-2xl bg-[#091526]/90 border border-[#B89C66]/35 space-y-3">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#B89C66]/20 border border-[#B89C66]/40 text-[#FAF0DC] text-xs font-black">
                  <Sparkles className="w-3.5 h-3.5 text-[#B89C66]" />
                  <span>
                    {matchedBuildings.length} dự án phù hợp ({totalAvailableUnits} phòng trống)
                  </span>
                </span>
              </div>

              {matchedBuildings.length === 0 ? (
                <div className="text-center py-3 space-y-2">
                  <p className="text-xs font-bold text-slate-300">
                    Chưa có tòa nhà nào trong bán kính {radiusKm} km
                  </p>
                  <button
                    type="button"
                    onClick={() => setRadiusKm(Math.min(8, radiusKm + 2))}
                    className="px-3 py-1.5 rounded-lg bg-[#B89C66] text-[#0F223A] text-xs font-extrabold cursor-pointer"
                  >
                    Mở rộng bán kính lên {Math.min(8, radiusKm + 2)} km
                  </button>
                </div>
              ) : (
                <>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Nhấp vào <strong className="text-[#E5D7B7]">Huy hiệu Tòa nhà</strong> trên bản đồ hoặc chọn bên dưới để xem đường đi &amp; khoảng cách:
                  </p>
                  <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                    {matchedBuildings.map((b) => {
                      const isSelected = b.code === activeBuildingCode;
                      return (
                        <button
                          key={b.code}
                          type="button"
                          onClick={() => {
                            setActiveBuildingCode(b.code);
                            if (mapInstanceRef.current) {
                              mapInstanceRef.current.panTo([b.latitude, b.longitude], {
                                animate: true,
                              });
                            }
                          }}
                          className={`w-full flex items-center justify-between gap-2 p-2 rounded-xl border text-left transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-[#B89C66]/20 border-[#B89C66] text-white'
                              : 'bg-[#142A45]/60 border-slate-800/90 text-slate-300 hover:bg-[#142A45] hover:border-slate-700'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-white truncate">{b.name}</p>
                            <p className="text-[10px] text-slate-400 truncate mt-0.5">
                              {b.address}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="block text-[11px] font-black text-[#B89C66]">
                              {(b.min_price / 1_000_000).toFixed(1)}Tr
                            </span>
                            <span className="block text-[10px] text-slate-400">
                              {b.radarDistanceKm} km
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        </aside>

        {/* ========================================================= */}
        {/* RIGHT INTERACTIVE MAP CANVAS                              */}
        {/* ========================================================= */}
        <div className="relative flex-1 h-full min-h-[380px] bg-[#F8F8F6]">
          {/* Map Container */}
          <div ref={mapContainerRef} className="w-full h-full z-10" />

          {/* Top Floating Map Toolbar (Layer Switcher & Close Button) */}
          <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between gap-2 pointer-events-none">
            {/* Active Center Pill */}
            <div className="pointer-events-auto hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-[#0F223A]/90 backdrop-blur-md text-white border border-[#B89C66]/40 shadow-xl max-w-md">
              <Navigation className="w-3.5 h-3.5 text-[#B89C66] shrink-0" />
              <span className="text-xs font-bold truncate">{effectiveCenter.label}</span>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#B89C66] text-[#0F223A] shrink-0">
                R = {radiusKm} km
              </span>
            </div>

            {/* Right Controls: Map Style Switcher & Close */}
            <div className="pointer-events-auto flex items-center gap-2 ml-auto">
              <div className="flex items-center bg-[#0F223A]/90 backdrop-blur-md p-1 rounded-xl border border-[#B89C66]/40 shadow-xl">
                <Layers className="w-3.5 h-3.5 text-[#B89C66] ml-2 mr-1.5 hidden sm:block" />
                {[
                  { id: 'google_streets', label: 'Bản đồ Chuẩn' },
                  { id: 'google_hybrid', label: 'Vệ tinh' },
                  { id: 'carto_light', label: 'Tinh gọn' },
                ].map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setMapStyle(st.id as typeof mapStyle)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      mapStyle === st.id
                        ? 'bg-[#B89C66] text-[#0F223A]'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-9 h-9 rounded-xl bg-[#0F223A]/90 hover:bg-[#0F223A] text-white border border-[#B89C66]/40 flex items-center justify-center shadow-xl transition-transform active:scale-95 cursor-pointer"
                aria-label="Đóng bản đồ"
              >
                <X className="w-4.5 h-4.5 text-[#B89C66]" />
              </button>
            </div>
          </div>

          {/* Floating Locate Me Button */}
          <button
            type="button"
            onClick={handleLocateMe}
            title="Định vị GPS của tôi"
            className="absolute bottom-24 right-3 z-20 w-10 h-10 rounded-full bg-[#0F223A] hover:bg-[#193354] text-[#B89C66] border-2 border-[#B89C66] shadow-xl flex items-center justify-center transition-transform hover:scale-105 cursor-pointer"
          >
            <LocateFixed className="w-4.5 h-4.5" />
          </button>

          {/* Bottom Floating Selected Building Preview Card */}
          {activeBuilding && (
            <div className="absolute bottom-4 left-4 right-14 z-20 max-w-2xl bg-[#0F223A]/95 backdrop-blur-md text-white rounded-2xl border border-[#B89C66] shadow-[0_20px_50px_rgba(15,34,58,0.65)] p-3.5 sm:p-4 animate-in slide-in-from-bottom-4 duration-200">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3.5">
                <img
                  src={
                    activeBuilding.featured_image ||
                    activeBuilding.images[0] ||
                    'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400'
                  }
                  alt={activeBuilding.name}
                  className="w-full sm:w-28 h-24 rounded-xl object-cover border border-[#B89C66]/40 shrink-0"
                />

                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-black px-2 py-0.5 rounded bg-[#B89C66] text-[#0F223A]">
                      Mã DA: {activeBuilding.code}
                    </span>
                    <span className="text-[11px] font-bold text-[#E5D7B7] flex items-center gap-1">
                      <Route className="w-3.5 h-3.5 text-[#B89C66]" />
                      Cách điểm tâm {activeBuilding.radarDistanceKm} km (~
                      {Math.max(1, Math.round(activeBuilding.radarDistanceKm * 3))} phút đi xe)
                    </span>
                  </div>

                  <h3 className="text-sm sm:text-base font-black text-white truncate">
                    {activeBuilding.name}
                  </h3>
                  <p className="text-xs text-slate-300 truncate">{activeBuilding.address}</p>

                  <div className="flex items-center justify-between gap-2 pt-1.5">
                    <div>
                      <span className="text-xs sm:text-sm font-black text-[#B89C66]">
                        {(activeBuilding.min_price / 1_000_000).toFixed(1)} -{' '}
                        {(activeBuilding.max_price / 1_000_000).toFixed(1)} Triệu/tháng
                      </span>
                      <span className="text-[11px] text-slate-300 ml-2">
                        &bull; Còn {activeBuilding.available_rooms}/{activeBuilding.total_rooms} phòng trống
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&origin=${effectiveCenter.lat},${effectiveCenter.lng}&destination=${activeBuilding.latitude},${activeBuilding.longitude}&travelmode=two-wheeler`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white inline-flex items-center gap-1 transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-[#B89C66]" />
                        <span className="hidden md:inline">Chỉ đường</span>
                      </a>

                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onSelectBuilding(activeBuilding);
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-[#B89C66] hover:bg-[#A38752] text-[#0F223A] text-xs font-black inline-flex items-center gap-1 shadow-md cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Xem Phòng Trống</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
