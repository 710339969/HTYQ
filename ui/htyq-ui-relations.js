// 团体关系渲染模块
window.HTYQ_UI_RELATIONS = (function() {
    const STATE = window.HTYQ_STATE;
    const utils = window.HTYQ_UTILS;
    const escapeHtml = utils.escapeHtml;

    function render(container) {
        const s = STATE.worldState;
        if (!s.factionRelations.length) {
            container.innerHTML = '<div class="htyq-card">暂无团体关系</div>';
            return;
        }
        container.innerHTML = s.factionRelations.map(r => `
            <div class="htyq-relation-item">
                ${escapeHtml(r.factionA)} ↔ ${escapeHtml(r.factionB)}<br>
                关系: ${escapeHtml(r.relation)} (${r.level || '?'}/8) | 趋势: ${escapeHtml(r.trend || '稳定')}
            </div>
        `).join('');
    }

    return { render };
})();
