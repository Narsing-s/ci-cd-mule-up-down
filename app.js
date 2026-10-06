(() => {
  const $ = (id) => document.getElementById(id);
  const repo=$("repo"), token=$("token"), environment=$("environment"), action=$("action");
  const application=$("application"), confirm=$("confirm"), run=$("run");
  const connection=$("connection"), result=$("result"), appWrap=$("app-wrap");
  const analyticsStatus=$("analytics-status"), analyticsBody=$("analytics-body");
  let scope="application";
  let lastRunId=null;

  function setStatus(el,type,message,html=false){
    el.className="status "+type;
    if(html) el.innerHTML=message; else el.textContent=message;
  }
  function parseRepo(value){
    const clean=value.trim().replace(/^https?:\/\/github\.com\//,"").replace(/\.git$/,"").replace(/\/$/,"");
    const parts=clean.split("/").filter(Boolean);
    if(parts.length!==2) throw new Error("Repository must be owner/repository, for example Narsing-s/ci-cd-mule-up-down.");
    return parts;
  }
  function expectedConfirmation(){ return "CONFIRM_"+action.value.toUpperCase(); }
  function syncConfirmation(){ confirm.value=expectedConfirmation(); }
  function syncScope(){
    document.querySelectorAll(".seg").forEach(b=>b.classList.toggle("active",b.dataset.scope===scope));
    appWrap.style.display=scope==="application"?"block":"none";
  }
  function syncEnvironment(){ $("selected-env").textContent=environment.value; }
  document.querySelectorAll(".seg").forEach(b=>b.addEventListener("click",()=>{scope=b.dataset.scope;syncScope();}));
  action.addEventListener("change",syncConfirmation);
  environment.addEventListener("change",syncEnvironment);
  $("refresh-analytics").addEventListener("click",()=>refreshAnalytics());
  syncConfirmation(); syncScope(); syncEnvironment();

  async function github(path,options={}){
    const value=token.value.trim();
    if(!value) throw new Error("Enter your GitHub fine-grained token first.");
    const response=await fetch("https://api.github.com"+path,{
      ...options,
      headers:{Accept:"application/vnd.github+json",Authorization:"Bearer "+value,"X-GitHub-Api-Version":"2022-11-28",...(options.headers||{})}
    });
    const body=await response.text();
    let data={}; try{data=body?JSON.parse(body):{};}catch{}
    if(!response.ok){
      let hint="";
      if(response.status===401) hint=" Token is invalid or expired.";
      else if(response.status===403) hint=" Token lacks the required repository permission. For workflow dispatch, enable Actions → Read and write.";
      else if(response.status===404) hint=" Repository, workflow, or result file was not found.";
      throw new Error((data.message||("GitHub API returned HTTP "+response.status))+"."+hint);
    }
    return data;
  }

  function decodeBase64Json(encoded){
    const clean=encoded.replace(/\n/g,"");
    const bytes=Uint8Array.from(atob(clean),c=>c.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
  }

  function renderAnalytics(data){
    const s=data.summary||{};
    $("m-total").textContent=s.total??"—";
    $("m-success").textContent=s.success??"—";
    $("m-skipped").textContent=s.skipped??"—";
    $("m-running").textContent=s.running??"—";
    $("m-stopped").textContent=s.stopped??"—";
    $("m-unknown").textContent=s.unknown??"—";
    const rows=data.applications||[];
    analyticsBody.innerHTML=rows.length
      ? rows.map(x=>'<tr><td>'+escapeHtml(x.name)+'</td><td><span class="pill">'+escapeHtml(x.status)+'</span></td><td><span class="pill">'+escapeHtml(x.result)+'</span></td></tr>').join("")
      : '<tr><td colspan="3">No application results were returned.</td></tr>';
    setStatus(analyticsStatus,"ok",
      'Latest result: <b>'+escapeHtml(String(data.environment||"").toUpperCase())+'</b> / <b>'+escapeHtml(String(data.action||"").toUpperCase())+'</b> • Run #'+escapeHtml(String(data.runNumber||"—"))+' • '+escapeHtml(String(data.completedAt||"")).replace("T"," ").replace("Z"," UTC"),
      true
    );
  }

  function escapeHtml(value){
    return String(value).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
  }

  async function fetchAnalytics(env, expectedRunId=null){
    const [owner,name]=parseRepo(repo.value);
    const path="/repos/"+encodeURIComponent(owner)+"/"+encodeURIComponent(name)+"/contents/control-results/"+encodeURIComponent(env)+"/latest.json";
    const file=await github(path);
    const data=decodeBase64Json(file.content||"");
    if(expectedRunId && Number(data.runId)!==Number(expectedRunId)) return null;
    return data;
  }

  async function refreshAnalytics(){
    try{
      setStatus(analyticsStatus,"info","Loading latest analytics…");
      const data=await fetchAnalytics(environment.value,lastRunId);
      if(!data){
        setStatus(analyticsStatus,"info","The latest result is from an older run. Start a control operation and the UI will refresh when its result is published.");
        return;
      }
      renderAnalytics(data);
    }catch(e){
      setStatus(analyticsStatus,"err","Analytics unavailable: "+e.message);
    }
  }

  async function waitForRun(owner,name,env,startedAt){
    const started=Date.parse(startedAt)-10000;
    for(let i=0;i<30;i++){
      const data=await github("/repos/"+encodeURIComponent(owner)+"/"+encodeURIComponent(name)+"/actions/workflows/mule-api-control.yml/runs?event=workflow_dispatch&per_page=10");
      const runs=(data.workflow_runs||[]).filter(r=>Date.parse(r.created_at)>=started);
      const matching=runs.find(r=>String(r.display_title||"").toLowerCase().includes(env.toLowerCase()));
      if(matching) return matching;
      await new Promise(resolve=>setTimeout(resolve,2000));
    }
    throw new Error("Workflow was dispatched, but its run could not be located yet. Open the run monitor to inspect it.");
  }

  async function waitForCompletion(owner,name,runInfo){
    let current=runInfo;
    for(let i=0;i<60;i++){
      current=await github("/repos/"+encodeURIComponent(owner)+"/"+encodeURIComponent(name)+"/actions/runs/"+current.id);
      if(current.status==="completed") return current;
      await new Promise(resolve=>setTimeout(resolve,3000));
    }
    throw new Error("Workflow is still running after the UI wait window. The GitHub Actions run can continue in the background.");
  }

  $("connect").addEventListener("click",async()=>{
    try{
      const [owner,name]=parseRepo(repo.value);
      setStatus(connection,"info","Checking repository access and workflow permissions…");
      const r=await github("/repos/"+encodeURIComponent(owner)+"/"+encodeURIComponent(name));
      if(r.private && !r.permissions?.push) throw new Error("You can read this repository but your token does not have push/write access.");
      const workflow=await github("/repos/"+encodeURIComponent(owner)+"/"+encodeURIComponent(name)+"/actions/workflows/mule-api-control.yml");
      if(workflow.state!=="active") throw new Error("The MuleSoft workflow exists but is not active.");
      setStatus(connection,"ok","GitHub access OK. Repository: "+r.full_name+" • Workflow: active. You can run the control operation.");
    }catch(e){setStatus(connection,"err",e.message);}
  });

  run.addEventListener("click",async()=>{
    try{
      const [owner,name]=parseRepo(repo.value);
      if(scope==="application"&&!application.value.trim()) throw new Error("Application scope selected: enter an application name or ID.");
      if(confirm.value!==expectedConfirmation()) throw new Error("Confirmation mismatch. For "+action.value.toUpperCase()+" select "+expectedConfirmation()+".");
      if(!token.value.trim()) throw new Error("GitHub token is required.");
      run.disabled=true;
      setStatus(result,"info","Dispatching GitHub Actions workflow…");
      const inputs={action:action.value,scope,environment:environment.value,application:scope==="application"?application.value.trim():"",confirm:confirm.value};
      const startedAt=new Date().toISOString();
      await github("/repos/"+encodeURIComponent(owner)+"/"+encodeURIComponent(name)+"/actions/workflows/mule-api-control.yml/dispatches",{
        method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({ref:"main",inputs})
      });
      setStatus(result,"info","Workflow dispatched. Waiting for CloudHub 2.0 control execution and final API statistics…");
      const runInfo=await waitForRun(owner,name,environment.value,startedAt);
      lastRunId=runInfo.id;
      const completed=await waitForCompletion(owner,name,runInfo);
      const actionsUrl="https://github.com/"+owner+"/"+name+"/actions/runs/"+completed.id;
      if(completed.conclusion!=="success"){
        setStatus(result,"err",'Workflow finished with <b>'+escapeHtml(String(completed.conclusion||"failure").toUpperCase())+'</b>. <a href="'+actionsUrl+'" target="_blank" rel="noreferrer">Open run ↗</a>',true);
        await refreshAnalytics();
        return;
      }
      setStatus(result,"ok",'Workflow completed successfully for <b>'+environment.value.toUpperCase()+' / '+action.value.toUpperCase()+'</b>. Loading API analytics… <a href="'+actionsUrl+'" target="_blank" rel="noreferrer">Open run ↗</a>',true);
      for(let i=0;i<15;i++){
        const data=await fetchAnalytics(environment.value,lastRunId);
        if(data){renderAnalytics(data);break;}
        await new Promise(resolve=>setTimeout(resolve,2000));
      }
      if(!lastRunId) await refreshAnalytics();
    }catch(e){
      setStatus(result,"err","Run failed: "+e.message);
    }finally{run.disabled=false;}
  });
})();