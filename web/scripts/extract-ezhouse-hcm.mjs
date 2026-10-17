import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_BASE = 'https://ezhouse.vn/api';

// 11 Quận/Thành phố trọng điểm mới tại TP.HCM trên EzHouse (bên cạnh Tân Phú, Tân Bình, Bình Tân đã có)
const NEW_DISTRICTS = [
  {
    ezId: 'ad4dfbcf-57a7-4924-9042-25c7a0d5c2db',
    name: 'Quận Gò Vấp',
    shortCode: 'QGV',
    targetProjects: 5,
    landmarkHint: 'Gần ĐH Công Nghiệp IUH & ĐH Văn Lang',
    defaultLat: 10.8386,
    defaultLng: 106.6652,
    landlords: [
      { id: 'landlord_gv_1', name: 'Trần Quốc Bảo (Chủ chuỗi căn hộ Quang Trung - Gò Vấp)', phone: '0908112233', email: 'bao.govap@eliteliving.vn', district: 'Quận Gò Vấp' },
      { id: 'landlord_gv_2', name: 'Lê Thị Bích Ngọc (Chủ trọ Phan Văn Trị - Cityland Gò Vấp)', phone: '0908223344', email: 'ngoc.govap@eliteliving.vn', district: 'Quận Gò Vấp' },
    ],
  },
  {
    ezId: '989ab95d-197f-4f6c-90ed-64a089959833',
    name: 'Quận Bình Thạnh',
    shortCode: 'QBTH',
    targetProjects: 5,
    landmarkHint: 'Gần ĐH HUTECH, Ngoại Thương & Hàng Xanh',
    defaultLat: 10.8033,
    defaultLng: 106.7091,
    landlords: [
      { id: 'landlord_bth_1', name: 'Nguyễn Minh Triết (Chủ trọ Điện Biên Phủ - D2 Bình Thạnh)', phone: '0908334455', email: 'triet.binhthanh@eliteliving.vn', district: 'Quận Bình Thạnh' },
      { id: 'landlord_bth_2', name: 'Phạm Hoàng Yến (Quản lý Căn hộ Bạch Đằng - Nguyễn Xí)', phone: '0908445566', email: 'yen.binhthanh@eliteliving.vn', district: 'Quận Bình Thạnh' },
    ],
  },
  {
    ezId: '61f0fe6e-aa8f-474f-944f-a73383966bad',
    name: 'Quận Phú Nhuận',
    shortCode: 'QPN',
    targetProjects: 4,
    landmarkHint: 'Khu Phan Xích Long & Nguyễn Văn Trỗi',
    defaultLat: 10.7992,
    defaultLng: 106.6803,
    landlords: [
      { id: 'landlord_pn_1', name: 'Đỗ Thanh Tùng (Chủ căn hộ dịch vụ Phan Xích Long - Phú Nhuận)', phone: '0908556677', email: 'tung.phunhuan@eliteliving.vn', district: 'Quận Phú Nhuận' },
    ],
  },
  {
    ezId: '69ac908e-5ac6-42f6-a182-7ff3d279c14c',
    name: 'Thành phố Thủ Đức',
    shortCode: 'TPTD',
    targetProjects: 5,
    landmarkHint: 'Gần Làng Đại Học, ĐH SPKT & Thảo Điền',
    defaultLat: 10.8231,
    defaultLng: 106.7583,
    landlords: [
      { id: 'landlord_td_1', name: 'Vũ Đình Khoa (Chủ chuỗi Studio Thảo Điền - Võ Văn Ngân)', phone: '0908667788', email: 'khoa.thuduc@eliteliving.vn', district: 'Thành phố Thủ Đức' },
      { id: 'landlord_td_2', name: 'Ngô Thanh Hà (Chủ trọ Hiệp Bình Chánh - Gigamall Thủ Đức)', phone: '0908778899', email: 'ha.thuduc@eliteliving.vn', district: 'Thành phố Thủ Đức' },
    ],
  },
  {
    ezId: '47c1a715-c30c-48d8-b12f-6a994b5ade4d',
    name: 'Quận 7',
    shortCode: 'Q7',
    targetProjects: 5,
    landmarkHint: 'Gần ĐH Tôn Đức Thắng, RMIT & Phú Mỹ Hưng',
    defaultLat: 10.7379,
    defaultLng: 106.7176,
    landlords: [
      { id: 'landlord_q7_1', name: 'Huỳnh Tấn Phát (Chủ căn hộ Nam Sài Gòn - Tân Phong Q7)', phone: '0908889900', email: 'phat.quan7@eliteliving.vn', district: 'Quận 7' },
      { id: 'landlord_q7_2', name: 'Trương Mỹ Linh (Quản lý Studio Nguyễn Thị Thập - Lotte Q7)', phone: '0908990011', email: 'linh.quan7@eliteliving.vn', district: 'Quận 7' },
    ],
  },
  {
    ezId: '17078588-06a8-497d-baeb-2428cbd45449',
    name: 'Quận 10',
    shortCode: 'Q10',
    targetProjects: 4,
    landmarkHint: 'Gần ĐH Bách Khoa, ĐH Kinh Tế UEH & Vạn Hạnh Mall',
    defaultLat: 10.7726,
    defaultLng: 106.6675,
    landlords: [
      { id: 'landlord_q10_1', name: 'Lý Gia Hân (Chủ căn hộ Sư Vạn Hạnh - Thành Thái Q10)', phone: '0909112233', email: 'han.quan10@eliteliving.vn', district: 'Quận 10' },
    ],
  },
  {
    ezId: '21cd2b5a-bf9f-4059-bb05-1be2e1ba5a83',
    name: 'Quận 12',
    shortCode: 'Q12',
    targetProjects: 5,
    landmarkHint: 'Gần Công viên Phần mềm Quang Trung & ĐH FPT/GTVT',
    defaultLat: 10.8633,
    defaultLng: 106.6543,
    landlords: [
      { id: 'landlord_q12_1', name: 'Phan Văn Khải (Chủ trọ Tân Chánh Hiệp - CVPM Quang Trung)', phone: '0909223344', email: 'khai.quan12@eliteliving.vn', district: 'Quận 12' },
      { id: 'landlord_q12_2', name: 'Bùi Thị Tuyết (Chủ tòa nhà An Phú Đông - Thạnh Xuân Q12)', phone: '0909334455', email: 'tuyet.quan12@eliteliving.vn', district: 'Quận 12' },
    ],
  },
  {
    ezId: '6856f625-6a20-4273-96ee-142b45e25755',
    name: 'Quận 3',
    shortCode: 'Q3',
    targetProjects: 4,
    landmarkHint: 'Khu Lê Văn Sỹ, CMT8 & Nguyễn Đình Chiểu',
    defaultLat: 10.7835,
    defaultLng: 106.6844,
    landlords: [
      { id: 'landlord_q3_1', name: 'Đinh Nhật Minh (Chủ căn hộ dịch vụ Lê Văn Sỹ - Quận 3)', phone: '0909445566', email: 'minh.quan3@eliteliving.vn', district: 'Quận 3' },
    ],
  },
  {
    ezId: 'e84c0134-0602-4eab-a6f4-944e8b14b43d',
    name: 'Quận 1',
    shortCode: 'Q1',
    targetProjects: 4,
    landmarkHint: 'Trung tâm Đa Kao, Tân Định & Phố đi bộ Nguyễn Huệ',
    defaultLat: 10.7885,
    defaultLng: 106.6954,
    landlords: [
      { id: 'landlord_q1_1', name: 'Hoàng Kiều Trang (Quản lý Căn hộ Dịch vụ Trung tâm Quận 1)', phone: '0909556677', email: 'trang.quan1@eliteliving.vn', district: 'Quận 1' },
    ],
  },
  {
    ezId: '6ea1062e-3105-4f0f-b94b-04e5446c4520',
    name: 'Quận 6',
    shortCode: 'Q6',
    targetProjects: 4,
    landmarkHint: 'Gần Vòng xoay Phú Lâm, Hậu Giang & Kinh Dương Vương',
    defaultLat: 10.7478,
    defaultLng: 106.6352,
    landlords: [
      { id: 'landlord_q6_1', name: 'Lương Gia Huy (Chủ chuỗi nhà trọ Hậu Giang - Phú Lâm Q6)', phone: '0909667788', email: 'huy.quan6@eliteliving.vn', district: 'Quận 6' },
    ],
  },
  {
    ezId: 'bef233e1-fa79-4879-9945-c47a00df4934',
    name: 'Quận 8',
    shortCode: 'Q8',
    targetProjects: 4,
    landmarkHint: 'Khu Phạm Thế Hiển, Tạ Quang Bửu & Cầu chữ Y',
    defaultLat: 10.7368,
    defaultLng: 106.6631,
    landlords: [
      { id: 'landlord_q8_1', name: 'Tạ Quang Vinh (Chủ trọ Tạ Quang Bửu - Trung Sơn Quận 8)', phone: '0909778899', email: 'vinh.quan8@eliteliving.vn', district: 'Quận 8' },
    ],
  },
];

function normalizeImageUrl(url) {
  if (!url || typeof url !== 'string') return '';
  return url.replace(
    /ebabbdeb7dd23bff555f0d78c413e704\.r2\.cloudflarestorage\.com/g,
    'pub-31546a0e78914856a3ce968e8df5a028.r2.dev'
  );
}

function calculateHaversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
}

async function fetchMapProjects() {
  const res = await fetch(`${API_BASE}/rooms/public/map-projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  });
  if (!res.ok) return [];
  const json = await res.json();
  return json.data || [];
}

async function fetchRoomsByDistrict(districtId, limit = 80) {
  const res = await fetch(`${API_BASE}/rooms/public/job`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      districtId,
      limit,
      sortBy: 'imagesCount',
      sortOrder: 'desc',
    }),
  });
  let data = await res.json();
  if (data.status !== 'completed' && data.jobId) {
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 400));
      const sRes = await fetch(`${API_BASE}/rooms/public/status/${data.jobId}`);
      if (!sRes.ok) break;
      const sData = await sRes.json();
      if (sData.status === 'completed') {
        data = sData;
        break;
      }
      if (sData.status === 'failed') break;
    }
  }
  return data.result?.data || [];
}

function cleanStreetName(rawStreet) {
  if (!rawStreet) return 'Trung Tâm';
  // Only remove leading house numbers that start with a digit (e.g., "118/83/e2 Bạch Đằng")
  const stripped = rawStreet.replace(/^\d+[0-9A-Za-z\/\-\s]*\s+(?=[A-ZĐÀ-Ỹ0-9])/u, '').trim();
  return stripped || rawStreet.trim();
}

function buildBuildingTitle(streetName, wardName, districtName, idx, landmarkHint) {
  const prefixes = [
    'Tòa nhà Căn hộ Dịch vụ',
    'Khu Căn hộ Studio Cao cấp',
    'Chung cư mini An ninh',
    'Tòa nhà Căn hộ Ban công',
    'Khu Phòng trọ Duplex',
  ];
  const prefix = prefixes[idx % prefixes.length];
  const cleanSt = streetName.replace(/^Đường\s+/i, '');
  const cleanWard = (wardName || '').replace(/^Phường\s+/i, 'P.');
  if (idx === 0 && landmarkHint) {
    return `${prefix} ${cleanSt} (${landmarkHint})`;
  }
  return `${prefix} ${cleanSt}${cleanWard ? ` - ${cleanWard}` : ''} (${districtName})`;
}

async function main() {
  console.log('🚀 Bắt đầu trích xuất dữ liệu thực tế từ EzHouse API cho các quận TP.HCM...');

  const roomsDataPath = path.join(__dirname, '..', 'src', 'data', 'rooms_data.json');
  const rootSeedCompletePath = path.join(__dirname, '..', '..', 'seed_database_complete.json');
  const rootSeedRoomsHcmPath = path.join(__dirname, '..', '..', 'seed_rooms_tp_hcm.json');

  const rawData = JSON.parse(fs.readFileSync(roomsDataPath, 'utf-8'));

  // Preserve ONLY the original 3 districts (Tân Phú, Tân Bình, Bình Tân) as base so script is idempotent
  const ORIGINAL_DISTRICTS = new Set(['Quận Tân Phú', 'Quận Tân Bình', 'Quận Bình Tân']);
  const baseProjects = rawData.projects.filter((p) => ORIGINAL_DISTRICTS.has(p.district));
  const baseRooms = rawData.rooms.filter((r) => ORIGINAL_DISTRICTS.has(r.district));
  const baseLandlords = rawData.landlords.filter((l) => !l.district || ORIGINAL_DISTRICTS.has(l.district));
  const baseUsers = rawData.users.slice(0, 120);
  const baseInteractions = rawData.interactions.slice(0, 2500);

  console.log(`📦 Bảo toàn dữ liệu gốc 3 quận: ${baseProjects.length} tòa nhà, ${baseRooms.length} phòng, ${baseLandlords.length} chủ trọ.`);

  const usedCodes = new Set(baseProjects.map((p) => p.code));
  const usedSlugs = new Set(baseProjects.map((p) => p.slug));
  let nextRoomId = Math.max(...baseRooms.map((r) => r.id)) + 1;

  // Index map-projects for accurate coordinates
  console.log('🗺️ Đang tải tọa độ GPS từ EzHouse map-projects...');
  const mapProjects = await fetchMapProjects();
  const mapById = new Map();
  const mapByCode = new Map();
  for (const mp of mapProjects) {
    if (mp.id) mapById.set(mp.id, mp);
    if (mp.code) mapByCode.set(mp.code, mp);
  }
  console.log(`✅ Đã index ${mapById.size} dự án bản đồ EzHouse.`);

  const addedLandlords = [];
  const addedProjects = [];
  const addedRooms = [];
  const flatHcmSeedRooms = [];

  const ROOM_TYPES_POOL = [
    { label: 'Studio Full nội thất cao cấp', area: 28, balcony: true },
    { label: 'Duplex Gác lửng ban công view thoáng', area: 32, balcony: true },
    { label: '1 Phòng ngủ (1PN) riêng biệt', area: 36, balcony: true },
    { label: 'Phòng trọ gác lửng sinh viên', area: 22, balcony: false },
    { label: 'Căn hộ 2 Phòng ngủ cao cấp', area: 45, balcony: true },
  ];

  for (const distCfg of NEW_DISTRICTS) {
    console.log(`\n🔍 Đang trích xuất ${distCfg.name} (ID: ${distCfg.ezId})...`);
    for (const ll of distCfg.landlords) {
      addedLandlords.push(ll);
    }

    const ezRooms = await fetchRoomsByDistrict(distCfg.ezId, 80);
    console.log(`  -> EzHouse trả về ${ezRooms.length} phòng tại ${distCfg.name}`);

    // Group rooms by projectId
    const projectGroups = new Map();
    for (const r of ezRooms) {
      const imgs = (r.images || [])
        .map((im) => normalizeImageUrl(im.fileUrl || im))
        .filter(Boolean);
      if (imgs.length === 0) continue;

      const pid = r.projectId || r.project?.id || r.project?.code;
      if (!pid) continue;

      if (!projectGroups.has(pid)) {
        projectGroups.set(pid, {
          project: r.project || {},
          rooms: [],
          allImages: [],
        });
      }
      const grp = projectGroups.get(pid);
      grp.rooms.push(r);
      for (const u of imgs) {
        if (!grp.allImages.includes(u)) grp.allImages.push(u);
      }
    }

    // Sort candidate projects by number of images and rooms
    const sortedCandidates = Array.from(projectGroups.values()).sort(
      (a, b) => b.allImages.length - a.allImages.length
    );

    const selectedGroups = sortedCandidates.slice(0, distCfg.targetProjects);
    console.log(`  -> Chọn ${selectedGroups.length} tòa nhà tiêu biểu có nhiều ảnh thật nhất tại ${distCfg.name}`);

    // Collect a district-wide image pool as backup if any project has < 10 images
    const districtImagePool = [];
    for (const c of sortedCandidates) {
      for (const im of c.allImages) {
        if (!districtImagePool.includes(im)) districtImagePool.push(im);
      }
    }

    selectedGroups.forEach((grp, idx) => {
      const proj = grp.project;
      const sampleRoom = grp.rooms[0];
      const mp = mapById.get(proj.id || sampleRoom.projectId) || mapByCode.get(proj.code);

      // Extract address
      const addrObj = proj.address || mp?.address || {};
      const rawStreet = addrObj.street?.name || addrObj.newStreetName || 'Trung Tâm';
      const streetName = cleanStreetName(rawStreet);
      const wardName = addrObj.street?.ward?.name || addrObj.newWardName || 'Phường Trung Tâm';
      const houseNumber = addrObj.houseNumber || addrObj.newHouseNumber || String(10 + idx * 12);

      const fullAddress = `Số ${houseNumber} ${streetName.startsWith('Đường') ? streetName : `Đường ${streetName}`}, ${wardName}, ${distCfg.name}`;

      // Coordinates
      const lat = Number(
        addrObj.latitude ||
          mp?.address?.latitude ||
          (distCfg.defaultLat + (idx - 2) * 0.0045).toFixed(5)
      );
      const lng = Number(
        addrObj.longitude ||
          mp?.address?.longitude ||
          (distCfg.defaultLng + (idx - 2) * 0.0045).toFixed(5)
      );

      // Unique Project Code
      let rawCode = (proj.code || `${distCfg.shortCode}.B${idx + 1}`).trim();
      if (rawCode.includes('.')) {
        const parts = rawCode.split('.');
        if (/^\d/.test(parts[0].trim()) && parts.length >= 3) {
          rawCode = parts.slice(1).join('.');
        }
      }
      // Append shortCode suffix if needed to avoid collision between QBT (Bình Tân) and QBTH (Bình Thạnh)
      let finalCode = rawCode.replace(/\.QBT$/, `.${distCfg.shortCode}`);
      if (usedCodes.has(finalCode)) {
        finalCode = `${finalCode}.${distCfg.shortCode}${idx + 1}`;
      }
      usedCodes.add(finalCode);

      // Unique Slug
      let slug = sampleRoom.slug ? `/phong/${sampleRoom.slug}` : `/phong/toa-nha-${finalCode.toLowerCase()}`;
      if (usedSlugs.has(slug)) {
        slug = `${slug}-${idx + 1}`;
      }
      usedSlugs.add(slug);

      // Price
      const rawPrice = Number(sampleRoom.price) || 5500000;
      const basePrice = rawPrice >= 1500000 && rawPrice <= 25000000 ? rawPrice : 5500000;

      // Extra costs from EzHouse
      const extraCosts = proj.extraCosts || [];
      const elecCostObj = extraCosts.find((c) => c.type === 'ELECTRICITY');
      const waterCostObj = extraCosts.find((c) => c.type === 'WATER');
      const serviceCostObj = extraCosts.find((c) => c.type === 'MANAGEMENT' || c.type === 'SERVICE');
      const wifiCostObj = extraCosts.find((c) => c.type === 'WIFI');
      const parkingCostObj = extraCosts.find((c) => c.type === 'PARKING');

      const electricityRate = Number(elecCostObj?.amount) || (idx % 2 === 0 ? 3800 : 4000);
      const waterRate = Number(waterCostObj?.amount) || 100000;
      const serviceFee = serviceCostObj?.amount !== undefined && serviceCostObj?.amount !== null
        ? Number(serviceCostObj.amount)
        : (idx % 3 === 0 ? 0 : 150000);
      const internetFee = Number(wifiCostObj?.amount) || 100000;
      const parkingFee = Number(parkingCostObj?.amount) || 120000;

      // Furniture / Amenities from EzHouse
      const rawFurnitures = (sampleRoom.furnitures || [])
        .map((f) => (typeof f === 'string' ? f : f?.name || f?.furniture?.name))
        .filter(Boolean);

      const baseAmenities = [
        'Máy lạnh',
        'Wifi',
        'Giờ tự do',
        'Khóa vân tay',
        'Kệ bếp',
      ];
      for (const f of rawFurnitures) {
        if (f !== 'Nội thất đầy đủ' && f !== 'Full nội thất' && !baseAmenities.includes(f)) {
          baseAmenities.push(f);
        }
      }
      if (idx % 2 === 0 && !baseAmenities.includes('Gác lửng')) baseAmenities.push('Gác lửng');
      if (idx % 2 === 1 && !baseAmenities.includes('Tủ lạnh')) baseAmenities.push('Tủ lạnh');
      if (idx === 0 && !baseAmenities.includes('Cho nuôi thú cưng')) baseAmenities.push('Cho nuôi thú cưng');

      // Images (ensure at least 12 real EzHouse images per project)
      const projectImages = [...grp.allImages];
      for (const backupImg of districtImagePool) {
        if (projectImages.length >= 16) break;
        if (!projectImages.includes(backupImg)) projectImages.push(backupImg);
      }

      const rtInfo = ROOM_TYPES_POOL[idx % ROOM_TYPES_POOL.length];
      const landlord = distCfg.landlords[idx % distCfg.landlords.length];
      const buildingName = buildBuildingTitle(streetName, wardName, distCfg.name, idx, distCfg.landmarkHint);

      const newProj = {
        slug,
        code: finalCode,
        name: buildingName,
        address: fullAddress,
        district: distCfg.name,
        lat,
        lng,
        base_price: basePrice,
        room_type: rtInfo.label,
        area: Number(sampleRoom.area) || rtInfo.area,
        landlord_id: landlord.id,
        landlord_name: landlord.name,
        landlord_phone: landlord.phone,
        images: projectImages,
        amenities: baseAmenities.slice(0, 7),
      };
      addedProjects.push(newProj);

      // Generate 15 rooms for this building (3 floors x 5 units)
      const ROOMS_PER_NEW_BUILDING = 15;
      for (let u = 0; u < ROOMS_PER_NEW_BUILDING; u++) {
        const floor = Math.floor(u / 5) + 1;
        const unitNumber = (u % 5) + 1;
        const roomCode = `P.${floor}0${unitNumber}`;
        const roomVariant = ROOM_TYPES_POOL[(idx + u) % ROOM_TYPES_POOL.length];
        const hasBalcony = u % 2 === 0 || roomVariant.balcony;

        // Slight price variation around building base_price
        const priceDelta = ((u % 5) - 2) * 200000;
        const roomPrice = Math.max(2500000, basePrice + priceDelta);
        const roomArea = Number(sampleRoom.area) || roomVariant.area + (u % 3) * 2;

        // Rotate images so each room has a distinct lead photo from the building's real EzHouse gallery
        const rotatedImages =
          projectImages.length > 1
            ? [
                ...projectImages.slice(u % projectImages.length),
                ...projectImages.slice(0, u % projectImages.length),
              ]
            : projectImages;

        const roomAmenities = [...baseAmenities];
        if (hasBalcony && !roomAmenities.includes('Ban công')) roomAmenities.push('Ban công');
        if (u % 3 === 0 && !roomAmenities.includes('Cửa sổ lớn')) roomAmenities.push('Cửa sổ lớn');
        if (u % 4 === 0 && !roomAmenities.includes('Cho nuôi thú cưng')) roomAmenities.push('Cho nuôi thú cưng');
        if (u % 5 === 0 && !roomAmenities.includes('Bãi đỗ ô tô')) roomAmenities.push('Bãi đỗ ô tô');

        // Status distribution: ~73% AVAILABLE, ~13% BOOKED_VIEWING, ~14% RENTED
        let status = 'AVAILABLE';
        if (u === 3 || u === 11) status = 'BOOKED_VIEWING';
        else if (u === 7 || u === 14) status = 'RENTED';

        const roomLat = Number((lat + (u - 7) * 0.00006).toFixed(6));
        const roomLng = Number((lng + ((u % 5) - 2) * 0.00006).toFixed(6));
        const distHuit = calculateHaversineKm(10.8066, 106.6286, roomLat, roomLng);

        const roomTypeFull = hasBalcony
          ? `${roomVariant.label} (Có ban công thoáng mát)`
          : roomVariant.label;

        const surroundingNote = proj.surroundingAmenities
          ? ` Tiện ích ngoại khu nổi bật: ${proj.surroundingAmenities.replace(/[\r\n\*\#\-]+/g, ' ').slice(0, 220)}...`
          : '';

        const description = `Cho thuê ${roomCode} (${roomTypeFull}) thuộc ${buildingName} tại ${fullAddress}. Vị trí trung tâm ${distCfg.name} (${distCfg.landmarkHint}), thuận tiện di chuyển sang các quận nội thành. Phòng diện tích ${roomArea}m², trang bị sẵn: ${roomAmenities.join(', ')}. Giờ giấc tự do 24/7, khóa vân tay an ninh, camera giám sát, hầm để xe rộng rãi.${surroundingNote}`;

        const roomObj = {
          id: nextRoomId++,
          room_code: roomCode,
          project_code: finalCode,
          project_name: buildingName,
          floor,
          unit_number: unitNumber,
          has_balcony: hasBalcony,
          title: `${roomCode} (${roomTypeFull}) - ${buildingName}`,
          price: roomPrice,
          deposit: roomPrice,
          area: roomArea,
          room_type: roomTypeFull,
          address: fullAddress,
          district: distCfg.name,
          latitude: roomLat,
          longitude: roomLng,
          distance_to_huit_km: distHuit,
          amenities: roomAmenities,
          images: rotatedImages,
          status,
          landlord_id: landlord.id,
          landlord_name: landlord.name,
          landlord_phone: landlord.phone,
          electricity_rate: electricityRate,
          water_rate: waterRate,
          internet_fee: internetFee,
          service_fee: serviceFee,
          parking_fee: parkingFee,
          description,
        };

        addedRooms.push(roomObj);

        if (u < 3) {
          flatHcmSeedRooms.push({
            id: roomObj.id,
            title: roomObj.title,
            room_number: roomObj.room_code,
            project_code: roomObj.project_code,
            price: roomObj.price,
            address: roomObj.address,
            district: roomObj.district,
            latitude: roomObj.latitude,
            longitude: roomObj.longitude,
            area: roomObj.area,
            images: roomObj.images.slice(0, 5),
            amenities: roomObj.amenities,
            status: roomObj.status,
            detail_url: `https://ezhouse.vn${slug}`,
          });
        }
      }
    });
  }

  const allLandlords = [...baseLandlords, ...addedLandlords];
  const allProjects = [...baseProjects, ...addedProjects];
  const allRooms = [...baseRooms, ...addedRooms];
  const allDistricts = [
    'Quận Tân Phú',
    'Quận Tân Bình',
    'Quận Bình Tân',
    ...NEW_DISTRICTS.map((d) => d.name),
  ];

  const updatedData = {
    metadata: {
      project_code: 'ELITE-LIVING-NETWORK-HCMC',
      title: 'Elite Living - Mạng Lưới Căn Hộ Dịch Vụ & Phòng Trọ Cao Cấp Toàn TP.HCM (14 Quận/Thành Phố)',
      location_filter: allDistricts.join(', '),
      sync_status: 'SYNCHRONIZED_100_PERCENT_EZHOUSE_HCMC',
      districts: allDistricts,
      rooms_count: allRooms.length,
      projects_count: allProjects.length,
      users_count: baseUsers.length,
      interactions_count: baseInteractions.length,
    },
    projects: allProjects,
    landlords: allLandlords,
    rooms: allRooms,
    users: baseUsers,
    interactions: baseInteractions,
  };

  fs.writeFileSync(roomsDataPath, JSON.stringify(updatedData, null, 2), 'utf-8');
  fs.writeFileSync(rootSeedCompletePath, JSON.stringify(updatedData, null, 2), 'utf-8');

  // Also append to seed_rooms_tp_hcm.json if exists
  if (fs.existsSync(rootSeedRoomsHcmPath)) {
    const existingFlat = JSON.parse(fs.readFileSync(rootSeedRoomsHcmPath, 'utf-8'));
    const combinedFlat = [...existingFlat.slice(0, 138), ...flatHcmSeedRooms];
    fs.writeFileSync(rootSeedRoomsHcmPath, JSON.stringify(combinedFlat, null, 2), 'utf-8');
  }

  console.log('\n🎉 HOÀN TẤT TRÍCH XUẤT & ĐỒNG BỘ FILE JSON!');
  console.log(`- Tổng số Quận/TP: ${allDistricts.length}`);
  console.log(`- Tổng số Tòa nhà (Projects): ${allProjects.length} (Gốc: ${baseProjects.length}, Mới: ${addedProjects.length})`);
  console.log(`- Tổng số Phòng (Rooms): ${allRooms.length} (Gốc: ${baseRooms.length}, Mới: ${addedRooms.length})`);
  console.log(`- Tổng số Chủ trọ (Landlords): ${allLandlords.length}`);
}

main().catch((err) => {
  console.error('❌ Lỗi khi trích xuất:', err);
  process.exit(1);
});
