// 推演策略模块 - 动态获取 API 和 Prompt 模块
window.HTYQ_EVOLUTION_STRATEGY = (function() {
    const STATE = window.HTYQ_STATE;
    const core = window.HTYQ_EVOLUTION_CORE;

    async function waitForModule(moduleName, maxWait = 5000) {
        const start = Date.now();
        while (!window[moduleName] && (Date.now() - start) < maxWait) {
            await new Promise(r => setTimeout(r, 100));
        }
        if (!window[moduleName]) {
            console.error(`[HTYQ] 模块 ${moduleName} 未加载`);
            return null;
        }
        return window[moduleName];
    }

    async function getApi() {
        return await waitForModule('HTYQ_EVOLUTION_API');
    }

    async function getPrompt() {
        return await waitForModule('HTYQ_EVOLUTION_PROMPT');
    }

    const FIELD_GROUPS = {
        core: { fields: ['world_time','world_digest','overall_atmosphere','driving_event','citizen_mood','security_status','astrology','direct_layer','near_layer','far_layer','upcoming_schedules','reputation','reputation_change','rumors','events'], dependsOn: null, maxDelay: 0 },
        economy: { fields: ['economy'], dependsOn: 'economy', maxDelay: 1 },
        factions: { fields: ['factions','faction_relations'], dependsOn: 'group_dynamics', maxDelay: 2 },
        characters: { fields: ['character_states'], dependsOn: null, maxDelay: 2 },
        causal: { fields: ['causal_chain','recent_actions','memory_summary'], dependsOn: null, maxDelay: 3 },
        random: { fields: ['random_events'], dependsOn: null, maxDelay: 1 },
        power: { fields: ['power_peaks'], dependsOn: 'power_peak', maxDelay: 3 },
        internal: { fields: ['internal_messages'], dependsOn: 'group_relation', maxDelay: 2 },
        blackmarket: { fields: ['blackMarket','accidents'], dependsOn: 'blackmarket', maxDelay: 3 },
        secret: { fields: ['secret_box'], dependsOn: 'secret_asset', maxDelay: 4 },
        memos: { fields: ['pending_foreshadowing','key_values_memo','round_focus','cross_region_memo','blood_feud_memo'], dependsOn: null, maxDelay: 4 },
        diplomatic: { fields: ['diplomatic_events'], dependsOn: null, maxDelay: 5 }
    };

    function getGroupsToEvolve() {
        const enabledDlcs = STATE.globalApiSettings.enabledDlcs || {};
        const last = STATE.worldState.lastUpdated || {};
        const currentRound = STATE.worldState.round;
        const groupsToEvolve = [];

        for (const [groupName, groupConfig] of Object.entries(FIELD_GROUPS)) {
            if (groupConfig.dependsOn && !enabledDlcs[groupConfig.dependsOn]) continue;
            const maxDelay = groupConfig.maxDelay;
            if (maxDelay === 0) {
                groupsToEvolve.push(groupName);
                continue;
            }
            let minLastRound = currentRound;
            for (const field of groupConfig.fields) {
                const fieldLast = last[field] !== undefined ? last[field] : 0;
                if (fieldLast < minLastRound) minLastRound = fieldLast;
            }
            if (currentRound - minLastRound >= maxDelay) {
                groupsToEvolve.push(groupName);
            }
        }
        return groupsToEvolve;
    }

    async function singleCallEvolution(manual) {
        const api = await getApi();
        if (!api) throw new Error('API模块不可用');
        await api.attemptEvolution(manual);
    }

    async function twoPassEvolution(manual) {
        const api = await getApi();
        const promptBuilder = await getPrompt();
        if (!api) throw new Error('API模块不可用');
        if (!promptBuilder) throw new Error('Prompt模块不可用');

        const corePrompt = await promptBuilder.buildCorePrompt();
        if (!corePrompt) throw new Error('构建核心 prompt 失败');
        const coreResult = await api.callRawAPI(corePrompt, '核心推演');
        if (coreResult) core.applyEvolution(coreResult);

        // ★ 关键修复：先增加轮次，再调用扩展组
        STATE.worldState.round++;
        STATE.saveWorldState();
        if (window.HTYQ_UI && window.HTYQ_UI.refresh) window.HTYQ_UI.refresh();

        let groups = getGroupsToEvolve();
        groups = groups.filter(g => g !== 'core');
        if (groups.length > 0) {
            const extPrompt = await promptBuilder.buildExtendedPromptForGroups(groups);
            if (extPrompt) {
                const extResult = await api.callRawAPI(extPrompt, '扩展推演');
                if (extResult) core.applyEvolution(extResult);
            }
        }
    }

    async function customStepEvolution(manual, maxSteps) {
        const api = await getApi();
        const promptBuilder = await getPrompt();
        if (!api) throw new Error('API模块不可用');
        if (!promptBuilder) throw new Error('Prompt模块不可用');

        let groups = getGroupsToEvolve();
        const hasCore = groups.includes('core');
        if (!hasCore) groups.unshift('core');
        const steps = Math.min(groups.length, maxSteps);
        for (let i = 0; i < steps; i++) {
            const groupName = groups[i];
            let promptText;
            if (groupName === 'core') {
                promptText = await promptBuilder.buildCorePrompt();
            } else {
                promptText = await promptBuilder.buildPromptForGroup(groupName);
            }
            if (!promptText) continue;
            const result = await api.callRawAPI(promptText, `推演组:${groupName}`);
            if (result) core.applyEvolution(result);
            await new Promise(r => setTimeout(r, 500));
        }

        // 增加世界轮次
        STATE.worldState.round++;
        STATE.saveWorldState();
        if (window.HTYQ_UI && window.HTYQ_UI.refresh) window.HTYQ_UI.refresh();
    }

    async function runWithStrategy(manual = false) {
        const strategy = STATE.globalApiSettings.evolutionStrategy || 'single';
        if (strategy === 'single') {
            await singleCallEvolution(manual);
        } else if (strategy === 'two_pass') {
            await twoPassEvolution(manual);
        } else if (strategy === 'custom') {
            const maxSteps = STATE.globalApiSettings.customSteps || 3;
            await customStepEvolution(manual, maxSteps);
        } else {
            await singleCallEvolution(manual);
        }
    }

    return {
        runWithStrategy,
        getGroupsToEvolve,
        FIELD_GROUPS
    };
})();
