// 编年史渲染模块
window.HTYQ_UI_CHRONICLE = (function() {
    const STATE = window.HTYQ_STATE;
    const utils = window.HTYQ_UTILS;
    const escapeHtml = utils.escapeHtml;

    function render(container) {
        const s = STATE.worldState;
        if (!s.chronicles.length) {
            container.innerHTML = '<div class="htyq-card">暂无编年史记录</div>';
            return;
        }
        container.innerHTML = `<div class="htyq-chronicle-list">${s.chronicles.map(c => `
            <div class="htyq-chronicle-item">
                <div class="htyq-chronicle-title">${escapeHtml(c.title)}</div>
                <div class="htyq-chronicle-content">${escapeHtml(c.content)}</div>
                <div class="htyq-chronicle-date">第${c.round}轮 · ${new Date(c.timestamp).toLocaleString()}</div>
            </div>
        `).join('')}</div>`;
    }

    return { render };
})();
