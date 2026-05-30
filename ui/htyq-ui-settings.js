// 设置页面渲染模块 - 新增：从ST世界书自动导入（通过 worldInfoManager）
window.HTYQ_UI_SETTINGS = (function() {
    const STATE = window.HTYQ_STATE;
    const utils = window.HTYQ_UTILS;
    const escapeHtml = utils.escapeHtml;

    async function render(container) {
        const set = STATE.globalApiSettings;
        const worldState = STATE.worldState;
        if (!worldState.manualWorlds) worldState.manualWorlds = [];

        // 辅助：将文本转换为世界书内容
        function normalizeContent(content) {
            return content.trim();
        }

        // ========== ST 世界书相关函数（使用 worldInfoManager） ==========
        function getSTContext() {
            if (typeof SillyTavern !== 'undefined' && SillyTavern.getContext) {
                return SillyTavern.getContext();
            }
            if (typeof getContext === 'function') {
                return getContext();
            }
            return null;
        }

        // 通过 worldInfoManager 获取世界书内容
        async function fetchSTWorldbookViaManager(worldName) {
            const ctx = getSTContext();
            if (!ctx || !ctx.worldInfoManager) {
                console.error('[HTYQ] worldInfoManager 不可用');
                return null;
            }
            try {
                // 方法1: getWorld
                const world = await ctx.worldInfoManager.getWorld(worldName);
                if (world && world.entries) {
                    return world;
                }
                // 方法2: 某些版本需要 getWorldbook
                if (typeof ctx.worldInfoManager.getWorldbook === 'function') {
                    return await ctx.worldInfoManager.getWorldbook(worldName);
                }
                return null;
            } catch (err) {
                console.error('[HTYQ] 通过 worldInfoManager 获取世界书失败:', worldName, err);
                return null;
            }
        }

        // 获取当前聊天关联的世界书名称列表（优先使用 worldInfoManager）
        async function getActiveSTWorldbookNames() {
            const ctx = getSTContext();
            const books = new Set();

            if (ctx) {
                // 常见直接字段
                if (ctx.selected_world_info) books.add(ctx.selected_world_info);
                if (ctx.chatMetadata?.world) books.add(ctx.chatMetadata.world);
                if (Array.isArray(ctx.world_names)) ctx.world_names.forEach(n => books.add(n));
                
                // 通过 worldInfoManager 获取所有可用世界书名称
                if (ctx.worldInfoManager) {
                    try {
                        let allNames = [];
                        if (typeof ctx.worldInfoManager.getWorldNames === 'function') {
                            allNames = await ctx.worldInfoManager.getWorldNames();
                        } else if (typeof ctx.worldInfoManager.getWorlds === 'function') {
                            const worlds = await ctx.worldInfoManager.getWorlds();
                            allNames = worlds.map(w => w.name || w.title);
                        }
                        if (allNames.length) {
                            allNames.forEach(n => books.add(n));
                        }
                    } catch(e) {}
                }
            }

            // 如果仍然为空，让用户手动输入
            if (books.size === 0) {
                const manual = prompt('未自动检测到世界书，请输入要导入的世界书名称（可从ST世界书列表中查看）:');
                if (manual && manual.trim()) books.add(manual.trim());
            }
            return Array.from(books);
        }

        // 将ST世界书条目转换为纯文本（支持两种格式）
        function convertSTEntriesToText(entriesObj) {
            let text = '';
            // entries 可能是对象或数组
            const entries = Array.isArray(entriesObj) ? entriesObj : Object.values(entriesObj);
            for (const entry of entries) {
                const keys = entry.key || entry.keys || [];
                const keyStr = Array.isArray(keys) ? keys.join(', ') : keys;
                const content = entry.content || '';
                text += `### 关键词: ${keyStr}\n${content}\n\n`;
            }
            return text.trim();
        }

        // 导入单个ST世界书到活体引擎
        async function importSingleSTWorldbook(worldName) {
            const lorebook = await fetchSTWorldbookViaManager(worldName);
            if (!lorebook || !lorebook.entries) {
                utils.showFloatingWarning(`世界书“${worldName}”无有效内容或读取失败`, true);
                return false;
            }
            const textContent = convertSTEntriesToText(lorebook.entries);
            if (!textContent) {
                utils.showFloatingWarning(`世界书“${worldName}”转换后为空`, true);
                return false;
            }
            // 检查是否已存在
            const existing = worldState.manualWorlds.find(w => w.name === worldName);
            if (existing) {
                const ok = confirm(`世界书“${worldName}”已存在，是否覆盖？`);
                if (!ok) return false;
                existing.content = textContent;
                existing.enabled = true;
            } else {
                worldState.manualWorlds.push({
                    name: worldName,
                    enabled: true,
                    content: textContent
                });
            }
            STATE.saveWorldState();
            utils.showFloatingWarning(`成功导入世界书“${worldName}”，内容长度 ${textContent.length}`, false);
            return true;
        }

        // 批量导入所有激活的ST世界书
        async function importAllSTWorldbooks() {
            const bookNames = await getActiveSTWorldbookNames();
            if (bookNames.length === 0) {
                utils.showFloatingWarning('未找到任何ST世界书，请确保当前聊天已关联世界书或手动输入', true);
                return;
            }
            let successCount = 0;
            for (const name of bookNames) {
                const ok = await importSingleSTWorldbook(name);
                if (ok) successCount++;
            }
            utils.showFloatingWarning(`导入完成！成功 ${successCount} / ${bookNames.length} 个世界书`, false);
            renderWorldList();
            const previewArea = document.getElementById('htyq-world-preview');
            if (previewArea) previewArea.innerHTML = '<div style="color:#94a3b8; text-align:center; font-size:12px;">点击「测试」按钮，此处将显示世界书完整内容</div>';
        }

        // 渲染世界书列表（原有函数，保持原样）
        function renderWorldList() {
            const listDiv = container.querySelector('#htyq-worlds-list');
            if (!listDiv) return;
            const worlds = worldState.manualWorlds;
            if (!worlds.length) {
                listDiv.innerHTML = '<div style="color:#64748b; padding:12px; text-align:center;">暂无世界书，请上传文件、手动添加或从ST世界书导入</div>';
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

            // 测试按钮
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

            // 删除世界书
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

            <!-- 世界书导入管理器（新增ST导入） -->
            <div class="htyq-settings-section">
                <h3>📚 世界书导入管理器</h3>
                <div style="margin-bottom:12px; display:flex; flex-wrap:wrap; gap:8px;">
                    <button id="htyq-upload-file" class="htyq-small-btn" style="background:#3b82f6;">📁 上传 TXT/JSON 文件导入</button>
                    <button id="htyq-add-empty-world" class="htyq-small-btn" style="background:#10b981;">➕ 新建空白世界书</button>
                    <button id="htyq-import-st-world" class="htyq-small-btn" style="background:#8b5cf6;">📖 从ST世界书导入</button>
                </div>
                <div id="htyq-worlds-list" style="max-height:300px; overflow-y:auto;"></div>
                <div id="htyq-world-preview" style="margin-top:16px; border-top:1px solid #334155; padding-top:12px;">
                    <div style="color:#94a3b8; text-align:center; font-size:12px;">点击「测试」按钮，此处将显示世界书完整内容</div>
                </div>
                <div style="margin-top:12px; font-size:12px; color:#fbbf24;">
                    💡 提示：<br>
                    - 上传 JSON 时自动识别 SillyTavern 世界书格式（数组），否则作为纯文本。<br>
                    - 上传 TXT 时直接作为纯文本。<br>
                    - 「从ST世界书导入」会自动读取当前聊天关联的世界书（Lorebook）并转换为活体引擎世界书。<br>
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

        // ========== 世界书导入事件 ==========
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
                        let worldText = fileContent;
                        if (file.name.endsWith('.json')) {
                            try {
                                const json = JSON.parse(fileContent);
                                if (Array.isArray(json) && json.length && (json[0].content || json[0].entry)) {
                                    worldText = json.map(entry => {
                                        const title = entry.comment || entry.name || entry.title || '条目';
                                        const content = entry.content || entry.entry || '';
                                        return `### ${title}\n${content}`;
                                    }).join('\n\n');
                                } else if (typeof json === 'object') {
                                    worldText = JSON.stringify(json, null, 2);
                                }
                            } catch (err) { /* 非JSON，保留原样 */ }
                        }
                        const existing = worldState.manualWorlds.find(w => w.name === worldName);
                        if (existing) {
                            if (confirm(`世界书「${worldName}」已存在，是否覆盖？`)) {
                                existing.content = worldText;
                                existing.enabled = true;
                            } else return;
                        } else {
                            worldState.manualWorlds.push({ name: worldName, enabled: true, content: worldText });
                        }
                        STATE.saveWorldState();
                        renderWorldList();
                        utils.showFloatingWarning(`已导入「${worldName}」，内容长度 ${worldText.length} 字符`, false);
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
                worldState.manualWorlds.push({ name: baseName, enabled: true, content: '在这里填写世界书内容...' });
                STATE.saveWorldState();
                renderWorldList();
                utils.showFloatingWarning(`已创建空白世界书「${baseName}」`, false);
            });
        }

        // 从ST世界书导入按钮
        const importStBtn = container.querySelector('#htyq-import-st-world');
        if (importStBtn) {
            importStBtn.addEventListener('click', async () => {
                importStBtn.disabled = true;
                importStBtn.textContent = '⏳ 导入中...';
                await importAllSTWorldbooks();
                importStBtn.disabled = false;
                importStBtn.textContent = '📖 从ST世界书导入';
            });
        }

        // 初始化世界书列表
        renderWorldList();
    }

    return { render };
})();
