// 辅助函数模块：entriesToText, showEntrySelectionDialog 等
window.__HTYQ_UI_SETTINGS_HELPERS = (function() {
    const utils = window.HTYQ_UTILS;
    const escapeHtml = utils.escapeHtml;

    // 将世界书 entries 转换为纯文本
    function entriesToText(entries) {
        let text = '';
        for (const entry of entries) {
            const title = entry.comment || entry.key?.join(', ') || '条目';
            const content = entry.content || '';
            text += `### ${title}\n${content}\n\n`;
        }
        return text.trim();
    }

    // 显示条目选择弹窗（多选）
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

    // 获取所有世界书名称列表
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

    // 加载世界书内容（含 entries）
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

    return {
        entriesToText,
        showEntrySelectionDialog,
        getWorldbookNames,
        loadWorldbookContent
    };
})();
