const M = (mm) => (mm / 1000).toFixed(2);
const T = (kg) => (kg / 1000).toFixed(2);

// XSS-safe: build DOM with textContent only (load.name echoes request input — never innerHTML it).
const line = (text) => { const d = document.createElement('div'); d.textContent = text; return d; };
const cellRow = (tag, cells) => {
  const tr = document.createElement('tr');
  for (const c of cells) { const el = document.createElement(tag); el.textContent = c; tr.appendChild(el); }
  return tr;
};

/** Render the summary into a DOM container (HTML overlay). summary = { loadsCount, load }. */
export function renderSummary(container, summary) {
  container.replaceChildren();
  const t = summary.load;
  if (summary.loadsCount > 1) {
    const note = line(`Transports: ${summary.loadsCount} (showing #1)`);
    note.style.fontWeight = 'bold';
    container.appendChild(note);
  }
  if (!t) return;

  const title = document.createElement('div');
  const b = document.createElement('b');
  b.textContent = t.name || 'Transport';
  title.append(b, document.createTextNode(` (view ${t.view})`));
  container.appendChild(title);

  const dims = t.dims.map((s) => `${M(s.x)}×${M(s.y)}×${M(s.z)}`).join(' / ');
  container.append(line(`dims: ${dims} m`), line(`places: ${t.places}`), line(`weight: ${T(t.weight)} t`), line(`fill: ${t.fillPct}%`));

  if (t.axes) {
    const table = document.createElement('table');
    table.appendChild(cellRow('th', ['axle', 'load', 'max']));
    for (const g of ['tt', 'pp', 'pr']) {
      if (!t.axes[g]) continue;
      t.axes[g].forEach((a, i) => {
        const tr = cellRow('td', [`${g} n${i + 1}`, `${T(a.val)} t`, a.max ? `${T(a.max)} t` : '—']);
        if (a.overload) tr.className = 'overload';
        table.appendChild(tr);
      });
    }
    container.appendChild(table);
  }
}
