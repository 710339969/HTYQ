// 公共工具模块 - 修复世界书读取兼容性
window.HTYQ_UTILS = (function() {
    function escapeHtml(str) {
        if (!str) return '';
        return String(str).replace(/[&<>]/g, function(m) {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            return m;
        });
    }

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

    function triggerEnvironmentVFX(level) {
        if (level === '重度') {
            document.body.classList.add('htyq-shake-trigger', 'htyq-flash-red-trigger');
            setTimeout(() => document.body.classList.remove('htyq-shake-trigger', 'htyq-flash-red-trigger'), 1000);
        } else if (level === '中度') {
            document.body.classList.add('htyq-shake-trigger');
            setTimeout(() => document.body.classList.remove('htyq-shake-trigger'), 600);
        }
    }

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

    // 获取所有世界书名称（保留，但不再强制依赖）
    async function getAllWorlds() {
        try {
            if (typeof getWorldbookNames === 'function') {
                const names = await getWorldbookNames();
                if (names && Array.isArray(names) && names.length) return names;
            }
            const ctx = (typeof SillyTavern !== 'undefined' && SillyTavern.getContext) 
                        ? SillyTavern.getContext() 
                        : (typeof getContext === 'function' ? getContext() : null);
            if (ctx && ctx.worldInfoManager) {
                if (typeof ctx.worldInfoManager.getWorldNames === 'function') {
                    const names = await ctx.worldInfoManager.getWorldNames();
                    if (names && names.length) return names;
                }
                if (typeof ctx.worldInfoManager.getWorlds === 'function') {
                    const worlds = await ctx.worldInfoManager.getWorlds();
                    if (worlds && worlds.length) return worlds.map(w => typeof w === 'string' ? w : (w.name || w.title || w.id));
                }
            }
            return [];
        } catch(e) {
            console.error('[HTYQ] getAllWorlds 错误', e);
            return [];
        }
    }

    // 获取指定世界书的内容
    async function getWorldContent(worldName) {
        if (!worldName || typeof worldName !== 'string') return '';
        const name = worldName.trim();
        if (!name) return '';

        try {
            if (typeof getWorldbook === 'function') {
                const entries = await getWorldbook(name);
                if (entries && Array.isArray(entries) && entries.length) {
                    return entries.map(entry => {
                        const title = entry.comment || entry.name || '条目';
                        const content = entry.content || '';
                        return `【${title}】${content}`;
                    }).join('\n');
                }
                return '';
            }
            const ctx = (typeof SillyTavern !== 'undefined' && SillyTavern.getContext) 
                        ? SillyTavern.getContext() 
                        : (typeof getContext === 'function' ? getContext() : null);
            if (ctx && ctx.worldInfoManager && typeof ctx.worldInfoManager.getWorld === 'function') {
                const world = await ctx.worldInfoManager.getWorld(name);
                if (world && world.entries) {
                    let entries = Array.isArray(world.entries) ? world.entries : Object.values(world.entries);
                    if (entries.length) {
                        return entries.map(entry => {
                            const title = entry.comment || entry.name || '条目';
                            const content = entry.content || '';
                            return `【${title}】${content}`;
                        }).join('\n');
                    }
                }
            }
            console.warn(`[HTYQ] 无法读取世界书 "${name}" 的内容`);
            return '';
        } catch(e) {
            console.error(`[HTYQ] getWorldContent("${name}") 错误`, e);
            return '';
        }
    }

    // 新增：测试世界书是否可读（供UI调用）
    async function testWorldReadable(worldName) {
        const content = await getWorldContent(worldName);
        if (content && content.length > 0) {
            return { success: true, preview: content.substring(0, 200) };
        } else {
            return { success: false, error: '无内容或读取失败' };
        }
    }

    return {
        escapeHtml,
        showFloatingWarning,
        triggerEnvironmentVFX,
        insertActiveContactMessage,
        getAllWorlds,
        getWorldContent,
        testWorldReadable
    };
})();
