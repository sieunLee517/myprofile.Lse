(() => {
    const section = document.querySelector("[data-task-storage]");
    const store = window.recordTaskStore;
    if (!section || !store) return;

    const grid = section.querySelector(".db-card-grid");
    const addButton = section.querySelector("[data-add-task]");
    const deleteButton = section.querySelector("[data-delete-mode]");
    const status = section.querySelector(".record-task-status");
    const cardTemplate = section.querySelector("[data-new-task]");
    const editorTemplate = section.querySelector("[data-task-editor]");
    const fields = ["goal", "role", "process", "result"];
    const { state } = store;
    state.removed ??= [];
    let nextAddedNumber = state.added.reduce(
        (largest, id) => Math.max(largest, Number(id.slice("added-".length))),
        0,
    ) + 1;
    let movements = [];
    let selectingCard = false;

    function render(card) {
        const task = state.edits[card.dataset.taskId];
        if (!task) return;

        const source = card.querySelector("[data-task-source]");
        if (source) source.hidden = true;
        card.querySelector(".record-task-values").hidden = false;
        card.querySelector(".db-task-topic").textContent = task.topic || "주제 입력 예정";
        for (const field of fields) {
            card.querySelector(`[data-field="${field}"]`).textContent = task[field] || "작성 예정";
        }
    }

    function labelCard(card, number) {
        const label = `Task ${number}`;
        card.querySelector("summary strong").textContent = label;
        card.querySelector(".db-task-content").setAttribute("aria-label", `${label} 세부 내용`);
    }

    function addCard(id) {
        const card = cardTemplate.content.firstElementChild.cloneNode(true);
        card.dataset.taskId = id;
        labelCard(card, grid.children.length + 1);
        grid.append(card);
        render(card);
        return card;
    }

    function announce(message) {
        status.textContent = store.save()
            ? message
            : "이 화면에는 반영됐지만 브라우저 저장이 제한되어 새로고침하면 사라질 수 있습니다.";
    }

    function originalTask(card) {
        const topic = card.dataset.defaultTopic;
        const task = { topic: topic === "주제 입력 예정" ? "" : (topic || "") };
        const source = card.querySelector("[data-task-source]");
        if (!source) return task;

        const headings = { "학습목적": "goal", "역할": "role", "과정": "process", "결과": "result" };
        let field = "process";
        for (const element of source.children) {
            const text = (element.innerText || element.textContent).trim();
            const heading = headings[text.replace(/[\s:：]/g, "")];
            if (element.matches("h1, h2, h3, h4, h5, h6") && heading) {
                field = heading;
            } else if (text) {
                task[field] = task[field] ? `${task[field]}

${text}` : text;
            }
        }
        return task;
    }

    function edit(card, button) {
        const values = card.querySelector(".record-task-values");
        const source = card.querySelector("[data-task-source]");
        const form = editorTemplate.content.firstElementChild.cloneNode(true);
        const task = state.edits[card.dataset.taskId] || originalTask(card);
        for (const name of ["topic", ...fields]) {
            form.elements.namedItem(name).value = task[name] || "";
        }

        function finish() {
            form.remove();
            const showSource = source && !state.edits[card.dataset.taskId];
            if (source) source.hidden = !showSource;
            values.hidden = Boolean(showSource);
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

        if (source) source.hidden = true;
        values.hidden = true;
        button.hidden = true;
        card.querySelector(".db-task-content").append(form);
        form.elements.namedItem("topic").focus();
    }

    for (const card of grid.querySelectorAll("[data-task-id]")) {
        if (state.removed.includes(card.dataset.taskId)) {
            card.remove();
            continue;
        }
        const editButton = card.querySelector("[data-edit-task]");
        if (editButton) {
            render(card);
            editButton.hidden = false;
        }
    }
    Array.from(grid.children).forEach((card, index) => labelCard(card, index + 1));
    for (const id of state.added) {
        addCard(id);
    }

    function setDeleteMode(active) {
        selectingCard = active;
        section.classList.toggle("is-selecting-task", active);
        deleteButton.setAttribute("aria-pressed", String(active));
        status.textContent = active ? "삭제할 카드를 선택하세요. Esc 키로 취소할 수 있습니다." : "";
    }

    deleteButton.addEventListener("click", () => {
        if (!grid.children.length) {
            status.textContent = "삭제할 Task 카드가 없습니다.";
            return;
        }
        setDeleteMode(!selectingCard);
        if (selectingCard) grid.querySelector("summary").focus();
    });

    section.addEventListener("keydown", (event) => {
        if (selectingCard && event.key === "Escape") {
            setDeleteMode(false);
            deleteButton.focus();
        }
    });

    grid.addEventListener("click", (event) => {
        if (!selectingCard) {
            const button = event.target.closest("[data-edit-task]");
            if (button) edit(button.closest(".db-task"), button);
            return;
        }

        const card = event.target.closest(".db-task");
        if (!card || event.target.closest("input, textarea, button, label, a")) return;
        event.preventDefault();
        const label = card.querySelector("summary strong").textContent;
        if (!window.confirm(`${label} 카드와 저장한 내용을 삭제할까요?`)) return;

        const { taskId } = card.dataset;
        if (taskId.startsWith("seed-")) {
            state.removed.push(taskId);
        } else {
            state.added = state.added.filter((id) => id !== taskId);
        }
        delete state.edits[taskId];

        const nearby = card.nextElementSibling || card.previousElementSibling;
        card.remove();
        Array.from(grid.children).forEach((item, index) => labelCard(item, index + 1));
        setDeleteMode(false);
        (nearby?.querySelector("summary") || deleteButton).focus();
        announce(`${label} 삭제됨`);
    });

    addButton.addEventListener("click", () => {
        setDeleteMode(false);
        const previous = Array.from(grid.children, (card) => [card, card.getBoundingClientRect()]);
        for (const movement of movements) movement.cancel();
        movements = [];

        const id = `added-${nextAddedNumber++}`;
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

    addButton.disabled = false;
    deleteButton.disabled = false;
    status.textContent = "";
})();
