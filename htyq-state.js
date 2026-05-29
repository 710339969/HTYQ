// 状态管理模块
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
                currencyName: null,        // 货币名称，如"金币"、"灵石"、"信用点"
                currencyAmount: null,      // 玩家持有数量
                marketTrend: '平稳', 
                keyResources: [], 
                fundsStatus: '尚未定义',    // 自然语言描述
                economyVisibility: { behavior: '', visible: false, witnesses: [], rumorGenerated: false } 
            },
            blackMarket: [],
            secretBox: { actions: [], assets: [] },
            accidentCooldown: 0,
            noContactCounter: 0,
            breaker: 0,
            manualWorlds: [],        // 新结构：[{ name, enabled, entries: [{title, content}] }]
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

    let globalApiSettings = {
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

    let worldState = getDefaultWorldState();

    function getCurrentChatId() {
        try {
            const ctx = (typeof SillyTavern !== 'undefined' && SillyTavern.getContext) ? SillyTavern.getContext() : getContext();
            return ctx.chatId || 'default';
        } catch(e) { return 'default'; }
    }

    function saveWorldState() {
        const chatId = getCurrentChatId();
        localStorage.setItem(`htyq_world_${chatId}`, JSON.stringify(worldState));
    }

    function loadWorldState() {
        const chatId = getCurrentChatId();
        const stored = localStorage.getItem(`htyq_world_${chatId}`);
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                worldState = { ...getDefaultWorldState(), ...parsed };
                const defaults = getDefaultWorldState();
                for (let key in defaults) {
                    if (worldState[key] === undefined) worldState[key] = defaults[key];
                }
                // 兼容旧数据：如果存在 userGold，迁移到新的货币结构
                if (parsed.economy && typeof parsed.economy.userGold === 'number' && !parsed.economy.currencyName) {
                    worldState.economy.currencyName = '金币';
                    worldState.economy.currencyAmount = parsed.economy.userGold;
                    worldState.economy.fundsStatus = '手头宽裕';
                    delete worldState.economy.userGold;
                }
                if (!worldState.economy.currencyName) worldState.economy.currencyName = null;
                if (worldState.economy.currencyAmount === undefined) worldState.economy.currencyAmount = null;
                if (!worldState.economy.fundsStatus) worldState.economy.fundsStatus = '尚未定义';
                if (!worldState.economy.economyVisibility) worldState.economy.economyVisibility = defaults.economy.economyVisibility;
                if (!worldState.manualWorlds) worldState.manualWorlds = [];
                // 兼容旧结构：如果旧数据是 content 格式，尝试转换为 entries
                if (worldState.manualWorlds.length && worldState.manualWorlds[0].content && !worldState.manualWorlds[0].entries) {
                    worldState.manualWorlds = worldState.manualWorlds.map(w => ({
                        name: w.name,
                        enabled: w.enabled !== false,
                        entries: [{ title: '世界书内容', content: w.content || '' }]
                    }));
                    saveWorldState();
                }
            } catch(e) { worldState = getDefaultWorldState(); }
        } else {
            worldState = getDefaultWorldState();
        }
    }

    function saveGlobalSettings() {
        localStorage.setItem('htyq_global_settings', JSON.stringify(globalApiSettings));
    }

    function loadGlobalSettings() {
        const stored = localStorage.getItem('htyq_global_settings');
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                globalApiSettings = { ...globalApiSettings, ...parsed };
                if (globalApiSettings.enabledDlcs) {
                    globalApiSettings.enabledDlcs = { ...DEFAULT_DLCS, ...globalApiSettings.enabledDlcs };
                }
            } catch(e) {}
        }
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
        globalApiSettings,
        worldState,
        getCurrentChatId,
        saveWorldState,
        loadWorldState,
        saveGlobalSettings,
        loadGlobalSettings,
        addChronicle
    };
})();
