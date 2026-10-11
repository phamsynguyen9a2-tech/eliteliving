// ============================================================
// ELITE LIVING — Multi-Agent Council: Debate Engine
// Động cơ Tranh luận 3-Vòng Có Kiểm soát (Bounded Debate)
// ============================================================

import { GoogleGenAI, type GenerateContentConfig } from "@google/genai";
import { randomUUID } from "crypto";
import {
  COUNCIL_AGENTS,
  CATEGORY_AGENT_MAP,
  DEFAULT_DEBATE_ORDER,
} from "./agents";
import type {
  AgentResponse,
  CouncilRequest,
  CouncilSession,
  CouncilRole,
} from "./types";

// Khởi tạo client Gemini — key được lấy từ biến môi trường
function getGenAIClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY chưa được cấu hình trong file .env. " +
      "Vui lòng thêm GEMINI_API_KEY=<your-key> vào web/.env"
    );
  }
  return new GoogleGenAI({ apiKey });
}

// ──────────────────────────────────────────────────────────
// Gọi một Agent cụ thể với nội dung prompt đã chuẩn bị
// ──────────────────────────────────────────────────────────
async function callAgent(
  ai: GoogleGenAI,
  agentId: CouncilRole,
  prompt: string,
  round: number
): Promise<AgentResponse> {
  const agent = COUNCIL_AGENTS[agentId];
  if (!agent) throw new Error(`Agent "${agentId}" không tồn tại.`);

  const startTime = Date.now();

  // Danh sách mô hình dự phòng theo thứ tự ưu tiên
  const candidateModels = Array.from(
    new Set([
      agent.model,
      "gemini-3.1-flash-lite",
      "gemini-3.5-flash-lite",
      "gemini-3-flash-preview",
      "gemini-3.6-flash",
      "gemini-3.5-flash",
      "gemini-3.7-flash",
    ])
  );

  let lastError: Error | null = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let response: any = null;
  let modelUsed = agent.model;

  for (const modelToTry of candidateModels) {
    try {
      // Thử chế độ Thinking trước
      const config: GenerateContentConfig = {
        systemInstruction: agent.systemInstruction,
        thinkingConfig: {
          thinkingBudget: agent.thinkingBudget,
          includeThoughts: true,
        },
      };

      response = await ai.models.generateContent({
        model: modelToTry,
        contents: prompt,
        config,
      });

      modelUsed = modelToTry;
      break;
    } catch {
      // Nếu chế độ Thinking gặp 503 (quá tải), thử ngay chế độ tiêu chuẩn không thinking trên cùng model
      try {
        const configNoThinking: GenerateContentConfig = {
          systemInstruction: agent.systemInstruction,
        };
        response = await ai.models.generateContent({
          model: modelToTry,
          contents: prompt,
          config: configNoThinking,
        });
        modelUsed = modelToTry;
        break;
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.warn(`[Hội đồng Agent] ${agent.nameVi} gọi mô hình ${modelToTry} thất bại: ${errMsg}. Đang thử mô hình dự phòng tiếp theo...`);
        lastError = err instanceof Error ? err : new Error(String(err));
      }
    }
  }

  if (!response) {
    throw lastError ?? new Error(`Không thể kết nối đến bất kỳ mô hình AI nào cho Agent ${agent.nameVi}`);
  }

  const durationMs = Date.now() - startTime;

  // Trích xuất nội dung suy luận (thinking) nếu có
  let thinkingSummary: string | undefined;
  let mainContent = "";

  for (const part of response.candidates?.[0]?.content?.parts ?? []) {
    if ((part as { thought?: boolean }).thought) {
      const rawThought = (part as { text?: string }).text ?? "";
      // Chỉ lấy 500 ký tự đầu của quá trình suy luận làm tóm tắt
      thinkingSummary = rawThought.slice(0, 500) + (rawThought.length > 500 ? "…" : "");
    } else {
      mainContent += (part as { text?: string }).text ?? "";
    }
  }

  // Fallback nếu API không trả về parts chuẩn
  if (!mainContent) {
    mainContent = response.text ?? "(Không có phản hồi)";
  }

  return {
    agentId: agent.id,
    agentName: agent.name,
    agentNameVi: agent.nameVi,
    emoji: agent.emoji,
    model: modelUsed,
    content: mainContent,
    thinkingSummary,
    durationMs,
    inputTokens: response.usageMetadata?.promptTokenCount,
    outputTokens: response.usageMetadata?.candidatesTokenCount,
    round,
  };
}

// ──────────────────────────────────────────────────────────
// Xây dựng prompt theo từng vai trò & vòng tranh luận
// ──────────────────────────────────────────────────────────
function buildPrompt(
  agentId: CouncilRole,
  request: CouncilRequest,
  previousRounds: AgentResponse[]
): string {
  const { topic, context, category } = request;

  const contextBlock = context
    ? `\n\n---\nNGỮ CẢNH BỔ SUNG (mã nguồn, lỗi, schema):\n\`\`\`\n${context}\n\`\`\`\n---`
    : "";

  const previousBlock =
    previousRounds.length > 0
      ? `\n\n---\nCÁC Ý KIẾN TRƯỚC ĐÓ TRONG HỘI ĐỒNG:\n${previousRounds
          .map(
            (r) =>
              `### ${r.emoji} ${r.agentNameVi} (${r.agentName}) — Vòng ${r.round}\n${r.content}`
          )
          .join("\n\n")}\n---`
      : "";

  const roleSpecificInstructions: Record<CouncilRole, string> = {
    architect:
      "Hãy phân tích CHỦ ĐỀ trên từ góc nhìn KIẾN TRÚC TỔNG THỂ. Đề xuất thiết kế module, pattern và cấu trúc phù hợp.",
    algorithm:
      "Hãy phân tích CHỦ ĐỀ từ góc nhìn THUẬT TOÁN VÀ HIỆU NĂNG. Đề xuất giải thuật cụ thể kèm độ phức tạp Big-O và ví dụ code.",
    backend:
      "Hãy phân tích CHỦ ĐỀ từ góc nhìn BACKEND, ĐẶC BIỆT CHÚ Ý đến concurrency, transaction, database lock và tính toàn vẹn dữ liệu.",
    critic:
      previousRounds.length > 0
        ? "Dựa trên các ý kiến đã được trình bày ở trên, hãy PHẢN BIỆN GAY GẮT và chỉ ra các lỗ hổng, nguy cơ bảo mật, edge cases và điểm yếu kỹ thuật. KHÔNG đề xuất giải pháp — chỉ đặt câu hỏi và chỉ ra vấn đề."
        : "Hãy đưa ra danh sách những RỦI RO và LỖ HỔNG tiềm năng cần tránh khi giải quyết chủ đề này.",
    judge:
      "Dựa trên TOÀN BỘ luồng tranh luận từ các chuyên gia bên trên, hãy đưa ra PHÁN QUYẾT CUỐI CÙNG bao gồm: (1) Thiết kế/kiến trúc được chọn, (2) Mã nguồn TypeScript hoàn chỉnh có thể tích hợp ngay, (3) Checklist triển khai theo thứ tự ưu tiên, (4) Rủi ro còn tồn đọng.",
  };

  return `# CHỦ ĐỀ THẢO LUẬN
**Danh mục**: ${category}
**Câu hỏi/Vấn đề**: ${topic}
${contextBlock}
${previousBlock}

# YÊU CẦU CỦA BẠN
${roleSpecificInstructions[agentId]}`;
}

// ──────────────────────────────────────────────────────────
// MAIN: Chạy phiên tranh luận đầy đủ của Hội đồng
// ──────────────────────────────────────────────────────────
export async function runCouncilSession(
  request: CouncilRequest
): Promise<CouncilSession> {
  const ai = getGenAIClient();
  const sessionId = randomUUID();
  const startedAt = new Date().toISOString();

  const session: CouncilSession = {
    sessionId,
    topic: request.topic,
    topicCategory: request.category,
    startedAt,
    rounds: [],
    status: "running",
  };

  // Xác định thứ tự agent theo category (bỏ qua các role được chỉ định skip)
  const agentOrder =
    CATEGORY_AGENT_MAP[request.category] ?? DEFAULT_DEBATE_ORDER;

  const activeAgents = agentOrder.filter(
    (id) =>
      id !== "judge" && !(request.skipRoles ?? []).includes(id as CouncilRole)
  );

  const allAgentsWithJudge = [...activeAgents, "judge"] as CouncilRole[];

  try {
    let roundIndex = 1;

    for (const agentId of allAgentsWithJudge) {
      const isJudge = agentId === "judge";
      const prompt = buildPrompt(agentId, request, session.rounds);
      const response = await callAgent(ai, agentId, prompt, roundIndex);

      if (isJudge) {
        session.verdict = response;
      } else {
        session.rounds.push(response);
        roundIndex++;
        // Tạm dừng 1 giây giữa các agent để đảm bảo ổn định và không vượt rate limit của Google API
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    session.status = "completed";
    session.finishedAt = new Date().toISOString();
    session.totalDurationMs =
      new Date(session.finishedAt).getTime() -
      new Date(session.startedAt).getTime();
  } catch (err: unknown) {
    session.status = "error";
    session.error =
      err instanceof Error ? err.message : "Lỗi không xác định từ Gemini API.";
    session.finishedAt = new Date().toISOString();
  }

  return session;
}

// ──────────────────────────────────────────────────────────
// Chạy nhanh chỉ một Agent (dùng cho test đơn lẻ)
// ──────────────────────────────────────────────────────────
export async function runSingleAgent(
  agentId: CouncilRole,
  topic: string,
  context?: string
): Promise<AgentResponse> {
  const ai = getGenAIClient();
  const prompt = buildPrompt(
    agentId,
    { topic, category: "general", context },
    []
  );
  return callAgent(ai, agentId, prompt, 1);
}
