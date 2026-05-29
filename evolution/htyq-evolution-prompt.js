// 构建推演 Prompt（修复世界书获取，避免 500 错误）
window.HTYQ_EVOLUTION_PROMPT = (function() {
    const STATE = window.HTYQ_STATE;
    const RULES = window.HTYQ_RULES;
    const utils = window.HTYQ_UTILS;
    const authFetch = utils.authFetch;

    async function fetchWorldContent(worldName) {
        if (!worldName || typeof worldName !== 'string') return '';
        const cleanName = worldName.trim();
        if (!cleanName) return '';

        try {
            const res = await authFetch('/api/worldinfo/get', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: cleanName })
            });

            if (!res.ok) {
                console.warn(`[HTYQ] 获取世界书 "${cleanName}" 失败，状态码 ${res.status}`);
                // 不抛出错误，仅记录警告
                return '';
            }

            const data = await res.json();
            if (data && data.entries) {
                let entries = Array.isArray(data.entries) ? data.entries : Object.values(data.entries);
                if (entries.length) {
                    return entries.map(entry => {
                        const title = entry.comment || entry.name || '条目';
                        const content = entry.content || '';
                        return `【${title}】${content}`;
                    }).join('\n');
                }
            }
            return '';
        } catch(e) {
            console.error(`[HTYQ] 请求世界书 "${cleanName}" 异常`, e);
            return '';
        }
    }

    async function getWorldContentByNames(worldNames) {
        if (!worldNames || !worldNames.length) return '';
        let combined = '';
        for (const name of worldNames) {
            const content = await fetchWorldContent(name);
            if (content) {
                combined += `\n【世界书：${name}】\n${content}\n`;
            }
        }
        return combined;
    }

    async function getCharacterCardInfo() { /* 保持不变 */ }

    async function buildEvolutionPrompt() { /* 与原逻辑相同，调用上述函数 */ }

    return { buildEvolutionPrompt };
})();
