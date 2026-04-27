# MATTIAS — AI Operating System TODO

## Backend

- [x] Database schema: events, memory_embeddings, entities, relationships, policies, approvals, agent_configs, workflow_definitions, feature_flags, tenants
- [x] Drizzle schema + migration applied
- [x] Semantic event catalog (TypeScript constants/enums)
- [x] Agent base class + AgentRegistry
- [x] EventBus service
- [x] Orchestrator (single + collaborative)
- [x] LLM integration with structured JSON schema outputs + Zod validation
- [x] PromptBuilder for semantic events
- [x] CriticAgent for multi-agent debate
- [x] ConsensusEngine
- [x] MemoryService with semantic search
- [x] EntityService
- [x] PolicyEngine with event-condition matching
- [x] RiskEngine with semantic scoring
- [x] AutonomyController (Manual, Assisted, Approval-Guarded, Autonomous)
- [x] ApprovalService (create, list, approve, reject)
- [x] All 8 agent modules: Operations, Finance, Sales, Marketing, Knowledge, Personal Life, Communication, Compliance & Risk
- [x] tRPC routers: events, agents, approvals, memory, policies, command, tenants, dashboard
- [x] MATTIAS command interface (chat-style LLM endpoint)
- [x] Subscription tiers + feature flags
- [x] Vitest tests for core procedures (6 tests passing)

## Frontend

- [x] Dark theme global CSS variables
- [x] MATTIASLayout sidebar (8 modules + system pages)
- [x] Dashboard page with stats, recent events, quick simulate panel
- [x] Command Center page (MATTIAS chat interface)
- [x] Event Log page (real-time semantic event feed with category filters)
- [x] Approval Queue page (pending actions with approve/reject + reasoning)
- [x] Agent detail pages for all 8 modules
- [x] Autonomy Control settings page (4 levels)
- [x] Memory Explorer page with semantic search
- [x] Policy Manager page (create/toggle/delete policies)
- [x] Event badge/chip components
- [x] Risk score indicator component
- [x] Login page for unauthenticated users
