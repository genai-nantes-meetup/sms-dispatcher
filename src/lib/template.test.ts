import { describe, it, expect } from "vitest";
import { fillTemplate } from "./template";
describe("fillTemplate", () => {
  const r = { first_name: "Alice", last_name: "Martin" };
  it("replaces $firstname", () => expect(fillTemplate("Hello $firstname", r)).toBe("Hello Alice"));
  it("replaces $lastname and $fullname, case-insensitive", () => expect(fillTemplate("$LastName / $fullname", r)).toBe("Martin / Alice Martin"));
  it("leaves unknown vars", () => expect(fillTemplate("$foo $firstnames", r)).toBe("$foo $firstnames"));
});
