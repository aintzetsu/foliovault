/* ==========================================================================
   FolioVault — Real-Time HTML5 Canvas Pixel Scanner & Deskew Engine
   ========================================================================== */

(function (global) {
  "use strict";

  function clampByte(v) {
    return v < 0 ? 0 : v > 255 ? 255 : v;
  }

  function createScanner(canvas) {
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    let sourceImg = null;
    let params = {
      filter: "magic", // "original" | "magic" | "bw" | "archive"
      brightness: 0,
      contrast: 15,
      deskew: 0,       // -15 to +15 deg
      rotate90: 0      // 0, 90, 180, 270
    };

    function loadDataUrl(dataUrl) {
      return new Promise(function (resolve, reject) {
        const img = new Image();
        img.onload = function () {
          sourceImg = img;
          render();
          resolve();
        };
        img.onerror = function (err) {
          reject(err);
        };
        img.src = dataUrl;
      });
    }

    function setParams(next) {
      params = Object.assign({}, params, next);
      render();
    }

    function getParams() {
      return Object.assign({}, params);
    }

    function resetParams() {
      params = {
        filter: "magic",
        brightness: 0,
        contrast: 15,
        deskew: 0,
        rotate90: 0
      };
      render();
    }

    function render() {
      if (!sourceImg) return;

      const maxDim = 900;
      const scale = Math.min(1, maxDim / Math.max(sourceImg.width, sourceImg.height));
      const baseW = Math.max(200, Math.round(sourceImg.width * scale));
      const baseH = Math.max(200, Math.round(sourceImg.height * scale));
      const swapDims = params.rotate90 % 180 !== 0;
      const outW = swapDims ? baseH : baseW;
      const outH = swapDims ? baseW : baseH;

      canvas.width = outW;
      canvas.height = outH;

      // Clean white archival background behind rotated/deskewed edges
      ctx.fillStyle = "#faf8f4";
      ctx.fillRect(0, 0, outW, outH);

      ctx.save();
      ctx.translate(outW / 2, outH / 2);
      ctx.rotate(((params.rotate90 + params.deskew) * Math.PI) / 180);
      ctx.drawImage(sourceImg, -baseW / 2, -baseH / 2, baseW, baseH);
      ctx.restore();

      const needsPixels =
        params.filter !== "original" ||
        params.brightness !== 0 ||
        params.contrast !== 0;

      if (!needsPixels) return;

      const imgData = ctx.getImageData(0, 0, outW, outH);
      const data = imgData.data;
      const b = params.brightness * 1.4;
      const cFactor = Math.pow((100 + params.contrast) / 100, 2);

      for (let i = 0; i < data.length; i += 4) {
        let r = data[i];
        let g = data[i + 1];
        let bl = data[i + 2];

        // Apply Brightness & Contrast
        r = (r - 128) * cFactor + 128 + b;
        g = (g - 128) * cFactor + 128 + b;
        bl = (bl - 128) * cFactor + 128 + b;

        if (params.filter === "magic") {
          // Document whitening: lift bright paper backgrounds toward clean ivory-white while sharpening ink
          const lum = 0.299 * r + 0.587 * g + 0.114 * bl;
          if (lum > 175) {
            const lift = (lum - 175) * 0.85;
            r += lift;
            g += lift * 1.02;
            bl += lift * 1.06;
          } else if (lum < 115) {
            r *= 0.86;
            g *= 0.86;
            bl *= 0.86;
          }
        } else if (params.filter === "bw") {
          const lum = 0.299 * r + 0.587 * g + 0.114 * bl;
          const bw = lum > 152 ? 250 : lum < 95 ? 18 : (lum - 95) * 4.1;
          r = bw;
          g = bw;
          bl = bw;
        } else if (params.filter === "archive") {
          const tr = r * 0.96 + 14;
          const tg = g * 0.93 + 8;
          const tb = bl * 0.84;
          r = tr;
          g = tg;
          bl = tb;
        }

        data[i] = clampByte(r);
        data[i + 1] = clampByte(g);
        data[i + 2] = clampByte(bl);
      }

      ctx.putImageData(imgData, 0, 0);
    }

    function exportDataUrl() {
      return canvas.toDataURL("image/jpeg", 0.9);
    }

    return {
      loadDataUrl: loadDataUrl,
      setParams: setParams,
      getParams: getParams,
      resetParams: resetParams,
      exportDataUrl: exportDataUrl
    };
  }

  global.FolioScanner = {
    create: createScanner
  };
})(window);
