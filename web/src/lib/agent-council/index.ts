// ============================================================
// ELITE LIVING — Multi-Agent Council: Public Exports
// ============================================================

export { runCouncilSession, runSingleAgent } from "./debate";
export { COUNCIL_AGENTS, GEMINI_MODELS, CATEGORY_AGENT_MAP } from "./agents";
export type {
  AgentConfig,
  AgentResponse,
  CouncilRequest,
  CouncilSession,
  CouncilRole,
  TopicCategory,
  ThinkingMode,
} from "./types";
