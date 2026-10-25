'use client';

import { useEffect, useState } from 'react';

export interface CatalogData {
  amenities: string[];
  pricing: { electricityRate: number; waterRate: number; internetFee: number; serviceFee: number; parkingFee: number };
}

export const FALLBACK_CATALOG: CatalogData = {
  amenities: ['Máy lạnh', 'Gác lửng', 'WC riêng', 'Tủ lạnh', 'Máy giặt', 'Ban công', 'Thang máy', 'Khóa vân tay', 'Wifi miễn phí'],
  pricing: { electricityRate: 3800, waterRate: 25000, internetFee: 100000, serviceFee: 150000, parkingFee: 120000 },
};

let cached: Promise<CatalogData> | null = null;

/** Danh mục tiện ích & đơn giá mặc định do admin quản lý (tải một lần cho cả trang). */
export function useCatalog(): CatalogData {
  const [data, setData] = useState<CatalogData>(FALLBACK_CATALOG);
  useEffect(() => {
    cached ??= fetch('/api/catalog')
      .then((r) => r.json())
      .then((json) => ({
        amenities: Array.isArray(json?.data?.amenities) && json.data.amenities.length
          ? json.data.amenities.map((a: { name: string }) => a.name)
          : FALLBACK_CATALOG.amenities,
        pricing: { ...FALLBACK_CATALOG.pricing, ...(json?.data?.pricing || {}) },
      }))
      .catch(() => {
        cached = null;
        return FALLBACK_CATALOG;
      });
    let alive = true;
    cached.then((d) => alive && setData(d));
    return () => {
      alive = false;
    };
  }, []);
  return data;
}
