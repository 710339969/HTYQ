// 设置模块入口 - 聚合子模块并暴露统一接口
window.HTYQ_UI_SETTINGS = (function() {
    // 确保依赖模块已加载（由 main.js 顺序保证）
    const core = window.__HTYQ_UI_SETTINGS_CORE;
    const helpers = window.__HTYQ_UI_SETTINGS_HELPERS;
    const worldbook = window.__HTYQ_UI_SETTINGS_WORLDBOOK;

    async function render(container) {
        if (core && core.render) {
            await core.render(container);
        } else {
            console.error('[HTYQ] 设置模块核心未加载');
            container.innerHTML = '<div class="htyq-card" style="color:red;">设置模块加载失败，请刷新页面</div>';
        }
    }

    return { render };
})();
