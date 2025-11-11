document.addEventListener('DOMContentLoaded', () => {
    const imageFolder = 'images/';
    const extensions = ['.jpg', '.jpeg', '.png', '.bmp', '.webp'];
    let imageFiles = [];
    let currentIndex = 0;
    let labels = JSON.parse(localStorage.getItem('ge_beeslab_final_labels')) || {};

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

    function loadImages() {
        fetch(imageFolder).then(r => r.text()).then(text => {
            const doc = new DOMParser().parseFromString(text, 'text/html');
            doc.querySelectorAll('a').forEach(a => {
                const href = a.getAttribute('href');
                if (extensions.some(e => href.toLowerCase().endsWith(e))) {
                    imageFiles.push(href.split('/').pop());
                }
            });
            imageFiles.sort();
            if (imageFiles.length === 0) {
                el.progress.textContent = "No images found! Put YOLO crops in /images folder";
                return;
            }
            showImage(currentIndex);
        }).catch(() => {
            el.progress.innerHTML = "Error: Open via <code>python -m http.server</code> or VS Code Live Server";
        });
    }

    function showImage(i) {
        if (i < 0 || i >= imageFiles.length) return;
        currentIndex = i;
        const file = imageFiles[i];
        el.image.src = imageFolder + file;
        el.filename.textContent = file;
        updateUI();
    }

    function updateUI() {
        const total = imageFiles.length;
        const labeled = Object.keys(labels).length;
        el.progress.textContent = `Image ${currentIndex + 1} of ${total} • Labeled: ${labeled}/${total}`;
        el.prevBtn.disabled = currentIndex === 0;
        el.nextBtn.disabled = currentIndex === total - 1;
        highlightLabel();
    }

    function highlightLabel() {
        document.querySelectorAll('.label-btn').forEach(b => b.style.opacity = '0.75');
        const file = imageFiles[currentIndex];
        if (labels[file]) {
            document.querySelectorAll('.label-btn').forEach(b => {
                if (b.classList.contains(labels[file])) b.style.opacity = '1';
            });
        }
    }

    function saveLabel(label) {
        const file = imageFiles[currentIndex];
        if (label === 'discard') delete labels[file];
        else labels[file] = label;
        localStorage.setItem('ge_beeslab_final_labels', JSON.stringify(labels));
        updateUI();
    }

    function downloadJSON() {
        const data = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(labels, null, 2));
        const a = document.createElement('a');
        a.href = data;
        a.download = `GE_BeesLab_YOLO_Labels_${new Date().toISOString().slice(0,10)}.json`;
        a.click();
    }

    // Events
    document.querySelectorAll('.label-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const cls = btn.classList[1];
            saveLabel(cls === 'discard' ? 'discard' : cls);
        });
    });

    el.prevBtn.onclick = () => showImage(currentIndex - 1);
    el.nextBtn.onclick = () => {
        if (currentIndex === imageFiles.length - 1) {
            el.doneMessage.classList.remove('hidden');
            el.labeledCount.textContent = Object.keys(labels).length;
        } else {
            showImage(currentIndex + 1);
        }
    };

    el.downloadBtn.onclick = el.downloadFinal.onclick = downloadJSON;

    // Keyboard
    document.addEventListener('keydown', e => {
        if (e.key === '1') document.querySelector('.garbage').click();
        if (e.key === '2') document.querySelector('.normal').click();
        if (e.key === '3') document.querySelector('.atypical').click();
        if (e.key === '4') document.querySelector('.discard').click();
        if (e.key === 'ArrowLeft') el.prevBtn.click();
        if (e.key === 'ArrowRight' || e.key === ' ') el.nextBtn.click();
    });

    loadImages();
});