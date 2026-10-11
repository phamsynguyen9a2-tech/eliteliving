"use client";

import { useState } from "react";
import type { CouncilSession, AgentResponse, TopicCategory } from "@/lib/agent-council/types";
import { COUNCIL_AGENTS } from "@/lib/agent-council/agents";

// ──────────────────────────────────────────────────────────
// Types nội bộ
// ──────────────────────────────────────────────────────────
type UIState = "idle" | "loading" | "done" | "error";

const CATEGORY_LABELS: Record<TopicCategory, string> = {
  general:      "🌐 Câu hỏi tổng quát",
  architecture: "🏛️ Kiến trúc hệ thống",
  algorithm:    "🧮 Thuật toán & Gợi ý",
  concurrency:  "⚙️ Xử lý tương tranh",
  security:     "🛡️ Bảo mật & Phân quyền",
  database:     "🗄️ Cơ sở dữ liệu",
  ui:           "🎨 Giao diện người dùng",
};

const AGENT_COLORS: Record<string, string> = Object.fromEntries(
  Object.entries(COUNCIL_AGENTS).map(([k, v]) => [k, v.color])
);

// ──────────────────────────────────────────────────────────
// Component chính
// ──────────────────────────────────────────────────────────
export default function CouncilPage() {
  const [topic, setTopic] = useState("");
  const [category, setCategory] = useState<TopicCategory>("general");
  const [context, setContext] = useState("");
  const [uiState, setUiState] = useState<UIState>("idle");
  const [session, setSession] = useState<CouncilSession | null>(null);
  const [error, setError] = useState("");
  const [showContext, setShowContext] = useState(false);

  const handleSubmit = async () => {
    if (!topic.trim()) return;
    setUiState("loading");
    setSession(null);
    setError("");

    try {
      const res = await fetch("/api/council", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: topic.trim(),
          category,
          context: context.trim() || undefined,
          mode: "council",
        }),
      });

      const data = await res.json() as { session?: CouncilSession; error?: string };

      if (!res.ok || data.error) {
        throw new Error(data.error ?? "Lỗi không xác định từ server");
      }

      setSession(data.session ?? null);
      setUiState("done");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Lỗi không xác định");
      setUiState("error");
    }
  };

  const formatMs = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <div
      style={{ backgroundColor: "#F8F8F6", minHeight: "100vh", fontFamily: "Inter, sans-serif" }}
    >
      {/* ─── HEADER ─── */}
      <div
        style={{
          background: "linear-gradient(135deg, #0F223A 0%, #1a3a5c 100%)",
          padding: "2rem",
          color: "white",
        }}
      >
        <div style={{ maxWidth: "900px", margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "2rem" }}>⚖️</span>
            <h1 style={{ fontSize: "1.75rem", fontWeight: 700, color: "#B89C66", margin: 0 }}>
              Hội đồng Agent
            </h1>
          </div>
          <p style={{ color: "#94a3b8", margin: 0, fontSize: "0.95rem" }}>
            Elite Living NhatroTop — Multi-Agent Council (High Thinking Mode)
          </p>

          {/* Agent badges */}
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "1.25rem" }}>
            {Object.values(COUNCIL_AGENTS).map((agent) => (
              <span
                key={agent.id}
                style={{
                  background: `${agent.color}22`,
                  border: `1px solid ${agent.color}55`,
                  color: agent.color,
                  padding: "0.3rem 0.75rem",
                  borderRadius: "999px",
                  fontSize: "0.78rem",
                  fontWeight: 500,
                }}
              >
                {agent.emoji} {agent.nameVi}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "2rem 1rem" }}>
        {/* ─── FORM ─── */}
        <div
          style={{
            background: "white",
            borderRadius: "16px",
            padding: "1.75rem",
            border: "1px solid #E5E3DE",
            boxShadow: "0 4px 24px rgba(15,34,58,0.06)",
            marginBottom: "2rem",
          }}
        >
          <label style={{ display: "block", fontWeight: 600, color: "#0F223A", marginBottom: "0.5rem" }}>
            Câu hỏi / Vấn đề kỹ thuật cần thảo luận
          </label>
          <textarea
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Ví dụ: Làm thế nào để tránh race condition khi 2 người dùng cùng đặt lịch xem một phòng trọ?"
            rows={3}
            style={{
              width: "100%",
              padding: "0.875rem",
              borderRadius: "10px",
              border: "1.5px solid #E5E3DE",
              fontSize: "0.95rem",
              fontFamily: "Inter, sans-serif",
              resize: "vertical",
              outline: "none",
              boxSizing: "border-box",
              color: "#0F223A",
            }}
            onFocus={(e) => { e.target.style.borderColor = "#B89C66"; }}
            onBlur={(e) => { e.target.style.borderColor = "#E5E3DE"; }}
          />

          {/* Category */}
          <div style={{ marginTop: "1rem" }}>
            <label style={{ display: "block", fontWeight: 600, color: "#0F223A", marginBottom: "0.5rem", fontSize: "0.9rem" }}>
              Danh mục
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              {(Object.keys(CATEGORY_LABELS) as TopicCategory[]).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  style={{
                    padding: "0.4rem 0.85rem",
                    borderRadius: "999px",
                    border: `1.5px solid ${category === cat ? "#B89C66" : "#E5E3DE"}`,
                    background: category === cat ? "#B89C6618" : "white",
                    color: category === cat ? "#B89C66" : "#64748b",
                    cursor: "pointer",
                    fontSize: "0.82rem",
                    fontWeight: category === cat ? 600 : 400,
                    transition: "all 0.15s",
                  }}
                >
                  {CATEGORY_LABELS[cat]}
                </button>
              ))}
            </div>
          </div>

          {/* Context bổ sung (collapsible) */}
          <div style={{ marginTop: "1rem" }}>
            <button
              onClick={() => setShowContext(!showContext)}
              style={{
                background: "none",
                border: "none",
                color: "#64748b",
                cursor: "pointer",
                fontSize: "0.85rem",
                padding: "0",
                display: "flex",
                alignItems: "center",
                gap: "0.3rem",
              }}
            >
              {showContext ? "▼" : "▶"} Thêm ngữ cảnh / mã nguồn (tùy chọn)
            </button>
            {showContext && (
              <textarea
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder="Dán mã nguồn, thông báo lỗi, schema Prisma, v.v..."
                rows={6}
                style={{
                  width: "100%",
                  marginTop: "0.5rem",
                  padding: "0.75rem",
                  borderRadius: "10px",
                  border: "1.5px solid #E5E3DE",
                  fontSize: "0.85rem",
                  fontFamily: "monospace",
                  resize: "vertical",
                  boxSizing: "border-box",
                  color: "#0F223A",
                  background: "#F8F8F6",
                }}
              />
            )}
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={uiState === "loading" || !topic.trim()}
            style={{
              marginTop: "1.25rem",
              width: "100%",
              padding: "0.875rem",
              borderRadius: "10px",
              border: "none",
              background: uiState === "loading" || !topic.trim()
                ? "#E5E3DE"
                : "linear-gradient(135deg, #B89C66, #A38752)",
              color: uiState === "loading" || !topic.trim() ? "#94a3b8" : "white",
              fontWeight: 700,
              fontSize: "1rem",
              cursor: uiState === "loading" || !topic.trim() ? "not-allowed" : "pointer",
              transition: "all 0.2s",
              letterSpacing: "0.02em",
            }}
          >
            {uiState === "loading"
              ? "⏳ Hội đồng đang tranh luận... (có thể mất 30–90 giây)"
              : "⚖️ Triệu tập Hội đồng Agent"}
          </button>
        </div>

        {/* ─── LOADING ANIMATION ─── */}
        {uiState === "loading" && (
          <div
            style={{
              background: "white",
              borderRadius: "16px",
              padding: "2rem",
              border: "1px solid #E5E3DE",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "2.5rem", marginBottom: "1rem", animation: "spin 2s linear infinite" }}>
              🔄
            </div>
            <p style={{ color: "#0F223A", fontWeight: 600, marginBottom: "0.5rem" }}>
              Các Agent đang suy luận (High Thinking Mode)...
            </p>
            <p style={{ color: "#64748b", fontSize: "0.9rem", margin: 0 }}>
              🏛️ Kiến trúc → 🧮 Thuật toán → ⚙️ Backend → 🔍 Phản biện → ⚖️ Phán quyết
            </p>
          </div>
        )}

        {/* ─── ERROR ─── */}
        {uiState === "error" && (
          <div
            style={{
              background: "#FFF1F0",
              border: "1px solid #FFCCC7",
              borderRadius: "12px",
              padding: "1.5rem",
              color: "#B85C5C",
            }}
          >
            <strong>❌ Lỗi:</strong> {error}
            <p style={{ fontSize: "0.85rem", marginTop: "0.5rem", color: "#64748b" }}>
              Kiểm tra biến môi trường <code>GEMINI_API_KEY</code> trong <code>web/.env</code>
            </p>
          </div>
        )}

        {/* ─── RESULTS ─── */}
        {uiState === "done" && session && (
          <div>
            {/* Session meta */}
            <div
              style={{
                background: "#0F223A",
                color: "white",
                borderRadius: "12px",
                padding: "1rem 1.5rem",
                marginBottom: "1.5rem",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "0.5rem",
              }}
            >
              <div>
                <span style={{ color: "#B89C66", fontWeight: 600 }}>✅ Phiên tranh luận hoàn tất</span>
                <p style={{ margin: "0.25rem 0 0", fontSize: "0.85rem", color: "#94a3b8" }}>
                  {session.rounds.length} ý kiến chuyên môn + 1 phán quyết cuối
                </p>
              </div>
              <span
                style={{
                  background: "#B89C6622",
                  border: "1px solid #B89C6644",
                  color: "#B89C66",
                  padding: "0.35rem 0.75rem",
                  borderRadius: "999px",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                }}
              >
                ⏱️ {formatMs(session.totalDurationMs ?? 0)}
              </span>
            </div>

            {/* Agent rounds */}
            {session.rounds.map((resp: AgentResponse, idx: number) => (
              <AgentCard key={idx} response={resp} formatMs={formatMs} />
            ))}

            {/* Verdict */}
            {session.verdict && (
              <div
                style={{
                  background: "white",
                  border: "2px solid #B89C66",
                  borderRadius: "16px",
                  overflow: "hidden",
                  boxShadow: "0 8px 32px rgba(184,156,102,0.15)",
                  marginTop: "1.5rem",
                }}
              >
                <div
                  style={{
                    background: "linear-gradient(135deg, #B89C66, #A38752)",
                    padding: "1rem 1.5rem",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                    <span style={{ fontSize: "1.5rem" }}>{session.verdict.emoji}</span>
                    <div>
                      <div style={{ color: "white", fontWeight: 700, fontSize: "1.05rem" }}>
                        ⚖️ PHÁN QUYẾT CUỐI CÙNG
                      </div>
                      <div style={{ color: "#0F223A80", fontSize: "0.8rem" }}>
                        {session.verdict.agentNameVi} · {session.verdict.model}
                      </div>
                    </div>
                  </div>
                  <span style={{ color: "#0F223A", fontSize: "0.8rem", fontWeight: 600 }}>
                    ⏱️ {formatMs(session.verdict.durationMs)}
                  </span>
                </div>
                <div style={{ padding: "1.5rem" }}>
                  <MarkdownContent content={session.verdict.content} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        pre { background: #F1F0EC; border-radius: 8px; padding: 1rem; overflow-x: auto; font-size: 0.85rem; }
        code { background: #F1F0EC; padding: 0.15rem 0.35rem; border-radius: 4px; font-size: 0.88em; }
        pre code { background: none; padding: 0; }
      `}</style>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Sub-component: Thẻ ý kiến từng Agent
// ──────────────────────────────────────────────────────────
function AgentCard({
  response,
  formatMs,
}: {
  response: AgentResponse;
  formatMs: (ms: number) => string;
}) {
  const [expanded, setExpanded] = useState(true);
  const color = AGENT_COLORS[response.agentId] ?? "#64748b";

  return (
    <div
      style={{
        background: "white",
        border: `1px solid ${color}33`,
        borderLeft: `4px solid ${color}`,
        borderRadius: "12px",
        marginBottom: "1rem",
        overflow: "hidden",
        transition: "box-shadow 0.2s",
      }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          width: "100%",
          background: "none",
          border: "none",
          padding: "1rem 1.25rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <span style={{ fontSize: "1.3rem" }}>{response.emoji}</span>
          <div>
            <div style={{ fontWeight: 700, color: "#0F223A", fontSize: "0.95rem" }}>
              {response.agentNameVi}
            </div>
            <div style={{ color: "#64748b", fontSize: "0.78rem" }}>
              {response.model} · Vòng {response.round}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span
            style={{
              background: `${color}18`,
              color,
              padding: "0.25rem 0.6rem",
              borderRadius: "999px",
              fontSize: "0.78rem",
              fontWeight: 600,
            }}
          >
            ⏱️ {formatMs(response.durationMs)}
          </span>
          <span style={{ color: "#64748b", fontSize: "0.9rem" }}>{expanded ? "▼" : "▶"}</span>
        </div>
      </button>

      {expanded && (
        <div
          style={{
            padding: "0 1.25rem 1.25rem",
            borderTop: `1px solid ${color}22`,
          }}
        >
          {response.thinkingSummary && (
            <details style={{ marginBottom: "0.75rem" }}>
              <summary
                style={{ cursor: "pointer", color: "#64748b", fontSize: "0.82rem", userSelect: "none" }}
              >
                💭 Xem quá trình suy luận (thinking summary)
              </summary>
              <div
                style={{
                  background: "#F8F8F6",
                  borderRadius: "8px",
                  padding: "0.75rem",
                  marginTop: "0.5rem",
                  fontSize: "0.82rem",
                  color: "#64748b",
                  fontStyle: "italic",
                  whiteSpace: "pre-wrap",
                }}
              >
                {response.thinkingSummary}
              </div>
            </details>
          )}
          <MarkdownContent content={response.content} />
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Sub-component: Render nội dung Markdown đơn giản
// (Không dùng thư viện ngoài để tránh phụ thuộc)
// ──────────────────────────────────────────────────────────
function MarkdownContent({ content }: { content: string }) {
  // Render cơ bản: tách code block và giữ lại whitespace
  const parts = content.split(/(```[\s\S]*?```)/g);

  return (
    <div style={{ color: "#334155", lineHeight: 1.7, fontSize: "0.93rem" }}>
      {parts.map((part, i) => {
        if (part.startsWith("```")) {
          const match = part.match(/^```(\w*)\n?([\s\S]*?)```$/);
          const code = match ? match[2] : part.slice(3, -3);
          const lang = match ? match[1] : "";
          return (
            <pre key={i} style={{ position: "relative" }}>
              {lang && (
                <span
                  style={{
                    position: "absolute",
                    top: "0.5rem",
                    right: "0.75rem",
                    fontSize: "0.7rem",
                    color: "#B89C66",
                    fontFamily: "Inter, sans-serif",
                    fontWeight: 600,
                  }}
                >
                  {lang.toUpperCase()}
                </span>
              )}
              <code>{code}</code>
            </pre>
          );
        }
        // Render inline: bold, headings đơn giản
        const lines = part.split("\n");
        return (
          <div key={i}>
            {lines.map((line, j) => {
              if (line.startsWith("### "))
                return <h3 key={j} style={{ color: "#0F223A", marginTop: "1rem", marginBottom: "0.4rem", fontSize: "1rem" }}>{line.slice(4)}</h3>;
              if (line.startsWith("## "))
                return <h2 key={j} style={{ color: "#0F223A", marginTop: "1.25rem", marginBottom: "0.5rem", fontSize: "1.1rem" }}>{line.slice(3)}</h2>;
              if (line.startsWith("# "))
                return <h1 key={j} style={{ color: "#0F223A", marginTop: "1.5rem", marginBottom: "0.5rem", fontSize: "1.2rem" }}>{line.slice(2)}</h1>;
              if (line.startsWith("- ") || line.startsWith("* "))
                return <li key={j} style={{ marginLeft: "1.25rem", marginBottom: "0.2rem" }}>{renderInline(line.slice(2))}</li>;
              if (line.match(/^\d+\. /))
                return <li key={j} style={{ marginLeft: "1.25rem", marginBottom: "0.2rem" }}>{renderInline(line.replace(/^\d+\. /, ""))}</li>;
              if (line.startsWith("---") || line.startsWith("==="))
                return <hr key={j} style={{ border: "none", borderTop: "1px solid #E5E3DE", margin: "0.75rem 0" }} />;
              if (line.trim() === "") return <br key={j} />;
              return <p key={j} style={{ margin: "0.25rem 0" }}>{renderInline(line)}</p>;
            })}
          </div>
        );
      })}
    </div>
  );
}

function renderInline(text: string): React.ReactNode {
  // Bold: **text**
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith("**") && p.endsWith("**")
      ? <strong key={i} style={{ color: "#0F223A" }}>{p.slice(2, -2)}</strong>
      : p
  );
}
