import chromium from "@sparticuz/chromium";
import { PDFOptions, launch } from "puppeteer-core";
import { logger } from "../utils/logging";

export async function generateDocument(document: string): Promise<Buffer | undefined> {
  let browser, generatedDocument;

  try {
    browser = await launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath,
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
    });

    const page = await browser.newPage();
    const options: PDFOptions = { format: "A4" };

    await page.setContent(document);
    await page.emulateMediaType("screen");
    generatedDocument = await page.pdf(options);
    logger.info("Document generation complete");
  } catch (error) {
    logger.error(error as any);
  } finally {
    browser?.close();
  }

  return generatedDocument;
}
