/**
 * מלאי + הזמנות — Google Apps Script
 * מקורות URL (בסדר עדיפות): localStorage → order-api.json → config.json
 */
const StockApi = (function () {
    const LS_URL_KEY = 'vipo-order-api-url';
    let appConfig = null;
    let onStockChange = null;
    let pollTimer = null;
    let lastStock = null;

    function isEnabled() {
        const api = appConfig && appConfig.orderApi;
        return !!(api && api.enabled && api.url && String(api.url).includes('script.google.com'));
    }

    function apiUrl() {
        return (appConfig && appConfig.orderApi && appConfig.orderApi.url) || '';
    }

    async function resolveConfig(baseConfig) {
        const cfg = JSON.parse(JSON.stringify(baseConfig || {}));
        cfg.orderApi = cfg.orderApi || { enabled: false, url: '' };

        try {
            const res = await fetch('order-api.json?_=' + Date.now(), { cache: 'no-store' });
            if (res.ok) {
                const overlay = await res.json();
                if (overlay && overlay.url) {
                    cfg.orderApi.url = overlay.url;
                    cfg.orderApi.enabled = overlay.enabled !== false;
                }
            }
        } catch (err) {
            console.warn('StockApi: order-api.json not loaded', err);
        }

        try {
            const local = localStorage.getItem(LS_URL_KEY);
            if (local && local.includes('script.google.com')) {
                cfg.orderApi.url = local;
                cfg.orderApi.enabled = true;
            }
        } catch (err) {
            /* ignore */
        }

        return cfg;
    }

    function applyStock(totalUnits, soldUnits) {
        lastStock = { totalUnits: Number(totalUnits), soldUnits: Number(soldUnits) };
        if (typeof onStockChange === 'function') {
            onStockChange(lastStock.totalUnits, lastStock.soldUnits);
        }
        document.dispatchEvent(new CustomEvent('vipo:stock-updated', {
            detail: { ...lastStock, remaining: Math.max(0, lastStock.totalUnits - lastStock.soldUnits) }
        }));
    }

    function fallbackFromConfig() {
        if (appConfig && appConfig.totalUnits != null && appConfig.soldUnits != null) {
            applyStock(appConfig.totalUnits, appConfig.soldUnits);
        }
    }

    async function fetchStock() {
        if (!isEnabled()) {
            fallbackFromConfig();
            return lastStock;
        }
        try {
            const sep = apiUrl().includes('?') ? '&' : '?';
            const res = await fetch(
                `${apiUrl()}${sep}action=stock&_=${Date.now()}`,
                { cache: 'no-store', redirect: 'follow' }
            );
            const text = await res.text();
            let data;
            try {
                data = JSON.parse(text);
            } catch (parseErr) {
                throw new Error('תשובה לא תקינה מהשרת');
            }
            if (data.totalUnits != null && data.soldUnits != null) {
                applyStock(data.totalUnits, data.soldUnits);
            }
            return lastStock;
        } catch (err) {
            console.warn('StockApi: fetch failed', err);
            fallbackFromConfig();
            return lastStock;
        }
    }

    async function submitOrder(order) {
        if (!isEnabled()) {
            return { ok: false, localOnly: true, message: 'whatsapp_only' };
        }
        const res = await fetch(apiUrl(), {
            method: 'POST',
            redirect: 'follow',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({
                action: 'order',
                name: order.name,
                phone: order.phone,
                city: order.city || '',
                note: order.note || '',
                product: (appConfig && appConfig.productName) || ''
            })
        });
        const text = await res.text();
        let data;
        try {
            data = JSON.parse(text);
        } catch (e) {
            throw new Error('שגיאת שרת — בדוק את כתובת Web App');
        }
        if (data.ok && data.totalUnits != null && data.soldUnits != null) {
            applyStock(data.totalUnits, data.soldUnits);
        }
        return data;
    }

    function startPolling(ms) {
        if (pollTimer) {
            clearInterval(pollTimer);
        }
        if (!isEnabled()) {
            return;
        }
        pollTimer = setInterval(fetchStock, ms || 30000);
    }

    function init(config, updateCallback) {
        onStockChange = updateCallback;
        resolveConfig(config).then((merged) => {
            appConfig = merged;
            if (isEnabled()) {
                fetchStock().finally(() => startPolling(30000));
            } else if (typeof StockLive !== 'undefined') {
                StockLive.init(config, updateCallback);
            } else {
                fallbackFromConfig();
            }
        });
    }

    function saveUrl(url) {
        try {
            localStorage.setItem(LS_URL_KEY, url);
        } catch (e) {
            /* ignore */
        }
        if (appConfig) {
            appConfig.orderApi = appConfig.orderApi || {};
            appConfig.orderApi.url = url;
            appConfig.orderApi.enabled = true;
        }
    }

    return {
        init,
        fetchStock,
        submitOrder,
        saveUrl,
        isEnabled,
        getLastStock: () => lastStock,
        getRemaining: () => {
            if (!lastStock) return null;
            return Math.max(0, lastStock.totalUnits - lastStock.soldUnits);
        }
    };
})();
