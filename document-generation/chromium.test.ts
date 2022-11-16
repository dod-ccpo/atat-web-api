import { generateDocument } from "./chromium";
import { Browser, Page } from "puppeteer-core";

// inspiration for mocking
// https://dev.to/aarmora/jordan-mocks-puppeteer-with-jest-5592
const stubPage = {
  setContent(): Promise<void> {
    return Promise.resolve();
  },
  emulateMediaType(): Promise<void> {
    return Promise.resolve();
  },
  pdf(): Promise<Buffer> {
    return Promise.resolve(Buffer.from("Generated ATAT Document"));
  },
} as unknown as Page;

const stubBrowser = {
  newPage() {
    return Promise.resolve(stubPage);
  },
  close() {
    return Promise.resolve();
  },
} as unknown as Browser;

const stubPuppeteer = {
  launch() {
    return Promise.resolve(stubBrowser);
  },
} as unknown as any;

jest.mock("puppeteer-core", () => ({
  launch() {
    return stubBrowser;
  },
}));

beforeEach(() => {
  jest.restoreAllMocks();
});

describe("generateDocument()", () => {
  it("should return a buffer of a generated document", async () => {
    // WHEN
    const document = await generateDocument("stubbingTemplateWithData");
    // THEN
    expect(document?.toString("utf8")).toBe("Generated ATAT Document");
  });
});
