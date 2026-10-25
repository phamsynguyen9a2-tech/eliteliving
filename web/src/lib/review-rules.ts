/** Quy tắc thuần cho đánh giá phòng (không truy cập CSDL) — dùng chung cho API và kiểm thử. */
export const REVIEW_COMMENT_MAX = 1000;
export const REVIEW_REPLY_MAX = 1000;

export interface ReviewView {
  id: string;
  room_id: number;
  rating: number;
  comment: string;
  author: string;
  is_mine: boolean;
  landlord_reply: string | null;
  replied_at: string | null;
  is_hidden: boolean;
  hidden_reason: string | null;
  created_at: string;
  updated_at: string;
  room_code?: string;
  room_title?: string;
}

export interface ReviewSummary {
  average: number;
  count: number;
  /** số đánh giá theo sao: index 0 = 1 sao ... index 4 = 5 sao */
  distribution: number[];
}

/** "Phạm Sỹ Nguyên" → "Nguyên P." (không lộ họ tên đầy đủ trên trang công khai) */
export function maskReviewerName(name: string | null | undefined): string {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'Người thuê';
  if (parts.length === 1) return parts[0];
  return `${parts[parts.length - 1]} ${parts[0].charAt(0).toUpperCase()}.`;
}

export function validateReviewInput(input: { rating: unknown; comment: unknown }): { rating: number; comment: string } {
  const rating = Number(input.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new Error('INVALID_REVIEW: Vui lòng chọn số sao từ 1 đến 5.');
  }
  const comment = typeof input.comment === 'string' ? input.comment.trim() : '';
  if (comment.length > REVIEW_COMMENT_MAX) {
    throw new Error(`INVALID_REVIEW: Nội dung đánh giá tối đa ${REVIEW_COMMENT_MAX} ký tự.`);
  }
  if (rating <= 2 && comment.length < 10) {
    throw new Error('INVALID_REVIEW: Với đánh giá 1–2 sao, vui lòng mô tả vấn đề (ít nhất 10 ký tự) để chủ trọ cải thiện.');
  }
  return { rating, comment };
}

export function summarize(ratings: number[]): ReviewSummary {
  const distribution = [0, 0, 0, 0, 0];
  for (const r of ratings) if (r >= 1 && r <= 5) distribution[r - 1] += 1;
  const count = ratings.length;
  const average = count ? Number((ratings.reduce((a, b) => a + b, 0) / count).toFixed(1)) : 0;
  return { average, count, distribution };
}
