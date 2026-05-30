// 设置页面核心渲染与事件绑定
window.__HTYQ_UI_SETTINGS_CORE = (function() {
    const STATE = window.HTYQ_STATE;
    const utils = window.HTYQ_UTILS;
    const worldbook = window.__HTYQ_UI_SETTINGS_WORLDBOOK;
    const escapeHtml = utils.escapeHtml;

    async function render(container) {
        const set = STATE.globalApiSettings;
        const worldState = STATE.worldState;
        if (!worldState.manualWorlds) worldState.manualWorlds = [];

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
                <!-- 推演调用策略选项 - 新增 -->
                <div class="htyq-option-row" style="margin-top:12px;">
                    <label style="margin-right: 8px;">📞 推演调用策略：</label>
                    <select id="htyq-evo-strategy" style="background:#0f172a; color:#e2e8f0; border:1px solid #334155; border-radius:6px; padding:4px 8px;">
                        <option value="single">一次性调用（省token，兼容模式）</option>
                        <option value="two_pass">两次调用（核心+扩展）</option>
                        <option value="custom">自定义多次调用</option>
                    </select>
                </div>
                <div id="htyq-custom-steps-group" style="display: none; margin-left: 24px; margin-top: 8px;">
                    每轮最多调用 <input type="number" id="htyq-custom-steps" value="${set.customSteps || 3}" min="1" max="10" style="width:70px; background:#0f172a; color:white; border:1px solid #334155; border-radius:4px; padding:4px;"> 次API（按分组顺序）
                </div>
                <button id="htyq-save-engine" class="htyq-small-btn" style="margin-top:12px;">保存引擎设置</button>
            </div>

            <!-- 世界书导入管理器 -->
            <div class="htyq-settings-section">
                <h3>📚 世界书导入管理器</h3>
                <div style="margin-bottom:12px; display:flex; gap:8px; flex-wrap:wrap;">
                    <button id="htyq-auto-import-btn" class="htyq-small-btn" style="background:#10b981;">🚀 自动导入激活的世界书</button>
                    <button id="htyq-manual-import-btn" class="htyq-small-btn" style="background:#8b5cf6;">📖 手动选择世界书</button>
                </div>
                <div id="htyq-worlds-list" style="max-height:300px; overflow-y:auto;"></div>
                <div id="htyq-world-preview" style="margin-top:16px; border-top:1px solid #334155; padding-top:12px;">
                    <div style="color:#94a3b8; text-align:center; font-size:12px;">点击「测试」按钮，此处将显示世界书完整内容</div>
                </div>
                <div style="margin-top:12px; font-size:12px; color:#fbbf24;">
                    💡 提示：<br>
                    - 「自动导入激活的世界书」：自动检测当前角色绑定和全局启用的世界书，并导入（标记为自动）。<br>
                    - 「手动选择世界书」：从所有世界书中选择，可导入整本或选择特定条目（标记为手动）。<br>
                    - 切换角色/聊天时，会自动清理旧的角色/全局世界书，并重新导入新的。<br>
                    - 支持多选世界书后点击「删除选中」批量删除。<br>
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
                    <button id="htyq-export-world" class="htyq-small-btn" style="background:#3b82f6;">导出当前世界状态</button>
                    <button id="htyq-import-world" class="htyq-small-btn" style="background:#3b82f6;">导入当前世界状态</button>
                </div>
            </div>
        `;

        // 渲染 DLC 列表
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
                if (selected) set.apiMode = selected.value;
                set.customUrl = container.querySelector('#htyq-custom-url')?.value || '';
                set.customKey = container.querySelector('#htyq-custom-key')?.value || '';
                set.customModel = container.querySelector('#htyq-custom-model')?.value || '';
                STATE.saveGlobalSettings();
                utils.showFloatingWarning('API设置已保存', false);
            });
        }
        // 保存引擎设置（包含新增的策略）
        const saveEngineBtn = container.querySelector('#htyq-save-engine');
        if (saveEngineBtn) {
            saveEngineBtn.addEventListener('click', () => {
                set.autoInject = container.querySelector('#htyq-auto-inject')?.checked || false;
                set.autoPollMode = container.querySelector('#htyq-auto-poll')?.checked ? 'auto' : 'manual';
                const interval = container.querySelector('#htyq-poll-interval');
                if (interval) set.autoPollInterval = parseInt(interval.value) || 1;
                // 新增策略
                const strategySelect = container.querySelector('#htyq-evo-strategy');
                if (strategySelect) set.evolutionStrategy = strategySelect.value;
                const customStepsInput = container.querySelector('#htyq-custom-steps');
                if (customStepsInput) set.customSteps = parseInt(customStepsInput.value) || 3;
                STATE.saveGlobalSettings();
                utils.showFloatingWarning('引擎设置已保存', false);
            });
        }
        // 保存 DLC
        const saveDlcsBtn = container.querySelector('#htyq-save-dlcs');
        if (saveDlcsBtn) {
            saveDlcsBtn.addEventListener('click', () => {
                document.querySelectorAll('#htyq-dlcs-container input[type="checkbox"]').forEach(cb => {
                    set.enabledDlcs[cb.dataset.dlc] = cb.checked;
                });
                STATE.saveGlobalSettings();
                utils.showFloatingWarning('DLC设置已保存', false);
            });
        }
        // 重置当前聊天世界
        const resetWorldBtn = container.querySelector('#htyq-reset-world');
        if (resetWorldBtn) {
            resetWorldBtn.addEventListener('click', () => {
                if (confirm('重置当前聊天世界？这将清除所有进度，不可恢复！')) { 
                    STATE.resetCurrentWorld();
                    if (window.HTYQ_UI && window.HTYQ_UI.refresh) window.HTYQ_UI.refresh();
                    utils.showFloatingWarning('当前聊天世界已重置', false);
                }
            });
        }
        // 导出当前世界状态
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
        // 导入当前世界状态
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
                            Object.assign(STATE.worldState, imported);
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

        // 世界书导入按钮事件
        const autoImportBtn = container.querySelector('#htyq-auto-import-btn');
        if (autoImportBtn) {
            autoImportBtn.addEventListener('click', async () => {
                autoImportBtn.disabled = true;
                autoImportBtn.textContent = '⏳ 检测中...';
                await worldbook.autoImportActiveWorldbooks();
                autoImportBtn.disabled = false;
                autoImportBtn.textContent = '🚀 自动导入激活的世界书';
                const listContainer = container.querySelector('#htyq-worlds-list');
                if (listContainer) worldbook.renderWorldList(listContainer, STATE.worldState, () => {});
            });
        }

        const manualImportBtn = container.querySelector('#htyq-manual-import-btn');
        if (manualImportBtn) {
            manualImportBtn.addEventListener('click', async () => {
                manualImportBtn.disabled = true;
                manualImportBtn.textContent = '⏳ 加载...';
                await worldbook.manualImportFromST();
                manualImportBtn.disabled = false;
                manualImportBtn.textContent = '📖 手动选择世界书';
                const listContainer = container.querySelector('#htyq-worlds-list');
                if (listContainer) worldbook.renderWorldList(listContainer, STATE.worldState, () => {});
            });
        }

        // 初始化世界书列表
        const listContainer = container.querySelector('#htyq-worlds-list');
        if (listContainer) worldbook.renderWorldList(listContainer, STATE.worldState, () => {});

        // ========== 新增：策略下拉框初始化与联动 ==========
        const strategySelect = container.querySelector('#htyq-evo-strategy');
        const customStepsGroup = container.querySelector('#htyq-custom-steps-group');
        if (strategySelect && customStepsGroup) {
            // 设置当前值
            strategySelect.value = set.evolutionStrategy || 'single';
            const toggleCustom = () => {
                customStepsGroup.style.display = strategySelect.value === 'custom' ? 'block' : 'none';
            };
            strategySelect.addEventListener('change', toggleCustom);
            toggleCustom();
        }
        const customStepsInput = container.querySelector('#htyq-custom-steps');
        if (customStepsInput) customStepsInput.value = set.customSteps || 3;
    }

    return { render };
})();
