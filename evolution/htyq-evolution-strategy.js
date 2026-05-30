// 推演策略模块 - 管理分步调用、字段裁剪、最高延迟轮次
window.HTYQ_EVOLUTION_STRATEGY = (function() {
    const STATE = window.HTYQ_STATE;
    const promptBuilder = window.HTYQ_EVOLUTION_PROMPT;
    const api = window.HTYQ_EVOLUTION_API;
    const core = window.HTYQ_EVOLUTION_CORE;

    // 字段分组定义（与 prompt 模块保持一致）
    const FIELD_GROUPS = {
        core: {  // 核心组，每轮必须推演
            fields: [
                'world_time', 'world_digest', 'overall_atmosphere', 'driving_event',
                'citizen_mood', 'security_status', 'astrology', 'direct_layer',
                'near_layer', 'far_layer', 'upcoming_schedules', 'reputation',
                'reputation_change', 'rumors', 'events'
            ],
            dependsOn: null,
            maxDelay: 0  // 0 表示每轮都推演
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
            fields: ['black_market', 'accidents'],
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

    // 获取当前轮需要推演的组列表（基于 lastUpdated 和 DLC 启用）
    function getGroupsToEvolve() {
        const enabledDlcs = STATE.globalApiSettings.enabledDlcs || {};
        const last = STATE.worldState.lastUpdated || {};
        const currentRound = STATE.worldState.round;
        const groupsToEvolve = [];

        for (const [groupName, groupConfig] of Object.entries(FIELD_GROUPS)) {
            // 检查 DLC 依赖
            if (groupConfig.dependsOn && !enabledDlcs[groupConfig.dependsOn]) continue;
            
            const fields = groupConfig.fields;
            const maxDelay = groupConfig.maxDelay;
            // 如果 maxDelay === 0，总是推演
            if (maxDelay === 0) {
                groupsToEvolve.push(groupName);
                continue;
            }
            // 计算该组中所有字段的最后更新轮次（取最小值，即最久未更新的）
            let minLastRound = currentRound;
            for (const field of fields) {
                const fieldLast = last[field] !== undefined ? last[field] : 0;
                if (fieldLast < minLastRound) minLastRound = fieldLast;
            }
            if (currentRound - minLastRound >= maxDelay) {
                groupsToEvolve.push(groupName);
            }
        }
        return groupsToEvolve;
    }

    // 执行一次完整推演（按用户策略）
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

    // 单次推演（原逻辑）
    async function singleCallEvolution(manual) {
        await api.attemptEvolution(manual);
    }

    // 两次调用：第一次核心，第二次所有需要更新的扩展组合为一个请求
    async function twoPassEvolution(manual) {
        // 第一步：核心组
        const corePrompt = await promptBuilder.buildCorePrompt();
        if (!corePrompt) throw new Error('构建核心 prompt 失败');
        const coreResult = await api.callRawAPI(corePrompt, '核心推演');
        if (coreResult) {
            core.applyEvolution(coreResult);
        }
        // 获取需要更新的扩展组
        let groups = getGroupsToEvolve();
        groups = groups.filter(g => g !== 'core'); // 排除核心组
        if (groups.length > 0) {
            const extPrompt = await promptBuilder.buildExtendedPromptForGroups(groups);
            if (extPrompt) {
                const extResult = await api.callRawAPI(extPrompt, '扩展推演');
                if (extResult) {
                    core.applyEvolution(extResult);
                }
            }
        }
    }

    // 自定义多次调用：按顺序逐个组调用，最多 customSteps 次
    async function customStepEvolution(manual, maxSteps) {
        let groups = getGroupsToEvolve();
        // 确保核心组在第一个
        const hasCore = groups.includes('core');
        if (!hasCore) groups.unshift('core');
        // 限制调用次数
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
            if (result) {
                core.applyEvolution(result);
            }
            // 可选：添加小延迟避免 API 限流
            await new Promise(r => setTimeout(r, 500));
        }
    }

    // 导出供其他模块使用（如 prompt 模块需要访问 FIELD_GROUPS）
    return {
        runWithStrategy,
        getGroupsToEvolve,
        FIELD_GROUPS
    };
})();
