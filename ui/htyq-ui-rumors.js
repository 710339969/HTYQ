// 流言渲染模块
window.HTYQ_UI_RUMORS = (function() {
    const STATE = window.HTYQ_STATE;
    const utils = window.HTYQ_UTILS;
    const escapeHtml = utils.escapeHtml;

    function render(container) {
        const s = STATE.worldState;
        if (!s.rumors.length) {
            container.innerHTML = '<div class="htyq-card">暂无流言</div>';
            return;
        }
        container.innerHTML = s.rumors.map(r => `
            <div class="htyq-rumor-item">
                <strong>${escapeHtml(r.type || '流言')}</strong><br>
                ${escapeHtml(r.content || r.text || '')}<br>
                <small>范围: ${escapeHtml(r.scope || '未知')} | 可信度: ${escapeHtml(r.credibility || '未知')} | 来源: ${escapeHtml(r.source || '未知')} | 热度: ${escapeHtml(r.heat || '中')}</small>
            </div>
        `).join('');
    }

    return { render };
})();
