/**
 * טעינת תוכן מלא מדף הנחיתה + אתחול גלריה, וידאו, config
 */
(function () {
    const IMAGES = ['../assets/images/1.webp', '../assets/images/2.webp', '../assets/images/3.webp'];
    let slideIndex = 0;
    let slideTimer = null;

    function initGallery() {
        const mainImage = document.getElementById('mainImage');
        const mainContainer = document.querySelector('.main-image-container');
        if (!mainImage) return;

        function show(i) {
            mainImage.src = IMAGES[i % IMAGES.length];
            slideIndex = i;
        }

        function next() {
            show(slideIndex + 1);
        }

        function start() {
            stop();
            slideTimer = setInterval(next, 3000);
        }

        function stop() {
            if (slideTimer) {
                clearInterval(slideTimer);
                slideTimer = null;
            }
        }

        show(0);
        start();

        if (mainContainer) {
            mainContainer.addEventListener('mouseenter', stop);
            mainContainer.addEventListener('mouseleave', start);
            mainContainer.addEventListener('touchstart', stop);
            mainContainer.addEventListener('touchend', start);
        }
    }

    function initVideo() {
        const video = document.getElementById('demoVideo');
        const wrap = document.getElementById('demoVideoWrap');
        const switchBtn = document.getElementById('demoVideoSwitch');
        const hint = document.querySelector('.lp-demo-video-hint');
        var paths = { preview: '../assets/1.mp4', full: '../assets/d2.mp4' };

        function startPreview() {
            if (!video || !wrap) return;
            video.src = paths.preview;
            video.muted = true;
            video.loop = true;
            video.removeAttribute('controls');
            video.playsInline = true;
            wrap.classList.add('is-preview');
            wrap.classList.remove('is-full');
            video.play().catch(function () {});
        }

        function switchToFull() {
            if (!video || !wrap || wrap.classList.contains('is-full')) return;
            video.pause();
            video.src = paths.full;
            video.muted = false;
            video.loop = true;
            video.setAttribute('controls', '');
            video.load();
            wrap.classList.remove('is-preview');
            wrap.classList.add('is-full');
            if (hint) hint.textContent = 'צופים בסרטון המלא';
            video.play().catch(function () {});
        }

        if (!video || !wrap) return;

        fetch('../config.json')
            .then(function (r) { return r.json(); })
            .then(function (cfg) {
                if (cfg.demoVideo) {
                    if (cfg.demoVideo.preview) paths.preview = '../' + cfg.demoVideo.preview.replace(/^\/?/, '');
                    if (cfg.demoVideo.full) paths.full = '../' + cfg.demoVideo.full.replace(/^\/?/, '');
                }
                startPreview();
            })
            .catch(function () {
                startPreview();
            });

        if (switchBtn) {
            switchBtn.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                switchToFull();
            });
        }

        wrap.addEventListener('click', function (e) {
            if (wrap.classList.contains('is-full')) return;
            if (switchBtn && (e.target === switchBtn || switchBtn.contains(e.target))) return;
            switchToFull();
        });
    }

    function initPulse() {
        document.querySelectorAll('.join-group-btn').forEach(function (btn) {
            btn.addEventListener('mouseover', function () { this.classList.add('pulse'); });
            btn.addEventListener('mouseout', function () { this.classList.remove('pulse'); });
        });
    }

    function loadConfig() {
        return fetch('../config.json')
            .then(function (r) { return r.json(); })
            .then(function (c) {
                document.dispatchEvent(new CustomEvent('vipo:config-loaded', { detail: c }));
                return c;
            })
            .catch(function () {
                document.dispatchEvent(new CustomEvent('vipo:config-loaded', { detail: {} }));
            });
    }

    function rebindShare() {
        var btn = document.querySelector('.share-button');
        var overlay = document.getElementById('shareOverlay');
        if (!btn || !overlay || btn.dataset.demoShareBound) return;
        btn.dataset.demoShareBound = '1';
        btn.addEventListener('click', function (e) {
            e.preventDefault();
            overlay.hidden = false;
            document.body.classList.add('share-open');
        });
    }

    function afterContentLoaded() {
        initGallery();
        initVideo();
        initPulse();
        rebindShare();
        loadConfig();
        if (typeof startCountdown === 'function') {
            startCountdown();
        }
        window.scrollTo(0, 0);
        document.dispatchEvent(new Event('demo:content-loaded'));
    }

    function loadLanding() {
        const root = document.getElementById('demo-root');
        if (!root) return Promise.reject(new Error('demo-root missing'));

        return fetch('partials/full-landing.html')
            .then(function (r) {
                if (!r.ok) throw new Error('Failed to load landing content');
                return r.text();
            })
            .then(function (html) {
                root.innerHTML = html;
                afterContentLoaded();
            });
    }

    document.addEventListener('DOMContentLoaded', function () {
        loadLanding().catch(function (err) {
            console.error(err);
            var root = document.getElementById('demo-root');
            if (root) {
                root.innerHTML = '<p style="padding:24px;text-align:center;color:#e11d48">שגיאה בטעינת התוכן. נסה לפתוח דרך שרת מקומי או GitHub Pages.</p>';
            }
        });
    });
})();
