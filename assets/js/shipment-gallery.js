(function () {
    const STAGE_ORDER = ['production', 'loading', 'shipped', 'israel-port'];

    function $(sel) {
        return document.querySelector(sel);
    }

    function openLightbox(src) {
        let lb = $('#sgLightbox');
        if (!lb) {
            lb = document.createElement('div');
            lb.id = 'sgLightbox';
            lb.hidden = true;
            lb.innerHTML = '<button type="button" class="sg-lightbox-close" aria-label="סגור">×</button><img src="" alt="">';
            document.body.appendChild(lb);
            lb.querySelector('.sg-lightbox-close').addEventListener('click', closeLightbox);
            lb.addEventListener('click', (e) => {
                if (e.target === lb) closeLightbox();
            });
        }
        lb.querySelector('img').src = src;
        lb.hidden = false;
        document.body.style.overflow = 'hidden';
    }

    function closeLightbox() {
        const lb = $('#sgLightbox');
        if (lb) lb.hidden = true;
        document.body.style.overflow = '';
    }

    function stageIndex(id) {
        return STAGE_ORDER.indexOf(id);
    }

    function stageMediaCount(stage) {
        const images = (stage.images || []).length;
        const videos = (stage.videos || []).length;
        return { images, videos, total: images + videos };
    }

    function stageMediaMeta(stage, i, currentIdx) {
        const { images, videos } = stageMediaCount(stage);
        const parts = [];
        if (images) parts.push(`${images} תמונות`);
        if (videos) parts.push(`${videos} סרטונים`);
        if (parts.length) return parts.join(' · ');
        return i <= currentIdx ? 'ממתין לתמונות' : 'בקרוב';
    }

    function renderTrack(stages, currentStageId) {
        const track = $('#sgTrackSteps');
        if (!track) return;
        const currentIdx = stageIndex(currentStageId);
        track.innerHTML = stages.map((stage, i) => {
            let cls = 'sg-step';
            if (i < currentIdx) cls += ' is-done';
            else if (i === currentIdx) cls += ' is-current';
            else cls += ' is-future';
            const meta = stageMediaMeta(stage, i, currentIdx);
            return `
<div class="${cls}" data-stage="${stage.id}">
  <div class="sg-step-icon"><i class="fas ${stage.icon}"></i></div>
  <div class="sg-step-body">
    <div class="sg-step-label">${stage.label}</div>
    <div class="sg-step-meta">${meta}</div>
  </div>
</div>`;
        }).join('');
    }

    function renderGallery(stages, currentStageId) {
        const wrap = $('#sgGallery');
        if (!wrap) return;
        const currentIdx = stageIndex(currentStageId);
        wrap.innerHTML = stages.map((stage, i) => {
            const { images, videos } = stageMediaCount(stage);
            if (i > currentIdx && !images && !videos) {
                return '';
            }
            const videoItems = (stage.videos || []).map((src, idx) => `
<div class="sg-video-card">
  <video controls playsinline preload="metadata" src="${src}" aria-label="סרטון ${idx + 1}"></video>
</div>`).join('');
            const videoBlock = videoItems ? `<div class="sg-videos">${videoItems}</div>` : '';
            const imgs = (stage.images || []).map((src, idx) => `
<button type="button" class="sg-thumb" data-src="${src}" aria-label="תמונה ${idx + 1}">
  <img src="${src}" alt="${stage.label} ${idx + 1}" loading="lazy">
</button>`).join('');
            const imageBlock = imgs ? `<div class="sg-grid">${imgs}</div>` : '';
            const body = videoBlock || imageBlock
                ? `${videoBlock}${imageBlock}`
                : `<div class="sg-empty">עדיין אין תמונות או סרטונים לשלב זה</div>`;
            const countParts = [];
            if (images) countParts.push(`${images} תמונות`);
            if (videos) countParts.push(`${videos} סרטונים`);
            return `
<section class="sg-section" id="section-${stage.id}">
  <div class="sg-section-head">
    <i class="fas ${stage.icon}"></i>
    <h2>${stage.label}</h2>
    <span class="sg-count">${countParts.join(' · ')}</span>
  </div>
  ${body}
</section>`;
        }).join('');

        wrap.querySelectorAll('.sg-thumb').forEach((btn) => {
            btn.addEventListener('click', () => openLightbox(btn.dataset.src));
        });
    }

    async function init() {
        const [manifest, config] = await Promise.all([
            fetch('shipment-images.json?_=' + Date.now()).then((r) => r.json()),
            fetch('config.json?_=' + Date.now()).then((r) => r.json()).catch(() => ({}))
        ]);
        const stages = manifest.stages || [];
        const currentStageId = (config.shipment && config.shipment.currentStage) || 'shipped';
        renderTrack(stages, currentStageId);
        renderGallery(stages, currentStageId);
    }

    document.addEventListener('DOMContentLoaded', init);
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeLightbox();
    });
})();
