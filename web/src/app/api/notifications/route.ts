import { NextRequest, NextResponse } from 'next/server';
import { inMemoryNotifications } from '@/lib/email-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const type = searchParams.get('type');

    let list = [...inMemoryNotifications];
    if (email) {
      list = list.filter((n) => n.recipientEmail.toLowerCase() === email.toLowerCase());
    }
    if (type) {
      list = list.filter((n) => n.type === type);
    }

    return NextResponse.json({
      success: true,
      data: list,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id } = body;
    const notif = inMemoryNotifications.find((n) => n.id === id);
    if (notif) {
      notif.isRead = true;
    }
    return NextResponse.json({ success: true, data: notif });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
