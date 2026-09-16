import { createWorker } from 'tesseract.js';

/**
 * Tesseract runs its recognition on its own Web Worker + WASM, so the heavy
 * OCR work never blocks (freezes) the UI thread. The engine + language traineddata
 * download is large, so we warm it up ONCE in the background (on idle) and reuse
 * the same worker for every scan.
 */

let workerPromise = null;

// Languages we OCR nutrition labels / receipts in.
const OCR_LANGS = 'eng+kor';

async function createOcrWorker() {
  const worker = await createWorker(OCR_LANGS, 1, {
    // Silence logs in production; hook in a progress callback where you call recognize().
    logger: () => {},
  });
  return worker;
}

/**
 * Kick off worker creation without awaiting it. Call this once at app start
 * (ideally in requestIdleCallback) so the first real scan is instant.
 */
export function preloadOcr() {
  if (!workerPromise) {
    workerPromise = createOcrWorker();
  }
  return workerPromise;
}

/** Get the shared, warmed worker (creating it if preload never ran). */
export function getOcrWorker() {
  return preloadOcr();
}

/**
 * Recognize text from an image (File | Blob | data URL | HTMLImageElement).
 * @returns {Promise<string>} extracted text
 */
export async function recognizeText(image) {
  const worker = await getOcrWorker();
  const { data } = await worker.recognize(image);
  return data.text;
}

/** Schedule the background preload on browser idle. Safe to call multiple times. */
export function schedulePreloadOcr() {
  const run = () => preloadOcr().catch(() => {});
  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(run, { timeout: 3000 });
  } else {
    setTimeout(run, 1500);
  }
}
