document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('index.html') || window.location.pathname === '/') return;

    let imagesData = JSON.parse(localStorage.getItem('yolo_images_batch') || '[]');
    let labels = JSON.parse(localStorage.getItem('yolo_labels_batch') || '{}');
    let currentIndex = 0;

    const el = {
        progress: document.getElementById('progress'),
        image: document.getElementById('currentImage'),
        filename: document.getElementById('filename'),
        prevBtn: document.getElementById('prevBtn'),
        nextBtn: document.getElementById('nextBtn'),
        downloadBtn: document.getElementById('downloadBtn'),
        doneMessage: document.getElementById('doneMessage'),
        labeledCount: document.getElementById('labeledCount'),
        downloadFinal: document.getElementById('downloadFinal')
    };

    if (imagesData.length === 0) {
        el.progress.innerHTML = 'No images loaded. <a href="index.html">Go back</a>';
        return;
    }

    function showImage(i) {
        if (i < 0 || i >= imagesData.length) return;
        currentIndex = i;
        const img = imagesData[i];
        el.image.src = img.url;
        el.filename.textContent = img.name;
        updateUI();
    }

    function updateUI() {
        const total = imagesData.length;
        const labeled = Object.values(labels).filter(l => l).length;
        el.progress.textContent = `Image ${currentIndex + 1} of ${total} • Labeled: ${labeled}/${total}`;
        el.prevBtn.disabled = currentIndex === 0;
        el.nextBtn.disabled = currentIndex === total - 1;
        highlightLabel();
    }

    function highlightLabel() {
        document.querySelectorAll('.label-btn').forEach(b => b.style.opacity = '0.75');
        const name = imagesData[currentIndex].name;
        if (labels[name]) {
            document.querySelector(`.${labels[name]}`)?.style.setProperty('opacity', '1');
        }
    }

    function saveLabel(label) {
        const name = imagesData[currentIndex].name;
        if (label === 'discard') delete labels[name];
        else labels[name] = label;
        localStorage.setItem('yolo_labels_batch', JSON.stringify(labels));
        updateUI();
    }

    function downloadJSON() {
        const data = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(labels, null, 2));
        const a = document.createElement('a');
        a.href = data;
        a.download = `GE_BeesLab_YOLO_Labels_${new Date().toISOString().slice(0,10)}.json`;
        a.click();
    }

    document.querySelectorAll('.label-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const cls = btn.classList[1];
            saveLabel(cls === 'discard' ? 'discard' : cls);
        });
    });

    el.prevBtn.onclick = () => showImage(currentIndex - 1);
    el.nextBtn.onclick = () => {
        if (currentIndex === imagesData.length - 1) {
            el.doneMessage.classList.remove('hidden');
            el.labeledCount.textContent = Object.values(labels).filter(l => l).length;
        } else {
            showImage(currentIndex + 1);
        }
    };

    el.downloadBtn.onclick = el.downloadFinal.onclick = downloadJSON;

    document.addEventListener('keydown', e => {
        if (e.key === '1') document.querySelector('.garbage').click();
        if (e.key === '2') document.querySelector('.normal').click();
        if (e.key === '3') document.querySelector('.atypical').click();
        if (e.key === '4') document.querySelector('.discard').click();
        if (e.key === 'ArrowLeft') el.prevBtn.click();
        if (e.key === 'ArrowRight' || e.key === ' ') el.nextBtn.click();
    });

    showImage(0);
});