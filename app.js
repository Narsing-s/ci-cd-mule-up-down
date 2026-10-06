(() => {
  const $ = (id) => document.getElementById(id);
  const repo=$("repo"), token=$("token"), environment=$("environment"), action=$("action");
  const application=$("application"), confirm=$("confirm"), run=$("run");
  const connection=$("connection"), result=$("result"), appWrap=$("app-wrap");
  let scope="application";

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
      const hint=response.status===401?" Token is invalid or expired.":response.status===403?" Token lacks permission or repository access.":response.status===404?" Repository or workflow was not found.":"";
      throw new Error((data.message||("GitHub API returned HTTP "+response.status))+"."+hint);
    }
    return data;
  }

  $("connect").addEventListener("click",async()=>{
    try{
      const [owner,name]=parseRepo(repo.value);
      setStatus(connection,"info","Checking repository access and workflow permissions…");
      const r=await github("/repos/"+encodeURIComponent(owner)+"/"+encodeURIComponent(name));
      if(r.private && !r.permissions?.push) throw new Error("You can read this repository but your token does not have push/write access.");
      const workflow=await github("/repos/"+encodeURIComponent(owner)+"/"+encodeURIComponent(name)+"/actions/workflows/mule-api-control.yml");
      if(workflow.state!=="active") throw new Error("The MuleSoft workflow exists but is not active.");
      setStatus(connection,"ok","GitHub access OK. Repository: "+r.full_name+" • Workflow: active. Your token can continue to the dispatch step.");
    }catch(e){setStatus(connection,"err",e.message);}
  });

  run.addEventListener("click",async()=>{
    try{
      const [owner,name]=parseRepo(repo.value);
      if(scope==="application"&&!application.value.trim()) throw new Error("Application scope selected: enter an application name or ID.");
      if(confirm.value!==expectedConfirmation()) throw new Error("Confirmation mismatch. For "+action.value.toUpperCase()+" select "+expectedConfirmation()+".");
      if(!token.value.trim()) throw new Error("GitHub token is required.");
      run.disabled=true;
      setStatus(result,"info","Checking GitHub access, then dispatching…");
      await github("/repos/"+encodeURIComponent(owner)+"/"+encodeURIComponent(name));
      const inputs={action:action.value,scope,environment:environment.value,application:scope==="application"?application.value.trim():"",confirm:confirm.value};
      await github("/repos/"+encodeURIComponent(owner)+"/"+encodeURIComponent(name)+"/actions/workflows/mule-api-control.yml/dispatches",{
        method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({ref:"main",inputs})
      });
      const actionsUrl="https://github.com/"+owner+"/"+name+"/actions/workflows/mule-api-control.yml";
      setStatus(result,"ok",'Workflow dispatched for '+environment.value.toUpperCase()+' / '+action.value.toUpperCase()+'. <a href="'+actionsUrl+'" target="_blank" rel="noreferrer">Open run monitor ↗</a>',true);
    }catch(e){
      setStatus(result,"err","Run failed: "+e.message);
    }finally{run.disabled=false;}
  });
})();