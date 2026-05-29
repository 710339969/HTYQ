// 构建推演 Prompt（修复世界书获取，避免 500 错误）
window.HTYQ_EVOLUTION_PROMPT = (function() {
    const STATE = window.HTYQ_STATE;
    const RULES = window.HTYQ_RULES;
    const utils = window.HTYQ_UTILS;
    const authFetch = utils.authFetch;

    // 获取单个世界书的内容
    async function fetchWorldContent(worldName) {
        if (!worldName || typeof worldName !== 'string') return '';
        const cleanName = worldName.trim();
        if (!cleanName) {
            console.warn('[HTYQ] 世界书名称为空，跳过');
            return '';
        }

        try {
            const res = await authFetch('/api/worldinfo/get', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: cleanName })
            });

            if (!res.ok) {
                console.warn(`[HTYQ] 获取世界书 "${cleanName}" 失败，状态码 ${res.status}`);
                // 500 错误时尝试读取错误信息但不抛出，只记录
                let errorText = '';
                try { errorText = await res.text(); } catch(e) {}
                if (errorText) console.warn('[HTYQ] 错误详情:', errorText);
                return '';
            }

            const data = await res.json();
            if (data && data.entries) {
                // 处理数组格式或对象格式的 entries
                let entries = Array.isArray(data.entries) ? data.entries : Object.values(data.entries);
                if (entries && entries.length) {
                    return entries.map(entry => {
                        const title = entry.comment || entry.name || '未命名条目';
                        const content = entry.content || '';
                        return `【${title}】${content}`;
                    }).join('\n');
                }
            }
            console.warn(`[HTYQ] 世界书 "${cleanName}" 没有有效条目`);
            return '';
        } catch(e) {
            console.error(`[HTYQ] 请求世界书 "${cleanName}" 异常`, e);
            return '';
        }
    }

    // 批量获取多个世界书内容
    async function getWorldContentByNames(worldNames) {
        if (!worldNames || !worldNames.length) return '';
        let combined = '';
        for (const name of worldNames) {
            const content = await fetchWorldContent(name);
            if (content) {
                combined += `\n【世界书：${name}】\n${content}\n`;
            }
        }
        return combined;
    }

    // 获取角色卡信息（略作增强）
    async function getCharacterCardInfo() {
        try {
            const ctx = (typeof SillyTavern !== 'undefined' && SillyTavern.getContext) ? SillyTavern.getContext() : getContext();
            const charId = ctx.characterId;
            if (!charId) return '';
            let characters = ctx.characters || [];
            if (!characters.length && window.parent && window.parent.characters) {
                characters = window.parent.characters;
            }
            const char = characters.find(c => c.avatar === charId || c.id === charId);
            if (!char || !char.data) return '';
            const desc = char.data.description || '';
            const personality = char.data.personality || '';
            const scenario = char.data.scenario || '';
            return `\n【当前角色卡设定】\n角色描述：${desc.substring(0, 1500)}\n性格：${personality.substring(0, 800)}\n初始场景：${scenario.substring(0, 800)}\n`;
        } catch(e) {
            console.warn('[HTYQ] 获取角色卡信息失败', e);
            return '';
        }
    }

    // 构建完整的推演 Prompt
    async function buildEvolutionPrompt() {
        const rules = RULES.getFullSystemRules(STATE.globalApiSettings.enabledDlcs);
        let worldContext = '';
        worldContext += await getCharacterCardInfo();

        const ws = STATE.worldState;
        let worldContent = '';

        // 根据用户设置选择世界书来源
        if (ws.autoBindCharacterWorld) {
            try {
                const ctx = (typeof SillyTavern !== 'undefined' && SillyTavern.getContext) ? SillyTavern.getContext() : getContext();
                const charId = ctx.characterId;
                if (charId) {
                    let characters = ctx.characters || [];
                    if (!characters.length && window.parent && window.parent.characters) {
                        characters = window.parent.characters;
                    }
                    const char = characters.find(c => c.avatar === charId || c.id === charId);
                    if (char && char.world) {
                        worldContent = await getWorldContentByNames([char.world]);
                    }
                }
            } catch(e) {
                console.warn('[HTYQ] 自动绑定世界书失败', e);
            }
        } else {
            const selected = ws.selectedWorlds || [];
            if (selected.length) {
                worldContent = await getWorldContentByNames(selected);
            }
        }

        if (worldContent) {
            const maxChars = STATE.globalApiSettings.worldInfoMaxChars || 2000;
            worldContext += `\n【世界书设定】\n${worldContent.substring(0, maxChars)}\n`;
        }

        if (STATE.globalApiSettings.customWorldInfo && STATE.globalApiSettings.customWorldInfo.trim()) {
            worldContext += `\n【额外世界背景】\n${STATE.globalApiSettings.customWorldInfo.substring(0, 2000)}\n`;
        }

        const s = STATE.worldState;
        return `${rules}\n${worldContext}\n当前世界状态：\n轮次：${s.round}\n时间：${s.worldTime || '未知'}\n世界摘要：${s.worldDigest}\n整体氛围：${s.overallAtmosphere}\n驱动事件：${s.drivingEvent}\n星象：${s.astrology}\n治安状况：${s.securityStatus}\n市民情绪：${s.citizenMood}\n直接接触层：${s.directLayer}\n近距离层：${s.nearLayer}\n远距离层：${s.farLayer}\n事件链：${JSON.stringify(s.events.slice(0,5))}\n团体：${JSON.stringify(s.factions.slice(0,5))}\n流言：${JSON.stringify(s.rumors.slice(0,5))}\n声誉：${JSON.stringify(s.reputation)}\n金币：${s.economy.userGold}\n即将发生的日程：${JSON.stringify(s.upcomingSchedules)}\n随机事件：${JSON.stringify(s.randomEvents)}\n请根据上述角色设定和世界书，推演世界新状态，以JSON格式返回，必须包含以下字段：\nworld_time, world_digest, overall_atmosphere, driving_event, citizen_mood, security_status, astrology, direct_layer, near_layer, far_layer, upcoming_schedules(数组，每个元素含time,event,involved,potentialImpact), reputation(四个维度), reputation_change(字符串), rumors(数组，每个对象含content,type,scope,credibility,source,impact,heat), events(数组，每个对象含name,level,stage,currentRound,totalRounds,desc,trigger), factions(数组，每个对象含name,region,current_goal,progress,cohesion,resources,attention_to_user,core_character), faction_relations(数组，每个对象含factionA,factionB,relation,level,trend), economy(包含userGold变化, marketTrend, keyResources数组(每个含name,status), fundsStatus(自然语言), economyVisibility对象(behavior,visible,witnesses,rumorGenerated)), blackMarket(数组，每个对象含type,description,price,method,risk), accidents(数组), active_contact(可选), recent_actions(数组，每个对象含action,noticedBy,consequence), memory_summary(字符串), causal_chain(数组，每个对象含rumorOrEvent,progress,manifestation), random_events(数组，每个对象含description,impact), power_peaks(数组，每个对象含name,group,title,personalGoal,pillars), internal_messages(数组，每个对象含source,group,relation,content,leadRounds), secret_box(对象，含actions数组,assets数组), character_states(数组，每个对象含name,importance,status,emotion,attitudeToUser,relationshipMap), diplomatic_events(数组), pending_foreshadowing(数组), key_values_memo(字符串), round_focus(字符串), cross_region_memo(字符串), blood_feud_memo(字符串)。\n只返回JSON，不要有其他文字。`;
    }

    return { buildEvolutionPrompt };
})();
