jest.mock("server-only", () => ({}));

import {
  isAllowedGalleryImageHost,
  isPrivateNetworkAddress,
} from "@/lib/gallery/image-dimensions";

describe("gallery image dimension network policy", () => {
  it("allows only configured image hosts", () => {
    expect(isAllowedGalleryImageHost("lh3.googleusercontent.com")).toBe(true);
    expect(isAllowedGalleryImageHost("project.supabase.co")).toBe(true);
    expect(isAllowedGalleryImageHost("localhost")).toBe(false);
    expect(isAllowedGalleryImageHost("example.com")).toBe(false);
  });

  it("blocks loopback, private, link-local and IPv6 local addresses", () => {
    for (const address of [
      "127.0.0.1",
      "10.0.0.1",
      "172.16.0.1",
      "192.168.1.1",
      "169.254.169.254",
      "::1",
      "fd00::1",
      "fe80::1",
    ]) {
      expect(isPrivateNetworkAddress(address)).toBe(true);
    }
    expect(isPrivateNetworkAddress("8.8.8.8")).toBe(false);
    expect(isPrivateNetworkAddress("2606:4700:4700::1111")).toBe(false);
  });
});
