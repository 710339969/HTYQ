// 公共工具模块 - 增强版（修复世界书列表获取）
window.HTYQ_UTILS = (function() {
    // HTML 转义
    function escapeHtml(str) {
        if (!str) return '';
        return String(str).replace(/[&<>]/g, function(m) {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            return m;
        });
    }

    // 浮动警告提示
    function showFloatingWarning(message, isRed = true) {
        let warnDiv = document.getElementById('htyq-float-warning');
        if (!warnDiv) {
            warnDiv = document.createElement('div');
            warnDiv.id = 'htyq-float-warning';
            warnDiv.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10003;
                background: ${isRed ? 'rgba(220, 38, 38, 0.95)' : 'rgba(0,0,0,0.8)'};
                color: white;
                padding: 12px 20px;
                border-radius: 8px;
                font-weight: bold;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                backdrop-filter: blur(4px);
                border-left: 5px solid #fbbf24;
                max-width: 350px;
                pointer-events: auto;
                cursor: pointer;
                font-size: 14px;
            `;
            warnDiv.onclick = () => warnDiv.remove();
            document.body.appendChild(warnDiv);
        }
        warnDiv.innerHTML = `⚠️ ${message}<br><small style="font-size:10px;">点击关闭</small>`;
        warnDiv.style.opacity = '1';
        setTimeout(() => {
            if (warnDiv && warnDiv.parentNode) warnDiv.style.opacity = '0';
            setTimeout(() => { if (warnDiv && warnDiv.parentNode) warnDiv.remove(); }, 500);
        }, 5000);
    }

    // 环境特效：震动/红闪
    function triggerEnvironmentVFX(level) {
        if (level === '重度') {
            document.body.classList.add('htyq-shake-trigger', 'htyq-flash-red-trigger');
            setTimeout(() => document.body.classList.remove('htyq-shake-trigger', 'htyq-flash-red-trigger'), 1000);
        } else if (level === '中度') {
            document.body.classList.add('htyq-shake-trigger');
            setTimeout(() => document.body.classList.remove('htyq-shake-trigger'), 600);
        }
    }

    // 插入主动接触消息到聊天
    async function insertActiveContactMessage(contactDesc) {
        try {
            const ctx = (typeof SillyTavern !== 'undefined' && SillyTavern.getContext) ? SillyTavern.getContext() : getContext();
            if (ctx && ctx.sendMessageAsUser) {
                await ctx.sendMessageAsUser(`⚠️ **【突发接触】**\n${contactDesc}`, { forceNewMessage: true, isSystem: true });
            } else if (ctx && ctx.addSystemMessage) {
                ctx.addSystemMessage(`⚠️ **突发接触**\n${contactDesc}`);
            }
        } catch(e) { console.warn(e); }
    }

    // 获取 SillyTavern 的认证请求头（复用酒馆的 authFetch 逻辑）
    function getAuthHeaders() {
        try {
            // 优先使用全局函数
            if (typeof getRequestHeaders === 'function') return getRequestHeaders();
            // 尝试从 SillyTavern 上下文获取
            const ctx = (typeof SillyTavern !== 'undefined' && SillyTavern.getContext) ? SillyTavern.getContext() : null;
            if (ctx && typeof ctx.getRequestHeaders === 'function') return ctx.getRequestHeaders();
            // 默认 JSON 头
            return { 'Content-Type': 'application/json' };
        } catch(e) {
            return { 'Content-Type': 'application/json' };
        }
    }

    // 带认证的 fetch 封装
    async function authFetch(url, options = {}) {
        const headers = getAuthHeaders();
        // 如果 body 是 FormData，删除 Content-Type 让浏览器自动设置
        if (options.body && (options.body instanceof FormData || options.body.constructor?.name === 'FormData')) {
            delete headers['Content-Type'];
        }
        options.headers = Object.assign({}, headers, options.headers || {});
        options.credentials = 'same-origin';
        const fetchFn = (window.parent && window.parent.fetch) || window.fetch;
        return fetchFn.call(window.parent || window, url, options);
    }

    // 获取所有世界书名称（修复版）
    async function getAllWorlds() {
        try {
            // 方法1：直接读取酒馆全局变量 world_names（最可靠）
            if (window.parent && window.parent.world_names && Array.isArray(window.parent.world_names)) {
                return [...window.parent.world_names];
            }
            if (window.world_names && Array.isArray(window.world_names)) {
                return [...window.world_names];
            }

            // 方法2：通过后端 API 获取世界书列表
            const res = await authFetch('/api/worldinfo/all', { method: 'GET' });
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data)) return data.map(w => typeof w === 'string' ? w : w.name);
                if (data && Array.isArray(data.worlds)) return data.worlds;
            }

            // 方法3：从 SillyTavern 上下文 worldInfoManager 获取
            const ctx = (typeof SillyTavern !== 'undefined' && SillyTavern.getContext) ? SillyTavern.getContext() : null;
            if (ctx && ctx.worldInfoManager) {
                if (typeof ctx.worldInfoManager.getWorlds === 'function') {
                    const worlds = await ctx.worldInfoManager.getWorlds();
                    if (worlds && worlds.length) return worlds.map(w => w.name || w);
                }
                if (ctx.worldInfoManager.worlds) {
                    const worlds = ctx.worldInfoManager.worlds;
                    if (typeof worlds === 'object') return Object.keys(worlds);
                    if (Array.isArray(worlds)) return worlds.map(w => w.name || w);
                }
            }

            // 方法4：从 ctx.worldInfo.entries 中提取世界书名称（旧版兼容）
            if (ctx && ctx.worldInfo && ctx.worldInfo.entries) {
                const worldsSet = new Set();
                ctx.worldInfo.entries.forEach(entry => {
                    if (entry.world) worldsSet.add(entry.world);
                });
                return Array.from(worldsSet);
            }

            return [];
        } catch(e) {
            console.error('[HTYQ] 获取世界书列表失败', e);
            return [];
        }
    }

    return {
        escapeHtml,
        showFloatingWarning,
        triggerEnvironmentVFX,
        insertActiveContactMessage,
        getAllWorlds,
        authFetch   // 导出供其他模块使用
    };
})();
