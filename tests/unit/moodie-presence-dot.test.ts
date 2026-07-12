import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MoodiePresenceDot } from "@/components/moodie/moodie-presence-dot";

describe("Moodie presence dot", () => {
  it("renders a green heartbeat only when a model provider is available", () => {
    const markup = renderToStaticMarkup(createElement(MoodiePresenceDot, { live: true }));
    expect(markup).toContain("Moodie đã kết nối model");
    expect(markup).toContain("bg-success/35");
    expect(markup).toContain("bg-success");
    expect(markup).toContain("animate-ping");
    expect(markup).toContain("animate-pulse");
    expect(markup).toContain("motion-reduce:animate-none");
    expect(markup).not.toContain(">M<");
    expect(markup).not.toContain("bg-primary");
  });

  it("renders a static Mood primary dot when no provider is configured", () => {
    const markup = renderToStaticMarkup(createElement(MoodiePresenceDot, { live: false }));
    expect(markup).toContain("Moodie chưa kết nối model");
    expect(markup).toContain("bg-primary");
    expect(markup).not.toContain("bg-success");
    expect(markup).not.toContain("animate-ping");
    expect(markup).not.toContain("animate-pulse");
  });
});
