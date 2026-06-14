import { describe, expect, it } from "vitest";

import { MATCH_LEVEL, RISK_LEVEL, formatProbability } from "./labels";

describe("labels", () => {
  it("formats probability as a percentage", () => {
    expect(formatProbability(0.62)).toBe("62%");
    expect(formatProbability(0.5)).toBe("50%");
  });

  it("maps match levels and risk levels to Chinese labels", () => {
    expect(MATCH_LEVEL.excellent.label).toBe("高度匹配");
    expect(RISK_LEVEL.high.label).toBe("高风险");
  });
});
