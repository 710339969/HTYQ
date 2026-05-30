// 推演策略模块 - 管理分步调用、字段裁剪、最高延迟轮次
window.HTYQ_EVOLUTION_STRATEGY = (function() {
    const STATE = window.HTYQ_STATE;
    const promptBuilder = window.HTYQ_EVOLUTION_PROMPT;
    const api = window.HTYQ_EVOLUTION_API;
    const core = window.HTYQ_EVOLUTION_CORE;

    // 字段分组定义
    const FIELD_GROUPS = {
        core: [  // 第一组：每轮必须推演
            'world_time', 'world_digest', 'overall_atmosphere', 'driving_event',
            'citizen_mood', 'security_status', 'astrology', 'direct_layer',
            'near_layer', 'far_layer', 'upcoming_schedules', 'reputation',
            'reputation_change', 'rumors', 'events'
        ],
        economy: {  // 经济组，依赖 DLC 但可单独
            fields: ['economy'],
            dependsOn: 'economy',
            maxDelay: 1  // 每轮都推演
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
            fields: ['black_market', 'accidents'],
            dependsOn: 'blackmarket',
            maxDelay: 3
        },
        secret: {
            fields: ['secret_box'],
            dependsOn: 'secret_asset',
            maxDelay: 4
        },
        extended_memos: {
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

    // 获取当前轮需要推演的组（基于 lastUpdated 和 DLC 启用）
    function getGroupsToEvolve() {
        const enabledDlcs = STATE.globalApiSettings.enabledDlcs;
        const last = STATE.worldState.lastUpdated || {};
        const currentRound = STATE.worldState.round;
        const groupsToEvolve = [];

        for (const [groupName, groupConfig] of Object.entries(FIELD_GROUPS)) {
            // 检查 DLC 依赖
            if (groupConfig.dependsOn && !enabledDlcs[groupConfig.dependsOn]) continue;
            
            const fields = groupConfig.fields || [groupConfig]; // 兼容旧格式
            const maxDelay = groupConfig.maxDelay || 2;
            // 计算该组中最早更新的字段的轮次
            let lastUpdate = 0;
            for (const field of fields) {
                const fieldLast = last[field] || 0;
                if (fieldLast > lastUpdate) lastUpdate = fieldLast;
            }
            if (currentRound - lastUpdate >= maxDelay) {
                groupsToEvolve.push(groupName);
            }
        }
        return groupsToEvolve;
    }

    // 根据用户设置的策略执行推演
    async function runWithStrategy(manual = false) {
        const strategy = STATE.globalApiSettings.evolutionStrategy || 'single';
        
        if (strategy === 'single') {
            // 一次调用，全部字段（不分组，一次性问）
            await singleCallEvolution(manual);
        } else if (strategy === 'two_pass') {
            // 两次调用：第一次核心，第二次扩展组（根据分组合并）
            await twoPassEvolution(manual);
        } else if (strategy === 'custom') {
            // 自定义多次调用，按组顺序依次调用
            const maxSteps = STATE.globalApiSettings.customSteps || 3;
            await customStepEvolution(manual, maxSteps);
        } else {
            // 默认降级
            await singleCallEvolution(manual);
        }
    }

    // 单次推演（原逻辑）
    async function singleCallEvolution(manual) {
        await api.attemptEvolution(manual);
    }

    // 两次调用：第一次核心，第二次所有需要更新的扩展组合为一个请求
    async function twoPassEvolution(manual) {
        const groups = getGroupsToEvolve();
        // 第一步：核心组（总是推演）
        const corePrompt = await promptBuilder.buildCorePrompt();
        const coreResult = await api.callRawAPI(corePrompt, "核心推演");
        if (coreResult) {
            core.applyEvolution(coreResult);
        }
        // 第二步：如果有需要更新的扩展组，合并成一个请求
        if (groups.length > 0) {
            const extPrompt = await promptBuilder.buildExtendedPromptForGroups(groups);
            const extResult = await api.callRawAPI(extPrompt, "扩展推演");
            if (extResult) {
                core.applyEvolution(extResult);
            }
        }
    }

    // 自定义多次调用：将需要更新的组按顺序逐个调用（每次一组）
    async function customStepEvolution(manual, maxSteps) {
        let groups = getGroupsToEvolve();
        // 限制调用次数不超过用户设置的最大步数
        const steps = Math.min(groups.length, maxSteps);
        // 核心组总是第一次
        const corePrompt = await promptBuilder.buildCorePrompt();
        const coreResult = await api.callRawAPI(corePrompt, "核心推演");
        if (coreResult) {
            core.applyEvolution(coreResult);
        }
        // 后续每组单独调用（如果步骤允许）
        for (let i = 0; i < steps; i++) {
            const groupName = groups[i];
            const groupPrompt = await promptBuilder.buildPromptForGroup(groupName);
            const groupResult = await api.callRawAPI(groupPrompt, `扩展推演:${groupName}`);
            if (groupResult) {
                core.applyEvolution(groupResult);
            }
        }
    }

    return {
        runWithStrategy,
        getGroupsToEvolve  // 供 UI 调试
    };
})();
