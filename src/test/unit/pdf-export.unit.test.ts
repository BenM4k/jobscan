import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { downloadTextAsPdf } from "@/lib/pdf-export";

describe("downloadTextAsPdf", () => {
  it("exports a function accepting (filename, content, fontSize?, lineHeight?)", () => {
    assert.equal(typeof downloadTextAsPdf, "function");
    assert.equal(downloadTextAsPdf.length, 2);
  });
});
