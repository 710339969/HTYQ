// 设置页面渲染模块（修复世界书绑定）
window.HTYQ_UI_SETTINGS = (function() {
    const STATE = window.HTYQ_STATE;
    const utils = window.HTYQ_UTILS;
    const escapeHtml = utils.escapeHtml;
    const getAllWorlds = utils.getAllWorlds; // 仅用于辅助提示，不强制依赖

    async function render(container) {
        const set = STATE.globalApiSettings;
        const worldState = STATE.worldState;
        const selectedWorlds = worldState.selectedWorlds || [];
        const selectedText = selectedWorlds.join(',\n');

        container.innerHTML = `
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
            <div class="htyq-settings-section">
                <h3>⚙️ 引擎设置</h3>
                <div class="htyq-option-row"><label><input type="checkbox" id="htyq-auto-inject" ${set.autoInject ? 'checked' : ''}> 自动注入世界摘要到AI</label></div>
                <div class="htyq-option-row"><label><input type="checkbox" id="htyq-auto-poll" ${set.autoPollMode === 'auto' ? 'checked' : ''}> 自动推演 (每轮对话后)</label></div>
                <div id="htyq-poll-interval-group" style="display: ${set.autoPollMode === 'auto' ? 'block' : 'none'}; margin-left:20px;">
                    每 <input type="number" id="htyq-poll-interval" value="${set.autoPollInterval}" min="1" style="width:70px;"> 轮推演一次
                </div>
                <button id="htyq-save-engine" class="htyq-small-btn">保存引擎设置</button>
            </div>
            <div class="htyq-settings-section">
                <h3>📚 世界书绑定</h3>
                <div class="htyq-option-row"><label><input type="radio" name="worldBindMode" value="auto" ${worldState.autoBindCharacterWorld ? 'checked' : ''}> 自动跟随角色卡绑定的世界书</label></div>
                <div class="htyq-option-row"><label><input type="radio" name="worldBindMode" value="manual" ${!worldState.autoBindCharacterWorld ? 'checked' : ''}> 手动指定世界书名称</label></div>
                <div id="htyq-manual-worlds-container" style="margin-left: 20px; display: ${worldState.autoBindCharacterWorld ? 'none' : 'block'};">
                    <textarea id="htyq-worldbook-names" rows="4" class="htyq-input" placeholder="每行一个世界书名称，或逗号分隔&#10;例如：&#10;核心世界观,&#10;角色背景" style="width:100%; background:var(--cm-bg-input); color:var(--cm-text); border:1px solid var(--cm-border); border-radius:6px; padding:6px; font-family:monospace;">${escapeHtml(selectedText)}</textarea>
                    <p style="font-size:11px; color:var(--cm-text-muted); margin-top:4px;">💡 提示：填写您在 SillyTavern 中创建的世界书名称，多个名称用逗号或换行分隔。点击下方按钮保存。</p>
                    <button id="htyq-apply-worldbooks" class="htyq-small-btn">保存世界书列表</button>
                    <button id="htyq-show-worldbooks-hint" class="htyq-small-btn" style="margin-left:8px;">📋 查看已创建的世界书</button>
                </div>
            </div>
            <div class="htyq-settings-section">
                <h3>🎲 DLC 开关</h3>
                <div id="htyq-dlcs-container" style="display:grid; grid-template-columns:repeat(2,1fr); gap:6px;"></div>
                <button id="htyq-save-dlcs" class="htyq-small-btn">保存DLC设置</button>
            </div>
            <div class="htyq-settings-section">
                <h3>📁 数据管理</h3>
                <div style="display:flex; gap:8px; flex-wrap:wrap;">
                    <button id="htyq-reset-world" class="htyq-small-btn" style="background:#ef4444;">重置当前聊天世界</button>
                    <button id="htyq-export-world" class="htyq-small-btn" style="background:#3b82f6;">导出世界状态</button>
                    <button id="htyq-import-world" class="htyq-small-btn" style="background:#3b82f6;">导入世界状态</button>
                </div>
            </div>
        `;

        const dlcMap = { world_engine:'活体世界引擎', group_dynamics:'社会群体法则', active_contact:'主动接触判定', revenge:'恩怨录', blackmarket:'黑市', economy:'经济脉搏', accident:'意外事件', reputation:'声誉系统', power_peak:'权力顶点', group_relation:'团体关系', secret_asset:'信息黑盒' };
        const dlcContainer = container.querySelector('#htyq-dlcs-container');
        if (dlcContainer) {
            dlcContainer.innerHTML = '';
            for (const [key, label] of Object.entries(dlcMap)) {
                const checked = set.enabledDlcs[key] !== false;
                dlcContainer.innerHTML += `<label class="htyq-checkbox-label"><input type="checkbox" data-dlc="${key}" ${checked ? 'checked' : ''}> ${label}</label>`;
            }
        }

        // 手动保存世界书列表
        const applyBtn = container.querySelector('#htyq-apply-worldbooks');
        if (applyBtn) {
            applyBtn.addEventListener('click', () => {
                const textarea = container.querySelector('#htyq-worldbook-names');
                if (!textarea) return;
                let raw = textarea.value;
                // 按逗号或换行分割
                let names = raw.split(/[,\n]/).map(s => s.trim()).filter(s => s);
                STATE.worldState.selectedWorlds = names;
                STATE.saveWorldState();
                utils.showFloatingWarning(`已保存 ${names.length} 个世界书名称`, false);
            });
        }

        // 辅助按钮：显示当前酒馆中已创建的世界书列表（供用户参考填写）
        const hintBtn = container.querySelector('#htyq-show-worldbooks-hint');
        if (hintBtn) {
            hintBtn.addEventListener('click', async () => {
                const worlds = await getAllWorlds();
                if (worlds.length === 0) {
                    utils.showFloatingWarning('未找到任何世界书，请先在酒馆中创建世界书', true);
                } else {
                    const list = worlds.join('\n');
                    // 弹出一个临时提示框，显示世界书名称
                    alert(`已创建的世界书列表（可复制后填入上方文本框）：\n\n${list}`);
                }
            });
        }

        // 绑定世界书绑定模式的切换
        document.querySelectorAll('input[name="worldBindMode"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                const isAuto = e.target.value === 'auto';
                const manualDiv = container.querySelector('#htyq-manual-worlds-container');
                if (manualDiv) manualDiv.style.display = isAuto ? 'none' : 'block';
                STATE.worldState.autoBindCharacterWorld = isAuto;
                STATE.saveWorldState();
            });
        });

        // API 设置相关事件（保持原有逻辑）
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
        const resetWorldBtn = container.querySelector('#htyq-reset-world');
        if (resetWorldBtn) {
            resetWorldBtn.addEventListener('click', () => {
                if (confirm('重置当前聊天世界？')) { STATE.worldState = STATE.getDefaultWorldState(); STATE.saveWorldState(); if (window.HTYQ_UI && window.HTYQ_UI.refresh) window.HTYQ_UI.refresh(); utils.showFloatingWarning('世界已重置', false); }
            });
        }
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
                        } catch(err) { utils.showFloatingWarning('导入失败', true); }
                    };
                    reader.readAsText(file);
                };
                input.click();
            });
        }
    }

    return { render };
})();
