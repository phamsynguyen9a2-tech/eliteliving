'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  PlusCircle,
  ArrowLeft,
  Sparkles,
  MapPin,
  Building2,
  Check,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

const REAL_PROJECT_OPTIONS = [
  {
    name: 'Tòa nhà Căn hộ Dịch vụ Tây Thạnh (Cạnh HUIT 140 Lê Trọng Tấn)',
    address: 'Số 84 Đường Tây Thạnh, Phường Tây Thạnh, Quận Tân Phú',
    district: 'Quận Tân Phú',
    image: 'https://res.cloudinary.com/dmdfi6nq7/image/upload/v1778732476/room-images/iufdgvwqykejxnqkd8ot.jpg',
  },
  {
    name: 'Tòa nhà Căn hộ Cao cấp Khuông Việt (Gần Đầm Sen)',
    address: 'Số 173/5/14 Đường Khuông Việt, Phường Phú Trung, Quận Tân Phú',
    district: 'Quận Tân Phú',
    image: 'https://res.cloudinary.com/dmdfi6nq7/image/upload/v1781103062/room-images/wwif5ftkfoiztzxtorof.webp',
  },
  {
    name: 'Tòa nhà Căn hộ Tên Lửa - Aeon Mall Bình Tân',
    address: 'Đường Tên Lửa, Phường An Lạc A, Quận Bình Tân',
    district: 'Quận Bình Tân',
    image: 'https://res.cloudinary.com/dmdfi6nq7/image/upload/v1778732478/room-images/qsx9lfypxygygzcc5efc.jpg',
  },
  {
    name: 'Tòa nhà Căn hộ Dịch vụ Lê Đức Thọ - Quận Gò Vấp (Gần ĐH IUH)',
    address: 'Số 688/93 Lê Đức Thọ, Phường 15, Quận Gò Vấp',
    district: 'Quận Gò Vấp',
    image: 'https://pub-31546a0e78914856a3ce968e8df5a028.r2.dev/rooms/zalo-import/adb57302-b467-4ae2-a342-254cc3c0dfe3.jpg',
  },
  {
    name: 'Tòa nhà Căn hộ Dịch vụ Nguyễn Gia Trí - Quận Bình Thạnh (Sát HUTECH)',
    address: 'Số 69/2/26 Nguyễn Gia Trí (Đường D2), Phường 25, Quận Bình Thạnh',
    district: 'Quận Bình Thạnh',
    image: 'https://res.cloudinary.com/dmdfi6nq7/image/upload/v1778664296/room-images/hvtv5esqrpqlobckbocf.webp',
  },
  {
    name: 'Tòa nhà Căn hộ Dịch vụ Thảo Điền - TP. Thủ Đức',
    address: 'Số 216 Nguyễn Văn Hưởng, Phường Thảo Điền, Thành phố Thủ Đức',
    district: 'Thành phố Thủ Đức',
    image: 'https://res.cloudinary.com/dmdfi6nq7/image/upload/v1778732476/room-images/iufdgvwqykejxnqkd8ot.jpg',
  },
  {
    name: 'Tòa nhà Căn hộ Dịch vụ Lê Văn Lương - Quận 7 (Gần ĐH TDTU & RMIT)',
    address: 'Số 100 Lê Văn Lương, Phường Tân Hưng, Quận 7',
    district: 'Quận 7',
    image: 'https://res.cloudinary.com/dmdfi6nq7/image/upload/v1781103062/room-images/wwif5ftkfoiztzxtorof.webp',
  },
  {
    name: 'Tòa nhà Căn hộ Dịch vụ Sư Vạn Hạnh - Quận 10 (Cạnh Vạn Hạnh Mall)',
    address: 'Số 493A/103 Cách Mạng Tháng 8, Phường 13, Quận 10',
    district: 'Quận 10',
    image: 'https://res.cloudinary.com/dmdfi6nq7/image/upload/v1778732478/room-images/qsx9lfypxygygzcc5efc.jpg',
  },
  {
    name: 'Khác / Tự nhập địa chỉ',
    address: '',
    district: 'Quận Tân Phú',
    image: '',
  }
];

const HABIT_OPTIONS = [
  'Sạch sẽ',
  'Ngủ sớm (trước 23h30)',
  'Dậy sớm',
  'Không hút thuốc',
  'Thích nấu ăn',
  'Yên tĩnh học bài',
  'Thân thiện hòa đồng',
  'Yêu thích thú cưng',
  'Tập thể thao',
  'Không tụ tập bạn bè qua đêm',
];

export default function CreateRoommatePostPage() {
  const router = useRouter();
  const { data: session } = useSession();

  const [selectedBuilding, setSelectedBuilding] = useState(REAL_PROJECT_OPTIONS[0].name);
  const [title, setTitle] = useState('Tìm 1 bạn ở ghép phòng thoáng mát, đầy đủ tiện nghi');
  const [district, setDistrict] = useState(REAL_PROJECT_OPTIONS[0].district);
  const [address, setAddress] = useState(REAL_PROJECT_OPTIONS[0].address);
  const [sharedRent, setSharedRent] = useState('2000000');
  const [maxPeople, setMaxPeople] = useState('2');
  const [currentPeople, setCurrentPeople] = useState('1');
  const [genderPreference, setGenderPreference] = useState('Không yêu cầu');
  const [selectedHabits, setSelectedHabits] = useState<string[]>(['Sạch sẽ', 'Không hút thuốc', 'Yên tĩnh học bài']);
  const [description, setDescription] = useState('Phòng sạch đẹp, đầy đủ máy lạnh, tủ lạnh, kệ bếp, khóa vân tay an ninh. Cần tìm bạn ở ghép cùng chia sẻ tiền phòng.');
  const [contactPhone, setContactPhone] = useState(session?.user?.phone || '0901234567');
  const [imageUrl, setImageUrl] = useState(REAL_PROJECT_OPTIONS[0].image);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSelectBuilding = (bName: string) => {
    setSelectedBuilding(bName);
    const found = REAL_PROJECT_OPTIONS.find((b) => b.name === bName);
    if (found && found.address) {
      setAddress(found.address);
      setDistrict(found.district);
      if (found.image) setImageUrl(found.image);
    }
  };

  const toggleHabit = (habit: string) => {
    if (selectedHabits.includes(habit)) {
      setSelectedHabits(selectedHabits.filter((h) => h !== habit));
    } else {
      setSelectedHabits([...selectedHabits, habit]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/roommate/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          district,
          address,
          shared_rent: Number(sharedRent),
          max_people: Number(maxPeople),
          current_people: Number(currentPeople),
          gender_preference: genderPreference,
          required_habits: selectedHabits,
          description,
          contact_phone: contactPhone || session?.user?.phone || '0903123456',
          room_title: selectedBuilding !== 'Khác / Tự nhập địa chỉ' ? selectedBuilding : undefined,
          images: imageUrl ? [imageUrl] : [
            'https://res.cloudinary.com/dmdfi6nq7/image/upload/v1778732476/room-images/iufdgvwqykejxnqkd8ot.jpg',
          ],
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Lỗi khi đăng bài.');
      } else {
        setSuccess(true);
        setTimeout(() => {
          router.push('/o-ghep');
        }, 1200);
      }
    } catch {
      setError('Lỗi kết nối máy chủ.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F8F6] text-[#0F223A] font-sans selection:bg-[#B89C66]/20 selection:text-[#8C6D37]">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex-1 w-full">
        {/* Breadcrumb */}
        <div className="mb-6">
          <Link
            href="/o-ghep"
            className="inline-flex items-center gap-2 text-xs font-bold text-[#64748B] hover:text-[#B89C66] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quay lại danh sách ở ghép</span>
          </Link>
        </div>

        {/* Card Form */}
        <div className="bg-white rounded-[28px] border border-[#E5E3DE] shadow-[0_15px_40px_-10px_rgba(15,34,58,0.08)] overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#0F223A] via-[#142A45] to-[#0F223A] text-white p-6 sm:p-8 relative">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#B89C66]/20 border border-[#B89C66]/30 text-[#B89C66] text-xs font-bold mb-3 backdrop-blur-sm">
              <Sparkles className="w-3.5 h-3.5 text-[#B89C66]" />
              <span>Ở ghép</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight font-sans">
              Đăng tin tìm người ở ghép
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-2 max-w-xl leading-relaxed">
              Bài đăng hiển thị công khai trên trang Ở ghép và được lưu trong tài khoản của bạn.
            </p>
          </div>

          <div className="p-6 sm:p-8">
            {success ? (
              <div className="py-12 text-center space-y-3">
                <CheckCircle2 className="w-16 h-16 text-[#B89C66] mx-auto animate-bounce" />
                <h3 className="text-xl font-black text-[#0F223A]">Đăng tin thành công!</h3>
                <p className="text-xs text-[#64748B]">Đang chuyển hướng về trang danh sách ở ghép...</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-700 font-medium">
                    <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Chọn tòa nhà thực tế */}
                <div>
                  <label className="block text-xs font-bold text-[#0F223A] uppercase tracking-wider mb-2">
                    Chọn Tòa Nhà Thực Tế Trong Hệ Thống Elite Living
                  </label>
                  <select
                    value={selectedBuilding}
                    onChange={(e) => handleSelectBuilding(e.target.value)}
                    className="w-full px-4 py-3 bg-[#FAF8F5] border border-[#E5E3DE] rounded-xl text-xs font-bold text-[#0F223A] focus:bg-white focus:border-[#B89C66] focus:ring-4 focus:ring-[#B89C66]/15 outline-none"
                  >
                    {REAL_PROJECT_OPTIONS.map((b) => (
                      <option key={b.name} value={b.name}>{b.name}</option>
                    ))}
                  </select>
                </div>

                {/* Tiêu đề */}
                <div>
                  <label className="block text-xs font-bold text-[#0F223A] uppercase tracking-wider mb-2">
                    Tiêu đề bài đăng <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="VD: Tìm 1 bạn nữ ở ghép studio ban công gần ĐH HUIT..."
                    className="w-full px-4 py-3 bg-[#FAF8F5] border border-[#E5E3DE] rounded-xl text-sm font-semibold text-[#0F223A] focus:bg-white focus:border-[#B89C66] focus:ring-4 focus:ring-[#B89C66]/15 outline-none"
                  />
                </div>

                {/* Khu vực & Địa chỉ */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#0F223A] uppercase tracking-wider mb-2">
                      Quận / Huyện <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      className="w-full px-4 py-3 bg-[#FAF8F5] border border-[#E5E3DE] rounded-xl text-xs font-bold text-[#0F223A] focus:bg-white focus:border-[#B89C66] outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#0F223A] uppercase tracking-wider mb-2">
                      Địa chỉ cụ thể <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full px-4 py-3 bg-[#FAF8F5] border border-[#E5E3DE] rounded-xl text-xs font-semibold text-[#0F223A] focus:bg-white focus:border-[#B89C66] outline-none"
                    />
                  </div>
                </div>

                {/* Giá chia sẻ & Số người */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#0F223A] uppercase tracking-wider mb-2">
                      Giá chia/người (VNĐ) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min={500000}
                      step={50000}
                      value={sharedRent}
                      onChange={(e) => setSharedRent(e.target.value)}
                      className="w-full px-4 py-3 bg-[#FAF8F5] border border-[#E5E3DE] rounded-xl text-sm font-black text-[#B89C66] focus:bg-white focus:border-[#B89C66] outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#0F223A] uppercase tracking-wider mb-2">
                      Số người hiện tại
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={currentPeople}
                      onChange={(e) => setCurrentPeople(e.target.value)}
                      className="w-full px-4 py-3 bg-[#FAF8F5] border border-[#E5E3DE] rounded-xl text-xs font-bold text-[#0F223A] focus:bg-white focus:border-[#B89C66] outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#0F223A] uppercase tracking-wider mb-2">
                      Tổng người tối đa
                    </label>
                    <input
                      type="number"
                      min={2}
                      max={10}
                      value={maxPeople}
                      onChange={(e) => setMaxPeople(e.target.value)}
                      className="w-full px-4 py-3 bg-[#FAF8F5] border border-[#E5E3DE] rounded-xl text-xs font-bold text-[#0F223A] focus:bg-white focus:border-[#B89C66] outline-none"
                    />
                  </div>
                </div>

                {/* Giới tính yêu cầu */}
                <div>
                  <label className="block text-xs font-bold text-[#0F223A] uppercase tracking-wider mb-2">
                    Yêu cầu giới tính bạn cùng phòng
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {['Nữ', 'Nam', 'Không yêu cầu'].map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setGenderPreference(g)}
                        className={`py-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          genderPreference === g
                            ? 'bg-[#B89C66] text-white border-[#B89C66] shadow-sm'
                            : 'bg-[#FAF8F5] border-[#E5E3DE] text-[#0F223A] hover:border-[#B89C66]'
                        }`}
                      >
                        {g === 'Không yêu cầu' ? 'Nam / Nữ đều được' : `Tìm ${g}`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Thói quen yêu cầu */}
                <div>
                  <label className="block text-xs font-bold text-[#0F223A] uppercase tracking-wider mb-2">
                    Tiêu chí &amp; Thói quen mong muốn (Thuật toán Jaccard sẽ so khớp)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {HABIT_OPTIONS.map((habit) => {
                      const selected = selectedHabits.includes(habit);
                      return (
                        <button
                          key={habit}
                          type="button"
                          onClick={() => toggleHabit(habit)}
                          className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
                            selected
                              ? 'bg-[#FAF7F2] text-[#8C6D37] border-[#B89C66] shadow-xs'
                              : 'bg-white border-[#E5E3DE] text-[#64748B] hover:border-[#B89C66]'
                          }`}
                        >
                          {selected ? <Check className="w-3.5 h-3.5 text-[#B89C66]" /> : null}
                          <span>{habit}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Mô tả chi tiết */}
                <div>
                  <label className="block text-xs font-bold text-[#0F223A] uppercase tracking-wider mb-2">
                    Mô tả chi tiết phòng &amp; Mong muốn về người ở cùng <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Mô tả nội thất, giờ giấc sinh hoạt, đồ đạc đã có sẵn..."
                    className="w-full px-4 py-3 bg-[#FAF8F5] border border-[#E5E3DE] rounded-xl text-xs font-medium text-[#0F223A] focus:bg-white focus:border-[#B89C66] focus:ring-4 focus:ring-[#B89C66]/15 outline-none"
                  />
                </div>

                {/* Số điện thoại liên hệ */}
                <div>
                  <label className="block text-xs font-bold text-[#0F223A] uppercase tracking-wider mb-2">
                    Số điện thoại liên hệ (Khách tìm phòng sẽ liên lạc qua số này) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="0901234567"
                    className="w-full px-4 py-3 bg-[#FAF8F5] border border-[#E5E3DE] rounded-xl text-xs font-bold text-[#0F223A] focus:bg-white focus:border-[#B89C66] outline-none"
                  />
                </div>

                {/* Submit Buttons */}
                <div className="pt-4 border-t border-[#E5E3DE] flex items-center justify-end gap-3">
                  <Link
                    href="/o-ghep"
                    className="px-5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#0F223A] font-bold text-xs transition-colors"
                  >
                    Hủy bỏ
                  </Link>

                  <button
                    type="submit"
                    disabled={loading}
                    className="px-7 py-3 bg-[#B89C66] hover:bg-[#A38752] text-white font-bold text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-[#B89C66]/25 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />}
                    <span>Đăng tin tìm bạn ngay</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
