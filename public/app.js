const $ = (id) => document.getElementById(id);
const state = { providers: [], quote: null, health: null };

function ensurePromptField() {
  document.querySelector(".brand-lockup .eyebrow")?.remove();
  if ($("prompt")) return;
  const taskSelect = $("task");
  const taskLabel = taskSelect.closest("label");
  const promptLabel = document.createElement("label");
  promptLabel.innerHTML = `Task prompt
    <textarea id="prompt" rows="5" placeholder="Describe what you want the AI to do...">Summarize the XRPL Hooks roadmap in a clear, stoic tone.</textarea>`;
  taskLabel.insertAdjacentElement("afterend", promptLabel);
  taskSelect.innerHTML = '<option value="general_text">General text task</option>';
  $("privacy").value = "standard";
}

function requestBody() {
  return {
    task: $("task").value,
    prompt: $("prompt").value,
    maxCostMicrounits: Number($("maxCost").value),
    maxLatencyMs: Number($("maxLatency").value),
    minimumQuality: Number($("quality").value) / 100,
    privacy: $("privacy").value,
  };
}

function privacyRank(value) {
  return { standard: 0, "no-retention": 1, "local-only": 2 }[value] ?? 0;
}

function renderProviders(selectedId) {
  const body = requestBody();
  $("providers").innerHTML = state.providers.map((p) => {
    const eligible = p.capability === body.task && p.available &&
      p.priceMicrounits <= body.maxCostMicrounits &&
      p.latencyMs <= body.maxLatencyMs &&
      p.quality >= body.minimumQuality &&
      privacyRank(p.privacy) >= privacyRank(body.privacy);

    return `<article class="provider-card ${p.id === selectedId ? "selected" : ""} ${eligible ? "" : "ineligible"}">
      <div class="provider-name"><strong>${p.id}</strong><small>${p.model}</small><span class="badge">${p.executionMode} · ${p.privacy}</span></div>
      <div class="provider-metric"><span>COST</span><strong>${p.priceMicrounits.toLocaleString()}</strong></div>
      <div class="provider-metric"><span>QUALITY</span><strong>${Math.round(p.quality * 100)}%</strong></div>
      <div class="provider-metric"><span>LATENCY</span><strong>${p.latencyMs}ms</strong></div>
    </article>`;
  }).join("");
}

async function api(path, options) {
  const response = await fetch(path, options);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}

async function boot() {
  ensurePromptField();
  try {
    const [health, providers, balance] = await Promise.all([
      api("/health"), api("/providers"), api("/balance")
    ]);
    state.health = health;
    $("serviceStatus").textContent = `${health.execution.toUpperCase()} execution · ${health.service} connected`;
    state.providers = providers;
    $("providerCount").textContent = providers.filter((p) => p.available).length;
    $("balance").textContent = balance.availableMicrounits.toLocaleString();
    renderProviders();
  } catch (error) {
    $("serviceStatus").textContent = error.message;
  }
}

$("quality").addEventListener("input", () => {
  $("qualityValue").textContent = `${$("quality").value}%`;
  renderProviders(state.quote?.provider?.id);
});
["task", "maxCost", "maxLatency", "privacy"].forEach((id) => $(id).addEventListener("change", () => renderProviders(state.quote?.provider?.id)));

$("jobForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = $("routeButton");
  button.disabled = true;
  button.textContent = "Pathfinding…";
  try {
    state.quote = await api("/quote", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(requestBody())
    });
    renderProviders(state.quote.provider.id);
    $("selectedProvider").textContent = `${state.quote.provider.id} · ${state.quote.provider.model}`;
    $("selectedCost").textContent = `${state.quote.provider.priceMicrounits.toLocaleString()} μ`;
    $("selectedQuality").textContent = `${Math.round(state.quote.provider.quality * 100)}%`;
    $("selectedLatency").textContent = `${state.quote.provider.latencyMs} ms`;
    $("selectedScore").textContent = state.quote.score.toFixed(4);
    $("resultPanel").classList.remove("hidden");
    document.querySelectorAll("#flow > div").forEach((el) => el.classList.remove("active", "done"));
    document.querySelector('[data-step="quote"]').classList.add("done");
    $("jobOutput").classList.add("hidden");
  } catch (error) {
    alert(error.message);
  } finally {
    button.disabled = false;
    button.textContent = "Find optimal route";
  }
});

$("executeButton").addEventListener("click", async () => {
  const button = $("executeButton");
  button.disabled = true;
  button.textContent = "Executing…";
  const steps = ["reserve", "execute", "stream", "settle"];
  steps.forEach((step) => document.querySelector(`[data-step="${step}"]`).classList.remove("active", "done"));
  try {
    for (const step of ["reserve", "execute", "stream"]) {
      const element = document.querySelector(`[data-step="${step}"]`);
      element.classList.add("active");
      await new Promise((resolve) => setTimeout(resolve, 350));
      element.classList.remove("active"); element.classList.add("done");
    }
    const result = await api("/jobs", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(requestBody())
    });
    document.querySelector('[data-step="settle"]').classList.add("done");
    $("jobOutput").textContent = `${result.output}\n\n---\nMode: ${result.executionMode}\nModel: ${result.model}\nDuration: ${result.durationMs} ms\nInput tokens: ${result.inputTokens ?? "n/a"}\nOutput tokens: ${result.outputTokens ?? "n/a"}\nJob: ${result.jobId}`;
    $("jobOutput").classList.remove("hidden");
    const balance = await api("/balance");
    $("balance").textContent = balance.availableMicrounits.toLocaleString();
  } catch (error) {
    $("jobOutput").textContent = error.message;
    $("jobOutput").classList.remove("hidden");
  } finally {
    button.disabled = false;
    button.textContent = "Execute routed job";
  }
});

boot();
