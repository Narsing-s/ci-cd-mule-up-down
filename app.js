(() => {
  const $ = (id) => document.getElementById(id);
  const repo = $("repo"), token = $("token"), environment = $("environment"), action = $("action");
  const application = $("application"), confirm = $("confirm"), run = $("run");
  const connection = $("connection"), result = $("result"), appWrap = $("app-wrap");
  let scope = "application";

  function setStatus(el, type, message) {
    el.className = "status " + type;
    el.textContent = message;
  }
  function parseRepo(value) {
    const clean = value.trim().replace(/^https?:\\/\\/github\\.com\\//, "").replace(/\\.git$/, "").replace(/\\/$/, "");
    const parts = clean.split("/").filter(Boolean);
    if (parts.length !== 2) throw new Error("Use a GitHub repository like owner/repository.");
    return parts;
  }
  function confirmationValue() {
    return "CONFIRM_" + action.value.toUpperCase();
  }
  function updateConfirmation() {
    confirm.value = confirmationValue();
  }
  function updateScope() {
    document.querySelectorAll(".seg").forEach(b => b.classList.toggle("active", b.dataset.scope === scope));
    appWrap.style.display = scope === "application" ? "block" : "none";
  }
  document.querySelectorAll(".seg").forEach(b => b.addEventListener("click", () => { scope = b.dataset.scope; updateScope(); }));
  action.addEventListener("change", updateConfirmation);
  updateConfirmation();

  async function github(path, options = {}) {
    const value = token.value.trim();
    if (!value) throw new Error("Enter a GitHub fine-grained token for this browser session.");
    const response = await fetch("https://api.github.com" + path, {
      ...options,
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: "Bearer " + value,
        "X-GitHub-Api-Version": "2022-11-28",
        ...(options.headers || {})
      }
    });
    const body = await response.text();
    let data = {};
    try { data = body ? JSON.parse(body) : {}; } catch {}
    if (!response.ok) throw new Error(data.message || ("GitHub API returned " + response.status));
    return data;
  }

  $("connect").addEventListener("click", async () => {
    try {
      const [owner, name] = parseRepo(repo.value);
      setStatus(connection, "info", "Checking repository access…");
      const data = await github("/repos/" + encodeURIComponent(owner) + "/" + encodeURIComponent(name));
      setStatus(connection, "ok", "Connected to " + data.full_name + ". The UI can dispatch its workflows.");
    } catch (e) {
      setStatus(connection, "err", e.message);
    }
  });

  run.addEventListener("click", async () => {
    try {
      const [owner, name] = parseRepo(repo.value);
      if (scope === "application" && !application.value.trim()) throw new Error("Enter an application name or ID.");
      if (confirm.value !== confirmationValue()) throw new Error("Confirmation does not match the selected action.");
      run.disabled = true;
      setStatus(result, "info", "Dispatching the existing MuleSoft workflow…");

      const inputs = {
        action: action.value,
        scope,
        environment: environment.value,
        application: scope === "application" ? application.value.trim() : "",
        confirm: confirm.value
      };

      await github("/repos/" + encodeURIComponent(owner) + "/" + encodeURIComponent(name) + "/actions/workflows/mule-api-control.yml/dispatches", {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({ref:"main", inputs})
      });

      const actionsUrl = "https://github.com/" + owner + "/" + name + "/actions/workflows/mule-api-control.yml";
      setStatus(result, "ok", "Workflow dispatched successfully. Open GitHub Actions to monitor the run.");
      result.innerHTML += ' <a href="' + actionsUrl + '" target="_blank" rel="noreferrer" style="color:inherit;font-weight:700">Open run monitor ↗</a>';
    } catch (e) {
      setStatus(result, "err", e.message);
    } finally {
      run.disabled = false;
    }
  });
})();