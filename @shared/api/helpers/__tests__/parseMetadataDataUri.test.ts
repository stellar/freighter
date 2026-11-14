import { MAX_METADATA_BYTES } from "../fetchMetadataJson";
import {
  isMetadataDataUri,
  parseMetadataDataUri,
} from "../parseMetadataDataUri";

const metadata = {
  name: "Stroopies 0",
  image:
    "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><rect width='64' height='64' fill='rgb(47,47,50)'/></svg>",
  attributes: [
    { trait_type: "role", value: 3 },
    { trait_type: "arms", value: 0 },
  ],
};

const toBase64 = (s: string) => Buffer.from(s, "utf-8").toString("base64");

describe("isMetadataDataUri", () => {
  it("matches data URIs regardless of scheme casing", () => {
    expect(isMetadataDataUri("data:application/json,{}")).toBe(true);
    expect(isMetadataDataUri("DATA:application/json,{}")).toBe(true);
  });

  it("does not match remote or empty URIs", () => {
    expect(isMetadataDataUri("https://example.com/metadata.json")).toBe(false);
    expect(isMetadataDataUri("ipfs://bafy")).toBe(false);
    expect(isMetadataDataUri("")).toBe(false);
  });
});

describe("parseMetadataDataUri", () => {
  it("parses a raw (unencoded) JSON payload with an inline SVG image", () => {
    const uri = `data:application/json,${JSON.stringify(metadata)}`;

    expect(parseMetadataDataUri(uri)).toEqual(metadata);
  });

  it("parses a percent-encoded JSON payload", () => {
    const uri = `data:application/json,${encodeURIComponent(
      JSON.stringify(metadata),
    )}`;

    expect(parseMetadataDataUri(uri)).toEqual(metadata);
  });

  it("parses a base64 JSON payload, including non-ASCII text", () => {
    const doc = { name: "Café ☕" };
    const uri = `data:application/json;base64,${toBase64(JSON.stringify(doc))}`;

    expect(parseMetadataDataUri(uri)).toEqual(doc);
  });

  it("parses a base64 payload whose characters are percent-encoded", () => {
    const doc = { name: "AB" };
    const encoded = encodeURIComponent(toBase64(JSON.stringify(doc)));
    expect(encoded).toContain("%3D");

    expect(
      parseMetadataDataUri(`data:application/json;base64,${encoded}`),
    ).toEqual(doc);
  });

  it("keeps percent escapes inside a raw JSON payload as written", () => {
    const doc = {
      name: "X",
      image: `data:image/svg+xml,${encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg"></svg>`,
      )}`,
    };
    const uri = `data:application/json,${JSON.stringify(doc)}`;

    expect(parseMetadataDataUri(uri)).toEqual(doc);
  });

  it("accepts media type parameters and mixed casing", () => {
    const uri = `data:Application/JSON;charset=utf-8;base64,${toBase64(
      JSON.stringify(metadata),
    )}`;

    expect(parseMetadataDataUri(uri)).toEqual(metadata);
  });

  it("falls back to the raw payload when it is not valid percent-encoding", () => {
    const doc = {
      image: "data:image/svg+xml,<svg width='100%' height='100%'/>",
    };
    const uri = `data:application/json,${JSON.stringify(doc)}`;

    expect(parseMetadataDataUri(uri)).toEqual(doc);
  });

  it("rejects anything that is not a data:application/json URI", () => {
    [
      "https://example.com/metadata.json",
      "data:text/html,<p>hi</p>",
      'data:,{"name":"x"}',
      "data:application/json",
    ].forEach((uri) => {
      expect(() => parseMetadataDataUri(uri)).toThrow(
        "not a data:application/json URI",
      );
    });
  });

  it("rejects malformed JSON", () => {
    expect(() => parseMetadataDataUri("data:application/json,{nope")).toThrow();
  });

  it("rejects malformed base64", () => {
    expect(() =>
      parseMetadataDataUri("data:application/json;base64,***"),
    ).toThrow();
  });

  it("rejects JSON that is not an object", () => {
    expect(() => parseMetadataDataUri("data:application/json,[1,2]")).toThrow(
      "not a JSON object",
    );
    expect(() => parseMetadataDataUri("data:application/json,null")).toThrow(
      "not a JSON object",
    );
    expect(() => parseMetadataDataUri('data:application/json,"text"')).toThrow(
      "not a JSON object",
    );
  });

  it("rejects a URI larger than MAX_METADATA_BYTES", () => {
    const uri = `data:application/json,${JSON.stringify({
      name: "x".repeat(MAX_METADATA_BYTES),
    })}`;

    expect(() => parseMetadataDataUri(uri)).toThrow("uri too large");
  });
});
