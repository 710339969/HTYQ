// 设置页面渲染模块
window.HTYQ_UI_SETTINGS = (function() {
    const STATE = window.HTYQ_STATE;
    const utils = window.HTYQ_UTILS;
    const escapeHtml = utils.escapeHtml;
    const getAllWorlds = utils.getAllWorlds;

    async function render(container) {
        const set = STATE.globalApiSettings;
        const worldState = STATE.worldState;

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
                <div class="htyq-option-row"><label><input type="radio" name="worldBindMode" value="manual" ${!worldState.autoBindCharacterWorld ? 'checked' : ''}> 手动选择世界书（可多选）</label></div>
                <div id="htyq-manual-worlds-container" style="margin-left: 20px; display: ${worldState.autoBindCharacterWorld ? 'none' : 'block'};">
                    <button id="htyq-refresh-worlds" class="htyq-small-btn">刷新世界书列表</button>
                    <div id="htyq-worlds-list" style="max-height: 150px; overflow-y: auto; border: 1px solid #334155; padding: 6px; border-radius: 8px; margin-top: 8px; font-size:12px;">
                        <div style="color:#64748b;">点击刷新按钮加载世界书...</div>
                    </div>
                </div>
                <button id="htyq-save-world-bind" class="htyq-small-btn" style="margin-top: 12px;">保存世界书绑定设置</button>
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
        const dlcContainer = document.getElementById('htyq-dlcs-container');
        if (dlcContainer) {
            dlcContainer.innerHTML = '';
            for (const [key, label] of Object.entries(dlcMap)) {
                const checked = set.enabledDlcs[key] !== false;
                dlcContainer.innerHTML += `<label class="htyq-checkbox-label"><input type="checkbox" data-dlc="${key}" ${checked ? 'checked' : ''}> ${label}</label>`;
            }
        }

        async function refreshWorldsListUI() {
            const listDiv = document.getElementById('htyq-worlds-list');
            if (!listDiv) return;
            listDiv.innerHTML = '<div style="color:#fbbf24;">🔄 加载中...</div>';
            const worlds = await getAllWorlds();
            if (!worlds.length) {
                listDiv.innerHTML = '<div style="color:#ef4444;">❌ 没有找到世界书。请确保：<br>1. 您已在 SillyTavern 中创建或激活了世界书；<br>2. 本插件拥有访问 worldInfoManager 的权限。</div>';
                return;
            }
            const selected = STATE.worldState.selectedWorlds || [];
            listDiv.innerHTML = worlds.map(w => `
                <label class="htyq-checkbox-label" style="display:flex; align-items:center; gap:6px; margin-bottom:4px;">
                    <input type="checkbox" data-world="${escapeHtml(w)}" ${selected.includes(w) ? 'checked' : ''}>
                    <span style="font-size:12px;">${escapeHtml(w)}</span>
                </label>
            `).join('');
        }

        const refreshBtn = document.getElementById('htyq-refresh-worlds');
        if (refreshBtn) refreshBtn.addEventListener('click', async () => { await refreshWorldsListUI(); utils.showFloatingWarning('世界书列表已刷新', false); });
        if (!worldState.autoBindCharacterWorld) refreshWorldsListUI();

        document.querySelectorAll('input[name="worldBindMode"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                const isAuto = e.target.value === 'auto';
                const manualDiv = document.getElementById('htyq-manual-worlds-container');
                if (manualDiv) manualDiv.style.display = isAuto ? 'none' : 'block';
                STATE.worldState.autoBindCharacterWorld = isAuto;
                if (!isAuto) refreshWorldsListUI();
            });
        });

        const saveWorldBtn = document.getElementById('htyq-save-world-bind');
        if (saveWorldBtn) {
            saveWorldBtn.addEventListener('click', async () => {
                const checkboxes = document.querySelectorAll('#htyq-worlds-list input[type="checkbox"]');
                const selected = [];
                checkboxes.forEach(cb => { if (cb.checked) selected.push(cb.dataset.world); });
                const validWorlds = await getAllWorlds();
                const validSelected = selected.filter(w => validWorlds.includes(w));
                STATE.worldState.selectedWorlds = validSelected;
                STATE.saveWorldState();
                utils.showFloatingWarning(`已保存 ${validSelected.length} 个世界书`, false);
            });
        }

        document.querySelectorAll('input[name="apiMode"]').forEach(r => r.addEventListener('change', (e) => {
            document.getElementById('htyq-custom-settings').style.display = e.target.value === 'custom' ? 'block' : 'none';
        }));
        document.getElementById('htyq-auto-poll')?.addEventListener('change', (e) => {
            document.getElementById('htyq-poll-interval-group').style.display = e.target.checked ? 'block' : 'none';
        });
        document.getElementById('htyq-fetch-models')?.addEventListener('click', async () => {
            const url = document.getElementById('htyq-custom-url').value.trim();
            const key = document.getElementById('htyq-custom-key').value.trim();
            if (!url) { utils.showFloatingWarning('请填写API URL', true); return; }
            const fetchUrl = url.replace(/\/$/, '') + (url.endsWith('/v1') ? '/models' : '/v1/models');
            try {
                const resp = await fetch(fetchUrl, { headers: { 'Authorization': `Bearer ${key}` } });
                if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
                const data = await resp.json();
                if (data.data && Array.isArray(data.data)) {
                    const select = document.getElementById('htyq-model-list');
                    select.innerHTML = '<option value="">-- 选择模型 --</option>';
                    data.data.forEach(m => { const opt = document.createElement('option'); opt.value = m.id; opt.textContent = m.id; select.appendChild(opt); });
                    select.style.display = 'block';
                    select.onchange = () => { document.getElementById('htyq-custom-model').value = select.value; };
                    utils.showFloatingWarning(`获取到 ${data.data.length} 个模型`, false);
                } else utils.showFloatingWarning('无法解析模型列表', true);
            } catch(e) { utils.showFloatingWarning('获取模型失败: ' + e.message, true); }
        });
        document.getElementById('htyq-save-api')?.addEventListener('click', () => {
            const selected = document.querySelector('input[name="apiMode"]:checked');
            if (selected) STATE.globalApiSettings.apiMode = selected.value;
            STATE.globalApiSettings.customUrl = document.getElementById('htyq-custom-url')?.value || '';
            STATE.globalApiSettings.customKey = document.getElementById('htyq-custom-key')?.value || '';
            STATE.globalApiSettings.customModel = document.getElementById('htyq-custom-model')?.value || '';
            STATE.saveGlobalSettings();
            utils.showFloatingWarning('API设置已保存', false);
        });
        document.getElementById('htyq-save-engine')?.addEventListener('click', () => {
            STATE.globalApiSettings.autoInject = document.getElementById('htyq-auto-inject')?.checked || false;
            STATE.globalApiSettings.autoPollMode = document.getElementById('htyq-auto-poll')?.checked ? 'auto' : 'manual';
            const interval = document.getElementById('htyq-poll-interval');
            if (interval) STATE.globalApiSettings.autoPollInterval = parseInt(interval.value) || 1;
            STATE.saveGlobalSettings();
            utils.showFloatingWarning('引擎设置已保存', false);
        });
        document.getElementById('htyq-save-dlcs')?.addEventListener('click', () => {
            document.querySelectorAll('#htyq-dlcs-container input[type="checkbox"]').forEach(cb => {
                STATE.globalApiSettings.enabledDlcs[cb.dataset.dlc] = cb.checked;
            });
            STATE.saveGlobalSettings();
            utils.showFloatingWarning('DLC设置已保存', false);
        });
        document.getElementById('htyq-reset-world')?.addEventListener('click', () => {
            if (confirm('重置当前聊天世界？')) { STATE.worldState = STATE.getDefaultWorldState(); STATE.saveWorldState(); if (window.HTYQ_UI && window.HTYQ_UI.refresh) window.HTYQ_UI.refresh(); utils.showFloatingWarning('世界已重置', false); }
        });
        document.getElementById('htyq-export-world')?.addEventListener('click', () => {
            const dataStr = JSON.stringify(STATE.worldState, null, 2);
            const blob = new Blob([dataStr], {type:'application/json'});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `htyq_world_${STATE.getCurrentChatId()}.json`;
            a.click();
            URL.revokeObjectURL(url);
        });
        document.getElementById('htyq-import-world')?.addEventListener('click', () => {
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

    return { render };
})();
