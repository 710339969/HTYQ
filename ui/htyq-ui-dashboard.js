// 仪表盘渲染模块
window.HTYQ_UI_DASHBOARD = (function() {
    const STATE = window.HTYQ_STATE;
    const utils = window.HTYQ_UTILS;
    const escapeHtml = utils.escapeHtml;

    function render(container) {
        const s = STATE.worldState;
        const eco = s.economy;
        const currencyDisplay = (eco.currencyName && eco.currencyAmount !== null) 
            ? `${eco.currencyAmount} ${eco.currencyName}` 
            : (eco.currencyName ? `0 ${eco.currencyName}` : '未定义货币');

        container.innerHTML = `
            <div class="htyq-card"><h3>⏰ 时间</h3><div>${escapeHtml(s.worldTime || '未知')}</div></div>
            <div class="htyq-card"><h3>🌍 世界状态摘要</h3><div class="htyq-digest">${escapeHtml(s.worldDigest)}</div></div>
            <div class="htyq-card"><h3>📌 整体氛围 / 驱动事件</h3><div>${escapeHtml(s.overallAtmosphere)} | ${escapeHtml(s.drivingEvent)}</div></div>
            <div class="htyq-card"><h3>😊 市民情绪 / 治安状况</h3><div>${escapeHtml(s.citizenMood)} | ${escapeHtml(s.securityStatus)}</div></div>
            <div class="htyq-card"><h3>👁️ 直接接触层</h3><div>${escapeHtml(s.directLayer)}</div></div>
            <div class="htyq-card"><h3>🏘️ 近距离层</h3><div>${escapeHtml(s.nearLayer)}</div></div>
            <div class="htyq-card"><h3>🌄 远距离层</h3><div>${escapeHtml(s.farLayer)}</div></div>
            <div class="htyq-card"><h3>🔥 活跃事件链</h3><ul>${s.events.slice(0,5).map(e => {
                const remaining = (e.totalRounds && e.currentRound) ? (e.totalRounds - e.currentRound) : '?';
                return `<li>【${escapeHtml(e.name)}】${escapeHtml(e.stage || '萌芽')} (剩余 ${remaining} 轮) — ${escapeHtml(e.desc || '')}</li>`;
            }).join('') || '<li>无</li>'}</ul></div>
            <div class="htyq-card"><h3>📅 即将发生的日程</h3><ul>${s.upcomingSchedules.map(u => `<li>${escapeHtml(u.time)}：${escapeHtml(u.event)} → ${escapeHtml(u.involved)}</li>`).join('') || '<li>无</li>'}</ul></div>
            <div class="htyq-card"><h3>📜 近期玩家行动记录</h3><ul>${s.recentActions.map(a => `<li>${escapeHtml(a.action)} → 被 ${escapeHtml(a.noticedBy)} 注意到 → ${escapeHtml(a.consequence)}</li>`).join('') || '<li>无</li>'}</ul></div>
            <div class="htyq-card"><h3>🎲 随机事件</h3><ul>${s.randomEvents.map(r => `<li>${escapeHtml(r.description)}</li>`).join('') || '<li>无</li>'}</ul></div>
            <div class="htyq-card"><h3>⭐ 声誉</h3><div>江湖:${s.reputation.jianghu} 官府:${s.reputation.official} 民间:${s.reputation.folk} 黑道:${s.reputation.underworld}</div><div>变化: ${escapeHtml(s.reputationChange || '无')}</div></div>
            <div class="htyq-card"><h3>🏛️ 权力顶点</h3><ul>${s.powerPeaks.map(p => `<li>${escapeHtml(p.name)} (${escapeHtml(p.group)}) — ${escapeHtml(p.personalGoal)}</li>`).join('') || '<li>无</li>'}</ul></div>
            <div class="htyq-card"><h3>💰 经济摘要</h3><div>玩家货币: ${currencyDisplay}</div><div>资金状况: ${escapeHtml(eco.fundsStatus)}</div><div>市场趋势: ${escapeHtml(eco.marketTrend)}</div><div>关键物资: ${(eco.keyResources || []).map(k => `${k.name}:${k.status}`).join(', ') || '无'}</div></div>
            <div class="htyq-card"><h3>💬 内部消息</h3><ul>${s.internalMessages.map(m => `<li>【${escapeHtml(m.source)}】${escapeHtml(m.content)} (领先${m.leadRounds}轮)</li>`).join('') || '<li>无</li>'}</ul></div>
            <div class="htyq-card"><h3>📝 本轮重点</h3><div>${escapeHtml(s.roundFocus || '无')}</div></div>
        `;
    }

    return { render };
})();
