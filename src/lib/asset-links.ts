/** One SHA-256 certificate fingerprint as Google writes it: 32 hex bytes joined by colons. */
const FINGERPRINT = /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/;

export type AssetLink = {
  relation: string[];
  target: { namespace: "android_app"; package_name: string; sha256_cert_fingerprints: string[] };
};

/**
 * Digital Asset Links statement that lets the Play Store app open this site full screen (no
 * browser bar). `fingerprints` is a comma-separated list, e.g. the upload key and Play's
 * app-signing key; invalid entries are dropped, and with none left no app is listed.
 */
export function assetLinks(packageName: string, fingerprints: string): AssetLink[] {
  const valid = fingerprints
    .split(",")
    .map((item) => item.trim().toUpperCase())
    .filter((item) => FINGERPRINT.test(item));
  if (valid.length === 0) return [];
  return [
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: packageName,
        sha256_cert_fingerprints: valid,
      },
    },
  ];
}
