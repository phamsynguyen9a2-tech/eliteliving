'use client';

import { useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';

function LoginRedirect() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab') || 'login';
      router.replace(`/?auth=${tab}`);
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-[#F8F8F6] flex flex-col items-center justify-center gap-3">
      <div className="w-10 h-10 border-3 border-[#B89C66] border-t-transparent rounded-full animate-spin" />
      <p className="text-xs font-semibold text-[#0F223A] tracking-wide">
        Đang mở cửa sổ đăng nhập Elite Living...
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginRedirect />
    </Suspense>
  );
}
