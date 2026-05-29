// 黑市渲染模块
window.HTYQ_UI_BLACKMARKET = (function() {
    const STATE = window.HTYQ_STATE;
    const utils = window.HTYQ_UTILS;
    const escapeHtml = utils.escapeHtml;

    function render(container) {
        const s = STATE.worldState;
        if (!s.blackMarket.length) {
            container.innerHTML = '<div class="htyq-card">暂无黑市交易</div>';
            return;
        }
        container.innerHTML = s.blackMarket.map(item => `
            <div class="htyq-blackmarket-item">
                <strong>${escapeHtml(item.type)}</strong><br>
                ${escapeHtml(item.description)}<br>
                价格: ${escapeHtml(item.price)} | 风险: ${escapeHtml(item.risk)}
            </div>
        `).join('');
    }

    return { render };
})();
