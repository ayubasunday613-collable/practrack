import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ReportAnswerField } from "./ReportAnswerField";
import { createReportCode } from "@/lib/supabase";

describe("ReportAnswerField", () => {
  it("blocks paste and accepts typed changes", () => {
    const onChange = vi.fn();
    render(
      <ReportAnswerField
        id="aims"
        title="Aims / Objectives"
        instructions="State the objective."
        value=""
        required
        disabled={false}
        onChange={onChange}
      />,
    );
    const field = screen.getByRole("textbox", { name: "Aims / Objectives" });
    const pasteEvent = new Event("paste", { bubbles: true, cancelable: true });

    field.dispatchEvent(pasteEvent);
    expect(pasteEvent.defaultPrevented).toBe(true);

    fireEvent.change(field, { target: { value: "Determine the sample property." } });
    expect(onChange).toHaveBeenCalledWith("Determine the sample property.");
  });
});

describe("report codes", () => {
  it("generates a 128-bit code formatted as 32 hexadecimal characters", () => {
    expect(createReportCode()).toMatch(/^[0-9A-F]{32}$/);
  });
});
