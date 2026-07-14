const $ = (id) => document.getElementById(id);
const state = { providers: [], quote: null };

function requestBody() {
  return {
    task: $("task").value,
    maxCostMicrounits: Number($("maxCost").value),
    maxLatencyMs: Number($("maxLatency").value),
    minimumQuality: Number($("quality").value) / 100,
    privacy: $("privacy").value,
  };
}

function renderProviders(selectedId) {
  const body = requestBody();
  $("providers").innerHTML = state.providers.map((p) => {
    const eligible = p.capability === body.task && p.available && p.priceMicrounits <= body.maxCostMicrounits && p.latencyMs <= body.maxLatencyMs && p.quality >= body.minimumQuality;
    return `<article class="provider-card ${p.id === selectedId ? "selected" : ""} ${eligible ? "" : "ineligible"}">
      <div class="provider-name"><strong>${p.id}</strong><small>${p.capability.replaceAll("_", " ")}</small><span class="badge">${p.privacy}</span></div>
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
  try {
    const [health, providers, balance] = await Promise.all([
      api("/health"), api("/providers"), api("/balance")
    ]);
    $("serviceStatus").textContent = `${health.service} connected`;
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
    $("selectedProvider").textContent = state.quote.provider.id;
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
    $("jobOutput").textContent = JSON.stringify(result, null, 2);
    $("jobOutput").classList.remove("hidden");
    const balance = await api("/balance");
    $("balance").textContent = balance.availableMicrounits.toLocaleString();
  } catch (error) {
    $("jobOutput").textContent = error.message;
    $("jobOutput").classList.remove("hidden");
  } finally {
    button.disabled = false;
  }
});

boot();
