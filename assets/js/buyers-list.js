(function () {
    const COLOR_CLASS = {
        'חום': 'is-brown',
        "בז'": 'is-beige',
        'בז': 'is-beige',
        'כחול': 'is-blue'
    };

    function formatDate(iso) {
        if (!iso) return '';
        var parts = String(iso).slice(0, 10).split('-');
        if (parts.length !== 3) return iso;
        return parts[2] + '/' + parts[1] + '/' + parts[0];
    }

    function renderBuyers(buyers, maxVisible) {
        var list = document.getElementById('lpBuyersList');
        var section = document.getElementById('lpBuyersSection');
        if (!list || !section) return;

        var items = (buyers || [])
            .slice()
            .sort(function (a, b) { return Number(b.number) - Number(a.number); })
            .slice(0, maxVisible || 12);

        if (!items.length) {
            section.hidden = true;
            return;
        }

        section.hidden = false;
        list.innerHTML = items.map(function (b) {
            var colorClass = COLOR_CLASS[b.color] || 'is-neutral';
            return (
                '<li class="lp-buyer-row">' +
                '<span class="lp-buyer-num">#' + b.number + '</span>' +
                '<span class="lp-buyer-name">' + b.name + '</span>' +
                '<span class="lp-buyer-color ' + colorClass + '">' + (b.color || '—') + '</span>' +
                '<span class="lp-buyer-date">' + formatDate(b.date) + '</span>' +
                '</li>'
            );
        }).join('');
    }

    async function loadBuyers(config) {
        var maxVisible = (config && config.buyersList && config.buyersList.maxVisible) || 12;
        if (config && config.buyersList && config.buyersList.enabled === false) {
            var section = document.getElementById('lpBuyersSection');
            if (section) section.hidden = true;
            return;
        }

        var buyers = [];
        if (typeof StockApi !== 'undefined' && StockApi.fetchBuyers) {
            buyers = await StockApi.fetchBuyers();
        }
        if (!buyers.length) {
            try {
                var res = await fetch('buyers.json?_=' + Date.now(), { cache: 'no-store' });
                if (res.ok) {
                    var data = await res.json();
                    buyers = data.buyers || [];
                }
            } catch (err) {
                console.warn('BuyersList: buyers.json not loaded', err);
            }
        }
        renderBuyers(buyers, maxVisible);
    }

    document.addEventListener('vipo:config-loaded', function (e) {
        loadBuyers(e.detail || {});
    });

    document.addEventListener('vipo:stock-updated', function () {
        fetch('config.json?_=' + Date.now())
            .then(function (r) { return r.json(); })
            .then(loadBuyers)
            .catch(function () { loadBuyers({}); });
    });
})();
