import { describe, expect, it } from "vitest";
import { pushTopic } from "./push";

describe("pushTopic", () => {
  it("deja solo letras y números (Apple rechaza guiones)", () => {
    expect(pushTopic("walk-main-2026-11-23-1040")).toBe("walkmain202611231040");
    expect(pushTopic("swap-3dfc10fc-6fc4-4137-8187-8011b189d955")).toMatch(/^[A-Za-z0-9]{1,32}$/);
    expect(pushTopic("test")).toBe("test");
  });
  it("sin tag no manda topic", () => {
    expect(pushTopic(undefined)).toBeUndefined();
    expect(pushTopic("---")).toBeUndefined();
  });
});
