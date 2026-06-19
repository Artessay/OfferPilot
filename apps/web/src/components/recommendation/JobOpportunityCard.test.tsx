import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import type { TierItem } from "@/lib/api/types";

import { JobOpportunityCard } from "./JobOpportunityCard";

const item: TierItem = {
  jobId: "j1",
  title: "数据分析实习生",
  company: "示例科技",
  matchScore: 82,
  successProbability: 0.62,
  opportunityValue: 78,
  riskLevel: "medium",
  tierReason: "技能匹配度较高",
  suggestedAction: "优先投递",
};

function renderCard() {
  return render(
    <MemoryRouter>
      <JobOpportunityCard item={item} />
    </MemoryRouter>,
  );
}

describe("JobOpportunityCard", () => {
  it("shows all decision indicators, not only the score", () => {
    renderCard();
    expect(screen.getByText("数据分析实习生")).toBeInTheDocument();
    expect(screen.getByText("82")).toBeInTheDocument();
    expect(screen.getByText("62%")).toBeInTheDocument(); // success probability
    expect(screen.getByText("78")).toBeInTheDocument(); // opportunity value
    expect(screen.getByText("中风险")).toBeInTheDocument();
  });

  it("marks the success probability as a prediction", () => {
    renderCard();
    expect(screen.getByText("(预测)")).toBeInTheDocument();
  });

  it("links the job title to the job detail page", () => {
    renderCard();
    expect(screen.getByRole("link", { name: "数据分析实习生" })).toHaveAttribute(
      "href",
      "/app/jobs/j1",
    );
  });
});

