// 公共工具模块 - 稳定版（基于 SillyTavern 官方 worldInfoManager）
window.HTYQ_UTILS = (function() {
    // ========== 基础辅助 ==========
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

    // ========== 获取 SillyTavern 上下文（统一兼容层）==========
    function getSTContext() {
        try {
            if (typeof SillyTavern !== 'undefined' && typeof SillyTavern.getContext === 'function') {
                return SillyTavern.getContext();
            }
            if (typeof getContext === 'function') {
                return getContext();
            }
            console.warn('[HTYQ] 无法获取 SillyTavern Context');
            return null;
        } catch (err) {
            console.error('[HTYQ] getSTContext 错误', err);
            return null;
        }
    }

    // ========== 获取所有世界书列表（稳定版）==========
    async function getAllWorlds() {
        try {
            const ctx = getSTContext();
            if (!ctx) {
                console.warn('[HTYQ] Context 不存在');
                return [];
            }

            // 新版 WorldInfoManager
            if (ctx.worldInfoManager) {
                // 方法1：官方 getWorldNames
                if (typeof ctx.worldInfoManager.getWorldNames === 'function') {
                    try {
                        const names = await ctx.worldInfoManager.getWorldNames();
                        if (Array.isArray(names) && names.length > 0) {
                            return names;
                        }
                    } catch (e) {
                        console.warn('[HTYQ] getWorldNames 失败', e);
                    }
                }

                // 方法2：getWorlds
                if (typeof ctx.worldInfoManager.getWorlds === 'function') {
                    try {
                        const worlds = await ctx.worldInfoManager.getWorlds();
                        if (Array.isArray(worlds) && worlds.length > 0) {
                            return worlds.map(w => typeof w === 'string' ? w : (w.name || w.title || w.id));
                        }
                    } catch (e) {
                        console.warn('[HTYQ] getWorlds 失败', e);
                    }
                }

                // 方法3：直接读取 worlds 对象
                if (ctx.worldInfoManager.worlds) {
                    const worlds = ctx.worldInfoManager.worlds;
                    if (Array.isArray(worlds)) {
                        return worlds.map(w => typeof w === 'string' ? w : (w.name || w.title || w.id));
                    }
                    if (typeof worlds === 'object') {
                        return Object.keys(worlds);
                    }
                }
            }

            // 旧版 worldInfo 兼容（备胎）
            if (ctx.worldInfo) {
                if (ctx.worldInfo.entries && Array.isArray(ctx.worldInfo.entries)) {
                    const worldSet = new Set();
                    ctx.worldInfo.entries.forEach(entry => {
                        if (entry.world) worldSet.add(entry.world);
                        if (entry.worldName) worldSet.add(entry.worldName);
                    });
                    if (worldSet.size > 0) return Array.from(worldSet);
                }
                if (ctx.worldInfo.lorebooks) {
                    const lorebooks = ctx.worldInfo.lorebooks;
                    if (Array.isArray(lorebooks)) {
                        return lorebooks.map(lb => lb.name || lb.title || lb);
                    }
                    if (typeof lorebooks === 'object') {
                        return Object.keys(lorebooks);
                    }
                }
            }

            console.warn('[HTYQ] 未读取到任何世界书');
            return [];
        } catch (err) {
            console.error('[HTYQ] getAllWorlds 总错误', err);
            return [];
        }
    }

    // ========== 获取指定世界书的内容（稳定版）==========
    async function getWorldContent(worldName) {
        if (!worldName || typeof worldName !== 'string') return '';
        const name = worldName.trim();
        if (!name) return '';

        try {
            const ctx = getSTContext();
            if (!ctx) return '';

            // 新版 worldInfoManager
            if (ctx.worldInfoManager) {
                // 方法1：getWorld
                if (typeof ctx.worldInfoManager.getWorld === 'function') {
                    try {
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
                    } catch (e) {
                        console.warn(`[HTYQ] getWorld("${name}") 失败`, e);
                    }
                }

                // 方法2：从 worlds 对象中读取
                if (ctx.worldInfoManager.worlds) {
                    let world = null;
                    const worlds = ctx.worldInfoManager.worlds;
                    if (typeof worlds === 'object' && !Array.isArray(worlds)) {
                        world = worlds[name];
                    } else if (Array.isArray(worlds)) {
                        world = worlds.find(w => w?.name === name);
                    }
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
            }

            // 旧版兼容（从 ctx.worldInfo.entries 筛选）
            if (ctx.worldInfo && ctx.worldInfo.entries && Array.isArray(ctx.worldInfo.entries)) {
                const entries = ctx.worldInfo.entries.filter(entry => entry.world === name || entry.worldName === name);
                if (entries.length) {
                    return entries.map(entry => {
                        const title = entry.comment || entry.name || '条目';
                        const content = entry.content || '';
                        return `【${title}】${content}`;
                    }).join('\n');
                }
            }

            console.warn(`[HTYQ] 未找到世界书 "${name}" 的内容`);
            return '';
        } catch (err) {
            console.error(`[HTYQ] 读取世界书 "${name}" 异常`, err);
            return '';
        }
    }

    // ========== 导出的公共接口 ==========
    return {
        escapeHtml,
        showFloatingWarning,
        triggerEnvironmentVFX,
        insertActiveContactMessage,
        getAllWorlds,           // 新版稳定
        getWorldContent        // 新版稳定
    };
})();
