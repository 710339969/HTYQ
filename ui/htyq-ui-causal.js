// 因果链渲染模块
window.HTYQ_UI_CAUSAL = (function() {
    const STATE = window.HTYQ_STATE;
    const utils = window.HTYQ_UTILS;
    const escapeHtml = utils.escapeHtml;

    function render(container) {
        const s = STATE.worldState;
        if (!s.causalChain.length) {
            container.innerHTML = '<div class="htyq-card">暂无因果链追踪</div>';
            return;
        }
        container.innerHTML = s.causalChain.map(c => `
            <div class="htyq-card">
                <h3>🔗 ${escapeHtml(c.rumorOrEvent)}</h3>
                <div><strong>进展:</strong> ${escapeHtml(c.progress)}</div>
                <div><strong>本轮体现:</strong> ${escapeHtml(c.manifestation)}</div>
            </div>
        `).join('');
    }

    return { render };
})();
