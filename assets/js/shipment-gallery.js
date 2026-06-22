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

    function renderTrack(stages, currentStageId) {
        const track = $('#sgTrackSteps');
        if (!track) return;
        const currentIdx = stageIndex(currentStageId);
        track.innerHTML = stages.map((stage, i) => {
            let cls = 'sg-step';
            if (i < currentIdx) cls += ' is-done';
            else if (i === currentIdx) cls += ' is-current';
            else cls += ' is-future';
            const count = stage.images.length;
            const meta = count
                ? `${count} תמונות`
                : (i <= currentIdx ? 'ממתין לתמונות' : 'בקרוב');
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
            if (i > currentIdx && !stage.images.length) {
                return '';
            }
            const imgs = stage.images.map((src, idx) => `
<button type="button" class="sg-thumb" data-src="${src}" aria-label="תמונה ${idx + 1}">
  <img src="${src}" alt="${stage.label} ${idx + 1}" loading="lazy">
</button>`).join('');
            const body = imgs
                ? `<div class="sg-grid">${imgs}</div>`
                : `<div class="sg-empty">עדיין אין תמונות לשלב זה</div>`;
            return `
<section class="sg-section" id="section-${stage.id}">
  <div class="sg-section-head">
    <i class="fas ${stage.icon}"></i>
    <h2>${stage.label}</h2>
    <span class="sg-count">${stage.images.length ? stage.images.length + ' תמונות' : ''}</span>
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
