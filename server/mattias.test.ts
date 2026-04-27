import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { COOKIE_NAME } from "../shared/const";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext; clearedCookies: { name: string; options: Record<string, unknown> }[] } {
  const clearedCookies: { name: string; options: Record<string, unknown> }[] = [];

  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-mattias",
    email: "test@mattias.ai",
    name: "MATTIAS Test",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: (name: string, options: Record<string, unknown>) => {
        clearedCookies.push({ name, options });
      },
    } as TrpcContext["res"],
  };

  return { ctx, clearedCookies };
}

describe("auth.logout", () => {
  it("clears the session cookie and reports success", async () => {
    const { ctx, clearedCookies } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result).toEqual({ success: true });
    expect(clearedCookies).toHaveLength(1);
    expect(clearedCookies[0]?.name).toBe(COOKIE_NAME);
    expect(clearedCookies[0]?.options).toMatchObject({
      maxAge: -1,
      secure: true,
      sameSite: "none",
      httpOnly: true,
      path: "/",
    });
  });
});

describe("auth.me", () => {
  it("returns the current user when authenticated", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const user = await caller.auth.me();
    expect(user?.email).toBe("test@mattias.ai");
    expect(user?.name).toBe("MATTIAS Test");
  });

  it("returns null when unauthenticated", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: { clearCookie: () => {} } as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    const user = await caller.auth.me();
    expect(user).toBeNull();
  });
});

describe("event catalog", () => {
  it("exports canonical event types", async () => {
    const { EventTypes } = await import("./mattias/eventCatalog");
    expect(EventTypes.LEAD_CAPTURED).toBe("LeadCaptured");
    expect(EventTypes.CASHFLOW_SHORTFALL_DETECTED).toBe("CashflowShortfallDetected");
    expect(EventTypes.PAYMENT_APPROVED).toBe("PaymentApproved");
    expect(EventTypes.CONTRACT_RISK_FLAGGED).toBe("ContractRiskFlagged");
  });
});

describe("agent names", () => {
  it("exports all 8 agent names plus CriticAgent", async () => {
    const { AGENT_NAMES } = await import("./mattias/eventCatalog");
    expect(AGENT_NAMES.OPERATIONS).toBe("OperationsAgent");
    expect(AGENT_NAMES.FINANCE).toBe("FinanceAgent");
    expect(AGENT_NAMES.SALES).toBe("SalesAgent");
    expect(AGENT_NAMES.MARKETING).toBe("MarketingAgent");
    expect(AGENT_NAMES.KNOWLEDGE).toBe("KnowledgeAgent");
    expect(AGENT_NAMES.PERSONAL_LIFE).toBe("PersonalLifeAgent");
    expect(AGENT_NAMES.COMMUNICATION).toBe("CommunicationAgent");
    expect(AGENT_NAMES.COMPLIANCE_RISK).toBe("ComplianceRiskAgent");
    expect(AGENT_NAMES.CRITIC).toBe("CriticAgent");
  });
});
