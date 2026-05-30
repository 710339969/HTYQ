// 状态管理模块 - 增加按聊天ID隔离存储
window.HTYQ_STATE = (function() {
    const DEFAULT_DLCS = {
        world_engine: true,
        group_dynamics: true,
        active_contact: true,
        revenge: true,
        blackmarket: true,
        economy: true,
        accident: true,
        reputation: true,
        power_peak: true,
        group_relation: true,
        secret_asset: true
    };

    const DEFAULT_API_SETTINGS = {
        apiMode: 'tavern',
        customUrl: '',
        customKey: '',
        customModel: '',
        autoInject: true,
        autoPollMode: 'auto',
        autoPollInterval: 1,
        enabledDlcs: { ...DEFAULT_DLCS },
        injectWorldInfo: true,
        worldInfoMaxChars: 2000,
        customWorldInfo: '',
        // 新增：推演策略配置
        evolutionStrategy: 'single',   // 'single', 'two_pass', 'custom'
        customSteps: 3                 // 自定义步骤数
    };

    function getDefaultWorldState() {
        return {
            round: 0,
            worldDigest: '世界正在苏醒，一切尚未可知。',
            astrology: '平稳',
            chronicles: [],
            events: [],
            factions: [],
            factionRelations: [],
            rumors: [],
            reputation: { jianghu: '默默无闻', official: '默默无闻', folk: '默默无闻', underworld: '默默无闻' },
            economy: { 
                currencyName: null,
                currencyAmount: null,
                marketTrend: '平稳',
                keyResources: [],
                fundsStatus: '尚未定义',
                economyVisibility: { behavior: '', visible: false, witnesses: [], rumorGenerated: false }
            },
            blackMarket: [],
            secretBox: { actions: [], assets: [] },
            accidentCooldown: 0,
            noContactCounter: 0,
            breaker: 0,
            manualWorlds: [],
            worldTime: '',
            overallAtmosphere: '',
            drivingEvent: '',
            citizenMood: '',
            securityStatus: '',
            directLayer: '',
            nearLayer: '',
            farLayer: '',
            upcomingSchedules: [],
            recentActions: [],
            memorySummary: '',
            causalChain: [],
            randomEvents: [],
            powerPeaks: [],
            internalMessages: [],
            characterStates: [],
            diplomaticEvents: [],
            pendingEvents: [],
            pendingForeshadowing: [],
            keyValuesMemo: '',
            roundFocus: '',
            crossRegionMemo: '',
            bloodFeudMemo: '',
            reputationChange: '',
            // 新增：记录每个字段最后更新的轮次
            lastUpdated: {}
        };
    }

    let globalApiSettings = { ...DEFAULT_API_SETTINGS };
    let worldState = getDefaultWorldState();

    function getContext() {
        if (typeof SillyTavern !== 'undefined' && SillyTavern.getContext) return SillyTavern.getContext();
        if (typeof getContext === 'function') return getContext();
        return null;
    }

    function getCurrentChatId() {
        const ctx = getContext();
        return ctx?.chatId || 'default';
    }

    function saveWorldState() {
        const chatId = getCurrentChatId();
        if (chatId) {
            localStorage.setItem(`htyq_world_${chatId}`, JSON.stringify(worldState));
        } else {
            localStorage.setItem('htyq_world_global', JSON.stringify(worldState));
        }
    }

    function loadWorldState(chatId) {
        const targetChatId = chatId || getCurrentChatId();
        let stored = null;
        if (targetChatId) {
            stored = localStorage.getItem(`htyq_world_${targetChatId}`);
        }
        if (!stored) {
            stored = localStorage.getItem('htyq_world_global');
        }
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                worldState = { ...getDefaultWorldState(), ...parsed };
                const defaults = getDefaultWorldState();
                for (let key in defaults) if (worldState[key] === undefined) worldState[key] = defaults[key];
                if (!worldState.manualWorlds) worldState.manualWorlds = [];
                worldState.manualWorlds = worldState.manualWorlds.map(w => ({ source: 'manual', ...w }));
                if (!worldState.lastUpdated) worldState.lastUpdated = {};
            } catch(e) { worldState = getDefaultWorldState(); }
        } else {
            worldState = getDefaultWorldState();
        }
        saveWorldState();
        return worldState;
    }

    function resetCurrentWorld() {
        worldState = getDefaultWorldState();
        saveWorldState();
        return worldState;
    }

    function saveGlobalSettings() {
        const ctx = getContext();
        if (ctx && ctx.extensionSettings) {
            ctx.extensionSettings.htyq = { apiSettings: globalApiSettings };
            if (typeof ctx.saveSettingsDebounced === 'function') ctx.saveSettingsDebounced();
            else if (typeof ctx.saveSettings === 'function') ctx.saveSettings();
            else localStorage.setItem('htyq_global_settings', JSON.stringify(globalApiSettings));
        } else {
            localStorage.setItem('htyq_global_settings', JSON.stringify(globalApiSettings));
        }
    }

    function loadGlobalSettings() {
        const ctx = getContext();
        let loaded = false;
        if (ctx && ctx.extensionSettings && ctx.extensionSettings.htyq) {
            const saved = ctx.extensionSettings.htyq.apiSettings;
            if (saved) {
                globalApiSettings = { ...DEFAULT_API_SETTINGS, ...saved };
                loaded = true;
            }
        }
        if (!loaded) {
            const stored = localStorage.getItem('htyq_global_settings');
            if (stored) {
                try {
                    const parsed = JSON.parse(stored);
                    globalApiSettings = { ...DEFAULT_API_SETTINGS, ...parsed };
                    loaded = true;
                } catch(e) {}
            }
        }
        if (!loaded) globalApiSettings = { ...DEFAULT_API_SETTINGS };
        if (!globalApiSettings.enabledDlcs) globalApiSettings.enabledDlcs = { ...DEFAULT_DLCS };
        else globalApiSettings.enabledDlcs = { ...DEFAULT_DLCS, ...globalApiSettings.enabledDlcs };
        // 确保策略配置存在
        if (globalApiSettings.evolutionStrategy === undefined) globalApiSettings.evolutionStrategy = 'single';
        if (globalApiSettings.customSteps === undefined) globalApiSettings.customSteps = 3;
    }

    function addChronicle(type, title, content) {
        worldState.chronicles.unshift({
            round: worldState.round,
            timestamp: Date.now(),
            type: type,
            title: title,
            content: content
        });
        if (worldState.chronicles.length > 100) worldState.chronicles.pop();
        saveWorldState();
    }

    function clearWorldsBySource(sources) {
        const before = worldState.manualWorlds.length;
        worldState.manualWorlds = worldState.manualWorlds.filter(w => !sources.includes(w.source));
        if (before !== worldState.manualWorlds.length) saveWorldState();
        return before - worldState.manualWorlds.length;
    }

    function addWorldbookWithSource(name, content, source = 'manual', enabled = true) {
        const existing = worldState.manualWorlds.find(w => w.name === name);
        if (existing) {
            existing.content = content;
            existing.enabled = enabled;
            existing.source = source;
        } else {
            worldState.manualWorlds.push({ name, enabled, content, source });
        }
        saveWorldState();
    }

    return {
        DEFAULT_DLCS,
        getDefaultWorldState,
        get globalApiSettings() { return globalApiSettings; },
        get worldState() { return worldState; },
        getCurrentChatId,
        saveWorldState,
        loadWorldState,
        resetCurrentWorld,
        saveGlobalSettings,
        loadGlobalSettings,
        addChronicle,
        clearWorldsBySource,
        addWorldbookWithSource
    };
})();
