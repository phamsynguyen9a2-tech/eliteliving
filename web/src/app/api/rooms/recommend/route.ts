import { NextRequest, NextResponse } from 'next/server';
import { getTopKRecommendations, getUserById } from '@/lib/db';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const { searchParams } = new URL(request.url);

  const userId = searchParams.get('userId');
  const user = userId ? await getUserById(userId) : undefined;

  const budgetMax = searchParams.get('budget') 
    ? Number(searchParams.get('budget')) 
    : (user?.preferences?.budget_max || 5000000);

  // Default to coordinates near HUIT (ĐH Công Thương TP.HCM: 10.8066, 106.6286)
  const targetLat = searchParams.get('lat') 
    ? Number(searchParams.get('lat')) 
    : (user?.preferences?.target_lat || 10.8066);

  const targetLng = searchParams.get('lng') 
    ? Number(searchParams.get('lng')) 
    : (user?.preferences?.target_lng || 106.6286);

  const maxRadiusKm = searchParams.get('radius') 
    ? Number(searchParams.get('radius')) 
    : (user?.preferences?.max_radius_km || 5.0);

  const k = searchParams.get('k') ? Number(searchParams.get('k')) : 6;

  const rawAmenities = searchParams.get('amenities');
  const preferredAmenities = rawAmenities 
    ? rawAmenities.split(',') 
    : (user?.preferences?.preferred_amenities || ['Máy lạnh', 'Gác lửng', 'Wifi']);

  const recommendations = await getTopKRecommendations(
    {
      budget_max: budgetMax,
      target_lat: targetLat,
      target_lng: targetLng,
      preferred_amenities: preferredAmenities,
      max_radius_km: maxRadiusKm
    },
    k
  );

  const latencyMs = Date.now() - startTime;

  return NextResponse.json({
    success: true,
    metadata: {
      algorithm: 'Hybrid: Weighted Rule-Based + Content-Based Cosine + Haversine Distance',
      k,
      latency_ms: latencyMs,
      p95_target: '< 500ms',
      precision_at_5_expected: '>= 70%'
    },
    data: recommendations
  });
}
