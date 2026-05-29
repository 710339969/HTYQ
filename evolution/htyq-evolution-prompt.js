// 构建推演 Prompt（使用手动导入的世界书，支持纯文本内容）
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

    // 从手动导入的世界书中获取内容（纯文本合并），并标注为“背景参考”
    function getManualWorldsContent(manualWorlds, maxChars) {
        if (!manualWorlds || !manualWorlds.length) return '';
        let combined = '';
        for (const world of manualWorlds) {
            if (!world.enabled) continue;
            if (world.content && world.content.trim()) {
                combined += `\n【背景参考 - 非强制性】世界书：${world.name}\n${world.content}\n`;
            }
        }
        if (combined.length > maxChars) {
            combined = combined.substring(0, maxChars) + '\n…(内容过长已截断)';
        }
        return combined;
    }

    async function buildEvolutionPrompt() {
        const rules = RULES.getFullSystemRules(STATE.globalApiSettings.enabledDlcs);
        
        // 新增：正文优先原则 + 货币初始化指令
        const priorityRule = `
【核心原则 - 正文驱动】
1. 当前对话正文中实际发生的剧情是唯一事实来源。所有世界状态更新（包括货币、物资、声誉、事件链、势力关系等）必须严格基于正文中明确出现的事件。
2. 世界书、角色卡中的描述仅为背景参考，帮助保持世界观一致性。若与正文冲突，必须完全以正文为准。
3. 禁止从世界书中直接提取剧情事件或自动生成剧情。世界书中的事件不应发生，除非正文触发了类似情节。
4. 首次推演（round === 0 且 economy.currencyName === null）时，请根据当前世界观（从角色卡、世界书或正文首次描述推断）自动设定合理的货币名称和玩家的初始持有量。货币名称示例：金币、灵石、铜钱、信用点、瓶盖等。初始持有量建议为中等偏低水平（如50），除非角色卡另有规定。
`;

        let worldContext = '';
        worldContext += await getCharacterCardInfo();

        const manualWorlds = STATE.worldState.manualWorlds || [];
        if (manualWorlds.length) {
            const maxChars = STATE.globalApiSettings.worldInfoMaxChars || 2000;
            const worldContent = getManualWorldsContent(manualWorlds, maxChars);
            if (worldContent) {
                worldContext += `\n${worldContent}\n`;
            }
        }

        if (STATE.globalApiSettings.customWorldInfo && STATE.globalApiSettings.customWorldInfo.trim()) {
            worldContext += `\n【额外世界背景】\n${STATE.globalApiSettings.customWorldInfo.substring(0, 2000)}\n`;
        }

        const s = STATE.worldState;
        const currencyName = s.economy.currencyName || '未定义货币';
        const currencyAmount = s.economy.currencyAmount !== null ? s.economy.currencyAmount : '未定义';
        return `${priorityRule}\n${rules}\n${worldContext}\n当前世界状态：\n轮次：${s.round}\n时间：${s.worldTime || '未知'}\n世界摘要：${s.worldDigest}\n整体氛围：${s.overallAtmosphere}\n驱动事件：${s.drivingEvent}\n星象：${s.astrology}\n治安状况：${s.securityStatus}\n市民情绪：${s.citizenMood}\n直接接触层：${s.directLayer}\n近距离层：${s.nearLayer}\n远距离层：${s.farLayer}\n事件链：${JSON.stringify(s.events.slice(0,5))}\n团体：${JSON.stringify(s.factions.slice(0,5))}\n流言：${JSON.stringify(s.rumors.slice(0,5))}\n声誉：${JSON.stringify(s.reputation)}\n玩家货币：${currencyAmount} ${currencyName}\n即将发生的日程：${JSON.stringify(s.upcomingSchedules)}\n随机事件：${JSON.stringify(s.randomEvents)}\n请根据上述角色设定和世界书（仅作参考），以当前对话正文为准，推演世界新状态，以JSON格式返回，必须包含以下字段：\nworld_time, world_digest, overall_atmosphere, driving_event, citizen_mood, security_status, astrology, direct_layer, near_layer, far_layer, upcoming_schedules(数组，每个元素含time,event,involved,potentialImpact), reputation(四个维度), reputation_change(字符串), rumors(数组，每个对象含content,type,scope,credibility,source,impact,heat), events(数组，每个对象含name,level,stage,currentRound,totalRounds,desc,trigger), factions(数组，每个对象含name,region,current_goal,progress,cohesion,resources,attention_to_user,core_character), faction_relations(数组，每个对象含factionA,factionB,relation,level,trend), economy(包含currencyName, currencyAmount(数字变化), marketTrend, keyResources数组(每个含name,status), fundsStatus(自然语言), economyVisibility对象(behavior,visible,witnesses,rumorGenerated)), blackMarket(数组，每个对象含type,description,price,method,risk), accidents(数组), active_contact(可选), recent_actions(数组，每个对象含action,noticedBy,consequence), memory_summary(字符串), causal_chain(数组，每个对象含rumorOrEvent,progress,manifestation), random_events(数组，每个对象含description,impact), power_peaks(数组，每个对象含name,group,title,personalGoal,pillars), internal_messages(数组，每个对象含source,group,relation,content,leadRounds), secret_box(对象，含actions数组,assets数组), character_states(数组，每个对象含name,importance,status,emotion,attitudeToUser,relationshipMap), diplomatic_events(数组), pending_foreshadowing(数组), key_values_memo(字符串), round_focus(字符串), cross_region_memo(字符串), blood_feud_memo(字符串)。\n只返回JSON，不要有其他文字。`;
    }

    return { buildEvolutionPrompt };
})();
