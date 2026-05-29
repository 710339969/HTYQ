// 设置页面渲染模块 - 手动导入世界书，支持从酒馆导入、上传文件
window.HTYQ_UI_SETTINGS = (function() {
    const STATE = window.HTYQ_STATE;
    const utils = window.HTYQ_UTILS;
    const escapeHtml = utils.escapeHtml;

    async function render(container) {
        const set = STATE.globalApiSettings;
        const worldState = STATE.worldState;
        if (!worldState.manualWorlds) worldState.manualWorlds = [];

        // ========== 辅助函数：渲染世界书列表 ==========
        function renderManualWorldList() {
            const listDiv = container.querySelector('#htyq-manual-worlds-list');
            if (!listDiv) return;
            const worlds = worldState.manualWorlds;
            if (!worlds.length) {
                listDiv.innerHTML = '<div style="color:#64748b; padding:12px; text-align:center;">暂无导入的世界书，请点击下方按钮添加</div>';
                return;
            }
            listDiv.innerHTML = worlds.map((world, idx) => `
                <div style="border:1px solid #334155; border-radius:8px; margin-bottom:12px; padding:12px; background:#1e2937;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                        <label style="display:flex; align-items:center; gap:8px;">
                            <input type="checkbox" class="htyq-world-enable" data-index="${idx}" ${world.enabled !== false ? 'checked' : ''}>
                            <strong>${escapeHtml(world.name)}</strong>
                        </label>
                        <div>
                            <button class="htyq-edit-world" data-index="${idx}" style="background:#3b82f6; border:none; color:white; border-radius:4px; padding:4px 10px; margin-right:6px; cursor:pointer;">编辑</button>
                            <button class="htyq-del-world" data-index="${idx}" style="background:#ef4444; border:none; color:white; border-radius:4px; padding:4px 10px; cursor:pointer;">删除</button>
                        </div>
                    </div>
                    <div style="font-size:12px; color:#94a3b8;">内容长度：${world.content.length} 字符</div>
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
            // 删除
            listDiv.querySelectorAll('.htyq-del-world').forEach(btn => {
                btn.addEventListener('click', () => {
                    const idx = parseInt(btn.dataset.index);
                    if (!isNaN(idx) && confirm('确定删除这个世界书吗？')) {
                        const name = worldState.manualWorlds[idx].name;
                        worldState.manualWorlds.splice(idx, 1);
                        renderManualWorldList();
                        STATE.saveWorldState();
                        utils.showFloatingWarning(`已删除「${name}」`, false);
                    }
                });
            });
            // 编辑
            listDiv.querySelectorAll('.htyq-edit-world').forEach(btn => {
                btn.addEventListener('click', () => {
                    const idx = parseInt(btn.dataset.index);
                    const world = worldState.manualWorlds[idx];
                    if (world) {
                        document.getElementById('htyq-world-name').value = world.name;
                        document.getElementById('htyq-world-content').value = world.content;
                        document.getElementById('htyq-edit-index').value = idx;
                        utils.showFloatingWarning('编辑后请点击“更新世界书”', false);
                    }
                });
            });
        }

        // ========== 构建整个设置页面 ==========
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

            <!-- 世界书导入管理器（手动模式） -->
            <div class="htyq-settings-section">
                <h3>📚 世界书导入管理器（手动模式）</h3>
                <div style="margin-bottom:12px;">
                    <button id="htyq-import-from-silly" class="htyq-small-btn" style="background:#8b5cf6;">📖 从酒馆导入世界书</button>
                    <button id="htyq-upload-file" class="htyq-small-btn" style="background:#3b82f6;">📁 上传文件导入</button>
                </div>
                <div style="border:1px solid #334155; border-radius:8px; padding:12px; margin-bottom:16px;">
                    <input type="text" id="htyq-world-name" placeholder="世界书名称" style="width:100%; margin-bottom:8px; background:#0f172a; border:1px solid #334155; color:white; padding:6px;">
                    <textarea id="htyq-world-content" rows="6" placeholder="粘贴世界书内容或手动输入..." style="width:100%; background:#0f172a; border:1px solid #334155; color:white; padding:6px; font-family:monospace;"></textarea>
                    <div style="margin-top:8px; display:flex; gap:8px;">
                        <button id="htyq-add-world" class="htyq-small-btn">➕ 添加新世界书</button>
                        <button id="htyq-update-world" class="htyq-small-btn" style="background:#f59e0b;">✏️ 更新选中的世界书</button>
                    </div>
                    <input type="hidden" id="htyq-edit-index" value="-1">
                </div>
                <div id="htyq-manual-worlds-list" style="max-height:300px; overflow-y:auto;"></div>
                <div style="margin-top:12px; font-size:12px; color:#fbbf24;">
                    💡 提示：勾选“启用”才会在推演时生效；从酒馆导入前请确保世界书在SillyTavern中已存在且可读。
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
        // 自动推演复选框
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
        // 保存 DLC 设置
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
        // 导出世界状态
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
        // 导入世界状态
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

        // ========== 世界书操作 ==========
        // 添加新世界书
        const addBtn = container.querySelector('#htyq-add-world');
        const nameInput = container.querySelector('#htyq-world-name');
        const contentInput = container.querySelector('#htyq-world-content');
        const editIndexInput = container.querySelector('#htyq-edit-index');
        if (addBtn) {
            addBtn.addEventListener('click', () => {
                const name = nameInput.value.trim();
                const content = contentInput.value.trim();
                if (!name || !content) {
                    utils.showFloatingWarning('名称和内容都不能为空', true);
                    return;
                }
                worldState.manualWorlds.push({ name, content, enabled: true });
                STATE.saveWorldState();
                renderManualWorldList();
                nameInput.value = '';
                contentInput.value = '';
                editIndexInput.value = '-1';
                utils.showFloatingWarning(`已添加世界书「${name}」`, false);
            });
        }
        // 更新世界书
        const updateBtn = container.querySelector('#htyq-update-world');
        if (updateBtn) {
            updateBtn.addEventListener('click', () => {
                const idx = parseInt(editIndexInput.value);
                if (idx >= 0 && worldState.manualWorlds[idx]) {
                    const newName = nameInput.value.trim();
                    const newContent = contentInput.value.trim();
                    if (!newName || !newContent) {
                        utils.showFloatingWarning('名称和内容都不能为空', true);
                        return;
                    }
                    worldState.manualWorlds[idx].name = newName;
                    worldState.manualWorlds[idx].content = newContent;
                    STATE.saveWorldState();
                    renderManualWorldList();
                    nameInput.value = '';
                    contentInput.value = '';
                    editIndexInput.value = '-1';
                    utils.showFloatingWarning('已更新', false);
                } else {
                    utils.showFloatingWarning('请先点击“编辑”选择要更新的世界书', true);
                }
            });
        }
        // 从酒馆导入世界书
        const importSillyBtn = container.querySelector('#htyq-import-from-silly');
        if (importSillyBtn) {
            importSillyBtn.addEventListener('click', async () => {
                try {
                    const worldNames = await utils.getAllWorlds();
                    if (!worldNames.length) {
                        utils.showFloatingWarning('未找到任何世界书，请确保SillyTavern中已创建世界书', true);
                        return;
                    }
                    const selected = prompt(`请输入要导入的世界书名称（可从以下列表中选择）：\n${worldNames.join('\n')}`);
                    if (!selected) return;
                    if (!worldNames.includes(selected)) {
                        utils.showFloatingWarning(`未找到名为「${selected}」的世界书`, true);
                        return;
                    }
                    const content = await utils.getWorldContent(selected);
                    if (!content) {
                        utils.showFloatingWarning(`读取世界书「${selected}」内容为空或失败`, true);
                        return;
                    }
                    if (worldState.manualWorlds.some(w => w.name === selected)) {
                        if (!confirm(`「${selected}」已存在，是否覆盖？`)) return;
                        const idx = worldState.manualWorlds.findIndex(w => w.name === selected);
                        worldState.manualWorlds[idx].content = content;
                        worldState.manualWorlds[idx].enabled = true;
                    } else {
                        worldState.manualWorlds.push({ name: selected, content, enabled: true });
                    }
                    STATE.saveWorldState();
                    renderManualWorldList();
                    utils.showFloatingWarning(`成功导入世界书「${selected}」`, false);
                } catch (err) {
                    console.error(err);
                    utils.showFloatingWarning('从酒馆导入失败：' + err.message, true);
                }
            });
        }
        // 上传文件导入
        const uploadBtn = container.querySelector('#htyq-upload-file');
        if (uploadBtn) {
            uploadBtn.addEventListener('click', () => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.txt,.json';
                input.onchange = async (e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                        let fileContent = ev.target.result;
                        let worldName = file.name.replace(/\.(txt|json)$/i, '');
                        let worldText = fileContent;
                        if (file.name.endsWith('.json')) {
                            try {
                                const json = JSON.parse(fileContent);
                                if (Array.isArray(json) && json.length && json[0].content) {
                                    worldText = json.map(entry => `【${entry.comment || entry.name || '条目'}】${entry.content}`).join('\n');
                                } else if (typeof json === 'object') {
                                    worldText = JSON.stringify(json, null, 2);
                                }
                            } catch (err) { /* 非JSON，保留原样 */ }
                        }
                        if (worldState.manualWorlds.some(w => w.name === worldName)) {
                            if (!confirm(`「${worldName}」已存在，是否覆盖？`)) return;
                            const idx = worldState.manualWorlds.findIndex(w => w.name === worldName);
                            worldState.manualWorlds[idx].content = worldText;
                            worldState.manualWorlds[idx].enabled = true;
                        } else {
                            worldState.manualWorlds.push({ name: worldName, content: worldText, enabled: true });
                        }
                        STATE.saveWorldState();
                        renderManualWorldList();
                        utils.showFloatingWarning(`已导入文件「${worldName}」`, false);
                    };
                    reader.readAsText(file, 'UTF-8');
                };
                input.click();
            });
        }

        // 初始渲染世界书列表
        renderManualWorldList();
    }

    return { render };
})();
