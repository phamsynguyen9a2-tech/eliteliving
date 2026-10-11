// ============================================================
// ELITE LIVING — Multi-Agent Council: Type Definitions
// Hệ thống Hội đồng Đa Tác tử — Phân loại kiểu dữ liệu
// ============================================================

export type CouncilRole =
  | "architect"       // Trưởng ban Kiến trúc — Thiết kế tổng thể hệ thống
  | "algorithm"       // Chuyên viên Thuật toán — UC-CORE-01 (Top-K, Cosine, Haversine)
  | "backend"         // Chuyên viên Backend — UC-CORE-02 (Concurrency, FSM, Lock)
  | "critic"          // Chuyên viên Phản biện — Devil's Advocate & QA/Security
  | "judge";          // Chủ tọa Phán quyết — Tổng hợp & Ra quyết định cuối

export type ThinkingMode = "high" | "medium" | "low";

export interface AgentConfig {
  id: CouncilRole;
  name: string;
  nameVi: string;
  model: string;
  thinkingBudget: number;
  systemInstruction: string;
  emoji: string;
  color: string; // hex màu hiển thị trên UI
}

export interface DebateRound {
  round: number;
  label: string;
  labelVi: string;
}

export interface AgentResponse {
  agentId: CouncilRole;
  agentName: string;
  agentNameVi: string;
  emoji: string;
  model: string;
  content: string;
  thinkingSummary?: string;
  durationMs: number;
  inputTokens?: number;
  outputTokens?: number;
  round: number;
}

export interface CouncilSession {
  sessionId: string;
  topic: string;
  topicCategory: TopicCategory;
  startedAt: string;
  finishedAt?: string;
  rounds: AgentResponse[];
  verdict?: AgentResponse;
  totalDurationMs?: number;
  status: "running" | "completed" | "error";
  error?: string;
}

export type TopicCategory =
  | "architecture"       // Thiết kế kiến trúc
  | "algorithm"          // Thuật toán gợi ý Top-K
  | "concurrency"        // Xử lý tương tranh đặt lịch
  | "security"           // Bảo mật & Phân quyền
  | "database"           // Cơ sở dữ liệu & Prisma schema
  | "ui"                 // Giao diện người dùng
  | "general";           // Câu hỏi tổng quát

export interface CouncilRequest {
  topic: string;
  category: TopicCategory;
  context?: string;       // Ngữ cảnh thêm (mã nguồn, lỗi, v.v.)
  skipRoles?: CouncilRole[];  // Bỏ qua một số vai trò để tiết kiệm thời gian
  maxRounds?: number;     // Giới hạn số vòng tranh luận (mặc định 3)
}
