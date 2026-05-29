// UI 核心模块：构建界面、选项卡切换、聚合各子渲染器
window.HTYQ_UI = (function() {
    const STATE = window.HTYQ_STATE;
    const utils = window.HTYQ_UTILS;

    // 引用所有子渲染模块
    const dashboard = window.HTYQ_UI_DASHBOARD;
    const chronicle = window.HTYQ_UI_CHRONICLE;
    const events = window.HTYQ_UI_EVENTS;
    const factions = window.HTYQ_UI_FACTIONS;
    const relations = window.HTYQ_UI_RELATIONS;
    const rumors = window.HTYQ_UI_RUMORS;
    const economy = window.HTYQ_UI_ECONOMY;
    const blackmarket = window.HTYQ_UI_BLACKMARKET;
    const reputation = window.HTYQ_UI_REPUTATION;
    const characters = window.HTYQ_UI_CHARACTERS;
    const causal = window.HTYQ_UI_CAUSAL;
    const diplomacy = window.HTYQ_UI_DIPLOMACY;
    const memos = window.HTYQ_UI_MEMOS;
    const settings = window.HTYQ_UI_SETTINGS;

    let currentTab = 'dashboard';
    let isEditing = false;

    function renderCurrentTab() {
        const viewDiv = document.getElementById(`htyq-view-${currentTab}`);
        if (!viewDiv) return;
        switch (currentTab) {
            case 'dashboard': dashboard.render(viewDiv); break;
            case 'chronicle': chronicle.render(viewDiv); break;
            case 'events': events.render(viewDiv); break;
            case 'factions': factions.render(viewDiv); break;
            case 'relations': relations.render(viewDiv); break;
            case 'rumors': rumors.render(viewDiv); break;
            case 'economy': economy.render(viewDiv); break;
            case 'blackmarket': blackmarket.render(viewDiv); break;
            case 'reputation': reputation.render(viewDiv); break;
            case 'characters': characters.render(viewDiv); break;
            case 'causal': causal.render(viewDiv); break;
            case 'diplomacy': diplomacy.render(viewDiv); break;
            case 'memos': memos.render(viewDiv); break;
            case 'settings': settings.render(viewDiv); break;
            default: break;
        }
        const roundSpan = document.getElementById('htyq-round');
        const goldSpan = document.getElementById('htyq-gold');
        if (roundSpan) roundSpan.textContent = STATE.worldState.round;
        if (goldSpan) goldSpan.textContent = STATE.worldState.economy.userGold;
    }

    function buildUI() {
        const container = document.getElementById('htyq-panel-content');
        if (!container) return;
        container.innerHTML = `
            <div class="htyq-tabs">
                <select id="htyq-tab-select" class="htyq-mobile-select" style="display:none;"></select>
                <div class="htyq-tab-buttons">
                    <button data-tab="dashboard" class="htyq-tab-btn active">📊 仪表</button>
                    <button data-tab="chronicle" class="htyq-tab-btn">📜 编年史</button>
                    <button data-tab="events" class="htyq-tab-btn">⚡ 事件链</button>
                    <button data-tab="factions" class="htyq-tab-btn">🏛️ 势力</button>
                    <button data-tab="relations" class="htyq-tab-btn">🔗 关系</button>
                    <button data-tab="rumors" class="htyq-tab-btn">🗣️ 流言</button>
                    <button data-tab="economy" class="htyq-tab-btn">💰 经济</button>
                    <button data-tab="blackmarket" class="htyq-tab-btn">🕶️ 黑市</button>
                    <button data-tab="reputation" class="htyq-tab-btn">⭐ 声誉</button>
                    <button data-tab="characters" class="htyq-tab-btn">👥 角色状态</button>
                    <button data-tab="causal" class="htyq-tab-btn">🔗 因果链</button>
                    <button data-tab="diplomacy" class="htyq-tab-btn">🤝 外交事件</button>
                    <button data-tab="memos" class="htyq-tab-btn">📋 备忘</button>
                    <button data-tab="settings" class="htyq-tab-btn">⚙️ 设置</button>
                </div>
            </div>
            <div class="htyq-view active" id="htyq-view-dashboard"></div>
            <div class="htyq-view" id="htyq-view-chronicle"></div>
            <div class="htyq-view" id="htyq-view-events"></div>
            <div class="htyq-view" id="htyq-view-factions"></div>
            <div class="htyq-view" id="htyq-view-relations"></div>
            <div class="htyq-view" id="htyq-view-rumors"></div>
            <div class="htyq-view" id="htyq-view-economy"></div>
            <div class="htyq-view" id="htyq-view-blackmarket"></div>
            <div class="htyq-view" id="htyq-view-reputation"></div>
            <div class="htyq-view" id="htyq-view-characters"></div>
            <div class="htyq-view" id="htyq-view-causal"></div>
            <div class="htyq-view" id="htyq-view-diplomacy"></div>
            <div class="htyq-view" id="htyq-view-memos"></div>
            <div class="htyq-view" id="htyq-view-settings"></div>
            <div class="htyq-footer">
                <button id="htyq-evolve-btn" class="htyq-evolve-btn">🌀 手动推演一轮</button>
                <div class="htyq-stats">轮次: <span id="htyq-round">0</span> | 金币: <span id="htyq-gold">0</span></div>
            </div>
        `;

        const evolveBtn = document.getElementById('htyq-evolve-btn');
        if (evolveBtn) evolveBtn.addEventListener('click', () => {
            if (window.HTYQ_EVOLUTION && window.HTYQ_EVOLUTION.runEvolution) window.HTYQ_EVOLUTION.runEvolution(true);
            else utils.showFloatingWarning('推演模块未就绪，请刷新页面', true);
        });

        const tabBtns = container.querySelectorAll('.htyq-tab-btn');
        const views = container.querySelectorAll('.htyq-view');
        const mobileSelect = container.querySelector('#htyq-tab-select');
        function switchTab(tabId) {
            currentTab = tabId;
            tabBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tabId));
            views.forEach(view => view.classList.toggle('active', view.id === `htyq-view-${tabId}`));
            if (mobileSelect) mobileSelect.value = tabId;
            renderCurrentTab();
        }
        tabBtns.forEach(btn => btn.addEventListener('click', () => switchTab(btn.dataset.tab)));
        if (mobileSelect) mobileSelect.addEventListener('change', (e) => switchTab(e.target.value));

        function adjustForMobile() {
            const isM = window.innerWidth < 768;
            const btnDiv = container.querySelector('.htyq-tab-buttons');
            if (isM) {
                if (btnDiv) btnDiv.style.display = 'none';
                if (mobileSelect) {
                    mobileSelect.style.display = 'block';
                    mobileSelect.innerHTML = '';
                    const tabs = ['dashboard','chronicle','events','factions','relations','rumors','economy','blackmarket','reputation','characters','causal','diplomacy','memos','settings'];
                    tabs.forEach(t => { const opt = document.createElement('option'); opt.value = t; opt.textContent = t.charAt(0).toUpperCase() + t.slice(1); if (t === currentTab) opt.selected = true; mobileSelect.appendChild(opt); });
                }
            } else {
                if (btnDiv) btnDiv.style.display = 'flex';
                if (mobileSelect) mobileSelect.style.display = 'none';
            }
        }
        window.addEventListener('resize', adjustForMobile);
        adjustForMobile();
        renderCurrentTab();
    }

    function refresh() { renderCurrentTab(); }
    function setEditingMode(editing) { isEditing = editing; refresh(); }
    function getEditingMode() { return isEditing; }

    return { buildUI, refresh, setEditingMode, getEditingMode };
})();
