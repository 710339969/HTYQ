// 外交事件渲染模块
window.HTYQ_UI_DIPLOMACY = (function() {
    const STATE = window.HTYQ_STATE;
    const utils = window.HTYQ_UTILS;
    const escapeHtml = utils.escapeHtml;

    function render(container) {
        const s = STATE.worldState;
        if (!s.diplomaticEvents.length) {
            container.innerHTML = '<div class="htyq-card">本轮无外交事件</div>';
            return;
        }
        container.innerHTML = s.diplomaticEvents.map(e => `
            <div class="htyq-card">
                <h3>${escapeHtml(e.name || '外交事件')}</h3>
                <div>${escapeHtml(e.description || '')}</div>
            </div>
        `).join('');
    }

    return { render };
})();
