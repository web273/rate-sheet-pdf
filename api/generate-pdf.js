const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');

chromium.setHeadlessMode = true;
chromium.setGraphicsMode = false;

module.exports = async (req, res) => {

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  let browser = null;

  try {
    const executablePath = await chromium.executablePath();
    
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: { width: 794, height: 1123 },
      executablePath: executablePath,
      headless: true,
      ignoreHTTPSErrors: true,
    });

    const page = await browser.newPage();

    await page.goto(url, { 
      waitUntil: 'networkidle0',
      timeout: 25000 
    });

    await page.evaluate(() => {
      return Promise.all(
        Array.from(document.images)
          .filter(img => !img.complete)
          .map(img => new Promise(resolve => {
            img.onload = resolve;
            img.onerror = resolve;
          }))
      );
    });

    await page.evaluate(() => {
      const btn = document.querySelector('[data-pdf-download]');
      if (btn) btn.style.display = 'none';
    });

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '0mm',
        right: '0mm',
        bottom: '0mm',
        left: '0mm'
      }
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="rate-sheet.pdf"');
    res.send(pdf);

  } catch (error) {
    console.error('PDF Error:', error.message);
    res.status(500).json({ error: error.message });

  } finally {
    if (browser) await browser.close();
  }
};
