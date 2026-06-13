import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Button } from "./button";

describe("Button", () => {
  it("renders its children", () => {
    render(<Button>生成报告</Button>);
    expect(screen.getByRole("button", { name: "生成报告" })).toBeInTheDocument();
  });

  it("defaults to type=button", () => {
    render(<Button>提交</Button>);
    expect(screen.getByRole("button", { name: "提交" })).toHaveAttribute("type", "button");
  });

  it("applies variant styles", () => {
    render(<Button variant="danger">删除</Button>);
    expect(screen.getByRole("button", { name: "删除" })).toHaveClass("bg-critical");
  });
});
