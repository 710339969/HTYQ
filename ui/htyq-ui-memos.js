// 备忘页面（待爆发、待回收、关键数值、血仇等）
window.HTYQ_UI_MEMOS = (function() {
    const STATE = window.HTYQ_STATE;
    const utils = window.HTYQ_UTILS;
    const escapeHtml = utils.escapeHtml;

    function render(container) {
        const s = STATE.worldState;
        container.innerHTML = `
            <div class="htyq-card"><h3>⏳ 待爆发事件链</h3><ul>${s.pendingEvents.map(e => `<li>${escapeHtml(e)}</li>`).join('') || '<li>无</li>'}</ul></div>
            <div class="htyq-card"><h3>📌 待回收伏笔</h3><ul>${s.pendingForeshadowing.map(f => `<li>${escapeHtml(f)}</li>`).join('') || '<li>无</li>'}</ul></div>
            <div class="htyq-card"><h3>🔢 关键数值备忘</h3><div>${escapeHtml(s.keyValuesMemo || '无')}</div></div>
            <div class="htyq-card"><h3>🩸 血仇备忘</h3><div>${escapeHtml(s.bloodFeudMemo || '无')}</div></div>
            <div class="htyq-card"><h3>🌍 跨区域角色备忘</h3><div>${escapeHtml(s.crossRegionMemo || '无')}</div></div>
        `;
    }

    return { render };
})();
