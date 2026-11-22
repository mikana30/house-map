// Interactive floor plans: layer legend, markers, detail panel.
// Data: data/items.json. Plans: img/floorplan/<floor>-rooms.svg (viewBox 0 0 1200 1060,
// plan drawn inside translate(10,90) in floor-plan units).
(function () {
  const FLOORS = [
    { id: "main", name: "Main floor", svg: "img/floorplan/main-rooms.svg" },
    { id: "second", name: "Second floor", svg: "img/floorplan/second-rooms.svg" },
    { id: "basement", name: "Basement", svg: "img/floorplan/basement-rooms.svg" },
  ];
  const NS = "http://www.w3.org/2000/svg";
  const root = document.getElementById("hm-app");
  if (!root) return;
  const ver = root.dataset.v || "";
  const state = { data: null, on: new Set() };

  function el(tag, attrs, text) {
    const e = document.createElement(tag);
    for (const k in attrs || {}) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    return e;
  }
  function svgEl(tag, attrs) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }
  function loadOn() {
    try { const s = localStorage.getItem("hm-layers"); if (s) return new Set(JSON.parse(s)); } catch (e) {}
    return null;
  }
  function saveOn() {
    try { localStorage.setItem("hm-layers", JSON.stringify([...state.on])); } catch (e) {}
  }

  function layer(id) { return state.data.layers.find((l) => l.id === id) || { name: id, color: "#555" }; }

  function showDetail(item) {
    const p = document.getElementById("hm-detail");
    p.innerHTML = "";
    const L = layer(item.layer);
    const close = el("button", { class: "hm-close", type: "button", "aria-label": "Close" }, "×");
    close.onclick = () => { p.hidden = true; };
    p.appendChild(close);
    p.appendChild(el("div", { class: "hm-kicker", style: "color:" + L.color }, L.name));
    p.appendChild(el("h3", {}, item.name));
    const fl = FLOORS.find((f) => f.id === item.floor);
    p.appendChild(el("p", { class: "hm-where" }, fl ? fl.name : "Location not recorded yet"));
    if (item.photo) {
      const a = el("a", { href: item.photo, target: "_blank", rel: "noopener" });
      a.appendChild(el("img", { src: item.photo, alt: "Photo of " + item.name, loading: "lazy" }));
      p.appendChild(a);
    }
    if (item.notes) p.appendChild(el("p", {}, item.notes));
    if (item.directory && item.directory.length) {
      const t = el("table", { class: "hm-dir" });
      const hr = el("tr");
      ["#", "Amps", "Label on the door"].forEach((h) => hr.appendChild(el("th", {}, h)));
      t.appendChild(hr);
      item.directory.forEach((r) => {
        const tr = el("tr");
        [r.breaker, r.amps, r.label].forEach((v) => tr.appendChild(el("td", {}, v == null ? "" : String(v))));
        t.appendChild(tr);
      });
      p.appendChild(el("h4", {}, "Panel directory"));
      p.appendChild(t);
    }
    p.hidden = false;
    p.focus();
  }

  function render() {
    const d = state.data;
    // legend
    const leg = document.getElementById("hm-legend");
    leg.innerHTML = "";
    d.layers.forEach((L) => {
      const items = d.items.filter((i) => i.layer === L.id);
      const lab = el("label", { class: "hm-layer" });
      const cb = el("input", { type: "checkbox" });
      cb.checked = state.on.has(L.id);
      cb.onchange = () => { cb.checked ? state.on.add(L.id) : state.on.delete(L.id); saveOn(); render(); };
      lab.appendChild(cb);
      lab.appendChild(el("span", { class: "hm-dot", style: "background:" + L.color }));
      lab.appendChild(document.createTextNode(" " + L.name + " (" + items.length + ")"));
      leg.appendChild(lab);
    });
    // unplaced list
    const un = document.getElementById("hm-unplaced");
    un.innerHTML = "";
    const unplaced = d.items.filter((i) => state.on.has(i.layer) && (i.x == null || !i.floor));
    if (unplaced.length) {
      un.appendChild(el("p", { class: "hm-sub" }, "Not on the map yet (spot not recorded):"));
      const ul = el("ul");
      unplaced.forEach((i) => {
        const li = el("li");
        const b = el("button", { type: "button", class: "hm-link" }, i.name);
        b.style.borderLeftColor = layer(i.layer).color;
        b.onclick = () => showDetail(i);
        li.appendChild(b);
        ul.appendChild(li);
      });
      un.appendChild(ul);
    }
    // floors
    const fw = document.getElementById("hm-floors");
    fw.innerHTML = "";
    FLOORS.forEach((f) => {
      const box = el("figure", { class: "hm-floor" });
      box.appendChild(el("h3", {}, f.name));
      const svg = svgEl("svg", { viewBox: "0 0 1200 1060", role: "img", "aria-label": f.name + " plan" });
      svg.appendChild(svgEl("image", { href: f.svg + "?v=" + ver, x: 0, y: 0, width: 1200, height: 1060 }));
      const g = svgEl("g", { transform: "translate(10,90)" });
      d.items.filter((i) => i.floor === f.id && i.x != null && state.on.has(i.layer)).forEach((i) => {
        const L = layer(i.layer);
        const m = svgEl("g", { class: "hm-marker", tabindex: "0", role: "button", "aria-label": i.name });
        m.appendChild(svgEl("circle", { cx: i.x, cy: i.y, r: 26, fill: L.color, opacity: 0.25 }));
        m.appendChild(svgEl("circle", { cx: i.x, cy: i.y, r: 13, fill: L.color, stroke: "#fff", "stroke-width": 4 }));
        const tt = svgEl("title", {}); tt.textContent = i.name; m.appendChild(tt);
        m.addEventListener("click", () => showDetail(i));
        m.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); showDetail(i); } });
        g.appendChild(m);
      });
      svg.appendChild(g);
      box.appendChild(svg);
      fw.appendChild(box);
    });
  }

  fetch("data/items.json?v=" + ver)
    .then((r) => r.json())
    .then((d) => {
      state.data = d;
      const saved = loadOn();
      state.on = saved || new Set(d.layers.map((l) => l.id));
      render();
      root.dataset.ready = "1";
    })
    .catch((e) => {
      root.dataset.error = String(e);
      document.getElementById("hm-floors").textContent = "Couldn't load the map data.";
    });
})();
