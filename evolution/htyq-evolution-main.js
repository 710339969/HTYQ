// 演化主控：runEvolution, start, 事件绑定 + 自动同步世界书
window.HTYQ_EVOLUTION = (function() {
    const STATE = window.HTYQ_STATE;
    const utils = window.HTYQ_UTILS;
    const api = window.HTYQ_EVOLUTION_API;

    let isEvolving = false;
    let hasFirstResponse = false;

    async function runEvolution(manual = false) {
        if (isEvolving) {
            utils.showFloatingWarning('推演进行中，请稍后', true);
            return;
        }
        if (!manual && !hasFirstResponse) {
            console.log('[HTYQ] 首轮对话尚未完成，跳过自动推演');
            return;
        }
        isEvolving = true;
        api.showPersistentToast('🌍 世界演化中...', false);
        try {
            await api.attemptEvolution(manual);
        } catch (err) {
            console.error('推演彻底失败:', err);
            api.hidePersistentToast();
            utils.showFloatingWarning(`推演彻底失败: ${err.message}，请检查控制台或手动重试`, true);
        } finally {
            isEvolving = false;
        }
    }

    // ========== 自动同步世界书（清理旧+导入新） ==========
    async function syncWorldbooks() {
        console.log('[HTYQ] 开始同步世界书...');
        // 1. 删除所有来源为 character 和 global 的世界书（自动导入的）
        const deletedCount = STATE.clearWorldsBySource(['character', 'global']);
        if (deletedCount > 0) console.log(`[HTYQ] 已清理 ${deletedCount} 个旧世界书`);

        // 2. 获取当前激活的世界书（角色绑定 + 全局启用）
        const ctx = SillyTavern.getContext();
        const activeWorlds = [];

        // 角色绑定世界书
        try {
            const char = ctx.characters?.[ctx.characterId];
            const charWorld = char?.data?.extensions?.world;
            if (charWorld) {
                const book = await ctx.loadWorldInfo(charWorld);
                if (book && book.entries) {
                    activeWorlds.push({
                        source: 'character',
                        name: charWorld,
                        entries: Object.values(book.entries).filter(e => !e.disable)
                    });
                }
            }
        } catch(e) { console.warn('读取角色世界书失败', e); }

        // 全局启用的世界书
        try {
            const headers = ctx.getRequestHeaders ? ctx.getRequestHeaders() : {};
            const resp = await fetch('/api/settings/get', {
                method: 'POST',
                headers: { ...headers, 'Content-Type': 'application/json' },
                body: '{}'
            });
            if (resp.ok) {
                const settings = await resp.json();
                const real = JSON.parse(settings.settings);
                const globals = real?.world_info_settings?.world_info?.globalSelect || [];
                for (const name of globals) {
                    const book = await ctx.loadWorldInfo(name);
                    if (book && book.entries) {
                        activeWorlds.push({
                            source: 'global',
                            name: name,
                            entries: Object.values(book.entries).filter(e => !e.disable)
                        });
                    }
                }
            }
        } catch(e) { console.warn('读取全局世界书失败', e); }

        // 3. 导入激活的世界书（整本）
        function entriesToText(entries) {
            let text = '';
            for (const entry of entries) {
                const title = entry.comment || entry.key?.join(', ') || '条目';
                const content = entry.content || '';
                text += `### ${title}\n${content}\n\n`;
            }
            return text.trim();
        }

        for (const w of activeWorlds) {
            const textContent = entriesToText(w.entries);
            STATE.addWorldbookWithSource(w.name, textContent, w.source, true);
        }
        console.log(`[HTYQ] 同步完成，导入了 ${activeWorlds.length} 个世界书`);
        // 刷新 UI
        if (window.HTYQ_UI && window.HTYQ_UI.refresh) window.HTYQ_UI.refresh();
    }

    let autoPollCounter = 0;
    let eventsBound = false;

    function onMessageReceived() {
        const settings = STATE.globalApiSettings;
        if (!hasFirstResponse) {
            hasFirstResponse = true;
            console.log('[HTYQ] 首轮AI回复完成，后续将启用自动推演');
            return;
        }
        if (settings.autoPollMode === 'auto') {
            autoPollCounter++;
            if (autoPollCounter >= settings.autoPollInterval) {
                autoPollCounter = 0;
                if (STATE.worldState.breaker <= 0) {
                    runEvolution(false).catch(console.warn);
                } else {
                    STATE.worldState.breaker--;
                    STATE.saveWorldState();
                }
            }
        }
    }

    function onChatLoaded() {
        STATE.saveWorldState();
        STATE.loadWorldState();
        hasFirstResponse = false;
        autoPollCounter = 0;
        // 自动同步世界书（清理旧+导入新）
        syncWorldbooks().catch(console.warn);
        if (window.HTYQ_UI && window.HTYQ_UI.refresh) window.HTYQ_UI.refresh();
        if (STATE.globalApiSettings.autoInject) api.injectWorldSummaryToChat();
    }

    function onCharacterChanged() {
        console.log('[HTYQ] 角色卡已切换，同步世界书...');
        syncWorldbooks().catch(console.warn);
    }

    function bindEvents() {
        if (eventsBound) return;
        try {
            const ctx = (typeof SillyTavern !== 'undefined' && SillyTavern.getContext) ? SillyTavern.getContext() : getContext();
            if (ctx && ctx.eventSource) {
                ctx.eventSource.on('message_received', onMessageReceived);
                ctx.eventSource.on('chat_loaded', onChatLoaded);
                ctx.eventSource.on('character_switched', onCharacterChanged);
                console.log('活体引擎事件已绑定到 eventSource');
                eventsBound = true;
                return;
            }
        } catch(e) {}
        if (typeof eventOn === 'function') {
            eventOn('message_received', onMessageReceived);
            eventOn('chat_loaded', onChatLoaded);
            eventOn('character_switched', onCharacterChanged);
            console.log('活体引擎事件已绑定到 eventOn');
            eventsBound = true;
            return;
        }
        console.warn('无法绑定自动推演事件，自动推演不可用');
    }

    function start() {
        STATE.loadGlobalSettings();
        STATE.loadWorldState();
        bindEvents();
        // 首次启动时也同步一次
        syncWorldbooks().catch(console.warn);
        if (STATE.globalApiSettings.autoInject) api.injectWorldSummaryToChat();
        console.log('活体引擎推演模块已启动');
    }

    return { runEvolution, start };
})();
