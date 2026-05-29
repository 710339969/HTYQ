// 已出场角色状态渲染模块
window.HTYQ_UI_CHARACTERS = (function() {
    const STATE = window.HTYQ_STATE;
    const utils = window.HTYQ_UTILS;
    const escapeHtml = utils.escapeHtml;

    function render(container) {
        const s = STATE.worldState;
        if (!s.characterStates.length) {
            container.innerHTML = '<div class="htyq-card">暂无角色状态</div>';
            return;
        }
        container.innerHTML = s.characterStates.map(c => `
            <div class="htyq-card">
                <h3>${escapeHtml(c.name)} <span style="color:#fbbf24;">(${escapeHtml(c.importance || '普通')})</span></h3>
                <div><strong>状态:</strong> ${escapeHtml(c.status || '未知')}</div>
                <div><strong>情绪:</strong> ${escapeHtml(c.emotion || '平静')}</div>
                <div><strong>对主角态度:</strong> ${escapeHtml(c.attitudeToUser || '中立')}</div>
                <div><strong>关系网:</strong> ${escapeHtml(c.relationshipMap || '无')}</div>
            </div>
        `).join('');
    }

    return { render };
})();
