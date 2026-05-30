// 世界书导入功能模块：自动导入激活的世界书、手动导入、删除等
window.__HTYQ_UI_SETTINGS_WORLDBOOK = (function() {
    const STATE = window.HTYQ_STATE;
    const utils = window.HTYQ_UTILS;
    const helpers = window.__HTYQ_UI_SETTINGS_HELPERS;
    const escapeHtml = utils.escapeHtml;

    // 获取所有激活的世界书（角色绑定 + 全局启用）
    async function getActiveWorldbooks() {
        const ctx = SillyTavern.getContext();
        const result = [];

        // 角色绑定世界书
        try {
            const char = ctx.characters?.[ctx.characterId];
            const charWorld = char?.data?.extensions?.world;
            if (charWorld) {
                const book = await ctx.loadWorldInfo(charWorld);
                if (book && book.entries) {
                    result.push({
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
                        result.push({
                            source: 'global',
                            name: name,
                            entries: Object.values(book.entries).filter(e => !e.disable)
                        });
                    }
                }
            }
        } catch(e) { console.warn('读取全局世界书失败', e); }

        return result;
    }

    // 导入整本世界书（直接调用 importToHtyq）
    async function importWholeWorldbook(worldName, entries, silent = false, source = 'manual') {
        if (!entries || !entries.length) {
            if (!silent) utils.showFloatingWarning(`世界书“${worldName}”无有效内容`, true);
            return false;
        }
        const textContent = helpers.entriesToText(entries);
        return await importToHtyq(worldName, textContent, silent, source);
    }

    // 核心导入函数：将文本内容存入 manualWorlds
    async function importToHtyq(worldName, content, silent = false, source = 'manual') {
        const worldState = STATE.worldState;
        if (!worldState.manualWorlds) worldState.manualWorlds = [];
        const existing = worldState.manualWorlds.find(w => w.name === worldName);
        if (existing) {
            if (!silent && !confirm(`世界书“${worldName}”已存在，是否覆盖？`)) return false;
            existing.content = content;
            existing.enabled = true;
            existing.source = source;
        } else {
            worldState.manualWorlds.push({ name: worldName, enabled: true, content, source });
        }
        STATE.saveWorldState();
        if (!silent) utils.showFloatingWarning(`成功导入世界书“${worldName}”`, false);
        return true;
    }

    // 自动导入所有激活的世界书（同时清理失效的）
    async function autoImportActiveWorldbooks() {
        const worldState = STATE.worldState;
        if (!worldState.manualWorlds) worldState.manualWorlds = [];

        // 1. 获取当前所有激活的世界书
        const activeBooks = await getActiveWorldbooks();
        const activeNames = new Set(activeBooks.map(b => b.name));

        // 2. 删除已经失效的自动导入世界书（来源为 character 或 global 但不在激活列表中）
        const beforeCount = worldState.manualWorlds.length;
        worldState.manualWorlds = worldState.manualWorlds.filter(w => {
            if (w.source !== 'character' && w.source !== 'global') return true;
            return activeNames.has(w.name);
        });
        const deletedCount = beforeCount - worldState.manualWorlds.length;
        if (deletedCount > 0) {
            console.log(`[HTYQ] 清理了 ${deletedCount} 个失效的自动导入世界书`);
            STATE.saveWorldState();
        }

        // 3. 导入（或更新）当前激活的世界书
        if (activeBooks.length === 0) {
            utils.showFloatingWarning('未检测到任何激活的世界书（角色绑定或全局启用）', true);
            return;
        }
        let success = 0;
        for (const book of activeBooks) {
            const source = book.source === 'character' ? 'character' : 'global';
            if (await importWholeWorldbook(book.name, book.entries, true, source)) success++;
        }
        utils.showFloatingWarning(`自动同步完成：成功 ${success} / ${activeBooks.length}`, false);
    }

    // 手动导入（用户选择世界书）
    async function manualImportFromST() {
        const allNames = await helpers.getWorldbookNames();
        if (!allNames.length) {
            utils.showFloatingWarning('未找到任何世界书，请先在 ST 中创建世界书', true);
            return;
        }
        const selectedWorld = await new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.style.cssText = `position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.6); z-index:10005; display:flex; align-items:center; justify-content:center;`;
            const dialog = document.createElement('div');
            dialog.style.cssText = `background:#1e2937; border-radius:12px; padding:20px; width:320px; max-width:90%; border:1px solid #334155;`;
            dialog.innerHTML = `
                <h3 style="margin:0 0 12px 0; font-size:16px; color:#c084fc;">📖 选择世界书</h3>
                <select id="htyq-world-select" style="width:100%; background:#0f172a; color:#e2e8f0; border:1px solid #334155; border-radius:6px; padding:8px;">
                    <option value="">-- 请选择 --</option>
                    ${allNames.map(n => `<option value="${escapeHtml(n)}">${escapeHtml(n)}</option>`).join('')}
                </select>
                <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:16px;">
                    <button id="htyq-cancel-btn" style="background:#334155; border:none; color:#e2e8f0; padding:6px 12px; border-radius:6px;">取消</button>
                    <button id="htyq-whole-btn" style="background:#8b5cf6; border:none; color:white; padding:6px 12px; border-radius:6px;">导入整本</button>
                    <button id="htyq-entries-btn" style="background:#10b981; border:none; color:white; padding:6px 12px; border-radius:6px;">选择条目</button>
                </div>
            `;
            overlay.appendChild(dialog);
            document.body.appendChild(overlay);
            const selectEl = dialog.querySelector('#htyq-world-select');
            const cancelBtn = dialog.querySelector('#htyq-cancel-btn');
            const wholeBtn = dialog.querySelector('#htyq-whole-btn');
            const entriesBtn = dialog.querySelector('#htyq-entries-btn');
            const close = (result) => { overlay.remove(); resolve(result); };
            cancelBtn.onclick = () => close(null);
            wholeBtn.onclick = () => {
                const name = selectEl.value;
                if (!name) { utils.showFloatingWarning('请选择一个世界书', true); return; }
                close({ type: 'whole', name });
            };
            entriesBtn.onclick = () => {
                const name = selectEl.value;
                if (!name) { utils.showFloatingWarning('请选择一个世界书', true); return; }
                close({ type: 'entries', name });
            };
            overlay.onclick = (e) => { if (e.target === overlay) close(null); };
        });
        if (!selectedWorld) return;
        if (selectedWorld.type === 'whole') {
            const data = await helpers.loadWorldbookContent(selectedWorld.name);
            if (data && data.entries.length) {
                await importWholeWorldbook(selectedWorld.name, data.entries, false, 'manual');
            } else {
                utils.showFloatingWarning(`世界书“${selectedWorld.name}”无有效内容`, true);
            }
        } else {
            const data = await helpers.loadWorldbookContent(selectedWorld.name);
            if (!data || !data.entries.length) {
                utils.showFloatingWarning(`世界书“${selectedWorld.name}”无有效条目`, true);
                return;
            }
            const selectedEntries = await helpers.showEntrySelectionDialog(selectedWorld.name, data.entries);
            if (!selectedEntries || selectedEntries.length === 0) return;
            const customName = `${selectedWorld.name} (选中条目 ${selectedEntries.length})`;
            const textContent = helpers.entriesToText(selectedEntries);
            await importToHtyq(customName, textContent, false, 'manual');
        }
    }

    // 渲染世界书列表（支持多选、批量删除、测试等）
    function renderWorldList(container, worldState, onRefresh) {
        const worlds = worldState.manualWorlds || [];
        const selectedIndices = new Set();

        function refreshList() {
            if (!container) return;
            if (!worlds.length) {
                container.innerHTML = '<div style="color:#64748b; padding:12px; text-align:center;">暂无世界书，请从ST世界书导入</div>';
                return;
            }
            container.innerHTML = `
                <div style="margin-bottom:8px; display:flex; align-items:center; gap:8px;">
                    <label style="display:flex; align-items:center; gap:4px; cursor:pointer;">
                        <input type="checkbox" id="htyq-select-all-cb" ${selectedIndices.size === worlds.length ? 'checked' : ''}>
                        <span style="font-size:12px;">全选</span>
                    </label>
                    <button id="htyq-batch-delete-btn" class="htyq-small-btn" style="background:#ef4444; padding:4px 10px;">🗑️ 删除选中</button>
                </div>
                <div id="htyq-worlds-container">
                    ${worlds.map((world, idx) => `
                        <div style="border:1px solid #334155; border-radius:8px; margin-bottom:12px; padding:12px; background:#1e2937;">
                            <div style="display:flex; justify-content:space-between; align-items:center;">
                                <div style="display:flex; align-items:center; gap:12px;">
                                    <input type="checkbox" class="htyq-world-select" data-index="${idx}" ${selectedIndices.has(idx) ? 'checked' : ''}>
                                    <label style="display:flex; align-items:center; gap:8px;">
                                        <input type="checkbox" class="htyq-world-enable" data-index="${idx}" ${world.enabled !== false ? 'checked' : ''}>
                                        <strong>${escapeHtml(world.name)}</strong>
                                    </label>
                                </div>
                                <div>
                                    <button class="htyq-test-world-btn" data-index="${idx}" style="background:#8b5cf6; border:none; color:white; border-radius:4px; padding:4px 10px; margin-right:6px; cursor:pointer;">🔍 测试</button>
                                    <button class="htyq-del-world-btn" data-index="${idx}" style="background:#ef4444; border:none; color:white; border-radius:4px; padding:4px 10px; cursor:pointer;">删除</button>
                                </div>
                            </div>
                            <div style="font-size:12px; color:#94a3b8; margin-top:6px;">📄 内容长度：${world.content.length} 字符</div>
                        </div>
                    `).join('')}
                </div>
            `;

            const selectAllCb = container.querySelector('#htyq-select-all-cb');
            if (selectAllCb) {
                selectAllCb.addEventListener('change', (e) => {
                    const isChecked = e.target.checked;
                    const selectCbs = container.querySelectorAll('.htyq-world-select');
                    if (isChecked) {
                        for (let i = 0; i < worlds.length; i++) selectedIndices.add(i);
                        selectCbs.forEach(cb => cb.checked = true);
                    } else {
                        selectedIndices.clear();
                        selectCbs.forEach(cb => cb.checked = false);
                    }
                });
            }

            const selectCbs = container.querySelectorAll('.htyq-world-select');
            selectCbs.forEach(cb => {
                cb.addEventListener('change', (e) => {
                    const idx = parseInt(cb.dataset.index);
                    if (e.target.checked) selectedIndices.add(idx);
                    else selectedIndices.delete(idx);
                    const allCb = container.querySelector('#htyq-select-all-cb');
                    if (allCb) allCb.checked = (selectedIndices.size === worlds.length);
                });
            });

            const batchDeleteBtn = container.querySelector('#htyq-batch-delete-btn');
            if (batchDeleteBtn) {
                batchDeleteBtn.addEventListener('click', () => {
                    if (selectedIndices.size === 0) {
                        utils.showFloatingWarning('没有选中任何世界书', true);
                        return;
                    }
                    const names = Array.from(selectedIndices).map(i => worlds[i]?.name).filter(Boolean);
                    if (!confirm(`确定删除选中的 ${selectedIndices.size} 个世界书吗？\n${names.join(', ')}`)) return;
                    const sortedIndices = Array.from(selectedIndices).sort((a,b) => b - a);
                    for (const idx of sortedIndices) worlds.splice(idx, 1);
                    selectedIndices.clear();
                    STATE.saveWorldState();
                    refreshList();
                    utils.showFloatingWarning(`已删除 ${sortedIndices.length} 个世界书`, false);
                    const previewArea = document.querySelector('#htyq-world-preview');
                    if (previewArea) previewArea.innerHTML = '<div style="color:#94a3b8; text-align:center; font-size:12px;">点击「测试」按钮，此处将显示世界书完整内容</div>';
                });
            }

            container.querySelectorAll('.htyq-world-enable').forEach(cb => {
                cb.addEventListener('change', (e) => {
                    const idx = parseInt(cb.dataset.index);
                    if (!isNaN(idx)) {
                        worlds[idx].enabled = cb.checked;
                        STATE.saveWorldState();
                        utils.showFloatingWarning(`已${cb.checked ? '启用' : '禁用'}「${worlds[idx].name}」`, false);
                    }
                });
            });

            container.querySelectorAll('.htyq-test-world-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const idx = parseInt(btn.dataset.index);
                    const world = worlds[idx];
                    if (world) {
                        const previewArea = document.querySelector('#htyq-world-preview');
                        if (previewArea) {
                            previewArea.innerHTML = `
                                <div style="background:#0f172a; padding:12px; border-radius:8px; border-left:4px solid #8b5cf6;">
                                    <div style="font-weight:bold; color:#c084fc; margin-bottom:8px;">📖 ${escapeHtml(world.name)} 完整内容</div>
                                    <pre style="white-space:pre-wrap; font-family:monospace; font-size:12px; color:#e2e8f0; margin:0; max-height:400px; overflow-y:auto;">${escapeHtml(world.content)}</pre>
                                </div>
                            `;
                        } else {
                            alert(`内容长度：${world.content.length} 字符\n\n${world.content.substring(0, 2000)}${world.content.length > 2000 ? '\n…(内容过长，已截断)' : ''}`);
                        }
                    }
                });
            });

            container.querySelectorAll('.htyq-del-world-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const idx = parseInt(btn.dataset.index);
                    if (!isNaN(idx) && confirm('确定删除这个世界书吗？')) {
                        const name = worlds[idx].name;
                        worlds.splice(idx, 1);
                        const newSelected = new Set();
                        for (let i of selectedIndices) {
                            if (i < idx) newSelected.add(i);
                            else if (i > idx) newSelected.add(i-1);
                        }
                        selectedIndices.clear();
                        for (let i of newSelected) selectedIndices.add(i);
                        STATE.saveWorldState();
                        refreshList();
                        utils.showFloatingWarning(`已删除「${name}」`, false);
                        const previewArea = document.querySelector('#htyq-world-preview');
                        if (previewArea) previewArea.innerHTML = '';
                    }
                });
            });
        }

        refreshList();
        return { refreshList };
    }

    return {
        getActiveWorldbooks,
        importWholeWorldbook,
        importToHtyq,
        autoImportActiveWorldbooks,
        manualImportFromST,
        renderWorldList
    };
})();
