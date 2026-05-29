// 状态管理模块 - 移除 showFloatingWarning 和 escapeHtml（已移至 utils）
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
            economy: { userGold: 1000, userAssets: [], marketTrend: '平稳', keyResources: [], fundsStatus: '勉强糊口', economyVisibility: { behavior: '', visible: false, witnesses: [], rumorGenerated: false } },
            blackMarket: [],
            secretBox: { actions: [], assets: [] },
            accidentCooldown: 0,
            noContactCounter: 0,
            breaker: 0,
            // 世界书手动导入列表
            manualWorlds: [],        // 格式： [{ name, content, enabled }]
            // 详细面板字段
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
                if (!worldState.economy.economyVisibility) worldState.economy.economyVisibility = defaults.economy.economyVisibility;
                if (!worldState.economy.fundsStatus) worldState.economy.fundsStatus = defaults.economy.fundsStatus;
                // 确保 manualWorlds 存在
                if (!worldState.manualWorlds) worldState.manualWorlds = [];
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
