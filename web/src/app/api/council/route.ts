// ============================================================
// ELITE LIVING — API Route: /api/council
// Endpoint điều phối phiên tranh luận của Hội đồng Agent
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { runCouncilSession, runSingleAgent } from "@/lib/agent-council";
import type { CouncilRequest, CouncilRole, TopicCategory } from "@/lib/agent-council";

// Giới hạn thời gian xử lý: 5 phút (phiên tranh luận đầy đủ có thể chậm)
export const maxDuration = 300;

// ──────────────────────────────────────────────────────────
// POST /api/council — Khởi động phiên tranh luận Hội đồng
// ──────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      topic?: string;
      category?: string;
      context?: string;
      skipRoles?: string[];
      mode?: "council" | "single";
      agentId?: string;
    };

    const { topic, category, context, skipRoles, mode, agentId } = body;

    // Validate
    if (!topic || typeof topic !== "string" || topic.trim().length === 0) {
      return NextResponse.json(
        { error: "Thiếu trường 'topic'. Vui lòng cung cấp câu hỏi/chủ đề thảo luận." },
        { status: 400 }
      );
    }

    const validCategories: TopicCategory[] = [
      "architecture", "algorithm", "concurrency",
      "security", "database", "ui", "general",
    ];

    const resolvedCategory: TopicCategory =
      validCategories.includes(category as TopicCategory)
        ? (category as TopicCategory)
        : "general";

    // Chế độ gọi đơn lẻ một Agent
    if (mode === "single") {
      const validRoles: CouncilRole[] = ["architect", "algorithm", "backend", "critic", "judge"];
      if (!agentId || !validRoles.includes(agentId as CouncilRole)) {
        return NextResponse.json(
          { error: `AgentId không hợp lệ. Các giá trị hợp lệ: ${validRoles.join(", ")}` },
          { status: 400 }
        );
      }

      const result = await runSingleAgent(agentId as CouncilRole, topic.trim(), context);
      return NextResponse.json({ mode: "single", result }, { status: 200 });
    }

    // Chế độ đầy đủ: Hội đồng tranh luận
    const councilRequest: CouncilRequest = {
      topic: topic.trim(),
      category: resolvedCategory,
      context: context?.trim(),
      skipRoles: skipRoles as CouncilRole[] | undefined,
    };

    const session = await runCouncilSession(councilRequest);

    return NextResponse.json(
      {
        mode: "council",
        session,
        error: session.status === "error" ? session.error : undefined,
      },
      { status: session.status === "error" ? 500 : 200 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Lỗi không xác định";
    console.error("[/api/council] Lỗi:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ──────────────────────────────────────────────────────────
// GET /api/council — Thông tin về Hội đồng Agent
// ──────────────────────────────────────────────────────────
export async function GET() {
  const { COUNCIL_AGENTS, GEMINI_MODELS, CATEGORY_AGENT_MAP } = await import("@/lib/agent-council");

  return NextResponse.json({
    name: "Elite Living — Multi-Agent Council",
    description: "Hệ thống Hội đồng Đa Tác tử hỗ trợ ra quyết định kỹ thuật cho đồ án NhatroTop.",
    version: "1.0.0",
    agents: Object.values(COUNCIL_AGENTS).map((a) => ({
      id: a.id,
      name: a.name,
      nameVi: a.nameVi,
      emoji: a.emoji,
      model: a.model,
      color: a.color,
    })),
    models: GEMINI_MODELS,
    categories: Object.keys(CATEGORY_AGENT_MAP),
    usage: {
      endpoint: "POST /api/council",
      body: {
        topic: "string (bắt buộc) — câu hỏi/vấn đề cần giải quyết",
        category: "string (tùy chọn) — architecture | algorithm | concurrency | security | database | ui | general",
        context: "string (tùy chọn) — mã nguồn, lỗi, schema bổ sung",
        skipRoles: "string[] (tùy chọn) — bỏ qua một số agent",
        mode: "\"council\" (mặc định) | \"single\"",
        agentId: "string (bắt buộc khi mode=single) — architect | algorithm | backend | critic | judge",
      },
      example: {
        topic: "Làm thế nào để tránh race condition khi 2 người dùng cùng đặt lịch xem một phòng?",
        category: "concurrency",
        context: "Đang dùng Prisma với PostgreSQL, NextAuth cho xác thực.",
      },
    },
  });
}
