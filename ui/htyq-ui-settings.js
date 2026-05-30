// 设置页面渲染模块 - 完整版（包含API、引擎、DLC、数据管理 + 仅ST世界书导入）
window.HTYQ_UI_SETTINGS = (function() {
    const STATE = window.HTYQ_STATE;
    const utils = window.HTYQ_UTILS;
    const escapeHtml = utils.escapeHtml;

    async function render(container) {
        const set = STATE.globalApiSettings;
        const worldState = STATE.worldState;
        if (!worldState.manualWorlds) worldState.manualWorlds = [];

        // ========== 核心 API：获取世界书列表和内容 ==========
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
                const entries = Object.values(data.entries).filter(e => !e.disable);
                return { name: worldName, entries };
            } catch(e) {
                console.error(`[HTYQ] 读取世界书 "${worldName}" 失败`, e);
                return null;
            }
        }

        function entriesToText(entries) {
            let text = '';
            for (const entry of entries) {
                const title = entry.comment || entry.key?.join(', ') || '条目';
                const content = entry.content || '';
                text += `### ${title}\n${content}\n\n`;
            }
            return text.trim();
        }

        async function importToHtyq(worldName, content) {
            const existing = worldState.manualWorlds.find(w => w.name === worldName);
            if (existing) {
                if (!confirm(`世界书“${worldName}”已存在，是否覆盖？`)) return false;
                existing.content = content;
                existing.enabled = true;
            } else {
                worldState.manualWorlds.push({ name: worldName, enabled: true, content });
            }
            STATE.saveWorldState();
            utils.showFloatingWarning(`成功导入世界书“${worldName}”`, false);
            renderWorldList();
            return true;
        }

        async function importWholeWorldbook(worldName) {
            const data = await loadWorldbookContent(worldName);
            if (!data || !data.entries.length) {
                utils.showFloatingWarning(`世界书“${worldName}”无有效内容`, true);
                return;
            }
            await importToHtyq(worldName, entriesToText(data.entries));
        }

        function showEntrySelectionDialog(worldName, entries) {
            return new Promise((resolve) => {
                const overlay = document.createElement('div');
                overlay.style.cssText = `position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); z-index:10006; display:flex; align-items:center; justify-content:center;`;
                const dialog = document.createElement('div');
                dialog.style.cssText = `background:#1e2937; border-radius:12px; padding:20px; width:500px; max-width:90%; max-height:80%; overflow:auto; border:1px solid #334155; display:flex; flex-direction:column;`;
                dialog.innerHTML = `
                    <h3 style="margin:0 0 8px 0; font-size:16px; color:#c084fc;">📖 ${escapeHtml(worldName)} - 选择条目</h3>
                    <div style="margin-bottom:12px; font-size:12px; color:#94a3b8;">共 ${entries.length} 个条目，可多选</div>
                    <div id="htyq-entries-list" style="flex:1; overflow-y:auto; border:1px solid #334155; border-radius:6px; padding:8px; background:#0f172a;">
                        ${entries.map((entry, idx) => `
                            <label style="display:flex; align-items:flex-start; gap:8px; margin-bottom:8px; cursor:pointer;">
                                <input type="checkbox" data-idx="${idx}" class="htyq-entry-cb" style="margin-top:2px;">
                                <div style="flex:1;">
                                    <div style="font-weight:bold; color:#e2e8f0;">${escapeHtml(entry.comment || entry.key?.join(', ') || '无标题')}</div>
                                    <div style="font-size:11px; color:#94a3b8; margin-top:2px;">${escapeHtml(entry.content?.substring(0, 100) || '')}${entry.content?.length > 100 ? '…' : ''}</div>
                                </div>
                            </label>
                        `).join('')}
                    </div>
                    <div style="margin-top:16px; display:flex; justify-content:flex-end; gap:8px;">
                        <button id="htyq-select-all-btn" style="background:#3b82f6; border:none; color:white; padding:6px 12px; border-radius:6px;">全选</button>
                        <button id="htyq-cancel-btn" style="background:#334155; border:none; color:#e2e8f0; padding:6px 12px; border-radius:6px;">取消</button>
                        <button id="htyq-import-btn" style="background:#8b5cf6; border:none; color:white; padding:6px 12px; border-radius:6px;">导入选中条目</button>
                    </div>
                `;
                overlay.appendChild(dialog);
                document.body.appendChild(overlay);
                const entriesList = dialog.querySelector('#htyq-entries-list');
                const selectAllBtn = dialog.querySelector('#htyq-select-all-btn');
                const cancelBtn = dialog.querySelector('#htyq-cancel-btn');
                const importBtn = dialog.querySelector('#htyq-import-btn');
                const close = (selected) => { overlay.remove(); resolve(selected); };
                selectAllBtn.onclick = () => {
                    const cbs = entriesList.querySelectorAll('.htyq-entry-cb');
                    const allChecked = Array.from(cbs).every(cb => cb.checked);
                    cbs.forEach(cb => cb.checked = !allChecked);
                    selectAllBtn.textContent = allChecked ? '全选' : '取消全选';
                };
                cancelBtn.onclick = () => close(null);
                importBtn.onclick = () => {
                    const selected = Array.from(entriesList.querySelectorAll('.htyq-entry-cb:checked'))
                        .map(cb => entries[parseInt(cb.dataset.idx)]);
                    if (selected.length === 0) { utils.showFloatingWarning('请至少选择一个条目', true); return; }
                    close(selected);
                };
                overlay.onclick = (e) => { if (e.target === overlay) close(null); };
            });
        }

        async function importFromST() {
            const allNames = await getWorldbookNames();
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
                await importWholeWorldbook(selectedWorld.name);
            } else {
                const data = await loadWorldbookContent(selectedWorld.name);
                if (!data || !data.entries.length) {
                    utils.showFloatingWarning(`世界书“${selectedWorld.name}”无有效条目`, true);
                    return;
                }
                const selectedEntries = await showEntrySelectionDialog(selectedWorld.name, data.entries);
                if (!selectedEntries || selectedEntries.length === 0) return;
                const customName = `${selectedWorld.name} (选中条目 ${selectedEntries.length})`;
                await importToHtyq(customName, entriesToText(selectedEntries));
            }
        }

        // ========== 渲染世界书列表 ==========
        function renderWorldList() {
            const listDiv = container.querySelector('#htyq-worlds-list');
            if (!listDiv) return;
            const worlds = worldState.manualWorlds;
            if (!worlds.length) {
                listDiv.innerHTML = '<div style="color:#64748b; padding:12px; text-align:center;">暂无世界书，请从ST世界书导入</div>';
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
                            <button class="htyq-test-world-btn" data-index="${idx}" style="background:#8b5cf6; border:none; color:white; border-radius:4px; padding:4px 10px; margin-right:6px; cursor:pointer;">🔍 测试</button>
                            <button class="htyq-del-world-btn" data-index="${idx}" style="background:#ef4444; border:none; color:white; border-radius:4px; padding:4px 10px; cursor:pointer;">删除</button>
                        </div>
                    </div>
                    <div style="font-size:12px; color:#94a3b8; margin-top:6px;">📄 内容长度：${world.content.length} 字符</div>
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
                            alert(`内容长度：${world.content.length} 字符\n\n${world.content.substring(0, 2000)}${world.content.length > 2000 ? '\n…(内容过长，已截断)' : ''}`);
                        }
                    }
                });
            });

            listDiv.querySelectorAll('.htyq-del-world-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const idx = parseInt(btn.dataset.index);
                    if (!isNaN(idx) && confirm('确定删除这个世界书吗？')) {
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

        // ========== 构建UI ==========
        container.innerHTML = `
            <!-- API 设置 -->
            <div class="htyq-settings-section">
                <h3>🔌 API 设置</h3>
                <div class="htyq-option-row"><label><input type="radio" name="apiMode" value="tavern" ${set.apiMode === 'tavern' ? 'checked' : ''}> 使用酒馆自带模型</label></div>
                <div class="htyq-option-row"><label><input type="radio" name="apiMode" value="custom" ${set.apiMode === 'custom' ? 'checked' : ''}> 使用自定义API</label></div>
                <div id="htyq-custom-settings" style="display: ${set.apiMode === 'custom' ? 'block' : 'none'}; margin-left:20px;">
                    <input type="text" id="htyq-custom-url" placeholder="API Base URL" value="${escapeHtml(set.customUrl)}" style="width:100%; margin-bottom:5px;">
                    <input type="password" id="htyq-custom-key" placeholder="API Key" value="${escapeHtml(set.customKey)}" style="width:100%; margin-bottom:5px;">
                    <input type="text" id="htyq-custom-model" placeholder="模型名称" value="${escapeHtml(set.customModel)}" style="width:100%; margin-bottom:5px;">
                    <button id="htyq-fetch-models" class="htyq-small-btn">获取模型列表</button>
                    <select id="htyq-model-list" style="display:none; width:100%; margin-top:5px;"></select>
                </div>
                <button id="htyq-save-api" class="htyq-small-btn">保存API设置</button>
            </div>

            <!-- 引擎设置 -->
            <div class="htyq-settings-section">
                <h3>⚙️ 引擎设置</h3>
                <div class="htyq-option-row"><label><input type="checkbox" id="htyq-auto-inject" ${set.autoInject ? 'checked' : ''}> 自动注入世界摘要到AI</label></div>
                <div class="htyq-option-row"><label><input type="checkbox" id="htyq-auto-poll" ${set.autoPollMode === 'auto' ? 'checked' : ''}> 自动推演 (每轮对话后)</label></div>
                <div id="htyq-poll-interval-group" style="display: ${set.autoPollMode === 'auto' ? 'block' : 'none'}; margin-left:20px;">
                    每 <input type="number" id="htyq-poll-interval" value="${set.autoPollInterval}" min="1" style="width:70px;"> 轮推演一次
                </div>
                <button id="htyq-save-engine" class="htyq-small-btn">保存引擎设置</button>
            </div>

            <!-- 世界书导入管理器 -->
            <div class="htyq-settings-section">
                <h3>📚 世界书导入管理器</h3>
                <div style="margin-bottom:12px;">
                    <button id="htyq-import-st-world" class="htyq-small-btn" style="background:#8b5cf6;">📖 从ST世界书导入</button>
                </div>
                <div id="htyq-worlds-list" style="max-height:300px; overflow-y:auto;"></div>
                <div id="htyq-world-preview" style="margin-top:16px; border-top:1px solid #334155; padding-top:12px;">
                    <div style="color:#94a3b8; text-align:center; font-size:12px;">点击「测试」按钮，此处将显示世界书完整内容</div>
                </div>
                <div style="margin-top:12px; font-size:12px; color:#fbbf24;">
                    💡 提示：<br>
                    - 点击「从ST世界书导入」→ 选择世界书 → 可选「导入整本」或「选择条目」。<br>
                    - 选择条目后可多选，导入后自动合并为一个新的世界书。<br>
                    - 勾选「启用」后，该世界书的内容会在推演时被 AI 读取。<br>
                    - 点击「测试」可预览完整内容。
                </div>
            </div>

            <!-- DLC 开关 -->
            <div class="htyq-settings-section">
                <h3>🎲 DLC 开关</h3>
                <div id="htyq-dlcs-container" style="display:grid; grid-template-columns:repeat(2,1fr); gap:6px;"></div>
                <button id="htyq-save-dlcs" class="htyq-small-btn">保存DLC设置</button>
            </div>

            <!-- 数据管理 -->
            <div class="htyq-settings-section">
                <h3>📁 数据管理</h3>
                <div style="display:flex; gap:8px; flex-wrap:wrap;">
                    <button id="htyq-reset-world" class="htyq-small-btn" style="background:#ef4444;">重置当前聊天世界</button>
                    <button id="htyq-export-world" class="htyq-small-btn" style="background:#3b82f6;">导出世界状态</button>
                    <button id="htyq-import-world" class="htyq-small-btn" style="background:#3b82f6;">导入世界状态</button>
                </div>
            </div>
        `;

        // ========== 渲染 DLC 列表 ==========
        const dlcMap = { 
            world_engine: '活体世界引擎', 
            group_dynamics: '社会群体法则', 
            active_contact: '主动接触判定', 
            revenge: '恩怨录', 
            blackmarket: '黑市', 
            economy: '经济脉搏', 
            accident: '意外事件', 
            reputation: '声誉系统', 
            power_peak: '权力顶点', 
            group_relation: '团体关系', 
            secret_asset: '信息黑盒' 
        };
        const dlcContainer = container.querySelector('#htyq-dlcs-container');
        if (dlcContainer) {
            dlcContainer.innerHTML = '';
            for (const [key, label] of Object.entries(dlcMap)) {
                const checked = set.enabledDlcs[key] !== false;
                dlcContainer.innerHTML += `<label class="htyq-checkbox-label"><input type="checkbox" data-dlc="${key}" ${checked ? 'checked' : ''}> ${label}</label>`;
            }
        }

        // ========== 事件绑定 ==========
        // API 模式切换
        document.querySelectorAll('input[name="apiMode"]').forEach(r => r.addEventListener('change', (e) => {
            const customDiv = container.querySelector('#htyq-custom-settings');
            if (customDiv) customDiv.style.display = e.target.value === 'custom' ? 'block' : 'none';
        }));
        // 自动推演
        const autoPollCb = container.querySelector('#htyq-auto-poll');
        if (autoPollCb) {
            autoPollCb.addEventListener('change', (e) => {
                const intervalGroup = container.querySelector('#htyq-poll-interval-group');
                if (intervalGroup) intervalGroup.style.display = e.target.checked ? 'block' : 'none';
            });
        }
        // 获取模型列表
        const fetchModelsBtn = container.querySelector('#htyq-fetch-models');
        if (fetchModelsBtn) {
            fetchModelsBtn.addEventListener('click', async () => {
                const url = container.querySelector('#htyq-custom-url')?.value.trim();
                const key = container.querySelector('#htyq-custom-key')?.value.trim();
                if (!url) { utils.showFloatingWarning('请填写API URL', true); return; }
                const fetchUrl = url.replace(/\/$/, '') + (url.endsWith('/v1') ? '/models' : '/v1/models');
                try {
                    const resp = await fetch(fetchUrl, { headers: { 'Authorization': `Bearer ${key}` } });
                    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
                    const data = await resp.json();
                    if (data.data && Array.isArray(data.data)) {
                        const select = container.querySelector('#htyq-model-list');
                        select.innerHTML = '<option value="">-- 选择模型 --</option>';
                        data.data.forEach(m => { const opt = document.createElement('option'); opt.value = m.id; opt.textContent = m.id; select.appendChild(opt); });
                        select.style.display = 'block';
                        select.onchange = () => { const modelInput = container.querySelector('#htyq-custom-model'); if (modelInput) modelInput.value = select.value; };
                        utils.showFloatingWarning(`获取到 ${data.data.length} 个模型`, false);
                    } else utils.showFloatingWarning('无法解析模型列表', true);
                } catch(e) { utils.showFloatingWarning('获取模型失败: ' + e.message, true); }
            });
        }
        // 保存API设置
        const saveApiBtn = container.querySelector('#htyq-save-api');
        if (saveApiBtn) {
            saveApiBtn.addEventListener('click', () => {
                const selected = container.querySelector('input[name="apiMode"]:checked');
                if (selected) STATE.globalApiSettings.apiMode = selected.value;
                STATE.globalApiSettings.customUrl = container.querySelector('#htyq-custom-url')?.value || '';
                STATE.globalApiSettings.customKey = container.querySelector('#htyq-custom-key')?.value || '';
                STATE.globalApiSettings.customModel = container.querySelector('#htyq-custom-model')?.value || '';
                STATE.saveGlobalSettings();
                utils.showFloatingWarning('API设置已保存', false);
            });
        }
        // 保存引擎设置
        const saveEngineBtn = container.querySelector('#htyq-save-engine');
        if (saveEngineBtn) {
            saveEngineBtn.addEventListener('click', () => {
                STATE.globalApiSettings.autoInject = container.querySelector('#htyq-auto-inject')?.checked || false;
                STATE.globalApiSettings.autoPollMode = container.querySelector('#htyq-auto-poll')?.checked ? 'auto' : 'manual';
                const interval = container.querySelector('#htyq-poll-interval');
                if (interval) STATE.globalApiSettings.autoPollInterval = parseInt(interval.value) || 1;
                STATE.saveGlobalSettings();
                utils.showFloatingWarning('引擎设置已保存', false);
            });
        }
        // 保存 DLC
        const saveDlcsBtn = container.querySelector('#htyq-save-dlcs');
        if (saveDlcsBtn) {
            saveDlcsBtn.addEventListener('click', () => {
                document.querySelectorAll('#htyq-dlcs-container input[type="checkbox"]').forEach(cb => {
                    STATE.globalApiSettings.enabledDlcs[cb.dataset.dlc] = cb.checked;
                });
                STATE.saveGlobalSettings();
                utils.showFloatingWarning('DLC设置已保存', false);
            });
        }
        // 重置世界
        const resetWorldBtn = container.querySelector('#htyq-reset-world');
        if (resetWorldBtn) {
            resetWorldBtn.addEventListener('click', () => {
                if (confirm('重置当前聊天世界？这将清除所有进度，不可恢复！')) { 
                    STATE.worldState = STATE.getDefaultWorldState(); 
                    STATE.saveWorldState(); 
                    if (window.HTYQ_UI && window.HTYQ_UI.refresh) window.HTYQ_UI.refresh(); 
                    utils.showFloatingWarning('世界已重置', false); 
                }
            });
        }
        // 导出
        const exportBtn = container.querySelector('#htyq-export-world');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                const dataStr = JSON.stringify(STATE.worldState, null, 2);
                const blob = new Blob([dataStr], {type:'application/json'});
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `htyq_world_${STATE.getCurrentChatId()}.json`;
                a.click();
                URL.revokeObjectURL(url);
            });
        }
        // 导入
        const importBtn = container.querySelector('#htyq-import-world');
        if (importBtn) {
            importBtn.addEventListener('click', () => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'application/json';
                input.onchange = (e) => {
                    const file = e.target.files[0];
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                        try {
                            const imported = JSON.parse(ev.target.result);
                            STATE.worldState = { ...STATE.worldState, ...imported };
                            STATE.saveWorldState();
                            if (window.HTYQ_UI && window.HTYQ_UI.refresh) window.HTYQ_UI.refresh();
                            utils.showFloatingWarning('世界状态导入成功', false);
                        } catch(err) { utils.showFloatingWarning('导入失败：无效的JSON', true); }
                    };
                    reader.readAsText(file);
                };
                input.click();
            });
        }

        // ========== ST 导入按钮 ==========
        const importStBtn = container.querySelector('#htyq-import-st-world');
        if (importStBtn) {
            importStBtn.addEventListener('click', async () => {
                importStBtn.disabled = true;
                importStBtn.textContent = '⏳ 加载世界书列表...';
                await importFromST();
                importStBtn.disabled = false;
                importStBtn.textContent = '📖 从ST世界书导入';
            });
        }

        // 初始化世界书列表
        renderWorldList();
    }

    return { render };
})();
