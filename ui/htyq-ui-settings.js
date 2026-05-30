// 设置页面渲染模块 - 通过官方 API 自动获取世界书列表
window.HTYQ_UI_SETTINGS = (function() {
    const STATE = window.HTYQ_STATE;
    const utils = window.HTYQ_UTILS;
    const escapeHtml = utils.escapeHtml;

    async function render(container) {
        const set = STATE.globalApiSettings;
        const worldState = STATE.worldState;
        if (!worldState.manualWorlds) worldState.manualWorlds = [];

        // ========== 核心：通过 ST 官方 API 获取世界书列表和内容 ==========
        async function getWorldbookNames() {
            try {
                const ctx = SillyTavern.getContext();
                const headers = ctx.getRequestHeaders ? ctx.getRequestHeaders() : {};
                const response = await fetch('/api/settings/get', {
                    method: 'POST',
                    headers: { ...headers, 'Content-Type': 'application/json' },
                    body: '{}'
                });
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const settings = await response.json();
                return settings.world_names || [];
            } catch(e) {
                console.error('[HTYQ] 获取世界书名称列表失败', e);
                return [];
            }
        }

        async function loadWorldbookContent(worldName) {
            try {
                const ctx = SillyTavern.getContext();
                const data = await ctx.loadWorldInfo(worldName);
                if (!data || !data.entries) return null;
                // 过滤禁用的条目
                const enabledEntries = Object.values(data.entries).filter(e => !e.disable);
                if (enabledEntries.length === 0) return null;
                return { entries: enabledEntries };
            } catch(e) {
                console.error(`[HTYQ] 读取世界书 "${worldName}" 失败`, e);
                return null;
            }
        }

        function convertEntriesToText(entries) {
            let text = '';
            for (const entry of entries) {
                const title = entry.comment || entry.key?.join(', ') || '条目';
                const content = entry.content || '';
                text += `### ${title}\n${content}\n\n`;
            }
            return text.trim();
        }

        async function importSingleWorldbook(worldName) {
            const lorebook = await loadWorldbookContent(worldName);
            if (!lorebook || !lorebook.entries.length) {
                utils.showFloatingWarning(`世界书“${worldName}”无有效内容`, true);
                return false;
            }
            const textContent = convertEntriesToText(lorebook.entries);
            if (!textContent) {
                utils.showFloatingWarning(`世界书“${worldName}”转换后为空`, true);
                return false;
            }
            const existing = worldState.manualWorlds.find(w => w.name === worldName);
            if (existing) {
                if (confirm(`世界书“${worldName}”已存在，是否覆盖？`)) {
                    existing.content = textContent;
                    existing.enabled = true;
                } else return false;
            } else {
                worldState.manualWorlds.push({ name: worldName, enabled: true, content: textContent });
            }
            STATE.saveWorldState();
            utils.showFloatingWarning(`成功导入世界书“${worldName}”`, false);
            return true;
        }

        // 弹出多选对话框
        function showSelectionDialog(bookNames) {
            return new Promise((resolve) => {
                const overlay = document.createElement('div');
                overlay.style.cssText = `
                    position: fixed; top:0; left:0; width:100%; height:100%;
                    background:rgba(0,0,0,0.6); z-index:10005;
                    display:flex; align-items:center; justify-content:center;
                `;
                const dialog = document.createElement('div');
                dialog.style.cssText = `
                    background:#1e2937; border-radius:12px; padding:20px;
                    width:320px; max-width:90%; border:1px solid #334155;
                `;
                dialog.innerHTML = `
                    <h3 style="margin:0 0 12px 0; font-size:16px; color:#c084fc;">📖 选择要导入的世界书</h3>
                    <select id="htyq-worldbook-select" multiple size="8" style="width:100%; background:#0f172a; color:#e2e8f0; border:1px solid #334155; border-radius:6px; padding:8px;">
                        ${bookNames.map(n => `<option value="${escapeHtml(n)}">${escapeHtml(n)}</option>`).join('')}
                    </select>
                    <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:16px;">
                        <button id="htyq-cancel-btn" style="background:#334155; border:none; color:#e2e8f0; padding:6px 12px; border-radius:6px;">取消</button>
                        <button id="htyq-confirm-btn" style="background:#8b5cf6; border:none; color:white; padding:6px 12px; border-radius:6px;">导入选中</button>
                    </div>
                    <div style="font-size:11px; color:#94a3b8; margin-top:12px;">💡 按住 Ctrl (Win) 或 Cmd (Mac) 可多选</div>
                `;
                overlay.appendChild(dialog);
                document.body.appendChild(overlay);
                const selectEl = dialog.querySelector('#htyq-worldbook-select');
                const confirmBtn = dialog.querySelector('#htyq-confirm-btn');
                const cancelBtn = dialog.querySelector('#htyq-cancel-btn');
                const close = (selected) => { overlay.remove(); resolve(selected); };
                confirmBtn.onclick = () => {
                    const selected = Array.from(selectEl.selectedOptions).map(opt => opt.value);
                    if (!selected.length) { utils.showFloatingWarning('请至少选择一个世界书', true); return; }
                    close(selected);
                };
                cancelBtn.onclick = () => close([]);
                overlay.onclick = (e) => { if (e.target === overlay) close([]); };
            });
        }

        async function importFromST() {
            const allNames = await getWorldbookNames();
            if (!allNames.length) {
                utils.showFloatingWarning('未找到任何世界书，请先在 ST 中创建世界书', true);
                return;
            }
            const selected = await showSelectionDialog(allNames);
            if (!selected.length) return;
            let success = 0;
            for (const name of selected) {
                if (await importSingleWorldbook(name)) success++;
            }
            utils.showFloatingWarning(`导入完成：成功 ${success} / ${selected.length}`, false);
            renderWorldList();
            const preview = document.getElementById('htyq-world-preview');
            if (preview) preview.innerHTML = '<div style="color:#94a3b8; text-align:center;">点击「测试」预览完整内容</div>';
        }

        // ========== 渲染世界书列表（与之前相同） ==========
        function renderWorldList() {
            const listDiv = container.querySelector('#htyq-worlds-list');
            if (!listDiv) return;
            const worlds = worldState.manualWorlds;
            if (!worlds.length) {
                listDiv.innerHTML = '<div style="color:#64748b; padding:12px; text-align:center;">暂无世界书，请从ST导入或手动上传</div>';
                return;
            }
            listDiv.innerHTML = worlds.map((world, idx) => `
                <div style="border:1px solid #334155; border-radius:8px; margin-bottom:12px; padding:12px; background:#1e2937;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <label style="display:flex; align-items:center; gap:8px;">
                            <input type="checkbox" class="htyq-world-enable" data-index="${idx}" ${world.enabled !== false ? 'checked' : ''}>
                            <strong>${escapeHtml(world.name)}</strong>
                        </label>
                        <div>
                            <button class="htyq-test-world-btn" data-index="${idx}" style="background:#8b5cf6; border:none; color:white; border-radius:4px; padding:4px 10px; margin-right:6px;">🔍 测试</button>
                            <button class="htyq-del-world-btn" data-index="${idx}" style="background:#ef4444; border:none; color:white; border-radius:4px; padding:4px 10px;">删除</button>
                        </div>
                    </div>
                    <div style="font-size:12px; color:#94a3b8;">📄 内容长度：${world.content.length} 字符</div>
                </div>
            `).join('');

            listDiv.querySelectorAll('.htyq-world-enable').forEach(cb => {
                cb.addEventListener('change', (e) => {
                    const idx = parseInt(cb.dataset.index);
                    if (!isNaN(idx)) {
                        worldState.manualWorlds[idx].enabled = cb.checked;
                        STATE.saveWorldState();
                        utils.showFloatingWarning(`已${cb.checked ? '启用' : '禁用'}「${worldState.manualWorlds[idx].name}」`, false);
                    }
                });
            });

            listDiv.querySelectorAll('.htyq-test-world-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const idx = parseInt(btn.dataset.index);
                    const world = worldState.manualWorlds[idx];
                    if (world) {
                        const previewArea = document.getElementById('htyq-world-preview');
                        if (previewArea) {
                            previewArea.innerHTML = `
                                <div style="background:#0f172a; padding:12px; border-radius:8px; border-left:4px solid #8b5cf6;">
                                    <div style="font-weight:bold; color:#c084fc; margin-bottom:8px;">📖 ${escapeHtml(world.name)} 完整内容</div>
                                    <pre style="white-space:pre-wrap; font-family:monospace; font-size:12px; color:#e2e8f0; margin:0; max-height:400px; overflow-y:auto;">${escapeHtml(world.content)}</pre>
                                </div>
                            `;
                        } else {
                            alert(`内容长度：${world.content.length} 字符\n${world.content.substring(0, 2000)}${world.content.length > 2000 ? '\n…(截断)' : ''}`);
                        }
                    }
                });
            });

            listDiv.querySelectorAll('.htyq-del-world-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const idx = parseInt(btn.dataset.index);
                    if (!isNaN(idx) && confirm('确定删除？')) {
                        const name = worldState.manualWorlds[idx].name;
                        worldState.manualWorlds.splice(idx, 1);
                        renderWorldList();
                        STATE.saveWorldState();
                        utils.showFloatingWarning(`已删除「${name}」`, false);
                        const previewArea = document.getElementById('htyq-world-preview');
                        if (previewArea) previewArea.innerHTML = '';
                    }
                });
            });
        }

        // ========== 构建UI（仅展示相关部分，其他API/引擎/DLC等设置与原版相同，此处省略以保持简洁） ==========
        // 注：实际使用时请保留原有所有设置区块，这里只展示世界书部分的核心修改
        container.innerHTML = `
            <!-- 其他设置区块... -->
            <div class="htyq-settings-section">
                <h3>📚 世界书导入管理器</h3>
                <div style="margin-bottom:12px;">
                    <button id="htyq-upload-file" class="htyq-small-btn" style="background:#3b82f6;">📁 上传 TXT/JSON 文件</button>
                    <button id="htyq-add-empty-world" class="htyq-small-btn" style="background:#10b981;">➕ 新建空白书</button>
                    <button id="htyq-import-st-world" class="htyq-small-btn" style="background:#8b5cf6;">📖 从ST世界书导入（自动列表）</button>
                </div>
                <div id="htyq-worlds-list"></div>
                <div id="htyq-world-preview" style="margin-top:16px; border-top:1px solid #334155; padding-top:12px;">
                    <div style="color:#94a3b8; text-align:center;">点击「测试」预览完整内容</div>
                </div>
                <div style="margin-top:12px; font-size:12px; color:#fbbf24;">
                    💡 提示：点击「从ST世界书导入」会自动列出所有世界书，可多选导入。
                </div>
            </div>
        `;

        // 绑定事件（上传、新建、ST导入）
        const uploadBtn = container.querySelector('#htyq-upload-file');
        if (uploadBtn) {
            uploadBtn.addEventListener('click', () => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.txt,.json';
                input.onchange = (e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                        let content = ev.target.result;
                        let name = file.name.replace(/\.(txt|json)$/i, '');
                        if (file.name.endsWith('.json')) {
                            try {
                                const json = JSON.parse(content);
                                if (Array.isArray(json) && json[0] && (json[0].content || json[0].entry)) {
                                    content = json.map(entry => {
                                        const title = entry.comment || entry.name || '条目';
                                        const body = entry.content || entry.entry || '';
                                        return `### ${title}\n${body}`;
                                    }).join('\n\n');
                                }
                            } catch(e) {}
                        }
                        if (worldState.manualWorlds.find(w => w.name === name)) {
                            if (!confirm(`「${name}」已存在，覆盖？`)) return;
                            const existing = worldState.manualWorlds.find(w => w.name === name);
                            existing.content = content;
                            existing.enabled = true;
                        } else {
                            worldState.manualWorlds.push({ name, enabled: true, content });
                        }
                        STATE.saveWorldState();
                        renderWorldList();
                        utils.showFloatingWarning(`已导入「${name}」`, false);
                    };
                    reader.readAsText(file, 'UTF-8');
                };
                input.click();
            });
        }

        const addEmptyBtn = container.querySelector('#htyq-add-empty-world');
        if (addEmptyBtn) {
            addEmptyBtn.addEventListener('click', () => {
                let base = '新世界书';
                let i = 1;
                while (worldState.manualWorlds.some(w => w.name === base)) base = `新世界书${i++}`;
                worldState.manualWorlds.push({ name: base, enabled: true, content: '在这里填写世界书内容...' });
                STATE.saveWorldState();
                renderWorldList();
                utils.showFloatingWarning(`已创建「${base}」`, false);
            });
        }

        const importStBtn = container.querySelector('#htyq-import-st-world');
        if (importStBtn) {
            importStBtn.addEventListener('click', async () => {
                importStBtn.disabled = true;
                importStBtn.textContent = '⏳ 加载世界书列表...';
                await importFromST();
                importStBtn.disabled = false;
                importStBtn.textContent = '📖 从ST世界书导入（自动列表）';
            });
        }

        renderWorldList();
    }

    return { render };
})();
