// 构建推演 Prompt（使用手动导入的世界书）
window.HTYQ_EVOLUTION_PROMPT = (function() {
    const STATE = window.HTYQ_STATE;
    const RULES = window.HTYQ_RULES;
    const utils = window.HTYQ_UTILS;

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

    // 从手动导入的世界书列表中获取内容
    function getManualWorldsContent(manualWorlds, maxChars) {
        if (!manualWorlds || !manualWorlds.length) return '';
        let combined = '';
        for (const world of manualWorlds) {
            if (!world.enabled) continue;
            if (world.content && world.content.trim()) {
                combined += `\n【世界书：${world.name}】\n${world.content}\n`;
            }
        }
        if (combined.length > maxChars) {
            combined = combined.substring(0, maxChars) + '\n…(内容过长已截断)';
        }
        return combined;
    }

    async function buildEvolutionPrompt() {
        const rules = RULES.getFullSystemRules(STATE.globalApiSettings.enabledDlcs);
        let worldContext = '';
        worldContext += await getCharacterCardInfo();

        // 读取手动导入的世界书
        const manualWorlds = STATE.worldState.manualWorlds || [];
        if (manualWorlds.length) {
            const maxChars = STATE.globalApiSettings.worldInfoMaxChars || 2000;
            const worldContent = getManualWorldsContent(manualWorlds, maxChars);
            if (worldContent) {
                worldContext += `\n【世界书设定】\n${worldContent}\n`;
            }
        }

        // 自定义额外世界背景
        if (STATE.globalApiSettings.customWorldInfo && STATE.globalApiSettings.customWorldInfo.trim()) {
            worldContext += `\n【额外世界背景】\n${STATE.globalApiSettings.customWorldInfo.substring(0, 2000)}\n`;
        }

        const s = STATE.worldState;
        return `${rules}\n${worldContext}\n当前世界状态：\n轮次：${s.round}\n时间：${s.worldTime || '未知'}\n世界摘要：${s.worldDigest}\n整体氛围：${s.overallAtmosphere}\n驱动事件：${s.drivingEvent}\n星象：${s.astrology}\n治安状况：${s.securityStatus}\n市民情绪：${s.citizenMood}\n直接接触层：${s.directLayer}\n近距离层：${s.nearLayer}\n远距离层：${s.farLayer}\n事件链：${JSON.stringify(s.events.slice(0,5))}\n团体：${JSON.stringify(s.factions.slice(0,5))}\n流言：${JSON.stringify(s.rumors.slice(0,5))}\n声誉：${JSON.stringify(s.reputation)}\n金币：${s.economy.userGold}\n即将发生的日程：${JSON.stringify(s.upcomingSchedules)}\n随机事件：${JSON.stringify(s.randomEvents)}\n请根据上述角色设定和世界书，推演世界新状态，以JSON格式返回，必须包含以下字段：\nworld_time, world_digest, overall_atmosphere, driving_event, citizen_mood, security_status, astrology, direct_layer, near_layer, far_layer, upcoming_schedules(数组，每个元素含time,event,involved,potentialImpact), reputation(四个维度), reputation_change(字符串), rumors(数组，每个对象含content,type,scope,credibility,source,impact,heat), events(数组，每个对象含name,level,stage,currentRound,totalRounds,desc,trigger), factions(数组，每个对象含name,region,current_goal,progress,cohesion,resources,attention_to_user,core_character), faction_relations(数组，每个对象含factionA,factionB,relation,level,trend), economy(包含userGold变化, marketTrend, keyResources数组(每个含name,status), fundsStatus(自然语言), economyVisibility对象(behavior,visible,witnesses,rumorGenerated)), blackMarket(数组，每个对象含type,description,price,method,risk), accidents(数组), active_contact(可选), recent_actions(数组，每个对象含action,noticedBy,consequence), memory_summary(字符串), causal_chain(数组，每个对象含rumorOrEvent,progress,manifestation), random_events(数组，每个对象含description,impact), power_peaks(数组，每个对象含name,group,title,personalGoal,pillars), internal_messages(数组，每个对象含source,group,relation,content,leadRounds), secret_box(对象，含actions数组,assets数组), character_states(数组，每个对象含name,importance,status,emotion,attitudeToUser,relationshipMap), diplomatic_events(数组), pending_foreshadowing(数组), key_values_memo(字符串), round_focus(字符串), cross_region_memo(字符串), blood_feud_memo(字符串)。\n只返回JSON，不要有其他文字。`;
    }

    return { buildEvolutionPrompt };
})();
