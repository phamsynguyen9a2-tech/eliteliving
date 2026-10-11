import { RoommatePost, RoommateRequest, RoommateProfile } from '@/lib/types';
import { INITIAL_ROOMMATE_POSTS, INITIAL_ROOMMATE_PROFILE } from '@/data/sample_roommates';

// Seed initial sample connection requests linking different accounts
const INITIAL_ROOMMATE_REQUESTS: RoommateRequest[] = [
  {
    id: 'req_seed_1',
    post_id: 'post_1',
    requester_id: 'user_phone_0912345678',
    requester_name: 'Lê Hoàng Yến Nhi',
    requester_phone: '0912345678',
    requester_image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    message: 'Chào bạn Phương Thảo, mình là sinh viên năm 2 ĐH Công Thương (HUIT), tính tình sạch sẽ, ngủ trước 23h, rất thích căn studio này của bạn. Mong sớm được kết nối và qua xem phòng trực tiếp!',
    status: 'PENDING',
    created_at: new Date(Date.now() - 3600 * 1000 * 4).toISOString(),
    post_title: 'Tìm 1 bạn nữ ở ghép phòng Studio ban công sát ĐH Công Thương (HUIT 140 Lê Trọng Tấn)',
  },
  {
    id: 'req_seed_2',
    post_id: 'post_1',
    requester_id: 'user_google_demo_1',
    requester_name: 'Phạm Sỹ Nguyên',
    requester_phone: '0901234567',
    requester_image: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=256&q=80',
    message: 'Chào bạn, mình đang tìm bạn ở ghép cho em gái mình chuẩn bị nhập học tại HUIT. Bạn cho mình hỏi phòng còn trống không ạ?',
    status: 'ACCEPTED',
    created_at: new Date(Date.now() - 3600 * 1000 * 24).toISOString(),
    post_title: 'Tìm 1 bạn nữ ở ghép phòng Studio ban công sát ĐH Công Thương (HUIT 140 Lê Trọng Tấn)',
  },
  {
    id: 'req_seed_3',
    post_id: 'post_2',
    requester_id: 'user_tenant_1',
    requester_name: 'Nguyễn Thị Phương Thảo',
    requester_phone: '0908123456',
    requester_image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
    message: 'Chào anh Quang, em có bạn nam cùng lớp IT muốn tìm phòng khu vực Khuông Việt, xin phép gửi thông tin liên hệ của bạn cho anh.',
    status: 'PENDING',
    created_at: new Date(Date.now() - 3600 * 1000 * 12).toISOString(),
    post_title: 'Tìm 1 bạn nam SV/IT ở ghép Căn hộ 2PN cao cấp Khuông Việt - Phú Trung',
  }
];

// Global in-memory cache to guarantee persistence across Next.js API reloads
declare global {
  // eslint-disable-next-line no-var
  var __roommatePostsStore: RoommatePost[] | undefined;
  // eslint-disable-next-line no-var
  var __roommateRequestsStore: RoommateRequest[] | undefined;
}

if (!global.__roommatePostsStore) {
  global.__roommatePostsStore = [...INITIAL_ROOMMATE_POSTS];
}

if (!global.__roommateRequestsStore) {
  global.__roommateRequestsStore = [...INITIAL_ROOMMATE_REQUESTS];
}

export function getPosts(): RoommatePost[] {
  return global.__roommatePostsStore || [];
}

export function getPostById(id: string): RoommatePost | undefined {
  return (global.__roommatePostsStore || []).find((p) => p.id === id);
}

export function addPost(post: RoommatePost): RoommatePost {
  if (!global.__roommatePostsStore) {
    global.__roommatePostsStore = [...INITIAL_ROOMMATE_POSTS];
  }
  global.__roommatePostsStore.unshift(post);
  return post;
}

export function getRequests(): RoommateRequest[] {
  return global.__roommateRequestsStore || [];
}

export function addRequest(request: RoommateRequest): RoommateRequest {
  if (!global.__roommateRequestsStore) {
    global.__roommateRequestsStore = [...INITIAL_ROOMMATE_REQUESTS];
  }
  global.__roommateRequestsStore.unshift(request);
  return request;
}

export function updateRequestStatus(id: string, status: 'PENDING' | 'ACCEPTED' | 'REJECTED'): RoommateRequest | null {
  if (!global.__roommateRequestsStore) return null;
  const index = global.__roommateRequestsStore.findIndex((r) => r.id === id);
  if (index !== -1) {
    global.__roommateRequestsStore[index] = {
      ...global.__roommateRequestsStore[index],
      status,
    };
    return global.__roommateRequestsStore[index];
  }
  return null;
}
