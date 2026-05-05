# MATTIAS — AI Operating System

**MATTIAS** is an enterprise-grade cognitive operating system designed to automate and optimize business operations through intelligent company profiling, market research, and multi-agent orchestration.

## 🚀 Features

### Company Management
- **Automatic Company Profiling** — Enter a website URL and MATTIAS automatically extracts 25+ company fields including industry, revenue, team size, and social media presence
- **Persistent Memory System** — Store and retrieve company memories with 7 types: notes, insights, metrics, risks, opportunities, contacts, and documents
- **Company Analytics** — Track company metrics over time with historical data and trend analysis
- **Batch Import** — Upload CSV files to add multiple companies at once

### Business Intelligence
- **Business Plan Research** — AI-powered market research with real data integration for TAM/SAM/SOM analysis, competitor intelligence, and regulatory landscape assessment
- **Document Ingestion** — Extract structured business profiles from uploaded documents and websites using LLM with JSON schema validation
- **Market Trends** — Identify emerging opportunities and market dynamics for strategic planning

### Cognitive Architecture
- **Cognitive Field Engine (CFE)** — Multi-threaded parallel reasoning with 6 concurrent threads for complex decision-making
- **Two-Speed Orchestrator** — Fast response path (1-2s) for immediate feedback + deep background processing for complex analysis
- **Dual Memory System** — Immutable truth layer (events) + cognitive layer (embeddings) for safe knowledge reinterpretation
- **Cognitive Trigger Threshold** — Intelligent routing between fast inference and deep CFE based on query complexity

### Integration & Automation
- **Ad Platform OAuth** — Seamless integration with Google Ads, Meta, TikTok, and YouTube for campaign management
- **Credential Management** — Secure storage and rotation of API credentials with audit trails and approval workflows
- **Integration Health Monitoring** — Real-time uptime, error rate, and response time tracking across all platforms
- **Multi-Role Approvals** — Role-based approval chains for sensitive operations with complete audit logging

### Subscription Tiers
- **Personal** — $49/month (50 companies, 5K requests/month, 3 team members)
- **Professional** — $139/month (1K companies, 50K requests/month, 10 team members, custom integrations)
- **Enterprise** — $389/month (10K companies, 500K requests/month, 100 team members, dedicated support)
- **7-Day Free Trial** — All tiers include a 7-day free trial with full feature access

## 🏗️ Architecture

### Technology Stack
- **Frontend**: React 19 + Tailwind CSS 4 + shadcn/ui
- **Backend**: Express 4 + tRPC 11 + Drizzle ORM
- **Database**: MySQL/TiDB with pgvector support for embeddings
- **LLM Integration**: OpenAI API with structured JSON schema responses
- **Authentication**: Manus OAuth with JWT sessions

### Core Services
- `cognitiveFieldEngine.ts` — Multi-threaded reasoning orchestrator with budgeting
- `dualMemorySystem.ts` — Event-based truth layer + embedding-based cognitive layer
- `twoSpeedOrchestrator.ts` — Fast/deep path routing with latency optimization
- `businessPlanResearchWithAPIs.ts` — Real data integration for market research
- `subscriptionTiers.ts` — Tier management and feature access control
- `companyManagement.ts` — Company CRUD with memory and metrics tracking
- `webScraper.ts` — Website analysis and company data extraction

## 📊 Database Schema

Key tables:
- `companies` — Company profiles with extracted metadata
- `company_memory` — Timestamped memories with 7 types and importance levels
- `company_metrics` — Historical metrics tracking (revenue, employees, etc.)
- `cognitive_field_engine` — CFE session state and thread tracking
- `memory_embeddings` — Vector embeddings for semantic search
- `credential_rotation_history` — Audit trail for credential changes
- `integration_credentials` — Encrypted storage of API keys and OAuth tokens

## 🚀 Getting Started

### Prerequisites
- Node.js 22+
- MySQL 8.0+ or TiDB
- Environment variables configured (see `.env.example`)

### Installation
```bash
# Install dependencies
pnpm install

# Generate Drizzle migrations
pnpm drizzle-kit generate

# Run database migrations
pnpm drizzle-kit migrate

# Start development server
pnpm dev

# Run tests
pnpm test
```

### Environment Variables
```
DATABASE_URL=mysql://user:password@localhost:3306/mattias
JWT_SECRET=your_jwt_secret_here
VITE_APP_ID=your_manus_oauth_app_id
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://portal.manus.im
BUILT_IN_FORGE_API_URL=https://api.manus.im/forge
BUILT_IN_FORGE_API_KEY=your_forge_api_key
```

## 📖 API Documentation

### Company Management
- `POST /api/trpc/company.create` — Create new company
- `GET /api/trpc/company.list` — List all companies
- `GET /api/trpc/company.get` — Get company details
- `DELETE /api/trpc/company.delete` — Delete company
- `POST /api/trpc/company.addMemory` — Add memory entry
- `POST /api/trpc/company.updateMetrics` — Update metrics

### Business Research
- `POST /api/trpc/businessPlan.research` — Conduct market research
- `GET /api/trpc/businessPlan.getCached` — Retrieve cached research

### Web Scraping
- `POST /api/trpc/company.scrapeWebsite` — Analyze website and extract company data

### Subscriptions
- `GET /api/trpc/subscription.getTier` — Get current tier
- `POST /api/trpc/subscription.upgrade` — Upgrade subscription

## 🧪 Testing

```bash
# Run all tests
pnpm test

# Run specific test file
pnpm test server/mattias/companyManagement.test.ts

# Watch mode
pnpm test --watch

# Coverage
pnpm test --coverage
```

**Current Test Coverage**: 280+ tests passing across all modules

## 📝 Development Workflow

1. **Schema First** — Update `drizzle/schema.ts` with new tables
2. **Generate Migrations** — Run `pnpm drizzle-kit generate`
3. **Database Helpers** — Add query functions in `server/db.ts`
4. **tRPC Procedures** — Create endpoints in `server/routers.ts`
5. **Frontend** — Build UI components in `client/src/pages/`
6. **Tests** — Write vitest specs in `server/mattias/*.test.ts`
7. **Checkpoint** — Save progress with `webdev_save_checkpoint`

## 🔐 Security

- **OAuth Authentication** — Manus OAuth for secure user authentication
- **Credential Encryption** — All API keys and tokens encrypted at rest
- **Role-Based Access Control** — User and admin roles with feature gating
- **Audit Trails** — Complete logging of all credential and approval actions
- **Rate Limiting** — Subscription tier-based request throttling

## 📈 Performance

- **Fast Path** — 1-2 second response time for simple queries
- **Deep Processing** — Background CFE threads for complex analysis
- **Caching** — 24-hour cache for business plan research
- **Database Indexing** — Optimized queries on company and memory tables
- **Vector Search** — Fast semantic search via pgvector embeddings

## 🤝 Contributing

1. Create a feature branch (`git checkout -b feature/amazing-feature`)
2. Commit changes (`git commit -m 'Add amazing feature'`)
3. Push to branch (`git push origin feature/amazing-feature`)
4. Open a Pull Request

## 📄 License

This project is proprietary and confidential. All rights reserved.

## 📞 Support

For support, email support@mattias.ai or visit https://mattias.ai/support

---

**MATTIAS** — Intelligent Business Operations Automation
