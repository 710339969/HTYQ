// 经济摘要渲染模块
window.HTYQ_UI_ECONOMY = (function() {
    const STATE = window.HTYQ_STATE;
    const utils = window.HTYQ_UTILS;
    const escapeHtml = utils.escapeHtml;

    function render(container) {
        const s = STATE.worldState;
        const eco = s.economy;
        const vis = eco.economyVisibility || {};
        const currencyDisplay = (eco.currencyName && eco.currencyAmount !== null) 
            ? `${eco.currencyAmount} ${eco.currencyName}` 
            : (eco.currencyName ? `0 ${eco.currencyName}` : '未定义货币');

        container.innerHTML = `
            <div class="htyq-card"><h3>💰 玩家货币</h3><div>${currencyDisplay}</div><div>资金状况: ${escapeHtml(eco.fundsStatus)}</div></div>
            <div class="htyq-card"><h3>📈 市场趋势</h3><div>${escapeHtml(eco.marketTrend)}</div></div>
            <div class="htyq-card"><h3>📦 关键物资</h3><ul>${(eco.keyResources || []).map(k => `<li>${escapeHtml(k.name)}: ${escapeHtml(k.status)}</li>`).join('') || '<li>无</li>'}</ul></div>
            <div class="htyq-card"><h3>👁️ 经济事件可见性</h3><div>行为: ${escapeHtml(vis.behavior || '无')}</div><div>可见: ${vis.visible ? '是' : '否'}</div><div>目击者: ${escapeHtml(vis.witnesses?.join(', ') || '无')}</div><div>已产生流言: ${vis.rumorGenerated ? '是' : '否'}</div></div>
        `;
    }

    return { render };
})();
