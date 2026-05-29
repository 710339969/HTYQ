// 演化主控：runEvolution, start, 事件绑定
window.HTYQ_EVOLUTION = (function() {
    const STATE = window.HTYQ_STATE;
    const utils = window.HTYQ_UTILS;
    const api = window.HTYQ_EVOLUTION_API;

    let isEvolving = false;
    let hasFirstResponse = false;   // 用于跳过首轮推演

    async function runEvolution(manual = false) {
        if (isEvolving) {
            utils.showFloatingWarning('推演进行中，请稍后', true);
            return;
        }
        // 如果是自动推演（manual=false）且尚未完成首轮对话，则跳过
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

    let autoPollCounter = 0;
    let eventsBound = false;

    function onMessageReceived() {
        const settings = STATE.globalApiSettings;
        // 标记首轮已响应（AI 已回复过至少一次）
        if (!hasFirstResponse) {
            hasFirstResponse = true;
            console.log('[HTYQ] 首轮AI回复完成，后续将启用自动推演');
            return; // 首轮不推演
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
        // 重置首轮标记，因为新聊天需要重新计数
        hasFirstResponse = false;
        autoPollCounter = 0;
        if (window.HTYQ_UI && window.HTYQ_UI.refresh) window.HTYQ_UI.refresh();
        if (STATE.globalApiSettings.autoInject) api.injectWorldSummaryToChat();
    }

    function bindEvents() {
        if (eventsBound) return;
        try {
            const ctx = (typeof SillyTavern !== 'undefined' && SillyTavern.getContext) ? SillyTavern.getContext() : getContext();
            if (ctx && ctx.eventSource) {
                ctx.eventSource.on('message_received', onMessageReceived);
                ctx.eventSource.on('chat_loaded', onChatLoaded);
                console.log('活体引擎事件已绑定到 eventSource');
                eventsBound = true;
                return;
            }
        } catch(e) {}
        if (typeof eventOn === 'function') {
            eventOn('message_received', onMessageReceived);
            eventOn('chat_loaded', onChatLoaded);
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
        if (STATE.globalApiSettings.autoInject) api.injectWorldSummaryToChat();
        console.log('活体引擎推演模块已启动');
    }

    return { runEvolution, start };
})();
