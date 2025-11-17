document.addEventListener('DOMContentLoaded', () => {
  const el = {
    zipCard: document.getElementById('zipCard'),
    mainArea: document.getElementById('mainArea'),
    progress: document.getElementById('progress'),
    originalCanvas: document.getElementById('originalCanvas'),
    cropCanvas: document.getElementById('cropCanvas'),
    prevBoxBtn: document.getElementById('prevBoxBtn'),
    nextBoxBtn: document.getElementById('nextBoxBtn'),
    imgCount: document.getElementById('imgCount'),
    boxCount: document.getElementById('boxCount'),
    downloadBtn: document.getElementById('downloadBtn'),
    doneCard: document.getElementById('doneCard'),
    finalCount: document.getElementById('finalCount'),
    downloadFinal: document.getElementById('downloadFinal'),
    newZipBtn: document.getElementById('newZipBtn'),
    zipInput: document.getElementById('zipInput'),
    uploadBtn: document.getElementById('uploadBtn')
  };

  let images = [];
  let currentImg = 0;
  let currentBox = 0;
  let labels = {};

  const classMap = { garbage: 0, normal: 1, atypical: 2 };

  // ZIP Upload
  el.uploadBtn.onclick = () => el.zipInput.click();
  el.zipInput.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    el.progress.textContent = 'Extracting ZIP...';
    try {
      const zip = await JSZip.loadAsync(file);
      const entries = Object.values(zip.files).filter(f => !f.dir);
      const imgEntries = entries.filter(f => /\.(jpe?g|png|bmp|webp)$/i.test(f.name));

      images = [];
      for (const entry of imgEntries) {
        const name = entry.name.split('/').pop();
        const base = name.replace(/\.[^/.]+$/, "");
        const txtEntry = entries.find(t => t.name.includes(base + '.txt'));
        const blob = await entry.async('blob');
        const url = URL.createObjectURL(blob);

        let bboxes = [];
        if (txtEntry) {
          const txt = await txtEntry.async('text');
          bboxes = txt.trim().split('\n').map(line => {
            const [cls, x, y, w, h] = line.split(' ').map(Number);
            return { x, y, w, h, label: null };
          });
        }
        images.push({ name, url, bboxes, currentBox: 0 });
      }

      if (images.length === 0) throw "No images found";

      labels = {};
      startLabeling();
    } catch (err) {
      el.progress.textContent = 'Error loading ZIP. Please try again.';
    }
  };

  function startLabeling() {
    el.zipCard.classList.add('hidden');
    el.mainArea.classList.remove('hidden');
    currentImg = 0;
    currentBox = 0;
    loadCurrentImage();
  }

  function loadCurrentImage() {
    const img = images[currentImg];
    if (!img || img.bboxes.length === 0) {
      nextImage();
      return;
    }

    el.imgCount.textContent = `${currentImg + 1}/${images.length}`;
    updateBoxCounter();
    drawOriginal();
  }

  function drawOriginal() {
    const imgData = images[currentImg];
    const box = imgData.bboxes[currentBox];
    const img = new Image();
    img.src = imgData.url;

    img.onload = () => {
      const ctx = el.originalCanvas.getContext('2d');
      el.originalCanvas.width = img.width;
      el.originalCanvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      // Draw all bounding boxes
      imgData.bboxes.forEach((b, i) => {
  const x = (b.x - b.w / 2) * img.width;
  const y = (b.y - b.h / 2) * img.height;
  const w = b.w * img.width;
  const h = b.h * img.height;

  if (i === currentBox) {
    ctx.strokeStyle = '#f80000ff';   // coral
    ctx.lineWidth = 20;

    // Optional glow
    ctx.shadowColor = '#B7A3E3';
    ctx.shadowBlur = 20;
  } else {
    ctx.strokeStyle = '#C2E2FA';   // soft blue
    ctx.lineWidth = 3;
    ctx.shadowBlur = 0;
  }

  ctx.strokeRect(x, y, w, h);
});


      // Crop the active box
      const cx = (box.x - box.w / 2) * img.width;
      const cy = (box.y - box.h / 2) * img.height;
      const cw = box.w * img.width;
      const ch = box.h * img.height;

      el.cropCanvas.width = cw;
      el.cropCanvas.height = ch;
      const cctx = el.cropCanvas.getContext('2d');
      cctx.drawImage(img, cx, cy, cw, ch, 0, 0, cw, ch);

      // Highlight active label
      highlightActiveLabel(imgData.bboxes[currentBox].label);
    };
  }

  function updateBoxCounter() {
    const img = images[currentImg];
    el.boxCount.textContent = `${currentBox + 1}/${img.bboxes.length}`;
  }

  // Active label glow + bold
  function highlightActiveLabel(label) {
    document.querySelectorAll('.label-btn').forEach(b => {
      b.classList.remove('active');
      b.style.opacity = '0.85';
    });
    if (label && label !== 'discard') {
      const btn = document.querySelector(`.${label}`);
      if (btn) {
        btn.classList.add('active');
        btn.style.opacity = '1';
      }
    }
  }

  function saveLabel(label) {
    const key = `${images[currentImg].name}#${currentBox}`;
    if (label === 'discard') {
      delete labels[key];
      images[currentImg].bboxes[currentBox].label = null;
    } else {
      labels[key] = label;
      images[currentImg].bboxes[currentBox].label = label;
    }
    highlightActiveLabel(label);
  }

  function nextBox() {
    const img = images[currentImg];
    if (currentBox < img.bboxes.length - 1) {
      currentBox++;
    } else if (currentImg < images.length - 1) {
      currentImg++;
      currentBox = 0;
    } else {
      finish();
      return;
    }
    loadCurrentImage();
  }

  function prevBox() {
    if (currentBox > 0) {
      currentBox--;
    } else if (currentImg > 0) {
      currentImg--;
      currentBox = images[currentImg].bboxes.length - 1;
    }
    loadCurrentImage();
  }

  function nextImage() {
    if (currentImg < images.length - 1) {
      currentImg++;
      currentBox = 0;
      loadCurrentImage();
    } else {
      finish();
    }
  }

  function finish() {
    el.mainArea.classList.add('hidden');
    el.doneCard.classList.remove('hidden');
    el.finalCount.textContent = Object.values(labels).filter(l => l !== 'discard').length;
  }

  // Download ZIP
  async function downloadZip() {
    const zip = new JSZip();
    const imgFolder = zip.folder("images");
    const labelFolder = zip.folder("labels");

    for (const img of images) {
      const blob = await fetch(img.url).then(r => r.blob());
      imgFolder.file(img.name, blob);

      const lines = img.bboxes.map((b, i) => {
        const key = `${img.name}#${i}`;
        const label = labels[key];
        if (!label || label === 'discard') return null;
        return `${classMap[label]} ${b.x} ${b.y} ${b.w} ${b.h}`;
      }).filter(Boolean);

      if (lines.length > 0) {
        const txtName = img.name.replace(/\.[^/.]+$/, "") + ".txt";
        labelFolder.file(txtName, lines.join('\n'));
      }
    }

    zip.file("classes.yaml", `names:\n  0: garbage\n  1: normal\n  2: atypical\n`);
    const blob = await zip.generateAsync({ type: "blob" });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `GE_BeesLab_Labeled_${new Date().toISOString().slice(0,10)}.zip`;
    a.click();
  }

  // Events
  document.querySelectorAll('.label-btn').forEach(btn => {
    const cls = btn.classList[1];
    btn.onclick = () => saveLabel(cls === 'discard' ? 'discard' : cls);
  });

  el.prevBoxBtn.onclick = prevBox;
  el.nextBoxBtn.onclick = nextBox;
  el.downloadBtn.onclick = el.downloadFinal.onclick = downloadZip;
  el.newZipBtn.onclick = () => location.reload();

  // Keyboard
  document.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft') prevBox();
    if (e.key === 'ArrowRight' || e.key === ' ') nextBox();
    if (e.key >= '1' && e.key <= '4') {
      document.querySelectorAll('.label-btn')[e.key - 1].click();
    }
  });
});