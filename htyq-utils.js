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

    // ==================== 修复后的世界书读取函数 ====================
    
    // 获取所有世界书名称列表（兼容SillyTavern 1.12+）
    async function getAllWorlds() {
        try {
            // 方法1：官方全局函数 getWorldbookNames（最优先）
            if (typeof getWorldbookNames === 'function') {
                const names = await getWorldbookNames();
                if (names && Array.isArray(names) && names.length) {
                    console.log('[HTYQ] 通过 getWorldbookNames 获取世界书:', names);
                    return names;
                }
            }

            // 方法2：通过 context.worldInfoManager
            const ctx = (typeof SillyTavern !== 'undefined' && SillyTavern.getContext) 
                        ? SillyTavern.getContext() 
                        : (typeof getContext === 'function' ? getContext() : null);
            
            if (ctx && ctx.worldInfoManager) {
                // 2.1 getWorldNames
                if (typeof ctx.worldInfoManager.getWorldNames === 'function') {
                    const names = await ctx.worldInfoManager.getWorldNames();
                    if (names && names.length) {
                        console.log('[HTYQ] worldInfoManager.getWorldNames 获取世界书:', names);
                        return names;
                    }
                }
                // 2.2 getWorlds（返回对象数组）
                if (typeof ctx.worldInfoManager.getWorlds === 'function') {
                    const worlds = await ctx.worldInfoManager.getWorlds();
                    if (worlds && worlds.length) {
                        const names = worlds.map(w => typeof w === 'string' ? w : (w.name || w.title || w.id));
                        console.log('[HTYQ] worldInfoManager.getWorlds 获取世界书:', names);
                        return names;
                    }
                }
            }

            // 方法3：降级 - 尝试全局变量（旧版本兼容）
            if (window.world_names && Array.isArray(window.world_names) && window.world_names.length) {
                console.log('[HTYQ] window.world_names 获取世界书:', window.world_names);
                return [...window.world_names];
            }
            if (window.parent && window.parent.world_names && Array.isArray(window.parent.world_names)) {
                console.log('[HTYQ] parent.world_names 获取世界书:', window.parent.world_names);
                return [...window.parent.world_names];
            }

            console.warn('[HTYQ] 所有方法均未能获取世界书列表');
            return [];
        } catch (err) {
            console.error('[HTYQ] getAllWorlds 错误', err);
            return [];
        }
    }

    // 获取指定世界书的内容（兼容SillyTavern 1.12+）
    async function getWorldContent(worldName) {
        if (!worldName || typeof worldName !== 'string') return '';
        const name = worldName.trim();
        if (!name) return '';

        try {
            // 方法1：官方全局函数 getWorldbook
            if (typeof getWorldbook === 'function') {
                console.log(`[HTYQ] 使用 getWorldbook("${name}")`);
                const entries = await getWorldbook(name);
                if (entries && Array.isArray(entries) && entries.length) {
                    return entries.map(entry => {
                        const title = entry.comment || entry.name || '条目';
                        const content = entry.content || '';
                        return `【${title}】${content}`;
                    }).join('\n');
                }
                if (entries && entries.length === 0) {
                    console.warn(`[HTYQ] 世界书 "${name}" 存在但无条目`);
                }
                return '';
            }

            // 方法2：通过 worldInfoManager
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
        } catch (err) {
            console.error(`[HTYQ] getWorldContent("${name}") 错误`, err);
            return '';
        }
    }

    return {
        escapeHtml,
        showFloatingWarning,
        triggerEnvironmentVFX,
        insertActiveContactMessage,
        getAllWorlds,
        getWorldContent
    };
})();
