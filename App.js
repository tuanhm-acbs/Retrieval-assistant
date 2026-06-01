/* Retrieval Trainer V1
   Static GitHub Pages app.
   No backend. No API key.
*/

let pack = null;

let state = {
    mode: null,
    index: 0,
    wrong: [],
    score: {
        correct: 0,
        wrong: 0
    }
};

const STORAGE_KEY = "retrieval_trainer_pack_v1";
const STATE_KEY = "retrieval_trainer_state_v1";

/* ---------- Helpers ---------- */

function $(id) {
    return document.getElementById(id);
}

function showScreen(id) {
    document.querySelectorAll(".screen").forEach(screen => {
        screen.classList.remove("active");
    });

    $(id).classList.add("active");
    window.scrollTo(0, 0);
}

function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pack));
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
}

function loadSaved() {
    const savedPack = localStorage.getItem(STORAGE_KEY);
    const savedState = localStorage.getItem(STATE_KEY);

    if (savedPack) {
        try {
            pack = JSON.parse(savedPack);
        } catch (e) {
            pack = null;
        }
    }

    if (savedState) {
        try {
            state = JSON.parse(savedState);
        } catch (e) {}
    }

    if (pack) {
        renderDashboard();
        showScreen("dashboardScreen");
    }
}

function normalize(text) {
    return String(text || "")
        .toLowerCase()
        .replace(/[^\w\s]/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

function similarity(a, b) {
    a = normalize(a);
    b = normalize(b);

    if (!a || !b) return 0;
    if (a === b) return 1;

    const aw = new Set(a.split(" "));
    const bw = new Set(b.split(" "));

    let overlap = 0;
    aw.forEach(w => {
        if (bw.has(w)) overlap++;
    });

    return overlap / Math.max(aw.size, bw.size);
}

function getAnswerText(item) {
    if (!item) return "";

    if (typeof item.answer === "string") return item.answer;

    if (Array.isArray(item.answer)) return item.answer.join(" → ");

    if (Array.isArray(item.expected_chain)) {
        return item.expected_chain.join(" → ");
    }

    if (Array.isArray(item.steps)) {
        return item.steps.join(" → ");
    }

    return "";
}

function setFeedback(id, html) {
    const el = $(id);
    el.innerHTML = html;
    el.classList.add("show");
}

function clearFeedback(id) {
    const el = $(id);
    el.innerHTML = "";
    el.classList.remove("show");
}

function markWrong(type, item, userAnswer, expected) {
    state.wrong.push({
        type,
        item,
        userAnswer,
        expected,
        time: new Date().toISOString()
    });
    state.score.wrong++;
    save();
}

function markCorrect() {
    state.score.correct++;
    save();
}

function escapeHTML(text) {
    return String(text || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

/* ---------- Pack Loading ---------- */

function cleanPack(raw) {
    return {
        title: raw.title || raw.topic || "Untitled Retrieval Pack",
        topic: raw.topic || "",
        chains: Array.isArray(raw.chains) ? raw.chains : [],
        collocations: Array.isArray(raw.collocations) ? raw.collocations : [],
        why_questions: Array.isArray(raw.why_questions) ? raw.why_questions : [],
        how_questions: Array.isArray(raw.how_questions) ? raw.how_questions : [],
        summary_task: raw.summary_task || null
    };
}

function loadPackFromInput() {
    const text = $("jsonInput").value.trim();

    if (!text) {
        alert("Please paste Retrieval Pack JSON first.");
        return;
    }

    try {
        const raw = JSON.parse(text);
        pack = cleanPack(raw);

        state = {
            mode: null,
            index: 0,
            wrong: [],
            score: {
                correct: 0,
                wrong: 0
            }
        };

        save();
        renderDashboard();
        showScreen("dashboardScreen");

    } catch (e) {
        alert("Invalid JSON. Please check your Custom GPT output.");
    }
}

function renderDashboard() {
    $("packTitle").textContent = pack.title || "Retrieval Pack";
    $("chainCount").textContent = pack.chains.length;
    $("collocationCount").textContent = pack.collocations.length;
    $("questionCount").textContent =
        pack.why_questions.length + pack.how_questions.length;
}

/* ---------- Mode Start ---------- */

function startMode(mode) {
    state.mode = mode;
    state.index = 0;
    save();

    if (mode === "chains") {
        renderChain();
        showScreen("chainScreen");
    }

    if (mode === "collocations") {
        renderCollocation();
        showScreen("collocationScreen");
    }

    if (mode === "why") {
        renderWhy();
        showScreen("whyScreen");
    }

    if (mode === "how") {
        renderHow();
        showScreen("howScreen");
    }

    if (mode === "summary") {
        renderSummary();
        showScreen("summaryScreen");
    }
}

/* ---------- Chain Mode ---------- */

function currentChain() {
    if (!pack || !pack.chains.length) return null;
    return pack.chains[state.index % pack.chains.length];
}

function renderChain() {
    const item = currentChain();

    if (!item) {
        alert("No chains found in this pack.");
        showScreen("dashboardScreen");
        return;
    }

    clearFeedback("chainFeedback");

    $("chainProgress").textContent =
        `${state.index + 1} / ${pack.chains.length}`;

    $("chainConcept").textContent = item.concept || "Concept";

    const steps = Array.isArray(item.steps) ? item.steps : [];
    const container = $("chainInputs");
    container.innerHTML = "";

    steps.forEach((step, i) => {
        const input = document.createElement("input");
        input.className = "chainInput";
        input.type = "text";
        input.placeholder = `Step ${i + 1}`;
        input.dataset.answer = step;
        container.appendChild(input);
    });
}

function checkChain() {
    const inputs = Array.from(document.querySelectorAll(".chainInput"));
    let correctCount = 0;

    const expected = [];
    const user = [];

    inputs.forEach(input => {
        const userAnswer = input.value;
        const answer = input.dataset.answer;

        expected.push(answer);
        user.push(userAnswer);

        const sim = similarity(userAnswer, answer);

        input.classList.remove("correct", "wrong");

        if (sim >= 0.6) {
            input.classList.add("correct");
            correctCount++;
        } else {
            input.classList.add("wrong");
        }
    });

    if (correctCount === inputs.length) {
        markCorrect();
        setFeedback(
            "chainFeedback",
            `✅ Good retrieval. You recalled the full chain.`
        );
    } else {
        markWrong(
            "chain",
            currentChain(),
            user.join(" → "),
            expected.join(" → ")
        );

        setFeedback(
            "chainFeedback",
            `
            ❌ Some parts are missing or different.<br><br>
            <strong>Expected:</strong><br>
            ${escapeHTML(expected.join(" → "))}<br><br>
            <strong>Your answer:</strong><br>
            ${escapeHTML(user.join(" → "))}
            `
        );
    }
}

function showChainAnswer() {
    const item = currentChain();
    const steps = item.steps || [];

    setFeedback(
        "chainFeedback",
        `
        <strong>Answer:</strong><br>
        ${escapeHTML(item.concept || "")}
        → ${escapeHTML(steps.join(" → "))}
        `
    );

    const inputs = Array.from(document.querySelectorAll(".chainInput"));

    inputs.forEach((input, i) => {
        input.value = steps[i] || "";
    });
}

function nextChain() {
    if (!pack.chains.length) return;
    state.index = (state.index + 1) % pack.chains.length;
    save();
    renderChain();
}

/* ---------- Collocation Mode ---------- */

function currentCollocation() {
    if (!pack || !pack.collocations.length) return null;
    return pack.collocations[state.index % pack.collocations.length];
}

function renderCollocation() {
    const item = currentCollocation();

    if (!item) {
        alert("No collocations found in this pack.");
        showScreen("dashboardScreen");
        return;
    }

    clearFeedback("collocationFeedback");

    $("collocationProgress").textContent =
        `${state.index + 1} / ${pack.collocations.length}`;

    $("collocationAnswer").value = "";
    $("collocationAnswer").classList.remove("correct", "wrong");

    const meaning =
        item.meaning ||
        item.definition ||
        item.example ||
        "Recall the phrase";

    $("collocationMeaning").textContent = meaning;
}

function getCollocationPhrase(item) {
    return item.phrase || item.collocation || item.answer || "";
}

function checkCollocation() {
    const item = currentCollocation();
    const userAnswer = $("collocationAnswer").value;
    const expected = getCollocationPhrase(item);

    const sim = similarity(userAnswer, expected);

    $("collocationAnswer").classList.remove("correct", "wrong");

    if (sim >= 0.6) {
        $("collocationAnswer").classList.add("correct");
        markCorrect();

        setFeedback(
            "collocationFeedback",
            `✅ Correct: <strong>${escapeHTML(expected)}</strong>`
        );
    } else {
        $("collocationAnswer").classList.add("wrong");
        markWrong("collocation", item, userAnswer, expected);

        setFeedback(
            "collocationFeedback",
            `
            ❌ Not quite.<br><br>
            <strong>Expected:</strong> ${escapeHTML(expected)}<br>
            <strong>Your answer:</strong> ${escapeHTML(userAnswer)}
            `
        );
    }
}

function showCollocationAnswer() {
    const item = currentCollocation();
    const expected = getCollocationPhrase(item);

    $("collocationAnswer").value = expected;

    setFeedback(
        "collocationFeedback",
        `
        <strong>Phrase:</strong> ${escapeHTML(expected)}
        ${item.example ? `<div class="answerLine"><strong>Example:</strong> ${escapeHTML(item.example)}</div>` : ""}
        `
    );
}

function nextCollocation() {
    if (!pack.collocations.length) return;
    state.index = (state.index + 1) % pack.collocations.length;
    save();
    renderCollocation();
}

/* ---------- Why Mode ---------- */

function currentWhy() {
    if (!pack || !pack.why_questions.length) return null;
    return pack.why_questions[state.index % pack.why_questions.length];
}

function renderWhy() {
    const item = currentWhy();

    if (!item) {
        alert("No why questions found in this pack.");
        showScreen("dashboardScreen");
        return;
    }

    clearFeedback("whyFeedback");

    $("whyQuestion").textContent = item.question || "Why?";
    $("whyAnswer").value = "";
    $("whyAnswer").classList.remove("correct", "wrong");
}

function checkWhy() {
    const item = currentWhy();
    const userAnswer = $("whyAnswer").value;
    const expected = getAnswerText(item);

    const sim = similarity(userAnswer, expected);

    $("whyAnswer").classList.remove("correct", "wrong");

    if (sim >= 0.35) {
        $("whyAnswer").classList.add("correct");
        markCorrect();

        setFeedback(
            "whyFeedback",
            `
            ✅ Good. Your answer includes enough core meaning.<br><br>
            <strong>Expected logic:</strong><br>
            ${escapeHTML(expected)}
            `
        );
    } else {
        $("whyAnswer").classList.add("wrong");
        markWrong("why", item, userAnswer, expected);

        setFeedback(
            "whyFeedback",
            `
            ❌ Missing key logic.<br><br>
            <strong>Expected logic:</strong><br>
            ${escapeHTML(expected)}<br><br>
            <strong>Your answer:</strong><br>
            ${escapeHTML(userAnswer)}
            `
        );
    }
}

function nextWhy() {
    if (!pack.why_questions.length) return;
    state.index = (state.index + 1) % pack.why_questions.length;
    save();
    renderWhy();
}

/* ---------- How Mode ---------- */

function currentHow() {
    if (!pack || !pack.how_questions.length) return null;
    return pack.how_questions[state.index % pack.how_questions.length];
}

function renderHow() {
    const item = currentHow();

    if (!item) {
        alert("No how questions found in this pack.");
        showScreen("dashboardScreen");
        return;
    }

    clearFeedback("howFeedback");

    $("howQuestion").textContent = item.question || "How?";
    $("howAnswer").value = "";
    $("howAnswer").classList.remove("correct", "wrong");
}

function checkHow() {
    const item = currentHow();
    const userAnswer = $("howAnswer").value;
    const expected = getAnswerText(item);

    const sim = similarity(userAnswer, expected);

    $("howAnswer").classList.remove("correct", "wrong");

    if (sim >= 0.35) {
        $("howAnswer").classList.add("correct");
        markCorrect();

        setFeedback(
            "howFeedback",
            `
            ✅ Good. Your answer includes enough core meaning.<br><br>
            <strong>Expected logic:</strong><br>
            ${escapeHTML(expected)}
            `
        );
    } else {
        $("howAnswer").classList.add("wrong");
        markWrong("how", item, userAnswer, expected);

        setFeedback(
            "howFeedback",
            `
            ❌ Missing key logic.<br><br>
            <strong>Expected logic:</strong><br>
            ${escapeHTML(expected)}<br><br>
            <strong>Your answer:</strong><br>
            ${escapeHTML(userAnswer)}
            `
        );
    }
}

function nextHow() {
    if (!pack.how_questions.length) return;
    state.index = (state.index + 1) % pack.how_questions.length;
    save();
    renderHow();
}

/* ---------- Summary Mode ---------- */

function renderSummary() {
    const task = pack.summary_task || {};
    const prompt = task.prompt || "Write a 100-word summary from memory.";

    const summaryScreen = $("summaryScreen");
    const p = summaryScreen.querySelector("p");
    p.textContent = prompt;

    $("summaryText").value = localStorage.getItem("retrieval_summary_v1") || "";
    updateWordCount();
}

function updateWordCount() {
    const text = $("summaryText").value.trim();

    const count = text
        ? text.split(/\s+/).filter(Boolean).length
        : 0;

    $("wordCount").textContent = `${count} words`;
}

function saveSummary() {
    localStorage.setItem("retrieval_summary_v1", $("summaryText").value);

    alert("Summary saved on this device.");
}

/* ---------- Review ---------- */

function renderReview() {
    const total = state.score.correct + state.score.wrong;

    $("scoreContent").innerHTML = `
        <p><strong>Correct:</strong> ${state.score.correct}</p>
        <p><strong>Wrong:</strong> ${state.score.wrong}</p>
        <p><strong>Total Attempts:</strong> ${total}</p>
        <p><strong>Wrong Items Saved:</strong> ${state.wrong.length}</p>
    `;
}

function retryWrong() {
    if (!state.wrong.length) {
        alert("No wrong answers yet.");
        return;
    }

    const first = state.wrong[0];

    if (first.type === "chain") {
        const idx = pack.chains.findIndex(x => x.concept === first.item.concept);
        state.index = idx >= 0 ? idx : 0;
        renderChain();
        showScreen("chainScreen");
    }

    if (first.type === "collocation") {
        const expected = getCollocationPhrase(first.item);
        const idx = pack.collocations.findIndex(
            x => getCollocationPhrase(x) === expected
        );
        state.index = idx >= 0 ? idx : 0;
        renderCollocation();
        showScreen("collocationScreen");
    }

    if (first.type === "why") {
        const idx = pack.why_questions.findIndex(
            x => x.question === first.item.question
        );
        state.index = idx >= 0 ? idx : 0;
        renderWhy();
        showScreen("whyScreen");
    }

    if (first.type === "how") {
        const idx = pack.how_questions.findIndex(
            x => x.question === first.item.question
        );
        state.index = idx >= 0 ? idx : 0;
        renderHow();
        showScreen("howScreen");
    }
}

/* ---------- Events ---------- */

document.addEventListener("DOMContentLoaded", () => {
    $("loadPackBtn").addEventListener("click", loadPackFromInput);

    document.querySelectorAll(".modeBtn").forEach(btn => {
        btn.addEventListener("click", () => {
            const mode = btn.dataset.mode;

            if (mode === "review") {
                renderReview();
                showScreen("reviewScreen");
            } else {
                startMode(mode);
            }
        });
    });

    document.querySelectorAll(".backBtn").forEach(btn => {
        btn.addEventListener("click", () => {
            renderDashboard();
            showScreen("dashboardScreen");
        });
    });

    $("chainCheckBtn").addEventListener("click", checkChain);
    $("chainShowBtn").addEventListener("click", showChainAnswer);
    $("chainNextBtn").addEventListener("click", nextChain);

    $("collocationCheckBtn").addEventListener("click", checkCollocation);
    $("collocationShowBtn").addEventListener("click", showCollocationAnswer);
    $("collocationNextBtn").addEventListener("click", nextCollocation);

    $("whyCheckBtn").addEventListener("click", checkWhy);
    $("whyNextBtn").addEventListener("click", nextWhy);

    $("howCheckBtn").addEventListener("click", checkHow);
    $("howNextBtn").addEventListener("click", nextHow);

    $("summaryText").addEventListener("input", updateWordCount);
    $("saveSummaryBtn").addEventListener("click", saveSummary);

    $("retryWrongBtn").addEventListener("click", retryWrong);

    loadSaved();
});
