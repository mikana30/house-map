// Interactive floor plans: layer legend, markers, detail panel, and an edit mode.
// Data: data/items.json. Plans: img/floorplan/<floor>-rooms.svg (viewBox 0 0 1200 1060,
// plan drawn inside translate(10,90) in floor-plan units).
// Edit mode appears only when the tailnet-only save service on uriel answers.
(function () {
  const FLOORS = [
    { id: "main", name: "Main floor", svg: "img/floorplan/main-rooms.svg" },
    { id: "second", name: "Second floor", svg: "img/floorplan/second-rooms.svg" },
    { id: "basement", name: "Basement", svg: "img/floorplan/basement-rooms.svg" },
  ];
  const EDITOR = "https://uriel.tailff829b.ts.net:8446";
  const NS = "http://www.w3.org/2000/svg";
  const root = document.getElementById("hm-app");
  if (!root) return;
  const ver = root.dataset.v || "";
  // pending: {kind:"new"} | {kind:"move", item} -- what the next tap on a plan does
  const state = { data: null, on: new Set(), canEdit: false, editing: false, pending: null, draft: null, previews: {} };

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
  function roomAt(floor, x, y) {
    const rooms = (state.rooms || {})[floor] || [];
    for (const r of rooms) {
      const p = r.poly; let inside = false;
      for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
        const [x1, y1] = p[i], [x2, y2] = p[j];
        if ((y1 > y) !== (y2 > y) && x < (x2 - x1) * (y - y1) / (y2 - y1) + x1) inside = !inside;
      }
      if (inside) return r.name;
    }
    return null;
  }
  function where(floor, x, y) {
    if (!floor) return "No spot on the map yet";
    const r = x != null ? roomAt(floor, x, y) : null;
    return floorName(floor) + (r ? " · " + r : "");
  }
  function layer(id) { return state.data.layers.find((l) => l.id === id) || { name: id, color: "#555" }; }
  function floorName(id) { const f = FLOORS.find((x) => x.id === id); return f ? f.name : "Location not recorded yet"; }
  function panel() { return document.getElementById("hm-detail"); }
  function closePanel() { panel().hidden = true; state.draft = null; if (state.pending && state.pending.kind === "new") state.pending = null; render(); }

  function panelHeader(p, kicker, color, title) {
    p.innerHTML = "";
    const close = el("button", { class: "hm-close", type: "button", "aria-label": "Close" }, "×");
    close.onclick = closePanel;
    p.appendChild(close);
    p.appendChild(el("div", { class: "hm-kicker", style: "color:" + color }, kicker));
    p.appendChild(el("h3", {}, title));
  }

  function showDetail(item) {
    if (state.editing) return showForm(item);
    const p = panel();
    const L = layer(item.layer);
    panelHeader(p, L.name, L.color, item.name);
    p.appendChild(el("p", { class: "hm-where" }, floorName(item.floor)));
    const src = state.previews[item.id] || item.photo;
    if (src) {
      const a = el("a", { href: src, target: "_blank", rel: "noopener" });
      a.appendChild(el("img", { src: src, alt: "Photo of " + item.name, loading: "lazy" }));
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

  function shrink(file) {
    return new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onerror = rej;
      fr.onload = () => {
        const img = new Image();
        img.onerror = () => res(fr.result);
        img.onload = () => {
          const s = Math.min(1, 1800 / Math.max(img.width, img.height));
          const c = document.createElement("canvas");
          c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
          c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
          res(c.toDataURL("image/jpeg", 0.85));
        };
        img.src = fr.result;
      };
      fr.readAsDataURL(file);
    });
  }

  async function send(body) {
    const r = await fetch(EDITOR + "/api/items", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.ok) throw new Error(j.error || ("save failed (" + r.status + ")"));
    return j;
  }

  // Add / edit form. item = existing item, or null for a new one (uses state.draft for the spot).
  // opts.prefill = {name, layer, notes} from Ask Claude; opts.placeAt = {floor,x,y} to place an existing item.
  function showForm(item, opts) {
    opts = opts || {};
    const p = panel();
    const isNew = !item;
    const spot = opts.placeAt || (isNew ? state.draft : item);
    panelHeader(p, isNew ? "Add to the map" : (opts.placeAt ? "Place on the map" : "Edit"), "#555", isNew ? "New item" : item.name);
    p.appendChild(el("p", { class: "hm-where" }, spot ? where(spot.floor, spot.x, spot.y) : "No spot on the map yet"));
    if (isNew) {
      const ask = el("div", { class: "hm-ask" });
      ask.appendChild(el("label", { for: "hm-ask-text" }, "Ask Claude"));
      const q = el("textarea", { id: "hm-ask-text", rows: "2", maxlength: "400", placeholder: "e.g. this is the main floor thermostat, fill in what you know" });
      const go = el("button", { type: "button", class: "hm-btn hm-primary" }, "Fill it in");
      const am = el("p", { class: "hm-msg", role: "status" });
      go.onclick = async () => {
        if (!q.value.trim()) { am.textContent = "Say what it is first."; return; }
        go.disabled = true; am.textContent = "Claude is looking it up in your notes… (usually 15–40 seconds)";
        try {
          const j = await send({ action: "ask", floor: spot.floor, x: spot.x, y: spot.y, text: q.value });
          const pr = j.proposal;
          const match = pr.match_id && state.data.items.find((i) => i.id === pr.match_id);
          if (match) showForm(match, { prefill: pr, placeAt: spot, note: "Claude matched this to an existing entry. Check it, then Save." });
          else showForm(null, { prefill: pr, note: "Claude filled this in from your notes. Check it, then Add." });
        } catch (e) { am.textContent = e.message; go.disabled = false; }
      };
      ask.appendChild(q);
      const r0 = el("div", { class: "hm-row" }); r0.appendChild(go); ask.appendChild(r0);
      ask.appendChild(am);
      p.appendChild(ask);
      p.appendChild(el("p", { class: "hm-sub" }, "Or fill it in yourself:"));
    }
    if (opts.note) p.appendChild(el("p", { class: "hm-note" }, opts.note));
    const pf = opts.prefill || {};
    const f = el("form", { class: "hm-form" });
    const name = el("input", { type: "text", required: "", maxlength: "80", placeholder: "e.g. Main breaker panel" });
    name.value = pf.name || (item ? item.name : "");
    const sel = el("select");
    state.data.layers.forEach((L) => { const o = el("option", { value: L.id }, L.name); sel.appendChild(o); });
    sel.value = pf.layer || (item ? item.layer : (state.data.layers[0] || {}).id);
    const notes = el("textarea", { rows: "4", maxlength: "2000", placeholder: "Brand, model, what it controls, anything useful" });
    notes.value = pf.notes != null ? pf.notes : (item ? item.notes || "" : "");
    const photo = el("input", { type: "file", accept: "image/*" });
    const lab = (t, inp) => { const l = el("label", {}, t); l.appendChild(inp); return l; };
    f.appendChild(lab("Name", name));
    f.appendChild(lab("Layer", sel));
    f.appendChild(lab("Notes", notes));
    f.appendChild(lab(item && item.photo ? "Replace photo" : "Photo (optional)", photo));
    const msg = el("p", { class: "hm-msg", role: "status" });
    const row = el("div", { class: "hm-row" });
    const saveB = el("button", { type: "submit", class: "hm-btn hm-primary" }, isNew ? "Add" : (opts.placeAt ? "Save here" : "Save"));
    row.appendChild(saveB);
    if (!isNew && !opts.placeAt) {
      const mv = el("button", { type: "button", class: "hm-btn" }, item.x == null ? "Place on map" : "Move");
      mv.onclick = () => { state.pending = { kind: "move", item }; p.hidden = true; render(); };
      row.appendChild(mv);
      const del = el("button", { type: "button", class: "hm-btn hm-danger" }, "Delete");
      let armed = false;
      del.onclick = async () => {
        if (!armed) { armed = true; del.textContent = "Tap again to delete"; return; }
        del.disabled = true; msg.textContent = "Deleting…";
        try {
          await send({ action: "delete", id: item.id });
          state.data.items = state.data.items.filter((i) => i.id !== item.id);
          p.hidden = true; render();
        } catch (e) { msg.textContent = e.message; del.disabled = false; }
      };
      row.appendChild(del);
    }
    f.appendChild(row);
    f.appendChild(msg);
    f.onsubmit = async (ev) => {
      ev.preventDefault();
      saveB.disabled = true; msg.textContent = "Saving…";
      try {
        const body = { action: isNew ? "add" : "update", id: item && item.id, name: name.value, layer: sel.value, notes: notes.value };
        if ((isNew || opts.placeAt) && spot) Object.assign(body, { floor: spot.floor, x: spot.x, y: spot.y });
        let preview = null;
        if (photo.files && photo.files[0]) { preview = await shrink(photo.files[0]); body.photo_b64 = preview; }
        const j = await send(body);
        if (preview) state.previews[j.item.id] = preview;   // live page catches up after GitHub rebuilds (~1 min)
        const i = state.data.items.findIndex((x) => x.id === j.item.id);
        if (i >= 0) state.data.items[i] = j.item; else state.data.items.push(j.item);
        state.on.add(j.item.layer);
        state.draft = null; state.pending = null;
        render();
        showForm(j.item);
        const m2 = panel().querySelector(".hm-msg");
        if (m2) m2.textContent = "Saved. It's on the public page within a minute or two.";
      } catch (e) { msg.textContent = e.message; saveB.disabled = false; }
    };
    p.appendChild(f);
    p.hidden = false;
    const qa = p.querySelector("#hm-ask-text");
    (qa || name).focus();
  }

  async function planTap(floor, x, y) {
    if (!state.editing) return;
    x = Math.round(x); y = Math.round(y);
    if (state.pending && state.pending.kind === "move") {
      const item = state.pending.item;
      state.pending = null;
      try {
        const j = await send({ action: "move", id: item.id, floor, x, y });
        const i = state.data.items.findIndex((v) => v.id === item.id);
        state.data.items[i] = j.item;
        render(); showForm(j.item);
      } catch (e) { banner("Couldn't move it: " + e.message); }
      return;
    }
    state.draft = { floor, x, y };
    render();
    showForm(null);
  }

  let bannerMsg = "";
  function banner(t) { bannerMsg = t; render(); }

  function render() {
    const d = state.data;
    const ctl = document.getElementById("hm-edit");
    ctl.innerHTML = "";
    if (state.canEdit) {
      const b = el("button", { type: "button", class: "hm-btn" + (state.editing ? " hm-primary" : "") }, state.editing ? "Done editing" : "Edit map");
      b.onclick = () => { state.editing = !state.editing; state.pending = null; state.draft = null; bannerMsg = ""; panel().hidden = true; render(); };
      ctl.appendChild(b);
      if (state.editing) {
        const t = state.pending && state.pending.kind === "move"
          ? "Tap the spot for “" + state.pending.item.name + "”."
          : (bannerMsg || "Tap a spot on any floor to add something there. Tap a marker to edit, move or delete it.");
        ctl.appendChild(el("span", { class: "hm-banner" }, t));
      }
    }
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
      const box = el("figure", { class: "hm-floor" + (state.editing ? " hm-editing" : "") });
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
        m.addEventListener("click", (e) => { e.stopPropagation(); showDetail(i); });
        m.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); showDetail(i); } });
        g.appendChild(m);
      });
      if (state.draft && state.draft.floor === f.id) {
        g.appendChild(svgEl("circle", { cx: state.draft.x, cy: state.draft.y, r: 15, fill: "#fff", stroke: "#111", "stroke-width": 4, "stroke-dasharray": "5 4" }));
      }
      svg.appendChild(g);
      svg.addEventListener("click", (e) => {
        if (!state.editing) return;
        const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
        const q = pt.matrixTransform(svg.getScreenCTM().inverse());
        planTap(f.id, q.x - 10, q.y - 90);
      });
      box.appendChild(svg);
      fw.appendChild(box);
    });
  }

  fetch("data/items.json?t=" + Date.now(), { cache: "no-store" })
    .then((r) => r.json())
    .then((d) => {
      state.data = d;
      fetch("data/rooms.json?v=" + ver).then((r) => r.json()).then((rm) => { state.rooms = rm; }).catch(() => {});
      const saved = loadOn();
      state.on = saved || new Set(d.layers.map((l) => l.id));
      render();
      root.dataset.ready = "1";
      const ctrl = new AbortController();
      setTimeout(() => ctrl.abort(), 4000);
      fetch(EDITOR + "/api/ping", { signal: ctrl.signal })
        .then((r) => r.json())
        .then((j) => { if (j.ok) { state.canEdit = true; root.dataset.canEdit = "1"; render(); } })
        .catch(() => {});
    })
    .catch((e) => {
      root.dataset.error = String(e);
      document.getElementById("hm-floors").textContent = "Couldn't load the map data.";
    });
})();
