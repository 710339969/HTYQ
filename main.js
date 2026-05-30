// 悬浮地球面板 - 完整版（适配拆分后的设置模块）
(function() {
    if (window.__FLOATING_GLOBE_LOADED__) return;
    window.__FLOATING_GLOBE_LOADED__ = true;

    const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
                     ('ontouchstart' in window && window.matchMedia("(pointer: coarse)").matches);

    // 创建悬浮球
    const globe = document.createElement('div');
    globe.className = 'st-floating-globe';
    globe.innerHTML = '<span class="st-globe-icon">🌐</span>';
    document.body.appendChild(globe);

    // 创建面板
    const panel = document.createElement('div');
    panel.className = 'st-floating-panel';
    panel.innerHTML = `
        <div class="st-panel-header">
            <span class="st-panel-title">📋 活体世界引擎</span>
            <button class="st-panel-close" aria-label="关闭">✕</button>
        </div>
        <div class="st-panel-content" id="htyq-panel-content">
            <div style="padding: 20px; text-align: center; color: #aaa;">
                ⏳ 加载引擎模块中...
            </div>
        </div>
    `;
    document.body.appendChild(panel);
    const closeBtn = panel.querySelector('.st-panel-close');

    const STORAGE_KEY_GLOBE = 'st_floating_globe_pos';
    const STORAGE_KEY_PANEL = 'st_floating_panel_pos';

    function getSavedPosition(key, defaultLeft, defaultTop, w, h) {
        const saved = localStorage.getItem(key);
        if (saved) {
            try {
                const pos = JSON.parse(saved);
                let { left, top } = pos;
                const maxX = window.innerWidth - w;
                const maxY = window.innerHeight - h;
                left = Math.min(Math.max(left, 10), maxX);
                top = Math.min(Math.max(top, 10), maxY);
                return { left, top };
            } catch(e) {}
        }
        return { left: defaultLeft, top: defaultTop };
    }

    function savePosition(key, left, top) {
        localStorage.setItem(key, JSON.stringify({ left, top }));
    }

    function setPos(el, left, top) {
        el.style.left = left + 'px';
        el.style.top = top + 'px';
        el.style.right = 'auto';
        el.style.bottom = 'auto';
    }

    function initGlobe() {
        const w = globe.offsetWidth, h = globe.offsetHeight;
        const defaultLeft = window.innerWidth - w - 20;
        const defaultTop = window.innerHeight - h - 20;
        const { left, top } = getSavedPosition(STORAGE_KEY_GLOBE, defaultLeft, defaultTop, w, h);
        setPos(globe, left, top);
    }

    function initPanel() {
        if (window.innerWidth > 768) {
            panel.style.width = '540px';
            panel.style.height = '600px';
        }
        const w = panel.offsetWidth, h = panel.offsetHeight;
        const defaultLeft = Math.max(20, (window.innerWidth - w) / 2);
        const defaultTop = Math.max(20, (window.innerHeight - h) / 2);
        const { left, top } = getSavedPosition(STORAGE_KEY_PANEL, defaultLeft, defaultTop, w, h);
        setPos(panel, left, top);
    }

    function clampPosition(el, key) {
        const rect = el.getBoundingClientRect();
        let left = rect.left, top = rect.top;
        const w = rect.width, h = rect.height;
        const maxX = window.innerWidth - w;
        const maxY = window.innerHeight - h;
        let changed = false;
        if (left < 0) { left = 10; changed = true; }
        if (top < 0) { top = 10; changed = true; }
        if (left > maxX) { left = maxX - 10; changed = true; }
        if (top > maxY) { top = maxY - 10; changed = true; }
        if (changed) {
            setPos(el, left, top);
            savePosition(key, left, top);
        }
    }

    window.addEventListener('resize', () => {
        clampPosition(globe, STORAGE_KEY_GLOBE);
        if (panel.style.display !== 'none') clampPosition(panel, STORAGE_KEY_PANEL);
    });

    function makeDraggable(el, onDragEnd, handleSelector = null) {
        let startX = 0, startY = 0, startLeft = 0, startTop = 0, dragging = false;
        const dragHandle = handleSelector ? el.querySelector(handleSelector) : el;
        if (!dragHandle) return;

        const onMove = (e) => {
            if (!dragging) return;
            e.preventDefault();
            let clientX, clientY;
            if (e.touches) {
                clientX = e.touches[0].clientX;
                clientY = e.touches[0].clientY;
            } else {
                clientX = e.clientX;
                clientY = e.clientY;
            }
            let newLeft = startLeft + (clientX - startX);
            let newTop = startTop + (clientY - startY);
            const maxX = window.innerWidth - el.offsetWidth;
            const maxY = window.innerHeight - el.offsetHeight;
            newLeft = Math.min(Math.max(newLeft, 0), maxX);
            newTop = Math.min(Math.max(newTop, 0), maxY);
            setPos(el, newLeft, newTop);
            if (onDragEnd) onDragEnd(newLeft, newTop);
        };
        const onUp = () => {
            if (!dragging) return;
            dragging = false;
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            document.removeEventListener('touchmove', onMove);
            document.removeEventListener('touchend', onUp);
            document.body.style.userSelect = '';
        };
        const onDown = (e) => {
            if (e.target.closest && e.target.closest('.st-panel-close')) return;
            e.preventDefault();
            dragging = true;
            let clientX, clientY;
            if (e.touches) {
                clientX = e.touches[0].clientX;
                clientY = e.touches[0].clientY;
            } else {
                clientX = e.clientX;
                clientY = e.clientY;
            }
            startX = clientX; startY = clientY;
            startLeft = el.offsetLeft; startTop = el.offsetTop;
            document.body.style.userSelect = 'none';
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
            document.addEventListener('touchmove', onMove, { passive: false });
            document.addEventListener('touchend', onUp);
        };
        dragHandle.addEventListener('mousedown', onDown);
        dragHandle.addEventListener('touchstart', onDown, { passive: false });
    }

    makeDraggable(globe, (l,t) => savePosition(STORAGE_KEY_GLOBE, l, t));
    makeDraggable(panel, (l,t) => savePosition(STORAGE_KEY_PANEL, l, t), '.st-panel-header');

    let dragMoved = false, dragStarted = false;
    globe.addEventListener('mousedown', () => { dragMoved = false; dragStarted = true; });
    globe.addEventListener('touchstart', () => { dragMoved = false; dragStarted = true; });
    globe.addEventListener('mousemove', () => { if (dragStarted) dragMoved = true; });
    globe.addEventListener('touchmove', () => { if (dragStarted) dragMoved = true; });
    globe.addEventListener('mouseup', () => {
        if (dragStarted && !dragMoved) togglePanel();
        dragStarted = false; dragMoved = false;
    });
    globe.addEventListener('touchend', () => {
        if (dragStarted && !dragMoved) togglePanel();
        dragStarted = false; dragMoved = false;
    });

    let panelVisible = false;
    let outsideClickListener = null;

    function closePanel() {
        if (!panelVisible) return;
        panel.style.display = 'none';
        panelVisible = false;
        if (outsideClickListener) {
            document.removeEventListener('click', outsideClickListener);
            document.removeEventListener('touchstart', outsideClickListener);
            outsideClickListener = null;
        }
    }

    // 修复：打开面板时强制同步世界状态
    function openPanel() {
        if (panelVisible) return;
        if (panel.offsetWidth === 0) initPanel();
        else clampPosition(panel, STORAGE_KEY_PANEL);
        panel.style.display = 'flex';
        panelVisible = true;
        
        // 强制重新加载当前聊天的世界状态并刷新UI
        if (window.HTYQ_STATE && window.HTYQ_UI) {
            window.HTYQ_STATE.loadWorldState();
            window.HTYQ_UI.refresh();
            console.log('[HTYQ] 面板打开时强制同步世界状态');
        }
        
        if (isMobile) {
            outsideClickListener = (e) => {
                if (!panel.contains(e.target) && !globe.contains(e.target)) closePanel();
            };
            document.addEventListener('click', outsideClickListener);
            document.addEventListener('touchstart', outsideClickListener);
        }
        if (!window.__HTYQ_ENGINE_LOADED__) {
            loadEngineModules();
        }
    }

    function togglePanel() {
        panelVisible ? closePanel() : openPanel();
    }

    closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closePanel();
    });

    // ---------- 动态加载模块（串行加载，确保顺序）----------
    function getScriptBaseUrl() {
        const scripts = document.getElementsByTagName('script');
        for (let i = 0; i < scripts.length; i++) {
            const src = scripts[i].src;
            if (src && src.includes('main.js')) {
                return src.substring(0, src.lastIndexOf('/'));
            }
        }
        return './plugins/floating-globe-panel';
    }

    function loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = () => reject(new Error(`Failed to load ${src}`));
            document.head.appendChild(script);
        });
    }

    async function loadEngineModules() {
        if (window.__HTYQ_ENGINE_LOADED__) return;
        const baseUrl = getScriptBaseUrl();
        console.log('模块加载基础路径:', baseUrl);
        const modules = [
            'htyq-state.js',
            'htyq-rules.js',
            'htyq-utils.js',
            'ui/htyq-ui-dashboard.js',
            'ui/htyq-ui-chronicle.js',
            'ui/htyq-ui-events.js',
            'ui/htyq-ui-factions.js',
            'ui/htyq-ui-relations.js',
            'ui/htyq-ui-rumors.js',
            'ui/htyq-ui-economy.js',
            'ui/htyq-ui-blackmarket.js',
            'ui/htyq-ui-reputation.js',
            'ui/htyq-ui-characters.js',
            'ui/htyq-ui-causal.js',
            'ui/htyq-ui-diplomacy.js',
            'ui/htyq-ui-memos.js',
            'ui/settings/htyq-ui-settings-helpers.js',
            'ui/settings/htyq-ui-settings-worldbook.js',
            'ui/settings/htyq-ui-settings-core.js',
            'ui/htyq-ui-settings.js',
            'ui/htyq-ui-core.js',
            'evolution/htyq-evolution-core.js',
            'evolution/htyq-evolution-strategy.js',
            'evolution/htyq-evolution-prompt.js',
            'evolution/htyq-evolution-api.js',
            'evolution/htyq-evolution-main.js'
        ];
        try {
            for (const mod of modules) {
                await loadScript(`${baseUrl}/${mod}`);
            }
            if (window.HTYQ_STATE) {
                window.HTYQ_STATE.loadGlobalSettings();
                window.HTYQ_STATE.loadWorldState();
                console.log('已加载全局设置与世界状态');
            }
            if (window.HTYQ_UI && window.HTYQ_UI.buildUI) {
                window.HTYQ_UI.buildUI();
                console.log('活体引擎UI已构建');
            } else {
                throw new Error('UI模块未正确加载');
            }
            if (window.HTYQ_EVOLUTION && window.HTYQ_EVOLUTION.start) {
                window.HTYQ_EVOLUTION.start();
                console.log('活体引擎已启动');
            }
            window.__HTYQ_ENGINE_LOADED__ = true;
        } catch (err) {
            console.error('模块加载失败:', err);
            const contentDiv = document.getElementById('htyq-panel-content');
            if (contentDiv) {
                contentDiv.innerHTML = `
                    <div style="padding:20px;color:red;">
                        <strong>模块加载失败</strong><br>
                        ${err.message}<br>
                        请检查控制台并刷新页面。
                    </div>
                `;
            }
        }
    }

    initGlobe();
    initPanel();
    panel.style.display = 'none';
})();
