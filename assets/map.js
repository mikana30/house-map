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
  const state = { data: null, on: new Set(), canEdit: false, editing: false, pending: null, draft: null, previews: {},
    sec: { exists: false, blob: null, unlocked: false, key: null, salt: null, iter: 600000, items: [] } };
  // Security layer: kept ENCRYPTED in data/security.enc.json (AES-GCM, key from the password by PBKDF2).
  // The password is written inside the security panel's door, so only someone standing there can unlock it.
  // The browser encrypts before anything is sent; the server and the public repo only ever see ciphertext.
  const SEC = { id: "security", name: "Security system", color: "#222" };
  const enc = new TextEncoder(), dec = new TextDecoder();
  const b64 = (u8) => btoa(String.fromCharCode(...u8));
  const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  async function deriveKey(pw, salt, iter) {
    const base = await crypto.subtle.importKey("raw", enc.encode(pw), "PBKDF2", false, ["deriveKey"]);
    return crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations: iter, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
  }
  async function unlockSec(pw) {
    const b = state.sec.blob;
    const salt = unb64(b.salt), key = await deriveKey(pw, salt, b.iter);
    const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(b.iv) }, key, unb64(b.ct));   // throws on a wrong password
    Object.assign(state.sec, { unlocked: true, key, salt, iter: b.iter, items: JSON.parse(dec.decode(pt)) });
  }
  async function saveSec() {
    const s = state.sec, iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, s.key, enc.encode(JSON.stringify(s.items))));
    const blob = { v: 1, kdf: "PBKDF2-SHA256", iter: s.iter, salt: b64(s.salt), iv: b64(iv), ct: b64(ct) };
    await send({ action: "save_secure", blob });
    s.blob = blob; s.exists = true;
  }
  function allItems() { return state.data.items.concat(state.sec.unlocked ? state.sec.items : []); }

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
    try { localStorage.setItem("hm-layers", JSON.stringify([...state.on].filter((x) => x !== "security"))); } catch (e) {}
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
  function layer(id) { return id === SEC.id ? SEC : (state.data.layers.find((l) => l.id === id) || { name: id, color: "#555" }); }
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

  function showUnlock() {
    const p = panel();
    panelHeader(p, "Locked layer", SEC.color, "Security system");
    p.appendChild(el("p", { class: "hm-note" }, "The password is written inside the security system's panel door. You need to be standing at the panel to read it."));
    const f = el("form", { class: "hm-form" });
    const pw = el("input", { type: "password", autocomplete: "off", required: "" });
    const l = el("label", {}, "Password"); l.appendChild(pw); f.appendChild(l);
    const msg = el("p", { class: "hm-msg", role: "status" });
    const row = el("div", { class: "hm-row" }); row.appendChild(el("button", { type: "submit", class: "hm-btn hm-primary" }, "Unlock")); f.appendChild(row); f.appendChild(msg);
    f.onsubmit = async (ev) => {
      ev.preventDefault(); msg.textContent = "Checking…";
      try { await unlockSec(pw.value); pw.value = ""; state.on.add(SEC.id); p.hidden = true; render(); }
      catch (e) { msg.textContent = "That password didn't work."; }
    };
    p.appendChild(f); p.hidden = false; pw.focus();
  }

  function showSetup() {
    const p = panel();
    panelHeader(p, "Set up", SEC.color, "Security system layer");
    p.appendChild(el("p", {}, "Choose a password for this layer. Everything on it is encrypted in this browser before it's saved; nobody can read it without the password, including the server."));
    p.appendChild(el("p", { class: "hm-note" }, "Use a long passphrase (four or more random words). Write it on a label inside the security panel's door. If it's lost, the layer's contents can't be recovered."));
    const f = el("form", { class: "hm-form" });
    const a = el("input", { type: "password", autocomplete: "new-password", required: "", minlength: "12" });
    const b = el("input", { type: "password", autocomplete: "new-password", required: "", minlength: "12" });
    const la = el("label", {}, "Password (12+ characters)"); la.appendChild(a); f.appendChild(la);
    const lb = el("label", {}, "Same password again"); lb.appendChild(b); f.appendChild(lb);
    const msg = el("p", { class: "hm-msg", role: "status" });
    const row = el("div", { class: "hm-row" }); row.appendChild(el("button", { type: "submit", class: "hm-btn hm-primary" }, "Create locked layer")); f.appendChild(row); f.appendChild(msg);
    f.onsubmit = async (ev) => {
      ev.preventDefault();
      if (a.value !== b.value) { msg.textContent = "The two don't match."; return; }
      msg.textContent = "Saving…";
      try {
        const salt = crypto.getRandomValues(new Uint8Array(16));
        Object.assign(state.sec, { salt, iter: 600000, key: await deriveKey(a.value, salt, 600000), items: [], unlocked: true });
        a.value = b.value = "";
        await saveSec();
        state.on.add(SEC.id); p.hidden = true; render();
      } catch (e) { state.sec.unlocked = false; msg.textContent = e.message; }
    };
    p.appendChild(f); p.hidden = false; a.focus();
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
    state.data.layers.concat(state.sec.unlocked ? [SEC] : []).forEach((L) => { const o = el("option", { value: L.id }, L.name); sel.appendChild(o); });
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
          if (item.layer === SEC.id) { state.sec.items = state.sec.items.filter((i) => i.id !== item.id); await saveSec(); }
          else { await send({ action: "delete", id: item.id }); state.data.items = state.data.items.filter((i) => i.id !== item.id); }
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
        const wantSec = sel.value === SEC.id, wasSec = !!item && item.layer === SEC.id;
        let preview = null;
        if (photo.files && photo.files[0]) preview = await shrink(photo.files[0]);
        const where0 = (isNew || opts.placeAt) && spot ? { floor: spot.floor, x: spot.x, y: spot.y } : (item ? { floor: item.floor, x: item.x, y: item.y } : {});
        if (wantSec) {
          // encrypted path: photo travels inside the encrypted blob, never as a public file
          let it = wasSec ? state.sec.items.find((i) => i.id === item.id) : null;
          if (!it) { it = { id: "sec-" + Math.random().toString(36).slice(2, 8), directory: [], photo: null }; state.sec.items.push(it); }
          Object.assign(it, { layer: SEC.id, name: name.value.trim(), notes: notes.value }, where0);
          if (preview) it.photo = preview;
          await saveSec();
          if (item && !wasSec) { await send({ action: "delete", id: item.id }); state.data.items = state.data.items.filter((i) => i.id !== item.id); }
          state.on.add(SEC.id); state.draft = null; state.pending = null;
          render(); showForm(it);
          const m3 = panel().querySelector(".hm-msg"); if (m3) m3.textContent = "Saved to the locked layer (encrypted).";
          return;
        }
        if (wasSec) { state.sec.items = state.sec.items.filter((i) => i.id !== item.id); await saveSec(); }
        const body = { action: (isNew || wasSec) ? "add" : "update", id: item && !wasSec ? item.id : undefined, name: name.value, layer: sel.value, notes: notes.value };
        if (isNew || opts.placeAt || wasSec) Object.assign(body, where0);
        if (preview) body.photo_b64 = preview;
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
        if (item.layer === SEC.id) {
          Object.assign(item, { floor, x, y }); await saveSec(); render(); showForm(item);
        } else {
          const j = await send({ action: "move", id: item.id, floor, x, y });
          const i = state.data.items.findIndex((v) => v.id === item.id);
          state.data.items[i] = j.item;
          render(); showForm(j.item);
        }
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
    {
      const lab = el("div", { class: "hm-layer hm-sec" });
      if (state.sec.unlocked) {
        const cb = el("input", { type: "checkbox", id: "hm-sec-cb" });
        cb.checked = state.on.has(SEC.id);
        cb.onchange = () => { cb.checked ? state.on.add(SEC.id) : state.on.delete(SEC.id); render(); };
        const l2 = el("label", { for: "hm-sec-cb", class: "hm-layer" });
        l2.appendChild(cb); l2.appendChild(el("span", { class: "hm-dot", style: "background:" + SEC.color }));
        l2.appendChild(document.createTextNode(" " + SEC.name + " (" + state.sec.items.length + ", unlocked)"));
        lab.appendChild(l2);
        const lock = el("button", { type: "button", class: "hm-btn" }, "Lock");
        lock.onclick = () => { Object.assign(state.sec, { unlocked: false, key: null, items: [] }); state.on.delete(SEC.id); panel().hidden = true; render(); };
        lab.appendChild(lock);
      } else if (state.sec.exists) {
        lab.appendChild(el("span", { class: "hm-dot", style: "background:" + SEC.color }));
        lab.appendChild(document.createTextNode(" " + SEC.name + " (locked) "));
        const u = el("button", { type: "button", class: "hm-btn" }, "Unlock");
        u.onclick = showUnlock;
        lab.appendChild(u);
      } else if (state.editing) {
        lab.appendChild(el("span", { class: "hm-dot", style: "background:" + SEC.color }));
        lab.appendChild(document.createTextNode(" " + SEC.name + " (not set up) "));
        const u = el("button", { type: "button", class: "hm-btn" }, "Set up");
        u.onclick = showSetup;
        lab.appendChild(u);
      }
      if (lab.childNodes.length) leg.appendChild(lab);
    }
    // unplaced list
    const un = document.getElementById("hm-unplaced");
    un.innerHTML = "";
    const unplaced = allItems().filter((i) => state.on.has(i.layer) && (i.x == null || !i.floor));
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
      allItems().filter((i) => i.floor === f.id && i.x != null && state.on.has(i.layer)).forEach((i) => {
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
      fetch("data/security.enc.json?t=" + Date.now(), { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((b) => { if (b && b.ct) { state.sec.exists = true; state.sec.blob = b; render(); } })
        .catch(() => {});
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
