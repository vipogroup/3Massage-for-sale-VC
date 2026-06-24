(function () {
    function renderStars(n) {
        var count = Math.max(0, Math.min(5, Number(n) || 5));
        var out = '';
        for (var i = 0; i < 5; i++) {
            out += '<i class="fas fa-star' + (i < count ? '' : ' lp-review-star-off') + '" aria-hidden="true"></i>';
        }
        return out;
    }

    function renderReviews(items) {
        var section = document.getElementById('lpReviewsSection');
        var list = document.getElementById('lpReviewsList');
        if (!section || !list) return;

        if (!items || !items.length) {
            section.hidden = true;
            return;
        }

        section.hidden = false;
        list.innerHTML = items.map(function (r) {
            return (
                '<article class="lp-review-card">' +
                '<div class="lp-review-stars" aria-label="' + (r.stars || 5) + ' כוכבים">' + renderStars(r.stars) + '</div>' +
                '<p class="lp-review-text">"' + r.text + '"</p>' +
                '<footer class="lp-review-author">' + r.name + '</footer>' +
                '</article>'
            );
        }).join('');
    }

    async function loadReviews(config) {
        if (config && config.reviews && config.reviews.enabled === false) {
            renderReviews([]);
            return;
        }

        var items = (config && config.reviews && config.reviews.items) || [];
        if (items.length) {
            renderReviews(items);
            return;
        }

        try {
            var res = await fetch('reviews.json?_=' + Date.now(), { cache: 'no-store' });
            if (res.ok) {
                var data = await res.json();
                renderReviews(data.reviews || []);
                return;
            }
        } catch (err) {
            console.warn('Reviews: reviews.json not loaded', err);
        }
        renderReviews([]);
    }

    document.addEventListener('vipo:config-loaded', function (e) {
        loadReviews(e.detail || {});
    });
})();
