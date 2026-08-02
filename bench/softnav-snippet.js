// Soft-navigation timing, evaluated inside a real browser tab on a category
// page. Hovers a product link (letting hover-preload fire), clicks after
// `hoverMs`, and times click -> h1 text change. Returns median + samples.
// Usage (from an agent driving CDP/preview_evaluate):
//   await measureSoftNav({ samples: 10, hoverMs: 250 })
async function measureSoftNav({ samples = 10, hoverMs = 250 } = {}) {
  const results = [];
  const links = [...document.querySelectorAll("main a[href*='/products/']")]
    .filter((a) => a.querySelector("img"));
  if (links.length < 2) return { error: "not enough product links" };

  const h1 = () => document.querySelector("h1")?.textContent ?? "";
  const back = () => new Promise((resolve) => {
    const target = h1();
    history.back();
    const iv = setInterval(() => {
      if (h1() !== target) {
        clearInterval(iv);
        setTimeout(resolve, 300);
      }
    }, 16);
  });

  for (let i = 0; i < samples; i++) {
    const link = links[i % links.length];
    link.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
    link.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
    await new Promise((r) => setTimeout(r, hoverMs));
    const before = h1();
    const start = performance.now();
    link.dispatchEvent(
      new MouseEvent("mousedown", { bubbles: true, button: 0 }),
    );
    link.click();
    await new Promise((resolve) => {
      const iv = setInterval(() => {
        if (h1() !== before) {
          clearInterval(iv);
          resolve();
        }
      }, 4);
    });
    results.push(Math.round(performance.now() - start));
    await back();
  }
  const sorted = [...results].sort((a, b) => a - b);
  return {
    samples: results,
    median: sorted[Math.floor(sorted.length / 2)],
    p90: sorted[Math.floor(sorted.length * 0.9)],
  };
}
