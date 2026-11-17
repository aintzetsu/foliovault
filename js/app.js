/* ==========================================================================
   FolioVault — Main Application Controller (IndexedDB + Scan Studio + Inspector)
   ========================================================================== */

(function (global) {
  "use strict";

  const STORAGE_THEME = "foliovault_theme";
  const DB = global.FolioDB;
  const Samples = global.FolioSamples;

  function safeGet(key, fallback) {
    try {
      const v = global.localStorage.getItem(key);
      return v ? JSON.parse(v) : fallback;
    } catch (_err) {
      return fallback;
    }
  }

  function safeSet(key, val) {
    try {
      global.localStorage.setItem(key, JSON.stringify(val));
    } catch (_err) {
      // Ignore storage error
    }
  }

  const state = {
    theme: safeGet(STORAGE_THEME, "light"),
    docs: [],
    folder: "all",
    search: "",
    sort: "newest",
    view: "grid", // "grid" | "list"
    activeDocId: null,
    inspectorZoom: 100,
    inspectorRotate: 0,
    pendingPdfUrl: null,
    webcamStream: null
  };

  let scanner = null;
  const dom = {};

  function cacheDom() {
    dom.sidebar = document.getElementById("sidebar");
    dom.mobileNavBtn = document.getElementById("mobile-nav-btn");
    dom.folderList = document.getElementById("folder-list");
    dom.storageSummary = document.getElementById("storage-summary");
    dom.resetVaultBtn = document.getElementById("reset-vault-btn");

    dom.searchInput = document.getElementById("search-input");
    dom.themeToggle = document.getElementById("theme-toggle");
    dom.openStudioBtn = document.getElementById("open-studio-btn");
    dom.dropzone = document.getElementById("dropzone");
    dom.fileInput = document.getElementById("file-input");
    dom.browseBtn = document.getElementById("browse-file-btn");
    dom.sampleScanBtn = document.getElementById("sample-scan-btn");

    dom.folderHeading = document.getElementById("folder-heading");
    dom.docCountBadge = document.getElementById("doc-count-badge");
    dom.sortSelect = document.getElementById("sort-select");
    dom.viewBtns = document.querySelectorAll("[data-view]");
    dom.docGrid = document.getElementById("doc-grid");
    dom.docTableWrap = document.getElementById("doc-table-wrap");
    dom.docTableBody = document.getElementById("doc-table-body");
    dom.emptyState = document.getElementById("empty-state");

    // Scan Studio Modal
    dom.studioModal = document.getElementById("studio-modal");
    dom.closeStudioBtn = document.getElementById("close-studio-btn");
    dom.studioCanvas = document.getElementById("studio-canvas");
    dom.studioCanvasWrap = document.getElementById("studio-canvas-wrap");
    dom.webcamBox = document.getElementById("webcam-box");
    dom.webcamVideo = document.getElementById("webcam-video");
    dom.captureFrameBtn = document.getElementById("capture-frame-btn");
    dom.cancelCamBtn = document.getElementById("cancel-cam-btn");
    dom.loadCamBtn = document.getElementById("studio-webcam-btn");
    dom.loadCrookedBtn = document.getElementById("studio-crooked-btn");
    dom.rotate90Btn = document.getElementById("studio-rotate-btn");
    dom.presetBtns = document.querySelectorAll("[data-scan-filter]");
    dom.brightnessSlider = document.getElementById("scan-brightness");
    dom.contrastSlider = document.getElementById("scan-contrast");
    dom.deskewSlider = document.getElementById("scan-deskew");
    dom.brightnessVal = document.getElementById("val-brightness");
    dom.contrastVal = document.getElementById("val-contrast");
    dom.deskewVal = document.getElementById("val-deskew");
    dom.studioForm = document.getElementById("studio-form");

    // Inspector Lightbox Modal
    dom.inspectorModal = document.getElementById("inspector-modal");
    dom.closeInspectorBtn = document.getElementById("close-inspector-btn");
    dom.inspectorImg = document.getElementById("inspector-img");
    dom.inspectorSerial = document.getElementById("inspector-serial");
    dom.zoomOutBtn = document.getElementById("zoom-out-btn");
    dom.zoomInBtn = document.getElementById("zoom-in-btn");
    dom.zoomLabel = document.getElementById("zoom-label");
    dom.inspectorRotateBtn = document.getElementById("inspector-rotate-btn");
    dom.inspectorForm = document.getElementById("inspector-form");
    dom.copyOcrBtn = document.getElementById("copy-ocr-btn");
    dom.downloadDocBtn = document.getElementById("download-doc-btn");
    dom.deleteDocBtn = document.getElementById("delete-doc-btn");

    dom.toast = document.getElementById("toast");
  }

  function showToast(msg) {
    if (!dom.toast) return;
    dom.toast.textContent = msg;
    dom.toast.hidden = false;
    clearTimeout(dom.toast._timer);
    dom.toast._timer = setTimeout(function () {
      dom.toast.hidden = true;
    }, 2400);
  }

  function applyTheme(theme) {
    state.theme = theme === "dark" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", state.theme);
    safeSet(STORAGE_THEME, state.theme);
    if (dom.themeToggle) {
      dom.themeToggle.textContent = state.theme === "dark" ? "Light Vault" : "Dark Vault";
    }
  }

  function countForFolder(folderId) {
    if (folderId === "all") return state.docs.length;
    if (folderId === "starred") {
      return state.docs.filter(function (d) { return d.starred; }).length;
    }
    return state.docs.filter(function (d) { return d.category === folderId; }).length;
  }

  function renderFolders() {
    dom.folderList.innerHTML = "";
    Samples.FOLDERS.forEach(function (f) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "folder-btn" + (state.folder === f.id ? " is-active" : "");
      btn.setAttribute("aria-pressed", String(state.folder === f.id));

      const lbl = document.createElement("span");
      lbl.textContent = f.label;
      const cnt = document.createElement("span");
      cnt.className = "folder-count";
      cnt.textContent = String(countForFolder(f.id));

      btn.appendChild(lbl);
      btn.appendChild(cnt);
      btn.addEventListener("click", function () {
        state.folder = f.id;
        dom.folderHeading.textContent = f.label;
        renderFolders();
        renderVault();
        if (dom.sidebar) dom.sidebar.classList.remove("is-open");
      });
      dom.folderList.appendChild(btn);
    });

    if (dom.storageSummary) {
      dom.storageSummary.textContent = state.docs.length + " scans stored locally";
    }
  }

  function getVisibleDocs() {
    const q = state.search.trim().toLowerCase();
    return state.docs
      .filter(function (doc) {
        const folderOk =
          state.folder === "all" ||
          (state.folder === "starred" ? doc.starred : doc.category === state.folder);
        if (!folderOk) return false;
        if (!q) return true;
        return (
          doc.title.toLowerCase().includes(q) ||
          (doc.issuer || "").toLowerCase().includes(q) ||
          (doc.ocrText || "").toLowerCase().includes(q) ||
          doc.id.toLowerCase().includes(q) ||
          (doc.tags || []).some(function (t) { return t.toLowerCase().includes(q); })
        );
      })
      .slice()
      .sort(function (a, b) {
        if (state.sort === "oldest") return (a.createdAt || 0) - (b.createdAt || 0);
        if (state.sort === "title") return a.title.localeCompare(b.title);
        return (b.createdAt || 0) - (a.createdAt || 0);
      });
  }

  async function toggleStar(docId) {
    const doc = state.docs.find(function (d) { return d.id === docId; });
    if (!doc) return;
    doc.starred = !doc.starred;
    await DB.saveDoc(doc);
    renderFolders();
    renderVault();
  }

  function renderVault() {
    const docs = getVisibleDocs();
    dom.docCountBadge.textContent = docs.length + " file" + (docs.length === 1 ? "" : "s");

    const isEmpty = docs.length === 0;
    dom.emptyState.hidden = !isEmpty;
    dom.docGrid.hidden = isEmpty || state.view !== "grid";
    dom.docTableWrap.hidden = isEmpty || state.view !== "list";

    if (isEmpty) return;

    if (state.view === "grid") {
      dom.docGrid.innerHTML = "";
      docs.forEach(function (doc) {
        const card = document.createElement("article");
        card.className = "doc-card";
        card.tabIndex = 0;
        card.addEventListener("click", function () { openInspector(doc.id); });
        card.addEventListener("keydown", function (ev) {
          if (ev.key === "Enter" || ev.key === " ") {
            ev.preventDefault();
            openInspector(doc.id);
          }
        });

        const prev = document.createElement("div");
        prev.className = "doc-card__preview";
        const img = document.createElement("img");
        img.src = doc.imageUrl;
        img.alt = doc.title;
        prev.appendChild(img);

        const head = document.createElement("div");
        head.className = "doc-card__head";
        const title = document.createElement("h3");
        title.className = "doc-card__title";
        title.textContent = doc.title;

        const star = document.createElement("button");
        star.type = "button";
        star.className = "star-btn" + (doc.starred ? " is-starred" : "");
        star.setAttribute("aria-label", doc.starred ? "Unstar document" : "Star document");
        star.textContent = doc.starred ? "★" : "☆";
        star.addEventListener("click", function (ev) {
          ev.stopPropagation();
          toggleStar(doc.id);
        });

        head.appendChild(title);
        head.appendChild(star);

        const meta = document.createElement("div");
        meta.className = "doc-card__meta";
        const issuer = document.createElement("span");
        issuer.textContent = (doc.issuer || "Uploaded Scan") + " · " + (doc.docDate || "");
        const stamp = document.createElement("span");
        stamp.className = "stamp-pill";
        stamp.textContent = doc.pdfUrl ? "PDF" : "OCR";
        meta.appendChild(issuer);
        meta.appendChild(stamp);

        const tags = document.createElement("div");
        tags.className = "tag-row";
        (doc.tags || []).slice(0, 3).forEach(function (t) {
          const span = document.createElement("span");
          span.className = "tag";
          span.textContent = "#" + t;
          tags.appendChild(span);
        });

        card.appendChild(prev);
        card.appendChild(head);
        card.appendChild(meta);
        card.appendChild(tags);
        dom.docGrid.appendChild(card);
      });
    } else {
      dom.docTableBody.innerHTML = "";
      docs.forEach(function (doc) {
        const tr = document.createElement("tr");
        tr.addEventListener("click", function () { openInspector(doc.id); });

        const c1 = document.createElement("td");
        c1.className = "mono";
        c1.textContent = doc.id;

        const c2 = document.createElement("td");
        c2.textContent = doc.title;

        const c3 = document.createElement("td");
        c3.textContent = doc.issuer || "—";

        const c4 = document.createElement("td");
        c4.className = "mono";
        c4.textContent = doc.docDate || "—";

        const c5 = document.createElement("td");
        const pill = document.createElement("span");
        pill.className = "stamp-pill";
        pill.textContent = doc.category;
        c5.appendChild(pill);

        tr.appendChild(c1);
        tr.appendChild(c2);
        tr.appendChild(c3);
        tr.appendChild(c4);
        tr.appendChild(c5);
        dom.docTableBody.appendChild(tr);
      });
    }
  }

  /* ------------------------------------------------------------------------
     Scan & Enhancement Studio
     ------------------------------------------------------------------------ */
  function syncStudioSlidersToUi() {
    const p = scanner.getParams();
    dom.brightnessSlider.value = String(p.brightness);
    dom.contrastSlider.value = String(p.contrast);
    dom.deskewSlider.value = String(p.deskew);
    dom.brightnessVal.textContent = String(p.brightness);
    dom.contrastVal.textContent = String(p.contrast);
    dom.deskewVal.textContent = p.deskew.toFixed(1) + "°";

    dom.presetBtns.forEach(function (btn) {
      const active = btn.dataset.scanFilter === p.filter;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-pressed", String(active));
    });
  }

  function stopWebcam() {
    if (state.webcamStream) {
      state.webcamStream.getTracks().forEach(function (t) { t.stop(); });
      state.webcamStream = null;
    }
    if (dom.webcamBox) dom.webcamBox.hidden = true;
    if (dom.studioCanvasWrap) dom.studioCanvasWrap.hidden = false;
  }

  async function openStudioWithImage(dataUrl, defaults) {
    stopWebcam();
    state.pendingPdfUrl = null;
    dom.studioForm.reset();

    const today = new Date().toISOString().slice(0, 10);
    dom.studioForm.elements.title.value = (defaults && defaults.title) || "Scanned Document " + today;
    dom.studioForm.elements.category.value = (defaults && defaults.category) || "receipts";
    dom.studioForm.elements.docDate.value = (defaults && defaults.docDate) || today;
    dom.studioForm.elements.issuer.value = (defaults && defaults.issuer) || "";
    dom.studioForm.elements.tags.value = (defaults && defaults.tags) || "scan, archive";
    dom.studioForm.elements.ocrText.value = (defaults && defaults.ocrText) || "";

    if (defaults && defaults.rawMode) {
      scanner.setParams({ filter: "original", brightness: 0, contrast: 0, deskew: 0, rotate90: 0 });
    } else {
      scanner.resetParams();
    }
    syncStudioSlidersToUi();

    await scanner.loadDataUrl(dataUrl);
    dom.studioModal.classList.add("is-open");
    dom.studioModal.setAttribute("aria-hidden", "false");
  }

  function closeStudio() {
    stopWebcam();
    dom.studioModal.classList.remove("is-open");
    dom.studioModal.setAttribute("aria-hidden", "true");
  }

  function buildPdfPlaceholder(fileName, sizeBytes) {
    const c = document.createElement("canvas");
    c.width = 640;
    c.height = 820;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#faf8f4";
    ctx.fillRect(0, 0, 640, 820);
    ctx.strokeStyle = "#c84b24";
    ctx.lineWidth = 4;
    ctx.strokeRect(48, 48, 544, 724);
    ctx.fillStyle = "#c84b24";
    ctx.font = "700 28px monospace";
    ctx.fillText("PDF ARCHIVE", 88, 130);
    ctx.fillStyle = "#17211d";
    ctx.font = "600 20px sans-serif";
    ctx.fillText(fileName.slice(0, 34), 88, 190);
    ctx.fillStyle = "#6c7771";
    ctx.font = "15px monospace";
    ctx.fillText("SIZE: " + Math.max(1, Math.round(sizeBytes / 1024)) + " KB", 88, 230);
    ctx.fillText("INDEXED IN BROWSER VAULT", 88, 260);
    return c.toDataURL("image/png");
  }

  function handleUploadedFile(file) {
    if (!file) return;
    const reader = new FileReader();

    if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
      reader.onload = async function () {
        const cover = buildPdfPlaceholder(file.name, file.size);
        await openStudioWithImage(cover, {
          title: file.name.replace(/\.pdf$/i, ""),
          category: "legal",
          issuer: "PDF Upload",
          tags: "pdf, document",
          ocrText: "Stored PDF Document: " + file.name + " (" + Math.round(file.size / 1024) + " KB)."
        });
        state.pendingPdfUrl = reader.result;
      };
      reader.readAsDataURL(file);
      return;
    }

    if (file.type.startsWith("image/")) {
      reader.onload = function () {
        openStudioWithImage(reader.result, {
          title: file.name.replace(/\.[^.]+$/, ""),
          category: "receipts",
          tags: "scanned, upload",
          rawMode: true
        });
      };
      reader.readAsDataURL(file);
      return;
    }

    showToast("Please upload an image (PNG/JPG/WebP) or PDF file.");
  }

  /* ------------------------------------------------------------------------
     Inspector Lightbox
     ------------------------------------------------------------------------ */
  function updateInspectorTransform() {
    dom.inspectorImg.style.transform =
      "scale(" + (state.inspectorZoom / 100) + ") rotate(" + state.inspectorRotate + "deg)";
    dom.zoomLabel.textContent = state.inspectorZoom + "%";
  }

  function openInspector(docId) {
    const doc = state.docs.find(function (d) { return d.id === docId; });
    if (!doc) return;
    state.activeDocId = doc.id;
    state.inspectorZoom = 100;
    state.inspectorRotate = 0;

    dom.inspectorSerial.textContent = doc.id + " · " + (doc.pdfUrl ? "PDF" : "IMAGE SCAN");
    dom.inspectorImg.src = doc.imageUrl;
    dom.inspectorImg.alt = doc.title;
    updateInspectorTransform();
    dom.inspectorForm.elements.title.value = doc.title;
    dom.inspectorForm.elements.category.value = doc.category;
    dom.inspectorForm.elements.docDate.value = doc.docDate || "";
    dom.inspectorForm.elements.issuer.value = doc.issuer || "";
    dom.inspectorForm.elements.tags.value = (doc.tags || []).join(", ");
    dom.inspectorForm.elements.ocrText.value = doc.ocrText || "";

    dom.inspectorModal.classList.add("is-open");
    dom.inspectorModal.setAttribute("aria-hidden", "false");
  }

  function closeInspector() {
    dom.inspectorModal.classList.remove("is-open");
    dom.inspectorModal.setAttribute("aria-hidden", "true");
    state.activeDocId = null;
  }

  /* ------------------------------------------------------------------------
     Event Bindings
     ------------------------------------------------------------------------ */
  function bindEvents() {
    if (dom.mobileNavBtn && dom.sidebar) {
      dom.mobileNavBtn.addEventListener("click", function () {
        dom.sidebar.classList.toggle("is-open");
      });
    }

    dom.themeToggle.addEventListener("click", function () {
      applyTheme(state.theme === "dark" ? "light" : "dark");
    });

    dom.searchInput.addEventListener("input", function () {
      state.search = dom.searchInput.value;
      renderVault();
    });

    dom.sortSelect.addEventListener("change", function () {
      state.sort = dom.sortSelect.value;
      renderVault();
    });

    dom.viewBtns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.view = btn.dataset.view;
        dom.viewBtns.forEach(function (b) {
          const active = b === btn;
          b.classList.toggle("is-active", active);
          b.setAttribute("aria-pressed", String(active));
        });
        renderVault();
      });
    });

    dom.browseBtn.addEventListener("click", function () { dom.fileInput.click(); });
    dom.openStudioBtn.addEventListener("click", function () {
      openStudioWithImage(Samples.generateCrookedCameraPhoto(), {
        title: "Solstice Coffee Receipt (Camera Scan)",
        category: "receipts",
        issuer: "Solstice Coffee Roasters",
        tags: "receipt, tax, expense",
        ocrText: "SOLSTICE COFFEE ROASTERS #4910. Subtotal $108.50. Sales Tax $9.22. TOTAL PAID $117.72.",
        rawMode: true
      });
    });

    dom.sampleScanBtn.addEventListener("click", function () {
      dom.openStudioBtn.click();
    });

    dom.fileInput.addEventListener("change", function () {
      if (dom.fileInput.files && dom.fileInput.files[0]) {
        handleUploadedFile(dom.fileInput.files[0]);
        dom.fileInput.value = "";
      }
    });

    dom.dropzone.addEventListener("dragover", function (ev) {
      ev.preventDefault();
      dom.dropzone.classList.add("is-drag-over");
    });
    dom.dropzone.addEventListener("dragleave", function () {
      dom.dropzone.classList.remove("is-drag-over");
    });
    dom.dropzone.addEventListener("drop", function (ev) {
      ev.preventDefault();
      dom.dropzone.classList.remove("is-drag-over");
      if (ev.dataTransfer.files && ev.dataTransfer.files[0]) {
        handleUploadedFile(ev.dataTransfer.files[0]);
      }
    });

    // Studio Filter Controls
    dom.presetBtns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        const filter = btn.dataset.scanFilter;
        const patch = { filter: filter };
        if (filter === "magic") {
          patch.contrast = 20;
          patch.brightness = 8;
        } else if (filter === "original") {
          patch.contrast = 0;
          patch.brightness = 0;
        }
        scanner.setParams(patch);
        syncStudioSlidersToUi();
      });
    });

    dom.brightnessSlider.addEventListener("input", function () {
      scanner.setParams({ brightness: Number(dom.brightnessSlider.value) });
      syncStudioSlidersToUi();
    });
    dom.contrastSlider.addEventListener("input", function () {
      scanner.setParams({ contrast: Number(dom.contrastSlider.value) });
      syncStudioSlidersToUi();
    });
    dom.deskewSlider.addEventListener("input", function () {
      scanner.setParams({ deskew: Number(dom.deskewSlider.value) });
      syncStudioSlidersToUi();
    });

    dom.rotate90Btn.addEventListener("click", function () {
      const nextRot = (scanner.getParams().rotate90 + 90) % 360;
      scanner.setParams({ rotate90: nextRot });
    });

    dom.loadCrookedBtn.addEventListener("click", function () {
      openStudioWithImage(Samples.generateCrookedCameraPhoto(), {
        title: "Solstice Coffee Receipt (Camera Scan)",
        category: "receipts",
        issuer: "Solstice Coffee Roasters",
        tags: "receipt, tax, expense",
        ocrText: "SOLSTICE COFFEE ROASTERS #4910. Subtotal $108.50. Sales Tax $9.22. TOTAL PAID $117.72.",
        rawMode: true
      });
    });

    dom.loadCamBtn.addEventListener("click", async function () {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showToast("Camera API unavailable in this browser.");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        state.webcamStream = stream;
        dom.webcamVideo.srcObject = stream;
        dom.studioCanvasWrap.hidden = true;
        dom.webcamBox.hidden = false;
      } catch (_err) {
        showToast("Camera permission denied or no camera found.");
      }
    });

    dom.captureFrameBtn.addEventListener("click", async function () {
      if (!state.webcamStream) return;
      const temp = document.createElement("canvas");
      temp.width = dom.webcamVideo.videoWidth || 800;
      temp.height = dom.webcamVideo.videoHeight || 600;
      temp.getContext("2d").drawImage(dom.webcamVideo, 0, 0, temp.width, temp.height);
      const dataUrl = temp.toDataURL("image/png");
      stopWebcam();
      await scanner.loadDataUrl(dataUrl);
      showToast("Captured frame—adjust filters and save!");
    });

    dom.cancelCamBtn.addEventListener("click", stopWebcam);
    dom.closeStudioBtn.addEventListener("click", closeStudio);
    dom.studioModal.addEventListener("click", function (ev) {
      if (ev.target === dom.studioModal) closeStudio();
    });

    dom.studioForm.addEventListener("submit", async function (ev) {
      ev.preventDefault();
      const fd = new FormData(dom.studioForm);
      const title = String(fd.get("title") || "").trim() || "Untitled Scan";
      const tagsRaw = String(fd.get("tags") || "");
      const tags = tagsRaw.split(",").map(function (t) { return t.trim(); }).filter(Boolean);

      const newDoc = {
        id: "FV-2026-" + String(100 + Math.floor(Math.random() * 899)),
        title: title,
        category: String(fd.get("category") || "receipts"),
        docDate: String(fd.get("docDate") || new Date().toISOString().slice(0, 10)),
        issuer: String(fd.get("issuer") || "").trim() || "Scanned Upload",
        tags: tags,
        starred: false,
        fileType: state.pendingPdfUrl ? "application/pdf" : "image/jpeg",
        imageUrl: scanner.exportDataUrl(),
        pdfUrl: state.pendingPdfUrl || null,
        ocrText: String(fd.get("ocrText") || "").trim(),
        createdAt: Date.now()
      };

      await DB.saveDoc(newDoc);
      state.docs.unshift(newDoc);
      state.pendingPdfUrl = null;
      closeStudio();
      renderFolders();
      renderVault();
      showToast("Saved " + newDoc.id + " to IndexedDB Vault");
    });

    // Inspector Controls
    dom.closeInspectorBtn.addEventListener("click", closeInspector);
    dom.inspectorModal.addEventListener("click", function (ev) {
      if (ev.target === dom.inspectorModal) closeInspector();
    });
    dom.zoomInBtn.addEventListener("click", function () {
      state.inspectorZoom = Math.min(200, state.inspectorZoom + 25);
      updateInspectorTransform();
    });
    dom.zoomOutBtn.addEventListener("click", function () {
      state.inspectorZoom = Math.max(50, state.inspectorZoom - 25);
      updateInspectorTransform();
    });
    dom.inspectorRotateBtn.addEventListener("click", function () {
      state.inspectorRotate = (state.inspectorRotate + 90) % 360;
      updateInspectorTransform();
    });

    dom.copyOcrBtn.addEventListener("click", function () {
      const txt = dom.inspectorForm.elements.ocrText.value;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(txt).then(function () {
          showToast("Copied extracted OCR text");
        }).catch(function () {});
      }
    });

    dom.inspectorForm.addEventListener("submit", async function (ev) {
      ev.preventDefault();
      const doc = state.docs.find(function (d) { return d.id === state.activeDocId; });
      if (!doc) return;
      const fd = new FormData(dom.inspectorForm);
      doc.title = String(fd.get("title") || "").trim() || doc.title;
      doc.category = String(fd.get("category") || doc.category);
      doc.docDate = String(fd.get("docDate") || "");
      doc.issuer = String(fd.get("issuer") || "").trim();
      doc.tags = String(fd.get("tags") || "").split(",").map(function (t) { return t.trim(); }).filter(Boolean);
      doc.ocrText = String(fd.get("ocrText") || "").trim();

      await DB.saveDoc(doc);
      renderFolders();
      renderVault();
      showToast("Updated " + doc.id);
    });

    dom.downloadDocBtn.addEventListener("click", function () {
      const doc = state.docs.find(function (d) { return d.id === state.activeDocId; });
      if (!doc) return;
      const a = document.createElement("a");
      a.href = doc.pdfUrl || doc.imageUrl;
      a.download = doc.id + (doc.pdfUrl ? ".pdf" : ".png");
      document.body.appendChild(a);
      a.click();
      a.remove();
      showToast("Downloaded " + a.download);
    });

    dom.deleteDocBtn.addEventListener("click", async function () {
      if (!state.activeDocId) return;
      const id = state.activeDocId;
      await DB.deleteDoc(id);
      state.docs = state.docs.filter(function (d) { return d.id !== id; });
      closeInspector();
      renderFolders();
      renderVault();
      showToast("Deleted " + id);
    });

    dom.resetVaultBtn.addEventListener("click", async function () {
      await DB.clearAllDocs();
      const seeds = Samples.createSeedDocuments();
      for (let i = 0; i < seeds.length; i++) {
        await DB.saveDoc(seeds[i]);
      }
      state.docs = seeds;
      renderFolders();
      renderVault();
      showToast("Restored 4 sample archival scans");
    });

    document.addEventListener("keydown", function (ev) {
      if (ev.key === "Escape") {
        closeStudio();
        closeInspector();
      }
    });
  }

  async function init() {
    cacheDom();
    applyTheme(state.theme);
    scanner = global.FolioScanner.create(dom.studioCanvas);

    let stored = await DB.getAllDocs();
    if (!stored || stored.length === 0) {
      stored = Samples.createSeedDocuments();
      for (let i = 0; i < stored.length; i++) {
        await DB.saveDoc(stored[i]);
      }
    }
    state.docs = stored;

    renderFolders();
    renderVault();
    bindEvents();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})(window);
