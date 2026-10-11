import { NextRequest, NextResponse } from 'next/server';
import { INITIAL_HANDOVERS } from '@/lib/../data/sample_handovers';
import type { HandoverComparison } from '@/lib/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Sample fallback comparison data
    const checkoutHandover = INITIAL_HANDOVERS.find((h) => h.id === id || h.type === 'CHECK_OUT') || INITIAL_HANDOVERS[1];
    const checkinHandover = INITIAL_HANDOVERS.find((h) => h.type === 'CHECK_IN') || INITIAL_HANDOVERS[0];

    const comparisonList: HandoverComparison[] = [];
    let totalDamageCost = 0;

    // Map checkout items against checkin items
    checkoutHandover.items.forEach((outItem) => {
      const inItem = checkinHandover.items.find(
        (i) => i.asset_name.toLowerCase() === outItem.asset_name.toLowerCase()
      );

      const hasDamage =
        outItem.condition === 'Hư hỏng' ||
        outItem.condition === 'Mất' ||
        (inItem && inItem.condition === 'Tốt' && outItem.condition !== 'Tốt') ||
        (outItem.estimated_cost && outItem.estimated_cost > 0);

      const damageCost = outItem.estimated_cost || (hasDamage ? 150000 : 0);
      if (hasDamage) totalDamageCost += damageCost;

      comparisonList.push({
        asset_name: outItem.asset_name,
        category: outItem.category,
        check_in_condition: inItem?.condition || 'Tốt',
        check_in_quantity: inItem?.quantity || 1,
        check_out_condition: outItem.condition,
        check_out_quantity: outItem.quantity,
        has_damage: Boolean(hasDamage),
        damage_cost: damageCost,
        check_in_photos: inItem?.photos || [],
        check_out_photos: outItem.photos || [],
      });
    });

    return NextResponse.json({
      success: true,
      data: {
        room_code: checkoutHandover.room_code || 'P-102',
        room_title: checkoutHandover.room_title || 'Căn hộ 2PN Emerald Celadon City',
        tenant_name: checkoutHandover.tenant_name,
        check_in_date: checkinHandover.handover_date,
        check_out_date: checkoutHandover.handover_date,
        total_damage_cost: totalDamageCost,
        comparisons: comparisonList,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
