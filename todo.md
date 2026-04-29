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


## Webhook & Data Sources (NEW)

- [x] Data sources table schema (webhooks, API connectors, CRM integrations)
- [x] Webhook ingestion endpoints (/api/webhooks/{sourceId})
- [x] Data source management tRPC router (list, create, delete, toggle)
- [x] Data source UI page (create, test, delete sources)
- [x] Webhook secret generation and URL management
- [x] Event type mapping from webhook payloads

## CRM Integration (NEW)

- [x] CRM connectors table (HubSpot, Salesforce, Pipedrive)
- [x] CRM connector marketplace UI page with 3 connectors
- [x] CRM connector management (list, create, delete, toggle)
- [x] OAuth token storage and refresh token support
- [x] CRM event mapping (lead, deal, contact events → MATTIAS events)
- [x] Default event mappings for HubSpot, Salesforce, Pipedrive
- [x] CRM event processing pipeline

## Advanced Policy Builder (NEW)

- [x] Enhanced policy UI with condition builder
- [x] Event type selector with schema preview
- [x] Action effect selector (ALLOW, DENY, REQUIRE_APPROVAL)
- [x] Risk threshold slider with examples
- [x] Policy testing/preview mode

## Workflow Builder (NEW)

- [x] Workflow definitions table schema
- [x] Drag-and-drop workflow canvas UI
- [x] Node types: trigger, agent action, approval gate, condition
- [x] Node creation, deletion, and positioning
- [x] Workflow name input
- [x] Node list sidebar with quick access
- [x] Workflow execution engine with context management
- [x] Workflow testing and dry-run mode
- [x] Edge drawing and connection logic with visual feedback
- [x] Connection ports on nodes (hover to reveal)
- [x] Edge deletion with midpoint buttons
- [x] Workflow routers integrated into tRPC API

## Database & Testing (COMPLETED)

- [x] All database migrations applied (data_sources, crm_connectors tables created)
- [x] 18 vitest tests passing (auth, orchestration, integration)
- [x] Data source creation and management tests
- [x] CRM connector tests with event mapping
- [x] Webhook event processing tests
- [x] Event type mapping validation


## Business Profile Layer (NEW - CRITICAL)

- [x] business_profiles table schema (identity, online presence, financial targets, time/language, AI config)
- [x] Business profile management tRPC router (list, create, update, delete)
- [x] Business profile UI page (create, edit, view profiles)
- [ ] Profile parameter extraction from website/document
- [x] Multi-business isolation and fencing (via tenantId)

## Integration Verification & Credential Management (NEW)

- [x] Integration verification pipeline (test connections before use)
- [x] Credential storage with bank-level security (AES-256 encryption)
- [x] Credential management tRPC router
- [x] Verification status tracking (pending, verified, failed, expired)
- [ ] Secure credential management UI page
- [ ] Connection health status dashboard
- [ ] Credential rotation and expiry handling

## Per-Transaction Authorization & Multi-Role Approval (NEW)

- [x] Multi-role approvals table schema
- [x] Multi-role approval chain management
- [x] Approval tracking with role-based sign-off
- [ ] Multi-factor approval chains (pending UI)
- [ ] Per-transaction policies for sensitive actions
- [ ] Enhanced approval queue with multi-role support
- [ ] Audit trail for all approvals

## Marketing Automation (NEW)

- [ ] Ad platform integrations (Google Ads, Meta, TikTok, YouTube)
- [ ] Marketing Agent for campaign creation and optimization
- [ ] Campaign optimization workflow
- [ ] Budget safeguards and policy enforcement
- [ ] Campaign performance tracking

## Voice Interface (NEW)

- [x] Voice input pipeline (Web Speech API integration)
- [x] Voice command processing and MATTIAS command integration
- [x] Voice output (text-to-speech responses)
- [x] Voice-based approval interface
- [x] Voice command history and logs
- [x] VoiceInterface page with full UI

## Recommendations Implementation (NEW)

- [ ] Real CRM OAuth flows (HubSpot, Salesforce, Pipedrive)
- [ ] Webhook event replay UI
- [ ] Agent reasoning transparency in Approval Queue
