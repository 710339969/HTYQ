// 设置页面渲染模块 - 完整版，包含API、引擎、DLC、数据管理、世界书条目级编辑器
window.HTYQ_UI_SETTINGS = (function() {
    const STATE = window.HTYQ_STATE;
    const utils = window.HTYQ_UTILS;
    const escapeHtml = utils.escapeHtml;

    async function render(container) {
        const set = STATE.globalApiSettings;
        const worldState = STATE.worldState;
        if (!worldState.manualWorlds) worldState.manualWorlds = [];

        // 辅助：将任意文本转换为条目数组（按 ### 标题分割，或整体作为单个条目）
        function textToEntries(text, worldName) {
            const lines = text.split('\n');
            const entries = [];
            let currentTitle = '内容';
            let currentContent = [];
            for (let line of lines) {
                if (line.trim().startsWith('### ')) {
                    if (currentContent.length) {
                        entries.push({ title: currentTitle, content: currentContent.join('\n').trim() });
                    }
                    currentTitle = line.trim().substring(4);
                    currentContent = [];
                } else {
                    currentContent.push(line);
                }
            }
            if (currentContent.length || entries.length === 0) {
                entries.push({ title: currentTitle, content: currentContent.join('\n').trim() });
            }
            return entries.filter(e => e.content || e.title);
        }

        // 渲染世界书列表（卡片形式，显示条目数）
        function renderWorldList() {
            const listDiv = container.querySelector('#htyq-worlds-list');
            if (!listDiv) return;
            const worlds = worldState.manualWorlds;
            if (!worlds.length) {
                listDiv.innerHTML = '<div style="color:#64748b; padding:12px; text-align:center;">暂无世界书，请上传文件或手动添加</div>';
                return;
            }
            listDiv.innerHTML = worlds.map((world, idx) => `
                <div style="border:1px solid #334155; border-radius:8px; margin-bottom:12px; padding:12px; background:#1e2937;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <label style="display:flex; align-items:center; gap:8px;">
                            <input type="checkbox" class="htyq-world-enable" data-index="${idx}" ${world.enabled !== false ? 'checked' : ''}>
                            <strong>${escapeHtml(world.name)}</strong>
                        </label>
                        <button class="htyq-del-world" data-index="${idx}" style="background:#ef4444; border:none; color:white; border-radius:4px; padding:4px 10px; cursor:pointer;">删除世界书</button>
                    </div>
                    <div style="font-size:12px; color:#94a3b8; margin-top:6px;">📄 条目数：${world.entries.length}</div>
                </div>
            `).join('');

            // 启用/禁用
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
            // 删除世界书
            listDiv.querySelectorAll('.htyq-del-world').forEach(btn => {
                btn.addEventListener('click', () => {
                    const idx = parseInt(btn.dataset.index);
                    if (!isNaN(idx) && confirm('确定删除这个世界书及其所有条目吗？')) {
                        const name = worldState.manualWorlds[idx].name;
                        worldState.manualWorlds.splice(idx, 1);
                        renderWorldList();
                        // 清空编辑器选择
                        const worldSelect = container.querySelector('#htyq-edit-world-select');
                        if (worldSelect) worldSelect.innerHTML = '<option value="">-- 请选择世界书 --</option>';
                        const entrySelect = container.querySelector('#htyq-edit-entry-select');
                        if (entrySelect) entrySelect.innerHTML = '<option value="">-- 请先选择世界书 --</option>';
                        document.getElementById('htyq-entry-content').value = '';
                        STATE.saveWorldState();
                        utils.showFloatingWarning(`已删除「${name}」`, false);
                    }
                });
            });
        }

        // 填充世界书下拉框
        function populateWorldSelect(selectedName) {
            const worldSelect = container.querySelector('#htyq-edit-world-select');
            if (!worldSelect) return;
            let options = '<option value="">-- 请选择世界书 --</option>';
            for (const world of worldState.manualWorlds) {
                options += `<option value="${escapeHtml(world.name)}" ${world.name === selectedName ? 'selected' : ''}>${escapeHtml(world.name)} (${world.entries.length}条目)</option>`;
            }
            worldSelect.innerHTML = options;
        }

        // 根据世界书名称填充条目下拉框
        function populateEntrySelect(worldName, selectedTitle) {
            const entrySelect = container.querySelector('#htyq-edit-entry-select');
            if (!entrySelect) return;
            const world = worldState.manualWorlds.find(w => w.name === worldName);
            if (!world) {
                entrySelect.innerHTML = '<option value="">-- 请先选择世界书 --</option>';
                document.getElementById('htyq-entry-content').value = '';
                return;
            }
            let options = '<option value="">-- 请选择条目 --</option>';
            for (let i = 0; i < world.entries.length; i++) {
                const entry = world.entries[i];
                const selectedAttr = entry.title === selectedTitle ? 'selected' : '';
                options += `<option value="${i}" ${selectedAttr}>${escapeHtml(entry.title)}</option>`;
            }
            entrySelect.innerHTML = options;
            // 如果有选中条目，显示内容
            if (selectedTitle) {
                const entry = world.entries.find(e => e.title === selectedTitle);
                if (entry) document.getElementById('htyq-entry-content').value = entry.content;
            } else {
                document.getElementById('htyq-entry-content').value = '';
            }
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

            <!-- 世界书导入管理器（条目级编辑） -->
            <div class="htyq-settings-section">
                <h3>📚 世界书导入管理器（条目级编辑）</h3>
                <div style="margin-bottom:12px;">
                    <button id="htyq-upload-file" class="htyq-small-btn" style="background:#3b82f6;">📁 上传 JSON/TXT 文件导入</button>
                    <button id="htyq-add-empty-world" class="htyq-small-btn" style="background:#10b981;">➕ 新建空白世界书</button>
                </div>
                <div style="border:1px solid #334155; border-radius:8px; padding:12px; margin-bottom:16px;">
                    <div style="margin-bottom:12px;">
                        <label style="display:block; margin-bottom:4px;">📖 选择世界书：</label>
                        <select id="htyq-edit-world-select" style="width:100%; background:#0f172a; border:1px solid #334155; color:white; padding:6px;"></select>
                    </div>
                    <div style="margin-bottom:12px;">
                        <label style="display:block; margin-bottom:4px;">📑 选择条目：</label>
                        <select id="htyq-edit-entry-select" style="width:100%; background:#0f172a; border:1px solid #334155; color:white; padding:6px;"></select>
                    </div>
                    <div>
                        <label style="display:block; margin-bottom:4px;">📝 条目内容：</label>
                        <textarea id="htyq-entry-content" rows="8" placeholder="条目内容..." style="width:100%; background:#0f172a; border:1px solid #334155; color:white; padding:6px; font-family:monospace;"></textarea>
                    </div>
                    <div style="margin-top:12px; display:flex; gap:8px; flex-wrap:wrap;">
                        <button id="htyq-update-entry" class="htyq-small-btn" style="background:#f59e0b;">💾 保存当前条目修改</button>
                        <button id="htyq-add-entry" class="htyq-small-btn" style="background:#10b981;">➕ 在当前世界书中添加新条目</button>
                        <button id="htyq-delete-entry" class="htyq-small-btn" style="background:#ef4444;">🗑️ 删除当前条目</button>
                    </div>
                </div>
                <div id="htyq-worlds-list" style="max-height:300px; overflow-y:auto;"></div>
                <div style="margin-top:12px; font-size:12px; color:#fbbf24;">
                    💡 提示：<br>
                    - 上传 JSON 文件时，如果文件是 SillyTavern 世界书格式（数组，每个元素含 name/comment 和 content），会自动解析为条目。<br>
                    - 上传 TXT 文件时，会按 "### 标题" 格式自动拆分条目，否则作为单个条目。<br>
                    - 勾选「启用」后，该世界书的所有条目才会在推演时被 AI 读取。
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
        // 1. API 模式切换
        document.querySelectorAll('input[name="apiMode"]').forEach(r => r.addEventListener('change', (e) => {
            const customDiv = container.querySelector('#htyq-custom-settings');
            if (customDiv) customDiv.style.display = e.target.value === 'custom' ? 'block' : 'none';
        }));

        // 2. 自动推演复选框
        const autoPollCb = container.querySelector('#htyq-auto-poll');
        if (autoPollCb) {
            autoPollCb.addEventListener('change', (e) => {
                const intervalGroup = container.querySelector('#htyq-poll-interval-group');
                if (intervalGroup) intervalGroup.style.display = e.target.checked ? 'block' : 'none';
            });
        }

        // 3. 获取模型列表
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

        // 4. 保存API设置
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

        // 5. 保存引擎设置
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

        // 6. 保存 DLC 设置
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

        // 7. 重置世界
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

        // 8. 导出世界状态
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

        // 9. 导入世界状态
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

        // ========== 世界书相关事件 ==========
        const worldSelect = container.querySelector('#htyq-edit-world-select');
        const entrySelect = container.querySelector('#htyq-edit-entry-select');
        const entryContent = container.querySelector('#htyq-entry-content');

        function onWorldChange() {
            const selectedWorld = worldSelect.value;
            if (selectedWorld) {
                populateEntrySelect(selectedWorld, null);
            } else {
                entrySelect.innerHTML = '<option value="">-- 请先选择世界书 --</option>';
                entryContent.value = '';
            }
        }

        function onEntryChange() {
            const selectedWorld = worldSelect.value;
            const selectedEntryIndex = entrySelect.value;
            if (selectedWorld && selectedEntryIndex !== "") {
                const world = worldState.manualWorlds.find(w => w.name === selectedWorld);
                if (world && world.entries[selectedEntryIndex]) {
                    entryContent.value = world.entries[selectedEntryIndex].content;
                } else {
                    entryContent.value = '';
                }
            } else {
                entryContent.value = '';
            }
        }

        if (worldSelect) worldSelect.addEventListener('change', onWorldChange);
        if (entrySelect) entrySelect.addEventListener('change', onEntryChange);

        // 保存当前条目修改
        const updateEntryBtn = container.querySelector('#htyq-update-entry');
        if (updateEntryBtn) {
            updateEntryBtn.addEventListener('click', () => {
                const selectedWorld = worldSelect.value;
                const selectedEntryIndex = entrySelect.value;
                if (!selectedWorld || selectedEntryIndex === "") {
                    utils.showFloatingWarning('请先选择世界书和条目', true);
                    return;
                }
                const world = worldState.manualWorlds.find(w => w.name === selectedWorld);
                if (world && world.entries[selectedEntryIndex]) {
                    world.entries[selectedEntryIndex].content = entryContent.value;
                    STATE.saveWorldState();
                    renderWorldList();
                    populateEntrySelect(selectedWorld, world.entries[selectedEntryIndex].title);
                    utils.showFloatingWarning(`已更新条目「${world.entries[selectedEntryIndex].title}」`, false);
                } else {
                    utils.showFloatingWarning('世界书或条目不存在', true);
                }
            });
        }

        // 添加新条目
        const addEntryBtn = container.querySelector('#htyq-add-entry');
        if (addEntryBtn) {
            addEntryBtn.addEventListener('click', () => {
                const selectedWorld = worldSelect.value;
                if (!selectedWorld) {
                    utils.showFloatingWarning('请先选择世界书', true);
                    return;
                }
                const newTitle = prompt('请输入新条目的标题：');
                if (!newTitle) return;
                const world = worldState.manualWorlds.find(w => w.name === selectedWorld);
                if (world) {
                    world.entries.push({ title: newTitle, content: '' });
                    STATE.saveWorldState();
                    renderWorldList();
                    populateWorldSelect(selectedWorld);
                    populateEntrySelect(selectedWorld, newTitle);
                    utils.showFloatingWarning(`已添加条目「${newTitle}」`, false);
                }
            });
        }

        // 删除当前条目
        const deleteEntryBtn = container.querySelector('#htyq-delete-entry');
        if (deleteEntryBtn) {
            deleteEntryBtn.addEventListener('click', () => {
                const selectedWorld = worldSelect.value;
                const selectedEntryIndex = entrySelect.value;
                if (!selectedWorld || selectedEntryIndex === "") {
                    utils.showFloatingWarning('请先选择世界书和条目', true);
                    return;
                }
                const world = worldState.manualWorlds.find(w => w.name === selectedWorld);
                if (world && world.entries[selectedEntryIndex]) {
                    const title = world.entries[selectedEntryIndex].title;
                    if (confirm(`确定删除条目「${title}」吗？`)) {
                        world.entries.splice(selectedEntryIndex, 1);
                        STATE.saveWorldState();
                        renderWorldList();
                        populateWorldSelect(selectedWorld);
                        if (world.entries.length) {
                            populateEntrySelect(selectedWorld, world.entries[0].title);
                        } else {
                            entrySelect.innerHTML = '<option value="">-- 无条目 --</option>';
                            entryContent.value = '';
                        }
                        utils.showFloatingWarning(`已删除条目「${title}」`, false);
                    }
                }
            });
        }

        // 上传文件
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
                        let fileContent = ev.target.result;
                        let worldName = file.name.replace(/\.(txt|json)$/i, '');
                        let entries = [];
                        if (file.name.endsWith('.json')) {
                            try {
                                const json = JSON.parse(fileContent);
                                if (Array.isArray(json) && json.length && (json[0].content || json[0].entry)) {
                                    entries = json.map(entry => ({
                                        title: entry.comment || entry.name || entry.title || '条目',
                                        content: entry.content || entry.entry || ''
                                    }));
                                } else {
                                    entries = [{ title: worldName, content: JSON.stringify(json, null, 2) }];
                                }
                            } catch (err) {
                                entries = [{ title: worldName, content: fileContent }];
                            }
                        } else {
                            entries = textToEntries(fileContent, worldName);
                        }
                        const existing = worldState.manualWorlds.find(w => w.name === worldName);
                        if (existing) {
                            if (confirm(`世界书「${worldName}」已存在，是否覆盖其所有条目？`)) {
                                existing.entries = entries;
                                existing.enabled = true;
                            } else return;
                        } else {
                            worldState.manualWorlds.push({ name: worldName, enabled: true, entries });
                        }
                        STATE.saveWorldState();
                        renderWorldList();
                        populateWorldSelect(worldName);
                        utils.showFloatingWarning(`已导入「${worldName}」，共 ${entries.length} 个条目`, false);
                    };
                    reader.readAsText(file, 'UTF-8');
                };
                input.click();
            });
        }

        // 新建空白世界书
        const addEmptyBtn = container.querySelector('#htyq-add-empty-world');
        if (addEmptyBtn) {
            addEmptyBtn.addEventListener('click', () => {
                let baseName = '新世界书';
                let counter = 1;
                while (worldState.manualWorlds.some(w => w.name === baseName)) {
                    baseName = `新世界书${counter++}`;
                }
                worldState.manualWorlds.push({ name: baseName, enabled: true, entries: [{ title: '示例条目', content: '在这里填写世界书内容...' }] });
                STATE.saveWorldState();
                renderWorldList();
                populateWorldSelect(baseName);
                utils.showFloatingWarning(`已创建空白世界书「${baseName}」`, false);
            });
        }

        // 初始化世界书下拉和列表
        populateWorldSelect('');
        renderWorldList();
    }

    return { render };
})();
