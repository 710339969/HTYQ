// 势力渲染模块
window.HTYQ_UI_FACTIONS = (function() {
    const STATE = window.HTYQ_STATE;
    const utils = window.HTYQ_UTILS;
    const escapeHtml = utils.escapeHtml;

    function render(container) {
        const s = STATE.worldState;
        if (!s.factions.length) {
            container.innerHTML = '<div class="htyq-card">暂无势力</div>';
            return;
        }
        container.innerHTML = s.factions.map(f => `
            <div class="htyq-faction-item">
                <strong>${escapeHtml(f.name)}</strong> (区域: ${escapeHtml(f.region || '未知')})<br>
                目标: ${escapeHtml(f.current_goal || '无')}<br>
                进度: ${escapeHtml(f.progress || '未知')}<br>
                凝聚力: ${escapeHtml(f.cohesion || '未知')} | 资源: ${escapeHtml(f.resources || '未知')}<br>
                对主角关注: ${escapeHtml(f.attention_to_user || '无')}<br>
                核心人物: ${escapeHtml(f.core_character || '无')}
            </div>
        `).join('');
    }

    return { render };
})();
