// 事件链渲染模块
window.HTYQ_UI_EVENTS = (function() {
    const STATE = window.HTYQ_STATE;
    const utils = window.HTYQ_UTILS;
    const escapeHtml = utils.escapeHtml;

    function render(container) {
        const s = STATE.worldState;
        if (!s.events.length) {
            container.innerHTML = '<div class="htyq-card">暂无事件链</div>';
            return;
        }
        container.innerHTML = s.events.map(e => {
            const remaining = (e.totalRounds && e.currentRound) ? (e.totalRounds - e.currentRound) : '?';
            return `
                <div class="htyq-event-item">
                    <strong>${escapeHtml(e.name)}</strong> (Lv.${e.level || '?'})<br>
                    阶段: ${escapeHtml(e.stage || '萌芽')} (${e.currentRound || 0}/${e.totalRounds || '?'})<br>
                    <span style="color: #fbbf24;">剩余传导轮数: ${remaining}</span><br>
                    触发条件: ${escapeHtml(e.trigger || '未知')}<br>
                    描述: ${escapeHtml(e.desc || '')}
                </div>
            `;
        }).join('');
    }

    return { render };
})();
