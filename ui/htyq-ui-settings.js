// 设置页面渲染模块 - 完全手动管理世界书列表，支持删除和测试读取
window.HTYQ_UI_SETTINGS = (function() {
    const STATE = window.HTYQ_STATE;
    const utils = window.HTYQ_UTILS;
    const escapeHtml = utils.escapeHtml;

    async function render(container) {
        const set = STATE.globalApiSettings;
        const worldState = STATE.worldState;

        // 确保 selectedWorlds 存在
        if (!worldState.selectedWorlds) worldState.selectedWorlds = [];

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
                <h3>📚 世界书绑定（手动管理）</h3>
                <div class="htyq-option-row"><label><input type="radio" name="worldBindMode" value="auto" ${worldState.autoBindCharacterWorld !== false ? 'checked' : ''}> 自动跟随角色卡绑定的世界书</label></div>
                <div class="htyq-option-row"><label><input type="radio" name="worldBindMode" value="manual" ${worldState.autoBindCharacterWorld === false ? 'checked' : ''}> 手动管理世界书列表</label></div>
                <div id="htyq-manual-worlds-container" style="margin-left: 20px; margin-top: 12px; display: ${worldState.autoBindCharacterWorld === false ? 'block' : 'none'};">
                    <div style="margin-bottom: 8px;">
                        <input type="text" id="htyq-new-world-name" placeholder="输入世界书名称（必须与酒馆中名称完全一致）" style="width: 70%;">
                        <button id="htyq-add-world-btn" class="htyq-small-btn">➕ 添加</button>
                    </div>
                    <div id="htyq-world-list-manual" style="border: 1px solid #334155; border-radius: 8px; padding: 8px; max-height: 200px; overflow-y: auto;">
                        <!-- 动态显示已添加的世界书列表 -->
                    </div>
                    <div style="margin-top: 8px;">
                        <button id="htyq-test-all-worlds" class="htyq-small-btn" style="background:#8b5cf6;">🔍 批量测试读取</button>
                        <span style="font-size: 11px; color: #94a3b8; margin-left: 8px;">点击测试可验证世界书是否真能读到内容</span>
                    </div>
                </div>
                <button id="htyq-save-world-bind" class="htyq-small-btn" style="margin-top: 12px;">💾 保存设置</button>
                <div style="font-size: 12px; color: #fbbf24; margin-top: 6px;">※ 手动列表将完全替代自动获取，你可以自由增删世界书名称。</div>
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

        // ==================== DLC 列表 ====================
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

        // ==================== 渲染手动世界书列表 ====================
        function renderManualWorldList() {
            const listDiv = container.querySelector('#htyq-world-list-manual');
            if (!listDiv) return;
            const worlds = worldState.selectedWorlds || [];
            if (worlds.length === 0) {
                listDiv.innerHTML = '<div style="color:#64748b; text-align:center;">暂无手动添加的世界书，请在上方添加</div>';
                return;
            }
            listDiv.innerHTML = worlds.map((name, idx) => `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 8px; border-bottom: 1px solid #334155;">
                    <span>📖 ${escapeHtml(name)}</span>
                    <div>
                        <button class="htyq-test-single-btn" data-world="${escapeHtml(name)}" style="background:#6b7280; border:none; color:white; border-radius:4px; padding:2px 8px; margin-right:6px; cursor:pointer;">测试</button>
                        <button class="htyq-del-world-btn" data-index="${idx}" style="background:#ef4444; border:none; color:white; border-radius:4px; padding:2px 8px; cursor:pointer;">删除</button>
                    </div>
                </div>
            `).join('');

            // 绑定单个测试按钮
            listDiv.querySelectorAll('.htyq-test-single-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const worldName = btn.getAttribute('data-world');
                    utils.showFloatingWarning(`正在测试「${worldName}」...`, false);
                    const result = await utils.testWorldReadable(worldName);
                    if (result.success) {
                        alert(`✅ 读取成功！\n前200字符：\n${result.preview}`);
                    } else {
                        alert(`❌ 读取失败：${result.error}\n请检查世界书名称是否正确。`);
                    }
                });
            });

            // 绑定删除按钮
            listDiv.querySelectorAll('.htyq-del-world-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const idx = parseInt(btn.getAttribute('data-index'), 10);
                    if (!isNaN(idx)) {
                        worldState.selectedWorlds.splice(idx, 1);
                        renderManualWorldList();
                        utils.showFloatingWarning('已删除，记得点击「保存设置」', false);
                    }
                });
            });
        }

        // 添加世界书
        const addBtn = container.querySelector('#htyq-add-world-btn');
        const newNameInput = container.querySelector('#htyq-new-world-name');
        if (addBtn && newNameInput) {
            addBtn.addEventListener('click', () => {
                let newName = newNameInput.value.trim();
                if (!newName) {
                    utils.showFloatingWarning('请输入世界书名称', true);
                    return;
                }
                // 去重
                if (worldState.selectedWorlds.includes(newName)) {
                    utils.showFloatingWarning('该世界书已存在', true);
                    return;
                }
                worldState.selectedWorlds.push(newName);
                renderManualWorldList();
                newNameInput.value = '';
                utils.showFloatingWarning(`已添加「${newName}」，记得点击「保存设置」`, false);
            });
        }

        // 批量测试所有已添加的世界书
        const testAllBtn = container.querySelector('#htyq-test-all-worlds');
        if (testAllBtn) {
            testAllBtn.addEventListener('click', async () => {
                const worlds = worldState.selectedWorlds || [];
                if (worlds.length === 0) {
                    utils.showFloatingWarning('没有世界书可测试', true);
                    return;
                }
                utils.showFloatingWarning(`正在测试 ${worlds.length} 个世界书...`, false);
                let successList = [];
                let failList = [];
                for (const w of worlds) {
                    const result = await utils.testWorldReadable(w);
                    if (result.success) successList.push(w);
                    else failList.push(w);
                }
                alert(`测试结果：\n✅ 成功 (${successList.length}): ${successList.join(', ') || '无'}\n\n❌ 失败 (${failList.length}): ${failList.join(', ') || '无'}`);
            });
        }

        // 保存设置（将当前 selectedWorlds 存入 state，同时保存 autoBindCharacterWorld）
        const saveWorldBtn = container.querySelector('#htyq-save-world-bind');
        if (saveWorldBtn) {
            saveWorldBtn.addEventListener('click', () => {
                // 注意：worldState.selectedWorlds 已经在添加/删除时直接修改，这里只需保存即可
                STATE.saveWorldState();
                utils.showFloatingWarning(`已保存 ${worldState.selectedWorlds.length} 个世界书`, false);
            });
        }

        // 世界书绑定模式切换
        document.querySelectorAll('input[name="worldBindMode"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                const isAuto = e.target.value === 'auto';
                const manualDiv = container.querySelector('#htyq-manual-worlds-container');
                if (manualDiv) manualDiv.style.display = isAuto ? 'none' : 'block';
                worldState.autoBindCharacterWorld = !isAuto; // auto模式 true，manual模式 false
                STATE.saveWorldState();
                if (!isAuto) renderManualWorldList();
            });
        });

        // 初始渲染列表（如果当前是手动模式）
        if (worldState.autoBindCharacterWorld === false) {
            renderManualWorldList();
        }

        // ==================== API / 引擎 / DLC 等其它设置（保持原样） ====================
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
                if (confirm('重置当前聊天世界？这将清除所有进度，不可恢复！')) { 
                    STATE.worldState = STATE.getDefaultWorldState(); 
                    STATE.saveWorldState(); 
                    if (window.HTYQ_UI && window.HTYQ_UI.refresh) window.HTYQ_UI.refresh(); 
                    utils.showFloatingWarning('世界已重置', false); 
                }
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
                        } catch(err) { utils.showFloatingWarning('导入失败：无效的JSON', true); }
                    };
                    reader.readAsText(file);
                };
                input.click();
            });
        }
    }

    return { render };
})();
