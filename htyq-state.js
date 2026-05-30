// 状态管理模块 - 使用 ST extensionSettings 持久化，世界书列表全局存储
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

    // 默认 API 设置
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
        customWorldInfo: ''
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
            manualWorlds: [],   // 全局世界书列表，单独存储
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
            reputationChange: ''
        };
    }

    // 全局变量
    let globalApiSettings = { ...DEFAULT_API_SETTINGS };
    let worldState = getDefaultWorldState();

    // 获取 ST Context
    function getContext() {
        if (typeof SillyTavern !== 'undefined' && SillyTavern.getContext) return SillyTavern.getContext();
        if (typeof getContext === 'function') return getContext();
        return null;
    }

    // 保存全局 API 设置到 extensionSettings
    function saveGlobalSettings() {
        const ctx = getContext();
        if (ctx && ctx.extensionSettings) {
            ctx.extensionSettings.htyq = {
                apiSettings: globalApiSettings
            };
            // 尝试保存设置
            if (typeof ctx.saveSettingsDebounced === 'function') {
                ctx.saveSettingsDebounced();
            } else if (typeof ctx.saveSettings === 'function') {
                ctx.saveSettings();
            } else {
                // 降级到 localStorage
                localStorage.setItem('htyq_global_settings', JSON.stringify(globalApiSettings));
            }
        } else {
            // 降级到 localStorage
            localStorage.setItem('htyq_global_settings', JSON.stringify(globalApiSettings));
        }
    }

    // 加载全局 API 设置
    function loadGlobalSettings() {
        const ctx = getContext();
        let loaded = false;
        // 优先从 extensionSettings 读取
        if (ctx && ctx.extensionSettings && ctx.extensionSettings.htyq) {
            const saved = ctx.extensionSettings.htyq.apiSettings;
            if (saved) {
                globalApiSettings = { ...DEFAULT_API_SETTINGS, ...saved };
                loaded = true;
            }
        }
        // 如果没读到，尝试从 localStorage 读取（兼容旧版）
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
        if (!loaded) {
            globalApiSettings = { ...DEFAULT_API_SETTINGS };
        }
        // 确保 DLC 默认值
        if (!globalApiSettings.enabledDlcs) {
            globalApiSettings.enabledDlcs = { ...DEFAULT_DLCS };
        } else {
            globalApiSettings.enabledDlcs = { ...DEFAULT_DLCS, ...globalApiSettings.enabledDlcs };
        }
    }

    // 保存世界状态（全局 localStorage）
    function saveWorldState() {
        localStorage.setItem('htyq_world_global', JSON.stringify(worldState));
    }

    // 加载世界状态
    function loadWorldState() {
        const stored = localStorage.getItem('htyq_world_global');
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                worldState = { ...getDefaultWorldState(), ...parsed };
                const defaults = getDefaultWorldState();
                for (let key in defaults) {
                    if (worldState[key] === undefined) worldState[key] = defaults[key];
                }
                if (!worldState.manualWorlds) worldState.manualWorlds = [];
            } catch(e) { worldState = getDefaultWorldState(); }
        } else {
            worldState = getDefaultWorldState();
        }
    }

    function getCurrentChatId() {
        const ctx = getContext();
        return ctx?.chatId || 'default';
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

    return {
        DEFAULT_DLCS,
        getDefaultWorldState,
        get globalApiSettings() { return globalApiSettings; },
        get worldState() { return worldState; },
        getCurrentChatId,
        saveWorldState,
        loadWorldState,
        saveGlobalSettings,
        loadGlobalSettings,
        addChronicle
    };
})();
