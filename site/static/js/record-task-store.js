(() => {
    const section = document.querySelector("[data-task-storage]");
    if (!section) return;

    const key = "portfolio:record-tasks:v1:" + section.dataset.taskStorage;
    let state = { added: [], edits: {} };

    try {
        const saved = JSON.parse(localStorage.getItem(key));
        if (Array.isArray(saved?.added) && saved.edits && typeof saved.edits === "object") {
            state = saved;
        }
    } catch {
        // A browser can block local storage or contain an unreadable saved record.
    }

    window.recordTaskStore = {
        state,
        save() {
            try {
                localStorage.setItem(key, JSON.stringify(state));
                return true;
            } catch {
                return false;
            }
        },
    };
})();
