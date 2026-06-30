(function () {
    const STAGE_ORDER = ['production', 'loading', 'shipped', 'israel-port'];

    function $(sel) {
        return document.querySelector(sel);
    }

    function initReveal() {
        const nodes = document.querySelectorAll('.reveal');
        if (!nodes.length || !('IntersectionObserver' in window)) {
            nodes.forEach(function (el) { el.classList.add('is-visible'); });
            return;
        }
        const io = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    io.unobserve(entry.target);
                }
            });
        }, { threshold: 0.12, rootMargin: '0px 0px -24px 0px' });
        nodes.forEach(function (el) { io.observe(el); });
    }

    function openLightbox(src) {
        const lb = $('#sgLightbox');
        const img = $('#sgLightboxImg');
        if (!lb || !img) return;
        img.src = src;
        lb.hidden = false;
        document.body.style.overflow = 'hidden';
    }

    function closeLightbox() {
        const lb = $('#sgLightbox');
        if (!lb) return;
        lb.hidden = true;
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
        if (images) parts.push(images + ' תמונות');
        if (videos) parts.push(videos + ' סרטונים');
        if (parts.length) return parts.join(' · ');
        return i <= currentIdx ? 'ממתין לתמונות' : 'בקרוב';
    }

    function scrollToStage(stageId) {
        const section = document.getElementById('section-' + stageId);
        if (section) {
            section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    function renderTrack(stages, currentStageId) {
        const track = $('#sgTrackSteps');
        if (!track) return;
        const currentIdx = stageIndex(currentStageId);
        track.innerHTML = stages.map(function (stage, i) {
            let cls = 'sg-step';
            if (i < currentIdx) cls += ' is-done';
            else if (i === currentIdx) cls += ' is-current';
            else cls += ' is-future';
            const meta = stageMediaMeta(stage, i, currentIdx);
            return (
                '<button type="button" class="' + cls + '" data-stage="' + stage.id + '">' +
                '  <div class="sg-step-icon"><i class="fas ' + stage.icon + '"></i></div>' +
                '  <div class="sg-step-body">' +
                '    <div class="sg-step-label">' + stage.label + '</div>' +
                '    <div class="sg-step-meta">' + meta + '</div>' +
                '  </div>' +
                '</button>'
            );
        }).join('');

        track.querySelectorAll('.sg-step').forEach(function (btn) {
            btn.addEventListener('click', function () {
                scrollToStage(btn.dataset.stage || '');
            });
        });
    }

    function renderGallery(stages, currentStageId) {
        const wrap = $('#sgGallery');
        if (!wrap) return;
        const currentIdx = stageIndex(currentStageId);
        wrap.innerHTML = stages.map(function (stage, i) {
            const { images, videos } = stageMediaCount(stage);
            if (i > currentIdx && !images && !videos) {
                return '';
            }

            const videoItems = (stage.videos || []).map(function (src, idx) {
                return (
                    '<div class="sg-video-card">' +
                    '<video controls playsinline preload="metadata" src="' + src + '" aria-label="סרטון ' + (idx + 1) + '"></video>' +
                    '</div>'
                );
            }).join('');

            const videoBlock = videoItems ? '<div class="sg-videos">' + videoItems + '</div>' : '';

            const imgs = (stage.images || []).map(function (src, idx) {
                return (
                    '<button type="button" class="sg-thumb" data-src="' + src + '" aria-label="תמונה ' + (idx + 1) + '">' +
                    '<img src="' + src + '" alt="' + stage.label + ' ' + (idx + 1) + '" loading="lazy">' +
                    '</button>'
                );
            }).join('');

            const imageBlock = imgs ? '<div class="sg-grid">' + imgs + '</div>' : '';
            const body = videoBlock || imageBlock
                ? videoBlock + imageBlock
                : '<div class="sg-empty">עדיין אין תמונות או סרטונים לשלב זה</div>';

            const countParts = [];
            if (images) countParts.push(images + ' תמונות');
            if (videos) countParts.push(videos + ' סרטונים');

            const delayClass = i === 0 ? ' reveal-delay-1' : i === 1 ? ' reveal-delay-2' : '';

            return (
                '<section class="sg-section reveal' + delayClass + '" id="section-' + stage.id + '">' +
                '  <div class="sec-card">' +
                '    <div class="sg-section-head">' +
                '      <div class="sg-section-icon"><i class="fas ' + stage.icon + '"></i></div>' +
                '      <h2>' + stage.label + '</h2>' +
                '      <span class="sg-count">' + countParts.join(' · ') + '</span>' +
                '    </div>' +
                body +
                '  </div>' +
                '</section>'
            );
        }).join('');

        wrap.querySelectorAll('.sg-thumb').forEach(function (btn) {
            btn.addEventListener('click', function () {
                openLightbox(btn.dataset.src || '');
            });
        });

        initReveal();
    }

    async function init() {
        const [manifest, config] = await Promise.all([
            fetch('shipment-images.json?_=' + Date.now()).then(function (r) { return r.json(); }),
            fetch('config.json?_=' + Date.now()).then(function (r) { return r.json(); }).catch(function () { return {}; })
        ]);
        const stages = manifest.stages || [];
        const currentStageId = (config.shipment && config.shipment.currentStage) || 'shipped';
        renderTrack(stages, currentStageId);
        renderGallery(stages, currentStageId);
        initReveal();
    }

    document.addEventListener('DOMContentLoaded', function () {
        const closeBtn = $('#sgLightboxClose');
        const lb = $('#sgLightbox');
        if (closeBtn) closeBtn.addEventListener('click', closeLightbox);
        if (lb) {
            lb.addEventListener('click', function (e) {
                if (e.target === lb) closeLightbox();
            });
        }
        init();
    });

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') closeLightbox();
    });
})();
