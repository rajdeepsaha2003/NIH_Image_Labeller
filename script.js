document.addEventListener('DOMContentLoaded', () => {
    const el = {
        folderSelector: document.getElementById('folderSelector'),
        mainArea: document.getElementById('mainArea'),
        progress: document.getElementById('progress'),
        image: document.getElementById('currentImage'),
        filename: document.getElementById('filename'),
        prevBtn: document.getElementById('prevBtn'),
        nextBtn: document.getElementById('nextBtn'),
        downloadBtn: document.getElementById('downloadBtn'),
        doneMessage: document.getElementById('doneMessage'),
        labeledCount: document.getElementById('labeledCount'),
        downloadFinal: document.getElementById('downloadFinal'),
        newFolderBtn: document.getElementById('newFolderBtn'),
        changeFolder: document.getElementById('changeFolder')
    };

    let images = [];
    let currentIndex = 0;
    let labels = {};

    // Load from localStorage or default
    const saved = localStorage.getItem('yolo_images_final');
    if (saved) {
        images = JSON.parse(saved);
        labels = JSON.parse(localStorage.getItem('yolo_labels_final') || '{}');
        startLabeling();
    } else {
        tryLoadDefaultImages();
    }

    function tryLoadDefaultImages() {
        fetch('images/').then(r => r.text()).then(html => {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const links = doc.querySelectorAll('a');
            links.forEach(link => {
                const href = link.getAttribute('href');
                if (/\.(jpe?g|png|bmp|webp)$/i.test(href)) {
                    images.push({ name: href.split('/').pop(), url: 'images/' + href.split('/').pop() });
                }
            });
            if (images.length > 0) {
                localStorage.setItem('yolo_images_final', JSON.stringify(images));
                startLabeling();
            } else {
                el.progress.textContent = "No images in /images folder. Use folder upload.";
            }
        }).catch(() => {
            el.progress.textContent = "GitHub Pages active. Use folder upload below.";
            el.folderSelector.style.display = 'block';
        });
    }

    function startLabeling() {
        el.folderSelector.style.display = 'none';
        el.mainArea.classList.remove('hidden');
        showImage(0);
    }

    function showImage(i) {
        if (i < 0 || i >= images.length) return;
        currentIndex = i;
        el.image.src = images[i].url;
        el.filename.textContent = images[i].name;
        updateProgress();
        highlightLabel();
    }

    function updateProgress() {
        const labeled = Object.keys(labels).length;
        el.progress.textContent = `Image ${currentIndex + 1}/${images.length} • Labeled: ${labeled}/${images.length}`;
    }

    function highlightLabel() {
        document.querySelectorAll('.label-btn').forEach(b => b.style.opacity = '0.75');
        const name = images[currentIndex].name;
        if (labels[name]) {
            document.querySelector(`.${labels[name]}`)?.style.setProperty('opacity', '1');
        }
    }

    function saveLabel(label) {
        const name = images[currentIndex].name;
        if (label === 'discard') delete labels[name];
        else labels[name] = label;
        localStorage.setItem('yolo_labels_final', JSON.stringify(labels));
        updateProgress();
        highlightLabel();
    }

    function downloadJSON() {
        const data = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(labels, null, 2));
        const a = document.createElement('a');
        a.href = data;
        a.download = `GE_BeesLab_Labels_${new Date().toISOString().slice(0,10)}.json`;
        a.click();
    }

    // Events
    document.querySelectorAll('.label-btn').forEach(btn => {
        btn.onclick = () => saveLabel(btn.classList[1] === 'discard' ? 'discard' : btn.classList[1]);
    });

    el.prevBtn.onclick = () => showImage(currentIndex - 1);
    el.nextBtn.onclick = () => {
        if (currentIndex === images.length - 1) {
            el.doneMessage.classList.remove('hidden');
            el.labeledCount.textContent = Object.keys(labels).length;
        } else {
            showImage(currentIndex + 1);
        }
    };

    el.downloadBtn.onclick = el.downloadFinal.onclick = downloadJSON;
    el.newFolderBtn.onclick = el.changeFolder.onclick = () => {
        localStorage.removeItem('yolo_images_final');
        localStorage.removeItem('yolo_labels_final');
        location.reload();
    };

    // Folder upload
    document.getElementById('browseBtn').onclick = () => document.getElementById('folderInput').click();
    document.getElementById('folderInput').onchange = (e) => {
        const files = Array.from(e.target.files).filter(f => /\.(jpe?g|png|bmp|webp)$/i.test(f.name));
        images = files.map(f => ({ name: f.name, url: URL.createObjectURL(f) }));
        localStorage.setItem('yolo_images_final', JSON.stringify(images));
        labels = {};
        localStorage.setItem('yolo_labels_final', '{}');
        startLabeling();
    };

    document.getElementById('useDefaultBtn').onclick = () => {
        tryLoadDefaultImages();
    };

    // Keyboard
    document.addEventListener('keydown', e => {
        if (e.key === '1') document.querySelector('.garbage').click();
        if (e.key === '2') document.querySelector('.normal').click();
        if (e.key === '3') document.querySelector('.atypical').click();
        if (e.key === '4') document.querySelector('.discard').click();
        if (e.key === 'ArrowLeft') el.prevBtn.click();
        if (e.key === 'ArrowRight' || e.key === ' ') el.nextBtn.click();
    });
});