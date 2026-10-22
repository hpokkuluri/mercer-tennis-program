// Reads a schedule PDF (e.g. the season grid "Saved as PDF" from Excel)
// into the same array-of-arrays shape the spreadsheet path produces, so it
// can go through parseScheduleGrid unchanged.
//
// Only works for PDFs that carry real text. A PDF made by printing a
// screenshot, or one where the text was flattened into drawn shapes, has
// nothing to read — that case returns { ok: false, reason: "no-text" }.
//
// pdf.js is loaded on demand so it never weighs on the main app bundle.

export function textItemsToAoa(items) {
  // items: [{ str, x, y, w, h }] in PDF coordinates (y grows upward)
  const cells = items
    .map((it) => ({ ...it, str: String(it.str).trim(), cx: it.x + it.w / 2 }))
    .filter((it) => it.str);
  if (cells.length === 0) return [];

  // 1. Rows — group by baseline, top of page first.
  const sorted = [...cells].sort((a, b) => b.y - a.y);
  const heights = sorted.map((c) => c.h || 8).sort((a, b) => a - b);
  const rowTol = Math.max(1.5, (heights[Math.floor(heights.length / 2)] || 8) * 0.5);
  const rows = [];
  for (const c of sorted) {
    const last = rows[rows.length - 1];
    if (last && Math.abs(last.y - c.y) <= rowTol) last.items.push(c);
    else rows.push({ y: c.y, items: [c] });
  }

  // 2. Columns — cluster horizontal centres (cell text is centred, so a
  // column's entries line up on their centre). Tolerance comes from the
  // tightest spacing in the busiest row, i.e. the narrowest column.
  const busiest = rows.reduce((a, b) => (b.items.length > a.items.length ? b : a));
  const bc = busiest.items.map((i) => i.cx).sort((a, b) => a - b);
  let minGap = Infinity;
  for (let i = 1; i < bc.length; i++) if (bc[i] - bc[i - 1] > 0.5) minGap = Math.min(minGap, bc[i] - bc[i - 1]);
  const colTol = Number.isFinite(minGap) ? minGap * 0.45 : 6;

  const centres = cells.map((c) => c.cx).sort((a, b) => a - b);
  const cols = [];
  for (const x of centres) {
    const last = cols[cols.length - 1];
    if (last && x - last.max <= colTol) {
      last.max = x;
      last.sum += x;
      last.n += 1;
    } else cols.push({ min: x, max: x, sum: x, n: 1 });
  }
  const colCentres = cols.map((c) => c.sum / c.n);
  const colOf = (x) => {
    let best = 0;
    for (let i = 1; i < colCentres.length; i++) if (Math.abs(colCentres[i] - x) < Math.abs(colCentres[best] - x)) best = i;
    return best;
  };

  return rows.map((r) => {
    const out = new Array(colCentres.length).fill("");
    for (const it of r.items.sort((a, b) => a.x - b.x)) {
      const c = colOf(it.cx);
      out[c] = out[c] ? `${out[c]} ${it.str}` : it.str;
    }
    return out;
  });
}

export async function readPdfAoa(arrayBuffer) {
  const pdfjs = await import("pdfjs-dist");
  const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

  const doc = await pdfjs.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
  const pages = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const tc = await page.getTextContent();
    const items = tc.items
      .filter((it) => typeof it.str === "string")
      .map((it) => ({ str: it.str, x: it.transform[4], y: it.transform[5], w: it.width || 0, h: it.height || Math.abs(it.transform[3]) || 8 }));
    pages.push(items);
  }
  const total = pages.reduce((n, items) => n + items.filter((i) => i.str.trim()).length, 0);
  if (total === 0) return { ok: false, reason: "no-text" };
  // Stack the pages top to bottom into one grid. Excel prints every page
  // with the same column positions, so a schedule that runs onto page 2
  // keeps its player columns even without a repeated header row.
  const stacked = pages.flatMap((items, i) => items.map((it) => ({ ...it, y: it.y - i * 100000 })));
  return { ok: true, aoa: textItemsToAoa(stacked) };
}
