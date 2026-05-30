// 演化核心：应用推演数据到世界状态、环境特效、自动生成pendingEvents
window.HTYQ_EVOLUTION_CORE = (function() {
    const STATE = window.HTYQ_STATE;
    const utils = window.HTYQ_UTILS;

    function applyEvolution(data) {
        if (!data || typeof data !== 'object') {
            console.error('推演数据无效:', data);
            utils.showFloatingWarning('推演返回数据无效，请检查模型输出', true);
            return false;
        }

        // ===== 字段映射：兼容模型返回的 groups/characters =====
        if (data.groups && !data.factions) {
            data.factions = data.groups;
        }
        if (data.characters && !data.character_states) {
            data.character_states = data.characters;
        }

        const s = STATE.worldState;
        let changed = false;

        // 基础字段
        if (data.world_digest && typeof data.world_digest === 'string') { s.worldDigest = data.world_digest; changed = true; }
        if (data.astrology && typeof data.astrology === 'string') { s.astrology = data.astrology; changed = true; }
        if (data.reputation && typeof data.reputation === 'object') { s.reputation = { ...s.reputation, ...data.reputation }; changed = true; }
        if (data.reputation_change) { s.reputationChange = data.reputation_change; changed = true; }
        if (data.world_time) { s.worldTime = data.world_time; changed = true; }
        if (data.overall_atmosphere) { s.overallAtmosphere = data.overall_atmosphere; changed = true; }
        if (data.driving_event) { s.drivingEvent = data.driving_event; changed = true; }
        if (data.citizen_mood) { s.citizenMood = data.citizen_mood; changed = true; }
        if (data.security_status) { s.securityStatus = data.security_status; changed = true; }
        if (data.direct_layer) { s.directLayer = data.direct_layer; changed = true; }
        if (data.near_layer) { s.nearLayer = data.near_layer; changed = true; }
        if (data.far_layer) { s.farLayer = data.far_layer; changed = true; }
        if (Array.isArray(data.upcoming_schedules)) { s.upcomingSchedules = data.upcoming_schedules; changed = true; }
        if (Array.isArray(data.recent_actions)) { s.recentActions = data.recent_actions; changed = true; }
        if (data.memory_summary) { s.memorySummary = data.memory_summary; changed = true; }
        if (Array.isArray(data.causal_chain)) { s.causalChain = data.causal_chain; changed = true; }
        if (Array.isArray(data.random_events)) { s.randomEvents = data.random_events; changed = true; }
        if (Array.isArray(data.power_peaks)) { s.powerPeaks = data.power_peaks; changed = true; }
        if (Array.isArray(data.internal_messages)) { s.internalMessages = data.internal_messages; changed = true; }
        if (data.secret_box) { s.secretBox = { ...s.secretBox, ...data.secret_box }; changed = true; }
        if (Array.isArray(data.character_states)) { s.characterStates = data.character_states; changed = true; }
        if (Array.isArray(data.diplomatic_events)) { s.diplomaticEvents = data.diplomatic_events; changed = true; }
        if (Array.isArray(data.pending_foreshadowing)) { s.pendingForeshadowing = data.pending_foreshadowing; changed = true; }
        if (data.key_values_memo) { s.keyValuesMemo = data.key_values_memo; changed = true; }
        if (data.round_focus) { s.roundFocus = data.round_focus; changed = true; }
        if (data.cross_region_memo) { s.crossRegionMemo = data.cross_region_memo; changed = true; }
        if (data.blood_feud_memo) { s.bloodFeudMemo = data.blood_feud_memo; changed = true; }

        // 数组合并
        if (Array.isArray(data.rumors) && data.rumors.length) { s.rumors = [...data.rumors, ...s.rumors].slice(0, 30); changed = true; }
        if (Array.isArray(data.events)) {
            for (const e of data.events) {
                if (!e.name) continue;
                const existing = s.events.find(ev => ev.name === e.name);
                if (existing) Object.assign(existing, e);
                else s.events.unshift(e);
            }
            s.events = s.events.slice(0, 20);
            changed = true;
        }
        if (Array.isArray(data.factions)) {
            for (const f of data.factions) {
                if (!f.name) continue;
                const existing = s.factions.find(fa => fa.name === f.name);
                if (existing) Object.assign(existing, f);
                else s.factions.unshift(f);
            }
            s.factions = s.factions.slice(0, 15);
            changed = true;
        }
        if (Array.isArray(data.faction_relations)) {
            for (const r of data.faction_relations) {
                if (!r.factionA || !r.factionB) continue;
                const existing = s.factionRelations.find(rel => rel.factionA === r.factionA && rel.factionB === r.factionB);
                if (existing) Object.assign(existing, r);
                else s.factionRelations.unshift(r);
            }
            s.factionRelations = s.factionRelations.slice(0, 30);
            changed = true;
        }
        if (data.economy) {
            if (typeof data.economy.currencyName === 'string') { s.economy.currencyName = data.economy.currencyName; changed = true; }
            if (typeof data.economy.currencyAmount === 'number') { 
                if (s.economy.currencyAmount === null) s.economy.currencyAmount = data.economy.currencyAmount;
                else s.economy.currencyAmount += data.economy.currencyAmount;
                changed = true;
            }
            if (data.economy.marketTrend) { s.economy.marketTrend = data.economy.marketTrend; changed = true; }
            if (Array.isArray(data.economy.keyResources)) { s.economy.keyResources = data.economy.keyResources; changed = true; }
            if (data.economy.fundsStatus) { s.economy.fundsStatus = data.economy.fundsStatus; changed = true; }
            if (data.economy.economyVisibility) { s.economy.economyVisibility = { ...s.economy.economyVisibility, ...data.economy.economyVisibility }; changed = true; }
        }
        if (Array.isArray(data.blackMarket)) { s.blackMarket = [...s.blackMarket, ...data.blackMarket].slice(0, 15); changed = true; }
        if (Array.isArray(data.accidents)) {
            for (const acc of data.accidents) {
                if (acc.level === '重度' || acc.level === '中度') {
                    utils.triggerEnvironmentVFX(acc.level);
                    utils.showFloatingWarning(`⚠️ 意外事件: ${acc.desc} (${acc.level})`, true);
                }
            }
            changed = true;
        }
        if (data.active_contact) { changed = true; }

        // 自动生成 pendingEvents
        const pending = s.events.filter(e => {
            const remaining = (e.totalRounds && e.currentRound) ? (e.totalRounds - e.currentRound) : -1;
            return remaining >= 0 && remaining <= 3;
        }).map(e => `${e.name}（剩余${(e.totalRounds - e.currentRound)}轮）`);
        if (pending.length) {
            s.pendingEvents = pending;
            changed = true;
        }

        // 记录每个字段的更新轮次
        const round = s.round;
        if (!s.lastUpdated) s.lastUpdated = {};
        for (let key in data) {
            if (data[key] !== undefined && key !== 'active_contact') {
                s.lastUpdated[key] = round;
            }
        }

        if (!changed) {
            console.warn('推演未产生任何有效数据更新', data);
            utils.showFloatingWarning('推演返回数据无有效变更，请检查模型输出', true);
            return false;
        }
        STATE.addChronicle('world_summary', `第${s.round + 1}轮推演`, s.worldDigest.substring(0, 200));
        STATE.saveWorldState();
        return true;
    }

    return { applyEvolution };
})();
