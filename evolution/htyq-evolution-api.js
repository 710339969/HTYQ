// API 调用和重试逻辑
window.HTYQ_EVOLUTION_API = (function() {
    const STATE = window.HTYQ_STATE;
    const utils = window.HTYQ_UTILS;
    const promptBuilder = window.HTYQ_EVOLUTION_PROMPT;
    const core = window.HTYQ_EVOLUTION_CORE;

    function getCustomApiUrl(base) {
        let u = base.trim().replace(/\/+$/, '');
        if (!u) return '';
        return u.endsWith('/chat/completions') ? u : (u.endsWith('/v1') ? u + '/chat/completions' : u + '/v1/chat/completions');
    }

    let currentRetry = 0;
    let floatingToast = null;

    function showPersistentToast(text, isError = false, duration = null) {
        if (floatingToast && floatingToast.parentNode) floatingToast.remove();
        floatingToast = document.createElement('div');
        floatingToast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${isError ? '#dc2626' : '#1f2937'};
            color: white;
            padding: 10px 18px;
            border-radius: 8px;
            z-index: 10004;
            font-size: 14px;
            font-weight: bold;
            box-shadow: 0 2px 10px rgba(0,0,0,0.4);
            pointer-events: auto;
            cursor: pointer;
            max-width: 350px;
            text-align: center;
        `;
        floatingToast.innerHTML = text + '<br><small style="font-size:10px;">点击关闭</small>';
        floatingToast.onclick = () => floatingToast.remove();
        document.body.appendChild(floatingToast);
        if (duration) setTimeout(() => { if (floatingToast && floatingToast.parentNode) floatingToast.remove(); }, duration);
    }

    function hidePersistentToast() {
        if (floatingToast && floatingToast.parentNode) floatingToast.remove();
        floatingToast = null;
    }

    // 新增：原始 API 调用，不经过重试，返回解析后的 JSON 对象
    async function callRawAPI(prompt, logTag = '') {
        try {
            console.log(`${logTag} Prompt 长度:`, prompt.length);
            let rawResult;
            const settings = STATE.globalApiSettings;
            if (settings.apiMode === 'custom' && settings.customUrl) {
                const response = await fetch(getCustomApiUrl(settings.customUrl), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${settings.customKey}` },
                    body: JSON.stringify({
                        model: settings.customModel || 'gpt-3.5-turbo',
                        messages: [
                            { role: 'system', content: '你是活体世界引擎，只返回纯净JSON，不要包含任何额外解释。' },
                            { role: 'user', content: prompt }
                        ],
                        temperature: 0.8
                    })
                });
                if (!response.ok) throw new Error(`API HTTP ${response.status}`);
                const data = await response.json();
                rawResult = data.choices[0].message.content;
            } else {
                const ctx = (typeof SillyTavern !== 'undefined' && SillyTavern.getContext) ? SillyTavern.getContext() : getContext();
                if (!ctx.generateRaw) throw new Error('当前环境不支持 generateRaw');
                rawResult = await ctx.generateRaw({ prompt, max_tokens: 4000, temperature: 0.8, should_stream: false });
                if (typeof rawResult !== 'string') rawResult = rawResult.text || String(rawResult);
            }
            console.log(`${logTag} 原始返回:`, rawResult);
            let jsonStr = rawResult.trim().replace(/```json/g, '').replace(/```/g, '');
            const firstBrace = jsonStr.indexOf('{');
            const lastBrace = jsonStr.lastIndexOf('}');
            if (firstBrace === -1 || lastBrace === -1) throw new Error('返回内容不包含有效的JSON对象');
            jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
            const evolutionData = JSON.parse(jsonStr);
            return evolutionData;
        } catch (err) {
            console.error(`${logTag} 调用失败:`, err);
            return null;
        }
    }

    async function attemptEvolution(manual) {
        const maxRetries = 3;
        try {
            const prompt = await promptBuilder.buildEvolutionPrompt();
            console.log('推演 Prompt 长度:', prompt.length);
            let rawResult;
            const settings = STATE.globalApiSettings;
            if (settings.apiMode === 'custom' && settings.customUrl) {
                const response = await fetch(getCustomApiUrl(settings.customUrl), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${settings.customKey}` },
                    body: JSON.stringify({
                        model: settings.customModel || 'gpt-3.5-turbo',
                        messages: [
                            { role: 'system', content: '你是活体世界引擎，只返回纯净JSON，不要包含任何额外解释。' },
                            { role: 'user', content: prompt }
                        ],
                        temperature: 0.8
                    })
                });
                if (!response.ok) throw new Error(`API HTTP ${response.status}`);
                const data = await response.json();
                rawResult = data.choices[0].message.content;
            } else {
                const ctx = (typeof SillyTavern !== 'undefined' && SillyTavern.getContext) ? SillyTavern.getContext() : getContext();
                if (!ctx.generateRaw) throw new Error('当前环境不支持 generateRaw');
                rawResult = await ctx.generateRaw({ prompt, max_tokens: 4000, temperature: 0.8, should_stream: false });
                if (typeof rawResult !== 'string') rawResult = rawResult.text || String(rawResult);
            }
            console.log('原始返回内容:', rawResult);
            let jsonStr = rawResult.trim().replace(/```json/g, '').replace(/```/g, '');
            const firstBrace = jsonStr.indexOf('{');
            const lastBrace = jsonStr.lastIndexOf('}');
            if (firstBrace === -1 || lastBrace === -1) throw new Error('返回内容不包含有效的JSON对象');
            jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
            const evolutionData = JSON.parse(jsonStr);
            console.log('解析后的数据:', evolutionData);
            const success = core.applyEvolution(evolutionData);
            if (!success) throw new Error('应用数据失败');
            STATE.worldState.round++;
            STATE.saveWorldState();
            if (window.HTYQ_UI && window.HTYQ_UI.refresh) window.HTYQ_UI.refresh();
            if (settings.autoInject) injectWorldSummaryToChat();
            if (evolutionData.active_contact) {
                utils.showFloatingWarning(`⚠️ 主动接触: ${evolutionData.active_contact.summary}`, true);
                const dashboardView = document.getElementById('htyq-view-dashboard');
                if (dashboardView && dashboardView.offsetParent !== null) {
                    const banner = document.createElement('div');
                    banner.className = 'htyq-red-warning';
                    banner.innerHTML = `🔥 主动接触！ ${evolutionData.active_contact.details}`;
                    dashboardView.prepend(banner);
                    setTimeout(() => banner.remove(), 8000);
                }
                await utils.insertActiveContactMessage(evolutionData.active_contact.details);
            }
            currentRetry = 0;
            hidePersistentToast();
            utils.showFloatingWarning('世界推演完成', false);
            return;
        } catch (err) {
            console.error('推演错误:', err);
            if (currentRetry >= maxRetries) throw err;
            currentRetry++;
            const retryMsg = `🌍 推演失败 (${err.message})，第${currentRetry}/${maxRetries}次重试...`;
            showPersistentToast(retryMsg, true, 3000);
            await new Promise(r => setTimeout(r, 2000));
            return attemptEvolution(manual);
        }
    }

    function injectWorldSummaryToChat() {
        const s = STATE.worldState;
        const injectContent = `<htyq_world>\n【世界大势】${s.worldDigest}\n【星象】${s.astrology}\n【声誉】${Object.entries(s.reputation).map(([k,v])=>`${k}:${v}`).join(' ')}\n</htyq_world>`;
        try {
            if (typeof injectPrompts === 'function') {
                const result = injectPrompts([{ id: 'htyq_inject', position: 'in_chat', depth: 0, role: 'system', content: injectContent, should_scan: true }]);
                if (result && result.uninject) {
                    if (window.htyq_uninject) window.htyq_uninject();
                    window.htyq_uninject = result.uninject;
                }
            }
        } catch(e) {}
    }

    return { attemptEvolution, injectWorldSummaryToChat, showPersistentToast, hidePersistentToast, callRawAPI };
})();
