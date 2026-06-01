const SAMPLE_PACK = {
  title: "Eco-Friendly Habits",
  topic: "Environment",
  level: "B1-B2",
  main_ideas: ["Small daily habits can protect the planet", "Reducing plastic and waste improves the environment", "Eco-friendly living can save energy and money"],
  chains: [
    { concept: "Recycling", steps: ["sort paper, cans, bottles, and plastics", "reduce waste production", "less pollution", "cleaner environment"], ielts_use: "Use for environment or public behavior essays." },
    { concept: "Energy-efficient light bulbs", steps: ["use less electricity", "reduce energy consumption", "lower carbon footprint", "save money and protect the planet"], ielts_use: "Use for energy and lifestyle topics." },
    { concept: "Reusable bags", steps: ["replace plastic bags", "reduce single-use plastic", "less plastic pollution", "greener lifestyle"], ielts_use: "Use for consumer habits and environment." },
    { concept: "Plants at home", steps: ["absorb carbon dioxide", "produce oxygen", "improve air quality", "healthier living space"], ielts_use: "Use for health and environment." }
  ],
  collocations: [
    { phrase: "reduce waste production", meaning: "make less rubbish", example: "Recycling can reduce waste production." },
    { phrase: "preserve the environment", meaning: "protect nature", example: "Eco-friendly habits help preserve the environment." },
    { phrase: "carbon footprint", meaning: "the amount of emissions caused by a person or activity", example: "Energy-efficient bulbs reduce our carbon footprint." },
    { phrase: "single-use plastic", meaning: "plastic used once and thrown away", example: "People should avoid single-use plastic." }
  ],
  why_questions: [
    { question: "Why is recycling important?", expected_chain: ["less waste", "less pollution", "cleaner environment", "better life quality"] },
    { question: "Why should people avoid single-use plastic?", expected_chain: ["less plastic waste", "less environmental pollution", "protect wildlife", "preserve ecosystems"] }
  ],
  how_questions: [
    { question: "How do plants improve the home environment?", expected_chain: ["absorb carbon dioxide", "produce oxygen", "improve air quality", "create healthier space"] },
    { question: "How can eco-friendly habits save money?", expected_chain: ["use less electricity", "reduce bills", "consume fewer disposable products", "save money over time"] }
  ],
  speaking_prompts: [
    { prompt: "Explain why people should adopt eco-friendly habits.", target_phrases: ["reduce waste", "preserve the environment", "improve air quality"] },
    { prompt: "Describe one eco-friendly habit you can practise every day.", target_phrases: ["single-use plastic", "reusable bags", "greener lifestyle"] }
  ],
  summary_task: { prompt: "Write a 100-word summary from memory.", must_include: ["recycling", "saving energy", "avoiding plastic", "protecting the environment"] }
};

const CUSTOM_GPT_PROMPT = `You are an English retrieval-training assistant.

When the user pastes an article, transform it into a retrieval practice pack.

Your goal is not to summarize only. Your goal is to help the user convert passive reading knowledge into active speaking and writing retrieval.

Always output valid JSON only. Do not use markdown. Do not explain.

JSON structure:
{
  "title": "",
  "topic": "",
  "level": "B1-B2",
  "main_ideas": [],
  "chains": [
    {
      "concept": "",
      "steps": ["", "", "", ""],
      "ielts_use": ""
    }
  ],
  "collocations": [
    {
      "phrase": "",
      "meaning": "",
      "example": ""
    }
  ],
  "why_questions": [
    {
      "question": "",
      "expected_chain": ["", "", "", ""]
    }
  ],
  "how_questions": [
    {
      "question": "",
      "expected_chain": ["", "", "", ""]
    }
  ],
  "speaking_prompts": [
    {
      "prompt": "",
      "target_phrases": []
    }
  ],
  "summary_task": {
    "prompt": "Write a 100-word summary from memory.",
    "must_include": []
  }
}

Rules:
- Extract 8-12 logic chains.
- Each chain must follow: Concept → Mechanism → Immediate Effect → Outcome → Long-term Consequence.
- Extract 15-25 useful collocations.
- Prefer natural phrases useful for IELTS Speaking and Writing.
- Avoid rare or overly academic words unless useful.
- Questions must train retrieval, not recognition.
- Keep wording simple and clear.
- Output JSON only.`;

let pack = JSON.parse(localStorage.getItem("retrievalPack") || "null");
let mode = "chains";
let index = 0;
let cleared = false;
let progress = JSON.parse(localStorage.getItem("retrievalProgress") || '{"done":0,"right":0,"wrong":0,"weak":[]}');

const $ = (id) => document.getElementById(id);
const $$ = (sel) => [...document.querySelectorAll(sel)];

function normalize(s) {
  return String(s || "").toLowerCase().replace(/[.,!?;:]/g, "").replace(/\s+/g, " ").trim();
}

function similarity(a, b) {
  a = normalize(a); b = normalize(b);
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return 0.85;
  const aw = new Set(a.split(" "));
  const bw = new Set(b.split(" "));
  const inter = [...aw].filter(w => bw.has(w)).length;
  return inter / Math.max(aw.size, bw.size);
}

function save() {
  localStorage.setItem("retrievalPack", JSON.stringify(pack));
  localStorage.setItem("retrievalProgress", JSON.stringify(progress));
}

function switchScreen(id) {
  $$(".screen").forEach(s => s.classList.remove("active"));
  $(id).classList.add("active");
  $$(".tab").forEach(t => t.classList.toggle("active", t.dataset.screen === id));
  renderAll();
}

function currentItems() {
  if (!pack) return [];
  if (mode === "chains") return pack.chains || [];
  if (mode === "collocations") return pack.collocations || [];
  if (mode === "why") return pack.why_questions || [];
  if (mode === "how") return pack.how_questions || [];
  if (mode === "speaking") return pack.speaking_prompts || [];
  if (mode === "summary") return pack.summary_task ? [pack.summary_task] : [];
  return [];
}

function getExpected(item) {
  if (mode === "chains") return item.steps || [];
  if (mode === "collocations") return [item.phrase || "", item.meaning || "", item.example || ""];
  if (mode === "why" || mode === "how") return item.expected_chain || [];
  if (mode === "speaking") return item.target_phrases || [];
  if (mode === "summary") return item.must_include || [];
  return [];
}

function renderSetup() {
  $("jsonFormat").textContent = JSON.stringify({ title:"", topic:"", chains:[{concept:"", steps:["", "", "", ""], ielts_use:""}], collocations:[{phrase:"", meaning:"", example:""}], why_questions:[{question:"", expected_chain:["", "", "", ""]}], how_questions:[{question:"", expected_chain:["", "", "", ""]}], speaking_prompts:[{prompt:"", target_phrases:[]}], summary_task:{prompt:"Write a 100-word summary from memory.", must_include:[]} }, null, 2);
  if (!pack) return $("packPreview").classList.add("hidden");
  $("packPreview").classList.remove("hidden");
  $("statTitle").textContent = pack.title || pack.topic || "Untitled";
  $("statChains").textContent = (pack.chains || []).length;
  $("statCollocations").textContent = (pack.collocations || []).length;
  $("statQuestions").textContent = (pack.why_questions || []).length + (pack.how_questions || []).length;
}

function renderPractice() {
  if (!pack) {
    $("noPack").classList.remove("hidden");
    $("practiceArea").classList.add("hidden");
    return;
  }
  $("noPack").classList.add("hidden");
  $("practiceArea").classList.remove("hidden");

  const items = currentItems();
  if (index >= items.length) index = 0;
  const item = items[index];
  const expected = getExpected(item);
  $("currentIndex").textContent = items.length ? index + 1 : 0;
  $("totalItems").textContent = items.length;
  $("modeLabel").textContent = modeLabel(mode);

  if (!item) {
    $("promptTitle").textContent = "No items in this mode";
    $("promptText").textContent = "Add items in your JSON pack.";
    $("answerFields").innerHTML = "";
    return;
  }

  if (mode === "chains") {
    $("promptTitle").textContent = item.concept || "Chain";
    $("promptText").textContent = item.ielts_use || "Recall the chain steps.";
    renderFields(expected.length, "Step");
  } else if (mode === "collocations") {
    $("promptTitle").textContent = item.meaning || "Collocation recall";
    $("promptText").textContent = "Recall the phrase, meaning, and example.";
    renderFields(3, "Answer");
  } else if (mode === "why" || mode === "how") {
    $("promptTitle").textContent = item.question || "Question";
    $("promptText").textContent = "Answer with a logical chain.";
    renderFields(expected.length, "Link");
  } else {
    $("promptTitle").textContent = item.prompt || "Production task";
    $("promptText").textContent = mode === "summary" ? "Use the must-include ideas from memory." : "Try to use the target phrases.";
    renderLongAnswer();
  }
  $("feedback").classList.add("hidden");
  $("clearCheckBtn").textContent = "Clear";
  cleared = false;
}

function modeLabel(m) {
  return {chains:"Chain Recall", collocations:"Collocation Recall", why:"Why Questions", how:"How Questions", speaking:"Speaking", summary:"Summary"}[m];
}

function renderFields(n, label) {
  $("longAnswer").classList.add("hidden");
  const html = Array.from({length:n}, (_,i) => `<div class="answer-row"><label>${label} ${i+1}</label><input class="answer-input" autocomplete="off" /></div>`).join("");
  $("answerFields").innerHTML = html;
}

function renderLongAnswer() {
  $("answerFields").innerHTML = "";
  $("longAnswer").classList.remove("hidden");
  $("longAnswer").value = "";
}

function clearOrCheck() {
  const expected = getExpected(currentItems()[index] || {});
  if (!cleared) {
    $$(".answer-input").forEach(i => { i.value = ""; i.classList.remove("correct", "wrong"); });
    $("longAnswer").value = "";
    $("feedback").classList.add("hidden");
    $("clearCheckBtn").textContent = "Check";
    cleared = true;
    return;
  }
  checkAnswer(expected);
}

function checkAnswer(expected) {
  let correct = 0, total = expected.length;
  if (mode === "speaking" || mode === "summary") {
    const ans = $("longAnswer").value;
    const found = expected.filter(x => normalize(ans).includes(normalize(x)) || similarity(ans, x) > 0.35);
    correct = found.length;
    $("feedback").classList.remove("hidden");
    $("feedback").innerHTML = `<strong>${correct}/${total} target ideas used.</strong><br>Target: ${expected.join(" • ")}`;
  } else {
    $$(".answer-input").forEach((input, i) => {
      const ok = similarity(input.value, expected[i]) >= 0.55;
      input.classList.toggle("correct", ok);
      input.classList.toggle("wrong", !ok);
      correct += ok ? 1 : 0;
      const row = input.closest(".answer-row");
      let right = row.querySelector(".right-answer");
      if (!right) { right = document.createElement("div"); right.className = "right-answer"; row.appendChild(right); }
      right.textContent = ok ? `✓ ${expected[i]}` : `Your answer: ${input.value || "(blank)"} | Right: ${expected[i]}`;
    });
  }
  progress.done += 1;
  if (correct === total) progress.right += 1; else {
    progress.wrong += 1;
    progress.weak.unshift({ mode, prompt: $("promptTitle").textContent, expected: expected.join(" → "), date: new Date().toLocaleDateString() });
    progress.weak = progress.weak.slice(0, 30);
  }
  save();
  renderProgress();
}

function showAnswer() {
  const expected = getExpected(currentItems()[index] || {});
  $("feedback").classList.remove("hidden");
  $("feedback").innerHTML = `<strong>Answer</strong><br>${expected.join(" → ")}`;
}

function nextItem() {
  const items = currentItems();
  if (!items.length) return;
  index = (index + 1) % items.length;
  renderPractice();
}

function renderProgress() {
  $("doneCount").textContent = progress.done;
  $("rightCount").textContent = progress.right;
  $("wrongCount").textContent = progress.wrong;
  $("accuracy").textContent = progress.done ? Math.round(progress.right / progress.done * 100) + "%" : "0%";
  $("wrongList").innerHTML = progress.weak.length ? progress.weak.map(w => `<div class="wrong-item"><strong>${w.prompt}</strong><br><span>${w.mode} · ${w.date}</span><br><small>${w.expected}</small></div>`).join("") : "No weak items yet.";
}

function renderAll() { renderSetup(); renderPractice(); renderProgress(); }

$$(".tab").forEach(t => t.addEventListener("click", () => switchScreen(t.dataset.screen)));
$$(".mode").forEach(b => b.addEventListener("click", () => { mode = b.dataset.mode; index = 0; $$(".mode").forEach(x=>x.classList.toggle("active", x===b)); renderPractice(); }));
$("copyPromptBtn").addEventListener("click", async () => { await navigator.clipboard.writeText(CUSTOM_GPT_PROMPT); $("loadStatus").textContent = "Custom GPT prompt copied."; });
$("sampleBtn").addEventListener("click", () => { pack = SAMPLE_PACK; save(); renderAll(); $("loadStatus").textContent = "Sample pack loaded."; });
$("loadPackBtn").addEventListener("click", () => {
  try {
    const parsed = JSON.parse($("jsonInput").value);
    if (!parsed.chains && !parsed.collocations) throw new Error("Missing chains/collocations.");
    pack = parsed; index = 0; save(); renderAll(); $("loadStatus").textContent = "Pack loaded successfully.";
  } catch (e) { $("loadStatus").textContent = "Invalid JSON: " + e.message; }
});
$("clearDataBtn").addEventListener("click", () => { localStorage.clear(); pack = null; progress = {done:0,right:0,wrong:0,weak:[]}; renderAll(); $("loadStatus").textContent = "Data cleared."; });
$("startBtn").addEventListener("click", () => switchScreen("practiceScreen"));
$("clearCheckBtn").addEventListener("click", clearOrCheck);
$("showBtn").addEventListener("click", showAnswer);
$("nextBtn").addEventListener("click", nextItem);
$("themeBtn").addEventListener("click", () => { document.body.classList.toggle("dark"); localStorage.setItem("theme", document.body.classList.contains("dark") ? "dark" : "light"); });
if (localStorage.getItem("theme") === "dark") document.body.classList.add("dark");
renderAll();
