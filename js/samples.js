/* ==========================================================================
   FolioVault — Procedural Realistic Paper Scan & Crooked Photo Generator
   ========================================================================== */

(function (global) {
  "use strict";

  const FOLDERS = [
    { id: "all", label: "All Documents" },
    { id: "identity", label: "Identity & Travel" },
    { id: "legal", label: "Legal & Contracts" },
    { id: "receipts", label: "Receipts & Tax" },
    { id: "medical", label: "Medical" },
    { id: "starred", label: "Starred" }
  ];

  function createPaperCanvas(w, h, bg) {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d");
    ctx.fillStyle = bg || "#f8f6f0";
    ctx.fillRect(0, 0, w, h);

    // Subtle paper grain dots
    ctx.fillStyle = "rgba(23, 33, 29, 0.03)";
    for (let i = 0; i < 450; i++) {
      const x = (i * 73) % w;
      const y = (i * 137) % h;
      ctx.fillRect(x, y, 2, 2);
    }
    return { canvas: c, ctx: ctx };
  }

  function drawStamp(ctx, text, x, y, color, angle) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle || -0.14);
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.strokeRect(-72, -20, 144, 40);
    ctx.fillStyle = color;
    ctx.font = "700 15px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 0, 1);
    ctx.restore();
  }

  function buildLeaseScan() {
    const p = createPaperCanvas(720, 940, "#faf8f3");
    const ctx = p.ctx;

    // Punch holes on left margin
    ctx.fillStyle = "#dcd6ca";
    [180, 470, 760].forEach(function (py) {
      ctx.beginPath();
      ctx.arc(28, py, 10, 0, Math.PI * 2);
      ctx.fill();
    });

    // Fold crease line across middle
    ctx.strokeStyle = "rgba(23, 33, 29, 0.08)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 470);
    ctx.lineTo(720, 470);
    ctx.stroke();

    ctx.fillStyle = "#17211d";
    ctx.font = "700 22px Georgia, serif";
    ctx.fillText("COMMERCIAL STUDIO LEASE AGREEMENT", 70, 90);
    ctx.font = "500 13px monospace";
    ctx.fillStyle = "#5c6660";
    ctx.fillText("DOC REF: KESTREL-BERLIN-2026-09 · PAGE 01 / 04", 70, 118);

    ctx.strokeStyle = "#17211d";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(70, 136);
    ctx.lineTo(650, 136);
    ctx.stroke();

    const lines = [
      "PARTIES: Kestrel Properties GmbH (Landlord) & Elena Sato Studio (Tenant).",
      "PREMISES: Suite 4B, Torstrasse 112, 10119 Berlin, Germany (142 sq meters).",
      "TERM: 24 Months commencing 2026-09-01 through 2028-08-31.",
      "MONTHLY BASE RENT: EUR 2,450.00 payable on the 1st of each calendar month.",
      "SECURITY DEPOSIT: EUR 4,900.00 held in segregated escrow account.",
      "",
      "CLAUSE 4.2 — ACOUSTIC & STUDIO MODIFICATIONS:",
      "Tenant is authorized to install removable acoustic wall panels and studio",
      "monitoring hardware provided structural load-bearing walls remain intact.",
      "",
      "CLAUSE 7.1 — RENEWAL OPTION:",
      "Tenant holds one automatic 12-month renewal right upon 60 days written notice."
    ];

    ctx.fillStyle = "#26312c";
    ctx.font = "15px Georgia, serif";
    lines.forEach(function (line, i) {
      ctx.fillText(line, 70, 184 + i * 28);
    });

    // Signatures
    ctx.strokeStyle = "#17211d";
    ctx.beginPath();
    ctx.moveTo(70, 760);
    ctx.lineTo(290, 760);
    ctx.moveTo(410, 760);
    ctx.lineTo(630, 760);
    ctx.stroke();

    // Ink signature scribble
    ctx.strokeStyle = "#1d4ed8";
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(95, 745);
    ctx.bezierCurveTo(130, 705, 160, 760, 210, 725);
    ctx.bezierCurveTo(235, 710, 245, 750, 270, 738);
    ctx.stroke();

    ctx.fillStyle = "#5c6660";
    ctx.font = "12px monospace";
    ctx.fillText("TENANT: ELENA SATO · 2026-08-29", 70, 784);
    ctx.fillText("LANDLORD: M. WEBER · 2026-08-30", 410, 784);

    drawStamp(ctx, "EXECUTED", 530, 625, "rgba(200, 75, 36, 0.85)", -0.18);
    return p.canvas.toDataURL("image/png");
  }

  function buildMedicalScan() {
    const p = createPaperCanvas(720, 920, "#f7f9f8");
    const ctx = p.ctx;

    ctx.fillStyle = "#134e4a";
    ctx.fillRect(0, 0, 720, 92);
    ctx.fillStyle = "#ffffff";
    ctx.font = "700 22px sans-serif";
    ctx.fillText("CHARITE DIAGNOSTICS LAB", 48, 46);
    ctx.font = "500 12px monospace";
    ctx.fillText("PATIENT REPORT & INSURANCE RECEIPT · #LAB-88412", 48, 70);

    ctx.fillStyle = "#17211d";
    ctx.font = "600 15px monospace";
    ctx.fillText("DATE: 2026-10-18    PATIENT: SATO, ELENA    DOB: 1995-03-11", 48, 140);

    const rows = [
      ["Complete Metabolic Panel", "Normal", "EUR 64.00"],
      ["Lipid Profile (Fast)", "Optimal", "EUR 42.00"],
      ["Vitamin D (25-OH)", "38 ng/mL", "EUR 35.00"],
      ["HbA1c Glycated", "5.1%", "EUR 28.50"],
      ["Lab Processing & Phlebotomy", "Verified", "EUR 18.00"]
    ];

    ctx.strokeStyle = "#cbd5e1";
    ctx.beginPath();
    ctx.moveTo(48, 175);
    ctx.lineTo(672, 175);
    ctx.stroke();

    rows.forEach(function (r, idx) {
      const y = 220 + idx * 54;
      ctx.fillStyle = idx % 2 === 0 ? "#eef2f1" : "#ffffff";
      ctx.fillRect(48, y - 24, 624, 42);
      ctx.fillStyle = "#17211d";
      ctx.font = "500 15px sans-serif";
      ctx.fillText(r[0], 62, y);
      ctx.fillStyle = "#0f766e";
      ctx.font = "600 14px monospace";
      ctx.fillText(r[1], 390, y);
      ctx.fillStyle = "#17211d";
      ctx.fillText(r[2], 560, y);
    });

    ctx.font = "700 18px monospace";
    ctx.fillText("TOTAL PAID (INSURANCE REIMBURSABLE): EUR 187.50", 48, 560);

    // Barcode at bottom
    ctx.fillStyle = "#17211d";
    for (let x = 48; x < 340; x += 7) {
      const bw = (x % 3 === 0) ? 4 : 2;
      ctx.fillRect(x, 760, bw, 64);
    }
    ctx.font = "12px monospace";
    ctx.fillText("*88412-CHARITE-2026*", 48, 845);

    drawStamp(ctx, "PAID IN FULL", 520, 680, "rgba(22, 163, 74, 0.85)", -0.1);
    return p.canvas.toDataURL("image/png");
  }

  function buildHardwareInvoiceScan() {
    const p = createPaperCanvas(700, 900, "#faf9f5");
    const ctx = p.ctx;

    ctx.fillStyle = "#141413";
    ctx.font = "700 24px monospace";
    ctx.fillText("VESPER AUDIO GMBH", 54, 82);
    ctx.font = "13px monospace";
    ctx.fillStyle = "#5c5b57";
    ctx.fillText("TAX INVOICE #VA-2026-4419 · VAT ID DE319044210", 54, 110);

    ctx.fillStyle = "#141413";
    ctx.fillRect(54, 134, 592, 2);

    const items = [
      ["1x Vesper Monitor One (VA-01-OBS-PAIR)", "$1,480.00"],
      ["1x Vesper Isolation Stand (Pair)", "$180.00"],
      ["Insured Berlin Courier", "$0.00"],
      ["Subtotal (Tax-Deductible Studio Asset)", "$1,660.00"],
      ["VAT (19% Recoverable)", "$315.40"]
    ];
    ctx.font = "15px monospace";
    items.forEach(function (row, idx) {
      const y = 195 + idx * 46;
      ctx.fillStyle = "#141413";
      ctx.fillText(row[0], 54, y);
      ctx.fillText(row[1], 530, y);
    });

    ctx.fillRect(54, 445, 592, 2);
    ctx.font = "700 20px monospace";
    ctx.fillText("TOTAL CHARGED: $1,975.40", 54, 490);

    // Mock QR square
    ctx.strokeStyle = "#141413";
    ctx.lineWidth = 3;
    ctx.strokeRect(54, 690, 96, 96);
    for (let gx = 64; gx < 140; gx += 14) {
      for (let gy = 700; gy < 776; gy += 14) {
        if ((gx + gy) % 28 === 0) ctx.fillRect(gx, gy, 9, 9);
      }
    }
    ctx.font = "12px monospace";
    ctx.fillText("SERIAL: VA01-2026-8842 / 8843", 172, 742);

    drawStamp(ctx, "TAX ARCHIVE", 500, 620, "rgba(180, 83, 9, 0.85)", 0.12);
    return p.canvas.toDataURL("image/png");
  }

  function buildPassportScan() {
    const p = createPaperCanvas(860, 620, "#f3f5f8");
    const ctx = p.ctx;

    // Security guilloche border
    ctx.strokeStyle = "#334155";
    ctx.lineWidth = 3;
    ctx.strokeRect(24, 24, 812, 572);
    ctx.strokeStyle = "#94a3b8";
    ctx.lineWidth = 1;
    ctx.strokeRect(34, 34, 792, 552);

    ctx.fillStyle = "#1e293b";
    ctx.font = "700 18px monospace";
    ctx.fillText("PASSPORT · PASSEPORT · REISEPASS", 56, 74);

    // Biometric photo box
    ctx.fillStyle = "#cbd5e1";
    ctx.fillRect(56, 110, 175, 225);
    ctx.fillStyle = "#64748b";
    ctx.beginPath();
    ctx.arc(143, 185, 38, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(143, 305, 62, Math.PI, 0);
    ctx.fill();

    // Passport fields
    const fields = [
      ["SURNAME / NOM", "SATO"],
      ["GIVEN NAMES / PRENOMS", "ELENA"],
      ["NATIONALITY", "JAPAN / JPN"],
      ["PASSPORT NO.", "TK9948210"],
      ["DATE OF EXPIRY", "2034-04-12"]
    ];
    fields.forEach(function (f, idx) {
      const y = 132 + idx * 44;
      ctx.fillStyle = "#64748b";
      ctx.font = "600 11px monospace";
      ctx.fillText(f[0], 266, y);
      ctx.fillStyle = "#0f172a";
      ctx.font = "700 17px monospace";
      ctx.fillText(f[1], 266, y + 20);
    });

    // Entry Stamp circle
    ctx.save();
    ctx.strokeStyle = "rgba(37, 99, 235, 0.72)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(690, 210, 56, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "rgba(37, 99, 235, 0.72)";
    ctx.font = "700 12px monospace";
    ctx.textAlign = "center";
    ctx.fillText("IMMIGRATION", 690, 198);
    ctx.fillText("2026-08-28", 690, 216);
    ctx.fillText("BER-TXL", 690, 234);
    ctx.restore();

    // MRZ lines
    ctx.fillStyle = "#e2e8f0";
    ctx.fillRect(46, 480, 768, 86);
    ctx.fillStyle = "#0f172a";
    ctx.font = "600 20px monospace";
    ctx.fillText("P<JPNSATO<<ELENA<<<<<<<<<<<<<<<<<<<<<<<<<<<<", 62, 515);
    ctx.fillText("TK99482104JPN9503118F3404126<<<<<<<<<<<<<<04", 62, 548);

    return p.canvas.toDataURL("image/png");
  }

  function generateCrookedCameraPhoto() {
    // Simulates a skewed, warm/dim phone photo of a receipt on an oak desk
    const c = document.createElement("canvas");
    c.width = 860;
    c.height = 980;
    const ctx = c.getContext("2d");

    // Warm dark oak desk backdrop
    ctx.fillStyle = "#4b382a";
    ctx.fillRect(0, 0, c.width, c.height);

    ctx.save();
    ctx.translate(c.width / 2, c.height / 2);
    ctx.rotate(-0.115); // ~ -6.5 degrees skewed!

    // Paper drop shadow + warm tungsten paper tint
    ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
    ctx.fillRect(-266, -346, 540, 700);
    ctx.fillStyle = "#e9dec6";
    ctx.fillRect(-274, -354, 540, 700);

    // Receipt content in faded thermal ink
    ctx.fillStyle = "#4d463c";
    ctx.font = "700 22px monospace";
    ctx.fillText("SOLSTICE COFFEE ROASTERS", -220, -280);
    ctx.font = "15px monospace";
    ctx.fillText("112 PORTLAND AVE · RECEIPT #4910", -220, -248);
    ctx.fillRect(-220, -228, 430, 2);

    const rows = [
      ["2x Single Origin Kenya AA", "$38.00"],
      ["1x Commercial Filter Box", "$24.50"],
      ["1x Client Meeting Catering", "$46.00"],
      ["Subtotal", "$108.50"],
      ["Sales Tax (8.5%)", "$9.22"]
    ];
    rows.forEach(function (r, idx) {
      const y = -165 + idx * 52;
      ctx.fillText(r[0], -220, y);
      ctx.fillText(r[1], 130, y);
    });
    ctx.fillRect(-220, 110, 430, 2);
    ctx.font = "700 20px monospace";
    ctx.fillText("TOTAL PAID: $117.72", -220, 155);
    ctx.font = "13px monospace";
    ctx.fillText("CARD **** 8821 · AUTH 09142B", -220, 200);
    ctx.fillText("TIP: Apply Deskew (+6.5°) & Magic Scan", -220, 290);

    ctx.restore();
    return c.toDataURL("image/png");
  }

  function createSeedDocuments() {
    const now = Date.now();
    return [
      {
        id: "FV-2026-001",
        title: "Studio Lease Agreement (Berlin)",
        category: "legal",
        docDate: "2026-09-01",
        issuer: "Kestrel Properties GmbH",
        tags: ["lease", "signed", "housing"],
        starred: true,
        fileType: "image/png",
        imageUrl: buildLeaseScan(),
        ocrText:
          "COMMERCIAL STUDIO LEASE AGREEMENT. Parties: Kestrel Properties GmbH & Elena Sato Studio. Suite 4B, Torstrasse 112, Berlin. Term: 2026-09-01 to 2028-08-31. Monthly Rent: EUR 2,450.00.",
        createdAt: now - 4000
      },
      {
        id: "FV-2026-002",
        title: "Passport Bio-Data & Entry Stamp",
        category: "identity",
        docDate: "2026-08-28",
        issuer: "Federal Travel Authority",
        tags: ["passport", "id", "travel"],
        starred: true,
        fileType: "image/png",
        imageUrl: buildPassportScan(),
        ocrText:
          "PASSPORT NO TK9948210. SATO, ELENA. NATIONALITY JPN. EXPIRY 2034-04-12. ENTRY STAMP BER-TXL 2026-08-28.",
        createdAt: now - 3000
      },
      {
        id: "FV-2026-003",
        title: "Diagnostic Lab Panel Receipt",
        category: "medical",
        docDate: "2026-10-18",
        issuer: "Charite Diagnostics Lab",
        tags: ["lab", "insurance", "paid"],
        starred: false,
        fileType: "image/png",
        imageUrl: buildMedicalScan(),
        ocrText:
          "CHARITE DIAGNOSTICS LAB #LAB-88412. Complete Metabolic Panel, Lipid Profile, Vitamin D (38 ng/mL), HbA1c (5.1%). TOTAL PAID EUR 187.50.",
        createdAt: now - 2000
      },
      {
        id: "FV-2026-004",
        title: "Studio Monitor Hardware Invoice",
        category: "receipts",
        docDate: "2026-11-02",
        issuer: "Vesper Audio GmbH",
        tags: ["tax-deductible", "vat", "equipment"],
        starred: false,
        fileType: "image/png",
        imageUrl: buildHardwareInvoiceScan(),
        ocrText:
          "VESPER AUDIO GMBH TAX INVOICE #VA-2026-4419. 1x Vesper Monitor One Pair ($1,480.00), 1x Isolation Stand ($180.00). VAT 19% $315.40. TOTAL $1,975.40.",
        createdAt: now - 1000
      }
    ];
  }

  global.FolioSamples = {
    FOLDERS: FOLDERS,
    createSeedDocuments: createSeedDocuments,
    generateCrookedCameraPhoto: generateCrookedCameraPhoto
  };
})(window);
