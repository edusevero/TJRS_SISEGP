(function () {
  'use strict';
  const O = window.InitiativeOptions;
  const A = window.AuxiliaryData;
  const departments = A ? A.names('Departamentos') : ['DIREÇÃO','DSUP','DSISADM','DSISJUD','DPROD','DPROJ'];
  const lifecycle = {'ABERTO':'Aberta','EM PLANEJAMENTO':'Em planejamento','EM EXECUÇÃO':'Em execução','EM HOMOLOGAÇÃO':'Em homologação','EM AJUSTES':'Em ajustes','FINALIZADO':'Concluída','SUSPENSO':'Suspensa','CANCELADO':'Cancelada'};
  const clone = value => JSON.parse(JSON.stringify(value));
  const dateLabel = value => /^\d{4}-\d{2}-\d{2}$/.test(value||'')?String(value).split('-').reverse().join('/'):value||'Não informado';
  function validCalendarDate(value){if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const date=new Date(value+'T12:00:00');return !Number.isNaN(date.getTime())&&date.getFullYear()===Number(value.slice(0,4))&&date.getMonth()+1===Number(value.slice(5,7))&&date.getDate()===Number(value.slice(8,10));}
  let activeController;
  // Adapter: keep legacy fields and collections intact; use explicit MVP structures.
  function normalize(source) {
    const item = A ? A.resolveRecord(source || {}) : clone(source || {});
    item.progress=Number.isFinite(Number(item.progress))?Math.max(0,Math.min(100,Number(item.progress))):0;
    item.mvp = Object.assign({classification:{},areas:[],stakeholders:[],members:[]}, item.mvp);
    ['areas','stakeholders','members'].forEach(key=>{if(!Array.isArray(item.mvp[key]))item.mvp[key]=[];});
    item.mvp.classification = item.mvp.classification || {};
    if(!source?.mvp) {
      item.mvp.stakeholders = Array.isArray(item.stakeholders)?item.stakeholders: item.stakeholders?[item.stakeholders]:[];
      item.mvp.members = (Array.isArray(item.team)?item.team:[]).map(name=>typeof name==='string'?{name,role:'',hst:''}:name);
      [['ditic','classification'],['axis','axis'],['cycle','cycle'],['objective','strategicObjective'],['criticality','criticality']].forEach(([key,legacy])=>{if(item[legacy])item.mvp.classification[key]=item[legacy];});
      if(O.Criticidade.includes(String(item.criticality).toLocaleUpperCase('pt-BR')))item.mvp.classification.criticality=String(item.criticality).toLocaleUpperCase('pt-BR');
    }
    item.administrativeStatus = item.administrativeStatus || Object.keys(lifecycle).find(key=>lifecycle[key]===item.status) || '';
    item.files = item.files || []; item.statusReports = item.statusReports || [];
    return item;
  }
  window.InitiativeEditor = { normalize, lifecycle, mount };
  function mount(root, source, api) {
    activeController?.abort();
    activeController = new AbortController();
    const signal = activeController.signal;
    const item = normalize(source), e = api.escapeHtml;
    const initialDepartment=item.department,initialSector=item.sector;
    const blobs = api.blobs;
    let dirty=false, memberIndex=null, reportIndex=null, saved=false;
    const tabs=[...(source?.id?[{label:'Visão Geral',index:5}]:[]),...['Dados da Iniciativa','Classificação','Equipe','Documentos','Status Report'].map((label,index)=>({label,index}))];
    const catalogs={title:null,initiativeType:'Tipos de Iniciativas',department:'Departamentos',sector:'Setores',administrativeStatus:'Status Administrativo da Iniciativa',manager:'Gerentes de Projetos','c.ditic':'Classificação DITIC','c.strategic':'Iniciativa Estratégica','c.biennium':'Biênio — PDTIC','c.axis':'Eixo','c.cycle':'Ciclo','c.enticjud':'ENTICJUD','c.objective':'Objetivo Estratégico','c.criticality':'Criticidade','c.complexity':'Complexidade','c.importance':'Importância para o TJRS','c.necessity':'Necessidade','c.impact':'Impacto no PE','c.legal':'Determinação Legal','c.deadline':'Prazo','c.budget':'Orçamento','report-type':'Status Report — Tipo de Relatório','report-status':'Status Report — Situação da Iniciativa','report-owner':'Gerentes de Projetos'};
    const widths={title:8,start:2,end:2,initiativeType:2,department:2,sector:2,requester:2,sponsor:2,sei:2,administrativeStatus:4,progress:2,manager:4,'member-name':5,'member-role':3,'member-hst':3,'report-type':3,'report-date':3,'report-status':3,'report-owner':3,'report-achievements':4,'report-impediments':4,'report-nextSteps':4};
    const sectorValues=(department,current='')=>A?A.names('Setores',current,A.find('Departamentos',department)?.id||'missing'):O[department]||[];
    const button=(label,action,index='')=>`<button type="button" class="button button--secondary button--small" data-mvp-action="${action}" data-index="${index}">${label}</button>`;
    function selectOptions(values,value,catalog) {
      const all=[...values];if(value&&!all.includes(value))all.push(value);
      return `<option value="">Selecione</option>${all.map(v=>`<option value="${e(v)}" ${v===value?'selected':''}>${e(v)}${catalog&&A?.find(catalog,v)?.active===false?' (inativo)':catalog&&A&&!A.find(catalog,v)||!values.includes(v)?' (legado)':''}</option>`).join('')}`;
    }
    function field(label,key,type='text',values=[],value) {
      value=value??(key.startsWith('c.')?item.mvp.classification[key.slice(2)]:item[key])??'';
      const id=`mvp-${key.replace('.','-')}`;
      if(type==='select'&&A&&catalogs[key])values=key==='sector'?sectorValues(item.department,value):A.names(catalogs[key],value);
      const width=widths[key]||(key.startsWith('c.')?(key==='c.hst'?4:['criticality','complexity','importance','necessity','impact','legal','deadline','budget'].includes(key.slice(2))?3:4):6);
      return `<div class="field span-2 mvp-col-${width}"><label for="${id}">${e(label)}</label>${type==='select'?`<select id="${id}" name="${key}">${selectOptions(values,value,catalogs[key])}</select>${key==='administrativeStatus'?`<div id="mvp-admin-status-preview">${A.statusBadge(value)}</div>`:''}`:type==='textarea'?`<textarea id="${id}" name="${key}" rows="${key.startsWith('report-')?5:3}">${e(value)}</textarea>`:`<input id="${id}" name="${key}" type="${type}" value="${e(value)}" ${type==='number'?`min="0" step="any" ${key==='progress'?'max="100"':''}`:''} ${key==='title'?'required':''}>`}</div>`;
    }
    const card=(title,body)=>`<section class="form-card"><h2>${title}</h2><div class="form-grid">${body}</div></section>`;
    const upload=origin=>`<div class="field span-4"><label for="mvp-upload-${origin}">${origin==='attachment'?'Anexos':'Selecionar documentos'}</label><input id="mvp-upload-${origin}" data-mvp-upload="${origin}" type="file" multiple><p>São salvos somente os metadados. Visualização e download do conteúdo ficam disponíveis durante esta sessão de edição.</p></div><div class="span-4" data-mvp-files="${origin}"></div>`;
    const memberButton=`<div class="mvp-col-1 mvp-add-field"><button type="button" class="button mvp-add" data-mvp-action="member-save" title="Adicionar integrante" aria-label="Adicionar integrante">+</button></div>`;
    root.innerHTML=`<div class="page mvp-editor">${api.header(source?.id?item.title:'Nova Iniciativa','Preencha as abas e salve o cadastro completo.')}<div class="tabs" role="tablist" aria-label="Cadastro da iniciativa">${tabs.map(({label,index},position)=>`<button type="button" id="mvp-tab-${index}" class="tab ${position===0?'active':''}" role="tab" aria-selected="${position===0}" aria-controls="mvp-panel-${index}" tabindex="${position===0?0:-1}" data-mvp-tab="${index}">${label}</button>`).join('')}</div><form id="mvp-initiative-form" novalidate>
      ${source?.id?`<div id="mvp-panel-5" role="tabpanel" aria-labelledby="mvp-tab-5">${api.overview?api.overview(item):''}</div>`:''}
      <div id="mvp-panel-0" role="tabpanel" aria-labelledby="mvp-tab-0" ${source?.id?'hidden':''}>
      ${card('Dados da Iniciativa',field('Nome da Iniciativa *','title')+field('Data de início','start','date')+field('Previsão de término','end','date')+field('Tipo de Iniciativa','initiativeType','select',O['Tipos de Iniciativas'])+field('Departamento','department','select',departments)+field('Setor','sector','select',sectorValues(item.department))+field('Solicitante','requester')+field('Patrocinador','sponsor')+field('Nº do SEI','sei')+field('Escopo Principal','scope','textarea')+field('Objetivo/Descrição da Iniciativa','description','textarea')+field('Benefício Esperado','benefits','textarea')+field('Observações Extras','notes','textarea'))}
      ${card('Administração da Iniciativa',field('Status da Iniciativa','administrativeStatus','select',O['Status Administrativo da Iniciativa'])+field('% de Conclusão','progress','number',[],item.progress??0)+`<div class="field mvp-col-6 mvp-progress-field"><label for="mvp-progress">Progresso</label><div><progress id="mvp-progress" max="100" value="${Math.max(0,Math.min(100,Number(item.progress)||0))}"></progress> <output id="mvp-progress-label">${Number(item.progress)||0}%</output></div></div><div class="field mvp-col-6"><label id="mvp-areas-label">Áreas Envolvidas</label><details id="mvp-area-picker" class="mvp-picker"><summary aria-labelledby="mvp-areas-label"><span id="mvp-area-list">Selecionar áreas</span><span aria-hidden="true">⌄</span></summary><div id="mvp-area-options" class="mvp-picker-options"></div></details><div id="mvp-area-chips" class="mvp-chips"></div></div><div class="field mvp-col-6"><label for="mvp-party">Partes Interessadas</label><div class="mvp-inline"><input id="mvp-party" type="text">${button('Adicionar','party-add')}</div><div id="mvp-parties" class="mvp-chips"></div></div>`)}
      ${card('Anexos da Iniciativa',upload('attachment'))}</div>
      <div id="mvp-panel-1" role="tabpanel" aria-labelledby="mvp-tab-1" hidden>
      ${card('Classificação da Iniciativa',field('Classificação DITIC','c.ditic','select',O['Classificação DITIC'])+field('Iniciativa Estratégica','c.strategic','select',['SIM','NÃO'],item.mvp.classification.strategic??(source?.id?(item.strategic?'SIM':'NÃO'):''))+field('Eixo','c.axis','select',O.Eixo)+field('Biênio — PDTIC','c.biennium','select',O['Biênio — PDTIC'])+field('Ciclo','c.cycle','select',O.Ciclo)+field('ENTICJUD','c.enticjud','select',O.ENTICJUD)+field('Gerente de Projeto','manager','select',api.managers)+field('Responsável','c.owner')+field('Objetivo Estratégico','c.objective','select',O['Objetivo Estratégico']))}
      ${card('Priorização da Iniciativa',['Criticidade','Complexidade','Importância para o TJRS','Necessidade','Impacto no PE','Determinação Legal','Prazo','Orçamento'].map((label,i)=>field(label,`c.${['criticality','complexity','importance','necessity','impact','legal','deadline','budget'][i]}`,'select',O[label])).join(''))}
      ${card('Estimativa de Horas',field('Estimativa HST (horas)','c.hst','number'))}<p>Pesos e cálculo de priorização aguardam definição. A estimativa é independente das horas da equipe.</p></div>
      <div id="mvp-panel-2" role="tabpanel" aria-labelledby="mvp-tab-2" hidden>${card('Equipe',field('Nome','member-name')+field('Papel','member-role')+field('HST (horas)','member-hst','number')+memberButton)}<div id="mvp-members"></div></div>
      <div id="mvp-panel-3" role="tabpanel" aria-labelledby="mvp-tab-3" hidden>${card('Documentos',upload('document'))}</div>
      <div id="mvp-panel-4" role="tabpanel" aria-labelledby="mvp-tab-4" hidden>${card('Status Report',field('Tipo de Relatório','report-type','select',O['Status Report — Tipo de Relatório'])+field('Data do Relatório','report-date','date')+field('Status da Iniciativa','report-status','select',O['Status Report — Situação da Iniciativa'])+field('Responsável pelo Relatório','report-owner','select',api.managers)+field('Realizações','report-achievements','textarea')+field('Impedimentos','report-impediments','textarea')+field('Próximas Atividades','report-nextSteps','textarea')+`<div class="span-4"><button type="button" class="button" data-mvp-action="report-save">Adicionar Status Report</button></div>`)}<div id="mvp-reports"></div></div>
      <footer class="form-footer"><span id="mvp-dirty" role="status">Nenhuma alteração pendente.</span><div class="form-footer__actions"><a class="button button--secondary" href="#/initiatives">Voltar ao portfólio</a><button class="button" type="submit">Salvar iniciativa</button></div></footer></form></div>`;
    const form=root.querySelector('form');
    const input=key=>form.elements.namedItem(key);
    const value=key=>input(key).value.trim();
    function mark(){dirty=true;root.querySelector('#mvp-dirty').textContent='Alterações não salvas — salve a iniciativa para confirmar todas as abas.';}
    function activate(index,focus=false){root.querySelectorAll('[data-mvp-tab]').forEach(b=>{const i=Number(b.dataset.mvpTab);b.classList.toggle('active',i===index);b.setAttribute('aria-selected',String(i===index));b.tabIndex=i===index?0:-1;root.querySelector(`#mvp-panel-${i}`).hidden=i!==index;if(i===index&&focus)b.focus();});}
    function fail(message,control){api.toast('Revise os campos',message,'danger');if(control){control.setAttribute('aria-invalid','true');const panel=control.closest('[role="tabpanel"]');activate(Number(panel.id.split('-').pop()));control.focus();}return false;}
    const validNumber=key=>{const el=input(key);return !el.validity.badInput&&(el.value===''||(Number.isFinite(Number(el.value))&&Number(el.value)>=0&&(key!=='progress'||Number(el.value)<=100)));};
    function table(headers,rows){return `<div class="table-wrap"><table class="data-table"><thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.join('')||`<tr><td colspan="${headers.length}">Nenhum registro cadastrado.</td></tr>`}</tbody></table></div>`;}
    function lists(){
      root.querySelector('#mvp-area-list').textContent=item.mvp.areas.length?item.mvp.areas.slice(0,2).join(', ')+(item.mvp.areas.length>2?` +${item.mvp.areas.length-2}`:''):'Selecionar áreas';
      root.querySelector('#mvp-area-options').innerHTML=(A?A.names('Áreas Envolvidas'):O['Áreas Envolvidas']).map(v=>`<label><input type="checkbox" data-mvp-area="${e(v)}" ${item.mvp.areas.includes(v)?'checked':''}>${e(v)}</label>`).join('')+item.mvp.areas.filter(v=>A&&!A.list('Áreas Envolvidas',{active:true}).some(r=>r.name===v)).map(v=>button(`${e(v)} (inativo / legado) ×`,'area-remove',item.mvp.areas.indexOf(v))).join('');
      root.querySelector('#mvp-area-chips').innerHTML=item.mvp.areas.slice(0,2).map((v,i)=>button(`${e(v)} ×`,'area-remove',i)).join('')+(item.mvp.areas.length>2?`<span class="filter-chip">+${item.mvp.areas.length-2} — abra para ver todos</span>`:'');
      root.querySelector('#mvp-parties').innerHTML=item.mvp.stakeholders.map((v,i)=>button(`${e(v)} ×`,'party-remove',i)).join('');
      root.querySelector('#mvp-members').innerHTML=table(['Nome','Papel','HST','Ações'],item.mvp.members.map((m,i)=>`<tr><td>${e(m.name)}</td><td>${e(m.role||'')}</td><td>${e(m.hst??'')} horas</td><td>${button('Editar','member-edit',i)} ${button('Excluir','member-remove',i)}</td></tr>`));
      root.querySelectorAll('[data-mvp-files]').forEach(container=>{const attachments=container.dataset.mvpFiles==='attachment';container.innerHTML=table(['Documento','Tipo','Tamanho','Data de Inclusão','Ações'],item.files.map((f,i)=>({f,i})).filter(({f})=>!attachments||f.origin==='attachment').map(({f,i})=>`<tr><td>${e(f.name)}</td><td>${e(f.extension||f.name.split('.').pop()||'—')}</td><td>${f.size!==undefined?e((Number(f.size)/1024).toFixed(1))+' KB':'Não informado'}</td><td>${e(dateLabel(f.date))}</td><td>${button('Visualizar','file-view',i)} ${button('Baixar','file-download',i)} ${button('Excluir','file-remove',i)} ${!blobs.has(f.id)?'<small>Conteúdo indisponível nesta sessão</small>':''}</td></tr>`));});
      root.querySelector('#mvp-reports').innerHTML=table(['Data','Tipo','Status','Responsável','Ações'],item.statusReports.map((r,i)=>({r,i})).sort((a,b)=>String(b.r.date).localeCompare(String(a.r.date))).map(({r,i})=>`<tr><td>${e(dateLabel(r.date))}</td><td>${e(r.type||'Não informado')}</td><td>${e(r.monitoringStatus||'Não informado')}</td><td>${e(r.owner||'Não informado')}</td><td>${button('Visualizar','report-view',i)} ${button('Editar','report-edit',i)} ${button('Excluir','report-remove',i)}</td></tr>`));
    }
    function updateButtons(){const member=root.querySelector('[data-mvp-action="member-save"]'),report=root.querySelector('[data-mvp-action="report-save"]');if(member){member.textContent=memberIndex===null?'+':'✓';member.title=memberIndex===null?'Adicionar integrante':'Salvar integrante';member.setAttribute('aria-label',member.title);}if(report)report.textContent=reportIndex===null?'Adicionar Status Report':'Salvar alterações do Status Report';}
    function resetEditor(prefix){
      if(prefix==='member')['name','role','hst'].forEach(key=>input(`member-${key}`).value='');
      if(prefix==='report')['type','date','status','owner','achievements','impediments','nextSteps'].forEach(key=>{const el=input(`report-${key}`);if(A&&el.tagName==='SELECT')el.innerHTML=selectOptions(A.names(catalogs[`report-${key}`]),'',catalogs[`report-${key}`]);el.value='';});
      updateButtons();
    }
    form.addEventListener('input',event=>{mark();event.target.setAttribute('aria-invalid','false');if(event.target.name==='progress'){const n=Number(event.target.value);root.querySelector('#mvp-progress').value=Math.max(0,Math.min(100,n||0));root.querySelector('#mvp-progress-label').textContent=`${event.target.value||0}%`;}});
    form.addEventListener('change',event=>{
      mark();const el=event.target;
      if(el.name==='administrativeStatus')root.querySelector('#mvp-admin-status-preview').innerHTML=A.statusBadge(el.value);
      if(el.name==='department'){const sector=input('sector'),values=sectorValues(el.value);sector.innerHTML=selectOptions(values,values.includes(sector.value)?sector.value:'');}
      if(el.dataset.mvpArea!==undefined){const v=el.dataset.mvpArea;item.mvp.areas=el.checked?[...new Set([...item.mvp.areas,v])]:item.mvp.areas.filter(a=>a!==v);lists();[...root.querySelectorAll('[data-mvp-area]')].find(node=>node.dataset.mvpArea===v)?.focus();}
      if(el.dataset.mvpUpload){for(const file of el.files){const existing=item.files.find(f=>f.name===file.name&&(f.size===undefined||f.size===file.size));const id=existing?.id||`FILE-${Date.now()}-${Math.random().toString(36).slice(2)}`;if(existing){existing.id=id;blobs.set(id,file);continue;}item.files.push({id,name:file.name,size:file.size,mime:file.type,extension:file.name.split('.').pop(),date:api.today(),origin:el.dataset.mvpUpload,category:el.dataset.mvpUpload==='attachment'?'Anexo':'Documento',owner:item.manager||'',tags:[]});blobs.set(id,file);}el.value='';lists();}
    });
    root.addEventListener('keydown',event=>{const tab=event.target.closest('[data-mvp-tab]');if(tab&&['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){event.preventDefault();const n=tabs.findIndex(t=>t.index===Number(tab.dataset.mvpTab));activate(tabs[event.key==='Home'?0:event.key==='End'?tabs.length-1:(n+(event.key==='ArrowRight'?1:tabs.length-1))%tabs.length].index,true);}if(event.key==='Escape'){root.querySelector('#mvp-area-picker').open=false;}if(event.target.id==='mvp-party'&&event.key==='Enter'){event.preventDefault();root.querySelector('[data-mvp-action="party-add"]').click();}}, {signal});
    root.addEventListener('click',event=>{
      if(!event.target.closest('#mvp-area-picker'))root.querySelector('#mvp-area-picker').open=false;
      const tab=event.target.closest('[data-mvp-tab]');if(tab){activate(Number(tab.dataset.mvpTab));return;}
      const b=event.target.closest('[data-mvp-action]');if(!b)return;
      const action=b.dataset.mvpAction,i=Number(b.dataset.index);
      if(action==='area-remove')item.mvp.areas.splice(i,1);
      if(action==='party-add'){const name=root.querySelector('#mvp-party').value.trim();if(!name)return;if(!item.mvp.stakeholders.includes(name))item.mvp.stakeholders.push(name);root.querySelector('#mvp-party').value='';}
      if(action==='party-remove')item.mvp.stakeholders.splice(i,1);
      if(action==='member-save'){
        if(!value('member-name'))return fail('Informe o nome do integrante.',input('member-name'));
        if(!validNumber('member-hst'))return fail('HST deve ser um número não negativo.',input('member-hst'));
        const m={...(memberIndex===null?{}:item.mvp.members[memberIndex]),name:value('member-name'),role:value('member-role'),hst:value('member-hst')===''?'':Number(value('member-hst'))};
        if(item.mvp.members.some((v,index)=>index!==memberIndex&&String(v.name||'').trim().toLocaleLowerCase('pt-BR')===m.name.toLocaleLowerCase('pt-BR')&&String(v.role||'').trim().toLocaleLowerCase('pt-BR')===m.role.toLocaleLowerCase('pt-BR')))return fail('Este integrante e papel já foram adicionados.',input('member-name'));
        if(memberIndex===null)item.mvp.members.push(m);else item.mvp.members[memberIndex]=m;memberIndex=null;resetEditor('member');
      }
      if(action==='member-edit'){memberIndex=i;['name','role','hst'].forEach(k=>input(`member-${k}`).value=item.mvp.members[i][k]??'');updateButtons();input('member-name').focus();return;}
            if(action==='member-remove'){api.confirm('Excluir integrante?',()=>{item.mvp.members.splice(i,1);memberIndex=null;resetEditor('member');mark();lists();});return;}
      if(action==='file-remove'){api.confirm('Excluir documento?',()=>{blobs.delete(item.files[i].id);item.files.splice(i,1);mark();lists();});return;}
      if(action==='file-view'||action==='file-download'){
        const f=item.files[i],blob=blobs.get(f.id);if(!blob)return api.toast('Conteúdo indisponível','Somente os metadados foram preservados. Selecione o arquivo novamente em uma futura inclusão.','warning');
        if(action==='file-view'&&!/^(image\/(png|jpeg|gif|webp)|application\/pdf)$/.test(blob.type))return api.toast('Prévia indisponível','Baixe este formato para abri-lo no aplicativo apropriado.','warning');
        const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;if(action==='file-download')a.download=f.name;else{a.target='_blank';a.rel='noopener';}a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);return;
      }
      if(action==='report-save'){
        if(!value('report-type')||!value('report-date')||!value('report-status')||!value('report-owner'))return fail('Informe tipo, data, situação e responsável pelo relatório.',input('report-type'));
        if(input('report-date').validity.valid===false)return fail('Informe uma data válida.',input('report-date'));
        const r={...(reportIndex===null?{}:item.statusReports[reportIndex]),type:value('report-type'),date:value('report-date'),monitoringStatus:value('report-status'),owner:value('report-owner'),achievements:value('report-achievements'),impediments:value('report-impediments'),nextSteps:value('report-nextSteps')};
        if(reportIndex===null)item.statusReports.push(r);else item.statusReports[reportIndex]=r;reportIndex=null;resetEditor('report');
      }
      if(action==='report-edit'){reportIndex=i;const r=item.statusReports[i];const fields={type:r.type,date:r.date,status:r.monitoringStatus,owner:r.owner,achievements:r.achievements||r.summary,impediments:r.impediments,nextSteps:r.nextSteps};Object.entries(fields).forEach(([k,v])=>{const el=input(`report-${k}`);if(el.tagName==='SELECT')el.innerHTML=selectOptions(A?A.names(catalogs['report-'+k],v||''):k==='type'?O['Status Report — Tipo de Relatório']:k==='status'?O['Status Report — Situação da Iniciativa']:api.managers,v||'',catalogs['report-'+k]);el.value=v||'';});updateButtons();input('report-type').focus();return;}
            if(action==='report-remove'){api.confirm('Excluir Status Report?',()=>{item.statusReports.splice(i,1);reportIndex=null;resetEditor('report');mark();lists();});return;}
      if(action==='report-view'||action==='saved-report-view'){const r=action==='saved-report-view'?normalize(source).statusReports[i]:item.statusReports[i];if(!r)return;api.view('Status Report',`<p>${e(dateLabel(r.date))} · ${e(r.type||'')} · ${e(r.monitoringStatus||'')} · ${e(r.owner||'')}</p>${[['Realizações',r.achievements||r.summary],['Impedimentos',r.impediments],['Próximas Atividades',r.nextSteps]].map(([label,text])=>`<h3>${label}</h3><p class="mvp-report-text">${e(text||'Não informado')}</p>`).join('')}`);return;}
      updateButtons();mark();lists();
    }, {signal});
    form.addEventListener('submit',event=>{
      event.preventDefault();if(saved)return;
      if(!value('title'))return fail('Informe o nome da iniciativa.',input('title'));
      for(const key of ['start','end'])if(input(key).validity?.badInput||(value(key)&&!validCalendarDate(value(key))))return fail('Informe uma data válida.',input(key));
      if(value('start')&&value('end')&&value('end')<value('start'))return fail('A previsão de término deve ser igual ou posterior à data de início.',input('end'));
      if(root.querySelector('#mvp-party').value.trim())return fail('Adicione a parte interessada à lista antes de salvar.',root.querySelector('#mvp-party'));
      for(const key of ['progress','c.hst'])if(!validNumber(key))return fail(key==='progress'?'Conclusão deve estar entre 0 e 100.':'Estimativa HST deve ser não negativa.',input(key));
      if(value('member-name')||value('member-role')||value('member-hst')||memberIndex!==null)return fail('Salve o integrante pelo botão ao lado dos campos antes de salvar a iniciativa.',input('member-name'));
      if(['type','date','status','owner','achievements','impediments','nextSteps'].some(k=>value(`report-${k}`))||reportIndex!==null)return fail('Salve o Status Report pelo botão da aba antes de salvar a iniciativa.',input('report-type'));
      for(const [key,v] of new FormData(form)){if(key.startsWith('member-')||key.startsWith('report-'))continue;if(key.startsWith('c.'))item.mvp.classification[key.slice(2)]=key==='c.hst'&&v!==''?Number(v):v;else item[key]=key==='progress'?Number(v):v.trim();}
      if(item.sector&&!sectorValues(item.department,initialDepartment===item.department&&initialSector===item.sector?item.sector:'').includes(item.sector))return fail('Selecione um setor do departamento escolhido.',input('sector'));
      if(item.administrativeStatus)item.status=lifecycle[item.administrativeStatus]||item.administrativeStatus;
      if(item.mvp.classification.strategic){const row=A?.find('Iniciativa Estratégica',item.mvp.classification.strategic),values=[item.mvp.classification.strategic,...(row?.aliases||[])];if(values.includes('SIM'))item.strategic=true;else if(values.includes('NÃO'))item.strategic=false;}
      if(O.Criticidade.includes(item.mvp.classification.criticality)){const labels={'BAIXA':'Baixa','MÉDIA':'Média','ALTA':'Alta'};item.criticality=labels[item.mvp.classification.criticality];}
      const submit=form.querySelector('[type="submit"]');submit.disabled=true;
      item.demoCompletionVersion=1;
      if(api.save(A?A.bindRecord(item):item)){dirty=false;saved=true;}else submit.disabled=false;
    });
    lists();activate(source?.id?5:0);
    return {isDirty:()=>dirty&&!saved};
  }
}());
