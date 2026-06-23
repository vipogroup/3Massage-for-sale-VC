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
        const playBtn = document.getElementById('demoVideoPlay');

        function setPlaying(active) {
            if (wrap) wrap.classList.toggle('is-playing', active);
        }

        function activate() {
            if (!video) return;
            video.muted = false;
            var playPromise = video.play();
            if (playPromise && playPromise.catch) playPromise.catch(function () {});
            setPlaying(true);
        }

        if (!video) return;

        video.play().catch(function () {});

        if (playBtn) {
            playBtn.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                activate();
            });
        }

        video.addEventListener('play', function () {
            if (!video.muted) setPlaying(true);
        });
        video.addEventListener('pause', function () {
            setPlaying(false);
        });
        video.addEventListener('volumechange', function () {
            if (!video.muted && !video.paused) setPlaying(true);
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
