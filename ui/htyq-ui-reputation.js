// 声誉系统渲染模块
window.HTYQ_UI_REPUTATION = (function() {
    const STATE = window.HTYQ_STATE;
    const utils = window.HTYQ_UTILS;
    const escapeHtml = utils.escapeHtml;

    function render(container) {
        const s = STATE.worldState;
        container.innerHTML = `
            <div class="htyq-card">
                <h3>⭐ 四维声誉</h3>
                <div class="htyq-reputation-grid">
                    <div>江湖声望: ${s.reputation.jianghu}</div>
                    <div>官府评价: ${s.reputation.official}</div>
                    <div>民间口碑: ${s.reputation.folk}</div>
                    <div>黑道地位: ${s.reputation.underworld}</div>
                </div>
                <div>本轮变化: ${escapeHtml(s.reputationChange || '无')}</div>
            </div>
        `;
    }

    return { render };
})();
