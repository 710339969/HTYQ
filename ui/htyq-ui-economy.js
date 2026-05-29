// 经济摘要渲染模块
window.HTYQ_UI_ECONOMY = (function() {
    const STATE = window.HTYQ_STATE;
    const utils = window.HTYQ_UTILS;
    const escapeHtml = utils.escapeHtml;

    function render(container) {
        const s = STATE.worldState;
        const vis = s.economy.economyVisibility || {};
        container.innerHTML = `
            <div class="htyq-card"><h3>💰 玩家资金</h3><div>${s.economy.userGold} 金币</div><div>资金状况: ${escapeHtml(s.economy.fundsStatus)}</div></div>
            <div class="htyq-card"><h3>📈 市场趋势</h3><div>${escapeHtml(s.economy.marketTrend)}</div></div>
            <div class="htyq-card"><h3>📦 关键物资</h3><ul>${(s.economy.keyResources || []).map(k => `<li>${escapeHtml(k.name)}: ${escapeHtml(k.status)}</li>`).join('') || '<li>无</li>'}</ul></div>
            <div class="htyq-card"><h3>👁️ 经济事件可见性</h3><div>行为: ${escapeHtml(vis.behavior || '无')}</div><div>可见: ${vis.visible ? '是' : '否'}</div><div>目击者: ${escapeHtml(vis.witnesses?.join(', ') || '无')}</div><div>已产生流言: ${vis.rumorGenerated ? '是' : '否'}</div></div>
        `;
    }

    return { render };
})();
