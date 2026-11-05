(() => {
    const section = document.querySelector("[data-task-storage]");
    const store = window.recordTaskStore;
    if (!section || !store) return;

    const grid = section.querySelector(".db-card-grid");
    const addButton = section.querySelector("[data-add-task]");
    const status = section.querySelector(".record-task-status");
    const cardTemplate = section.querySelector("[data-new-task]");
    const editorTemplate = section.querySelector("[data-task-editor]");
    const fields = ["goal", "role", "process", "result"];
    const { state } = store;
    let movements = [];

    function render(card) {
        const task = state.edits[card.dataset.taskId];
        if (!task) return;

        card.querySelector(".db-task-topic").textContent = task.topic || card.dataset.defaultTopic || "주제 입력 예정";
        for (const field of fields) {
            card.querySelector(`[data-field="${field}"]`).textContent = task[field] || "작성 예정";
        }
    }

    function addCard(id) {
        const card = cardTemplate.content.firstElementChild.cloneNode(true);
        const label = `Task ${grid.children.length + 1}`;
        card.dataset.taskId = id;
        card.querySelector("summary strong").textContent = label;
        card.querySelector(".db-task-content").setAttribute("aria-label", `${label} 세부 내용`);
        grid.append(card);
        render(card);
        return card;
    }

    function announce(message) {
        status.textContent = store.save()
            ? message
            : "이 화면에는 반영됐지만 브라우저 저장이 제한되어 새로고침하면 사라질 수 있습니다.";
    }

    function edit(card, button) {
        const values = card.querySelector(".record-task-values");
        const form = editorTemplate.content.firstElementChild.cloneNode(true);
        const task = state.edits[card.dataset.taskId] || {};
        for (const name of ["topic", ...fields]) {
            form.elements.namedItem(name).value = task[name] || "";
        }

        if (!state.edits[card.dataset.taskId] && card.dataset.defaultTopic !== "주제 입력 예정") {
            form.elements.namedItem("topic").value = card.dataset.defaultTopic || "";
        }

        function finish() {
            form.remove();
            values.hidden = false;
            button.hidden = false;
            button.focus();
        }

        form.addEventListener("submit", (event) => {
            event.preventDefault();
            state.edits[card.dataset.taskId] = Object.fromEntries(
                Array.from(new FormData(form), ([name, value]) => [name, value.trim()]),
            );
            render(card);
            finish();
            announce("이 브라우저에 Task를 저장했습니다.");
        });
        form.querySelector("[data-cancel-task]").addEventListener("click", finish);

        values.hidden = true;
        button.hidden = true;
        card.querySelector(".db-task-content").append(form);
        form.elements.namedItem("topic").focus();
    }

    for (const card of grid.querySelectorAll("[data-task-id]")) {
        render(card);
        card.querySelector("[data-edit-task]").hidden = false;
    }
    for (const id of state.added) {
        addCard(id);
    }

    grid.addEventListener("click", (event) => {
        const button = event.target.closest("[data-edit-task]");
        if (button) edit(button.closest(".db-task"), button);
    });

    addButton.addEventListener("click", () => {
        const previous = Array.from(grid.children, (card) => [card, card.getBoundingClientRect()]);
        for (const movement of movements) movement.cancel();
        movements = [];

        const id = `added-${state.added.length + 1}`;
        state.added.push(id);
        const card = addCard(id);

        if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches && card.animate) {
            for (const [item, before] of previous) {
                const after = item.getBoundingClientRect();
                const x = before.left - after.left;
                const y = before.top - after.top;
                if (x || y) {
                    movements.push(item.animate(
                        [{ transform: `translate(${x}px, ${y}px)` }, { transform: "none" }],
                        { duration: 240, easing: "ease-out" },
                    ));
                }
            }
            movements.push(card.animate(
                [{ opacity: 0, transform: "translateY(8px)" }, { opacity: 1, transform: "none" }],
                { duration: 240, easing: "ease-out" },
            ));
        }
        announce(`Task ${grid.children.length} 추가됨`);
    });

    addButton.hidden = false;
})();
