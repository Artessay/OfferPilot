import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ScoreOverview } from "./ScoreOverview";

describe("ScoreOverview", () => {
  it("renders the score and level label", () => {
    render(<ScoreOverview score={82} level="high" summary="技能匹配度较高" />);
    expect(screen.getByText("82")).toBeInTheDocument();
    expect(screen.getByText("较匹配")).toBeInTheDocument();
    expect(screen.getByText("技能匹配度较高")).toBeInTheDocument();
  });

  it("falls back to the raw level when unknown", () => {
    render(<ScoreOverview score={10} level="unknown" />);
    expect(screen.getByText("unknown")).toBeInTheDocument();
  });
});
