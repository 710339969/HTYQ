// 设置模块入口 - 聚合子模块并暴露统一接口
window.HTYQ_UI_SETTINGS = (function() {
    // 确保依赖模块已加载（由 main.js 顺序保证）
    const core = window.__HTYQ_UI_SETTINGS_CORE;
    const helpers = window.__HTYQ_UI_SETTINGS_HELPERS;
    const worldbook = window.__HTYQ_UI_SETTINGS_WORLDBOOK;

    // 对外暴露渲染函数（供 UI 核心调用）
    async function render(container) {
        if (core && core.render) {
            await core.render(container);
        } else {
            console.error('[HTYQ] 设置模块核心未加载');
            container.innerHTML = '<div class="htyq-card" style="color:red;">设置模块加载失败，请刷新页面</div>';
        }
    }

    // 可选：暴露一些内部函数供调试
    return {
        render,
        // 以下为内部模块，一般不直接调用，但暴露便于调试
        _core: core,
        _helpers: helpers,
        _worldbook: worldbook
    };
})();
