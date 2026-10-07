import { describe, expect, it } from "vitest";
import { assetLinks } from "../../src/lib/asset-links.ts";

const KEY = Array.from({ length: 32 }, (_, i) => (i * 7).toString(16).padStart(2, "0")).join(":");

describe("assetLinks", () => {
  it("lists the app with its fingerprints, upper-cased and trimmed", () => {
    const other = KEY.replace(/^00/, "FF");
    const [link] = assetLinks("co.barberia.app", ` ${KEY} , ${other}`);
    expect(link.relation).toEqual(["delegate_permission/common.handle_all_urls"]);
    expect(link.target).toEqual({
      namespace: "android_app",
      package_name: "co.barberia.app",
      sha256_cert_fingerprints: [KEY.toUpperCase(), other.toUpperCase()],
    });
  });

  it("lists no app when no fingerprint is valid", () => {
    expect(assetLinks("co.barberia.app", "no-es-una-huella")).toEqual([]);
  });
});
