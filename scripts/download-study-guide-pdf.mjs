import { chromium } from "playwright";
import { PDFDocument } from "pdf-lib";
import fs from "fs";
import path from "path";

const mainUrl = "https://indd.adobe.com/view/1283a734-69a3-475a-832e-1b80954835c0";
const outputPath = path.resolve("data/nbcot-sources/NBCOT_Study_Guide_for_OTR_full.pdf");

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const viewerPage = await context.newPage();

  console.log("Loading viewer...");
  await viewerPage.goto(mainUrl, { waitUntil: "load", timeout: 120000 });
  await viewerPage.waitForTimeout(5000);

  const manifest = await viewerPage.evaluate(() => {
    if (!window.readerViewDataFromServer) {
      throw new Error("readerViewDataFromServer not found");
    }
    return JSON.parse(window.readerViewDataFromServer.MANIFEST_BODY);
  });

  const pages = manifest.pages || [];
  console.log(`Found ${pages.length} page descriptors`);
  if (pages.length === 0) {
    throw new Error("Manifest contains no pages");
  }

  const packageFrame = viewerPage.frames().find((frame) => frame.url().includes("/package/prcj/"));
  if (!packageFrame) {
    throw new Error("Package frame not found");
  }

  const frameUrl = packageFrame.url();
  const baseUrl = frameUrl.replace(/[^/]+\.html.*$/, "");
  console.log(`Resolved base URL: ${baseUrl}`);

  const renderPage = await context.newPage();
  await renderPage.setViewportSize({ width: 900, height: 1200 });

  const pageBuffers = [];
  let index = 0;
  for (const pageDescriptor of pages) {
    index += 1;
    const htmlFile = pageDescriptor.html;
    const pageUrl = new URL(htmlFile, baseUrl).toString();
    console.log(`Rendering page ${index}/${pages.length}: ${pageUrl}`);
    await renderPage.goto(pageUrl, { waitUntil: "load", timeout: 60000 });
    await renderPage.waitForTimeout(500);
    const pdfBuffer = await renderPage.pdf({
      width: "8.5in",
      height: "11in",
      margin: { top: "0in", bottom: "0in", left: "0in", right: "0in" },
      printBackground: true,
    });
    pageBuffers.push(pdfBuffer);
  }

  await renderPage.close();
  await viewerPage.close();

  console.log("Merging pages into single PDF...");
  const mergedPdf = await PDFDocument.create();
  for (const [i, buffer] of pageBuffers.entries()) {
    const srcDoc = await PDFDocument.load(buffer);
    const copiedPages = await mergedPdf.copyPages(srcDoc, srcDoc.getPageIndices());
    copiedPages.forEach((p) => mergedPdf.addPage(p));
    if ((i + 1) % 25 === 0 || i === pageBuffers.length - 1) {
      console.log(`Added ${i + 1} pages...`);
    }
  }

  const mergedBytes = await mergedPdf.save();
  await fs.promises.writeFile(outputPath, mergedBytes);
  console.log(`Saved combined PDF to ${outputPath}`);

  await browser.close();
})();
