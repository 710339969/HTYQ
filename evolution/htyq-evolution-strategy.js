// 推演策略模块 - 管理分步调用、字段裁剪、最高延迟轮次
window.HTYQ_EVOLUTION_STRATEGY = (function() {
    const STATE = window.HTYQ_STATE;
    const promptBuilder = window.HTYQ_EVOLUTION_PROMPT;   // 关键修复：直接引用
    const api = window.HTYQ_EVOLUTION_API;
    const core = window.HTYQ_EVOLUTION_CORE;

    // 字段分组定义（与 prompt 模块保持一致）
    const FIELD_GROUPS = {
        core: {
            fields: [
                'world_time', 'world_digest', 'overall_atmosphere', 'driving_event',
                'citizen_mood', 'security_status', 'astrology', 'direct_layer',
                'near_layer', 'far_layer', 'upcoming_schedules', 'reputation',
                'reputation_change', 'rumors', 'events'
            ],
            dependsOn: null,
            maxDelay: 0
        },
        economy: {
            fields: ['economy'],
            dependsOn: 'economy',
            maxDelay: 1
        },
        factions: {
            fields: ['factions', 'faction_relations'],
            dependsOn: 'group_dynamics',
            maxDelay: 2
        },
        characters: {
            fields: ['character_states'],
            dependsOn: null,
            maxDelay: 2
        },
        causal: {
            fields: ['causal_chain', 'recent_actions', 'memory_summary'],
            dependsOn: null,
            maxDelay: 3
        },
        random: {
            fields: ['random_events'],
            dependsOn: null,
            maxDelay: 1
        },
        power: {
            fields: ['power_peaks'],
            dependsOn: 'power_peak',
            maxDelay: 3
        },
        internal: {
            fields: ['internal_messages'],
            dependsOn: 'group_relation',
            maxDelay: 2
        },
        blackmarket: {
            fields: ['blackMarket', 'accidents'],
            dependsOn: 'blackmarket',
            maxDelay: 3
        },
        secret: {
            fields: ['secret_box'],
            dependsOn: 'secret_asset',
            maxDelay: 4
        },
        memos: {
            fields: ['pending_foreshadowing', 'key_values_memo', 'round_focus', 'cross_region_memo', 'blood_feud_memo'],
            dependsOn: null,
            maxDelay: 4
        },
        diplomatic: {
            fields: ['diplomatic_events'],
            dependsOn: null,
            maxDelay: 5
        }
    };

    // 获取当前轮需要推演的组列表
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

    // 单次推演
    async function singleCallEvolution(manual) {
        await api.attemptEvolution(manual);
    }

    // 两次调用：核心 + 扩展组合
    async function twoPassEvolution(manual) {
        const corePrompt = await promptBuilder.buildCorePrompt();
        if (!corePrompt) throw new Error('构建核心 prompt 失败');
        const coreResult = await api.callRawAPI(corePrompt, '核心推演');
        if (coreResult) core.applyEvolution(coreResult);

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

    // 自定义多次调用
    async function customStepEvolution(manual, maxSteps) {
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
    }

    // 主入口：根据策略选择调用方式
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
