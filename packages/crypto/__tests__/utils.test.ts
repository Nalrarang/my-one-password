import { describe, it, expect } from "vitest";
import {
  secureZero,
  constantTimeEqual,
  encodeUtf8,
  decodeUtf8,
} from "../src/utils";

describe("secureZero", () => {
  it("fills buffer with zeros", () => {
    const buffer = new Uint8Array([0xff, 0xab, 0x42, 0x01, 0xde]);
    secureZero(buffer);

    expect(buffer).toEqual(new Uint8Array(5));
    for (let i = 0; i < buffer.length; i++) {
      expect(buffer[i]).toBe(0);
    }
  });
});

describe("constantTimeEqual", () => {
  it("returns true for identical arrays", () => {
    const a = new Uint8Array([1, 2, 3, 4, 5]);
    const b = new Uint8Array([1, 2, 3, 4, 5]);

    expect(constantTimeEqual(a, b)).toBe(true);
  });

  it("returns false for different arrays", () => {
    const a = new Uint8Array([1, 2, 3, 4, 5]);
    const b = new Uint8Array([1, 2, 3, 4, 6]);

    expect(constantTimeEqual(a, b)).toBe(false);
  });

  it("returns false for different lengths", () => {
    const a = new Uint8Array([1, 2, 3]);
    const b = new Uint8Array([1, 2, 3, 4]);

    expect(constantTimeEqual(a, b)).toBe(false);
  });
});

describe("encodeUtf8 / decodeUtf8", () => {
  it("round-trips correctly for ASCII text", () => {
    const original = "hello world 123!";
    const encoded = encodeUtf8(original);
    const decoded = decodeUtf8(encoded);

    expect(decoded).toBe(original);
  });

  it("handles Korean characters", () => {
    const korean = "\uD55C\uAD6D\uC5B4 \uD14C\uC2A4\uD2B8";
    const encoded = encodeUtf8(korean);
    const decoded = decodeUtf8(encoded);

    expect(decoded).toBe(korean);
    // Korean characters require multiple bytes in UTF-8
    expect(encoded.length).toBeGreaterThan(korean.length);
  });

  it("handles emoji", () => {
    const emoji = "\uD83D\uDD10\uD83D\uDEE1\uFE0F\uD83D\uDCA5";
    const encoded = encodeUtf8(emoji);
    const decoded = decodeUtf8(encoded);

    expect(decoded).toBe(emoji);
    // Emoji are multi-byte in UTF-8 (typically 4 bytes each)
    expect(encoded.length).toBeGreaterThan(emoji.length);
  });
});
