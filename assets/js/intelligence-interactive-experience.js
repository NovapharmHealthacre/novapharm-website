(() => {
  'use strict';
  // Explicit demonstration values, not government health observations.
  const examples = [
    ['North East',78.4],['North West',69.2],['Yorkshire and The Humber',61.8],['West Midlands',54.6],
    ['East Midlands',51.3],['East of England',43.6],['London',39.2],['South East',31.5],['South West',24.7]
  ];
  const labels = ['Jul 2025','Aug 2025','Sep 2025','Oct 2025','Nov 2025','Dec 2025','Jan 2026','Feb 2026','Mar 2026','Apr 2026','May 2026','Jun 2026'];
  const byName = Object.fromEntries(examples);
  let selected='North East', compared='South West', period=11, tab='geography';
  const $ = id => document.getElementById(id);
  // Synthetic historical progression; only the final period equals the illustrated values from the supplied screenshot.
  const rate = (name,i) => {
    const base=byName[name];
    const position=i/11;
    const seasonal = Math.sin((i+examples.findIndex(x=>x[0]===name))*.8)*.012*(1-position);
    return Math.round((base*(.77+.23*position+seasonal))*10)/10;
  };
  const regionButtons = $('regionButtons');
  const comparison = $('comparisonRegion');
  examples.forEach(([name])=>{
    const button=document.createElement('button');button.type='button';button.dataset.region=name;button.setAttribute('aria-pressed','false');
    const label=document.createElement('span');label.textContent=name==='Yorkshire and The Humber'?'Yorkshire':name;
    const value=document.createElement('span');value.className='region-rate';button.append(label,value);
    button.addEventListener('click',()=>selectRegion(name));regionButtons.append(button);
    const option=document.createElement('option');option.value=name;option.textContent=name;comparison.append(option);
  });
  comparison.value=compared;
  comparison.addEventListener('change',()=>{compared=comparison.value;update();});
  const tabs=[...document.querySelectorAll('[data-tab]')];
  function setTab(name,focus=false){
    tab=name;tabs.forEach(btn=>{const active=btn.dataset.tab===name;btn.setAttribute('aria-selected',String(active));btn.tabIndex=active?0:-1; if(active&&focus)btn.focus();});
    ['geography','trends','evidence'].forEach(key=>{$('panel-'+key).hidden=key!==name;});
    if(name==='trends')drawChart();
  }
  tabs.forEach((btn,index)=>{
    btn.addEventListener('click',()=>setTab(btn.dataset.tab));
    btn.addEventListener('keydown',event=>{if(!['ArrowRight','ArrowLeft','Home','End'].includes(event.key))return;event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?tabs.length-1:(index+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;setTab(tabs[next].dataset.tab,true);});
  });
  function selectRegion(name){selected=name;if(selected===compared){compared=examples.find(x=>x[0]!==name)[0];comparison.value=compared;}update();}
  const shades=['#dbe8f9','#c2d7f2','#9abde9','#6d9bd5','#386fb2','#064b91'];
  function shade(value){return shades[Math.max(0,Math.min(shades.length-1,Math.floor(value/18)))];}
  const svgNS='http://www.w3.org/2000/svg';
  const make=(tag,attrs={})=>{const el=document.createElementNS(svgNS,tag);Object.entries(attrs).forEach(([k,v])=>el.setAttribute(k,String(v)));return el;};
  const fallbackPolygons=[
    ['North East','M276 35 L326 66 347 115 338 166 301 176 278 139 265 99Z'],
    ['North West','M239 109 L265 99 278 139 301 176 275 225 238 218 211 174Z'],
    ['Yorkshire and The Humber','M301 176 L340 161 370 211 351 266 302 259 275 225Z'],
    ['East Midlands','M302 259 L351 266 371 321 340 360 289 344 276 299Z'],
    ['West Midlands','M238 218 L275 225 302 259 276 299 289 344 244 358 212 310Z'],
    ['East of England','M371 321 L409 326 427 383 405 429 358 414 340 360Z'],
    ['London','M342 407 L358 414 376 435 349 448 331 430Z'],
    ['South East','M289 344 L340 360 342 407 331 430 349 448 311 480 249 465 249 423Z'],
    ['South West','M244 358 L289 344 249 423 249 465 196 475 163 496 109 494 76 519 47 513 64 491 123 456 162 429 195 389Z']
  ];
  function buildFallback(){
    const svg=make('svg',{viewBox:'0 0 475 550',role:'img','aria-label':'Illustrative schematic placement of England regions; not surveyed boundary shapes'});
    fallbackPolygons.forEach(([name,d])=>{
      const path=make('path',{d,'data-region':name,tabindex:0,role:'button','aria-label':'Select '+name});path.append(make('title'));path.querySelector('title').textContent=name+' · schematic geography';
      path.addEventListener('click',()=>selectRegion(name));path.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();selectRegion(name);}});svg.append(path);
    });$('mapMount').replaceChildren(svg);$('mapStatus').textContent='Schematic fallback only. Prescribing colours and figures are simulated.';colourMap();
  }
  function buildFromGeometry(featureCollection){
    const features=(featureCollection.features||[]).filter(f=>f.geometry&&['Polygon','MultiPolygon'].includes(f.geometry.type));
    if(features.length!==9)throw Error('Expected nine ONS English regions');
    const getRegion=f=>Object.entries(f.properties||{}).find(([key,val])=>typeof val==='string'&&/RGN.*NM|NAME/i.test(key))?.[1];
    const matching=features.map(f=>({feature:f,name:getRegion(f)}));
    const resolve=name=>name&&name.toLowerCase().includes('yorkshire')?'Yorkshire and The Humber':examples.find(x=>x[0].toLowerCase()===String(name).toLowerCase())?.[0];
    if(matching.some(item=>!resolve(item.name)))throw Error('Unknown ONS region name');
    const pts=[];const recurse=p=>{if(!Array.isArray(p))return;if(p.length===2&&Number.isFinite(p[0])&&Number.isFinite(p[1])){pts.push(p);return;}p.forEach(recurse);};features.forEach(f=>recurse(f.geometry.coordinates));
    if(pts.length<100)throw Error('Invalid region geometry');
    const cosine=Math.cos(52*Math.PI/180),left=Math.min(...pts.map(p=>p[0]*cosine)),right=Math.max(...pts.map(p=>p[0]*cosine)),bottom=Math.min(...pts.map(p=>p[1])),top=Math.max(...pts.map(p=>p[1]));
    const w=475,h=550,pad=24,s=Math.min((w-pad*2)/(right-left),(h-pad*2)/(top-bottom)),ox=(w-(right-left)*s)/2,oy=(h-(top-bottom)*s)/2;
    const coord=([lon,lat])=>[(lon*cosine-left)*s+ox,(top-lat)*s+oy];
    const ring=r=>r.map((p,i)=>{const [x,y]=coord(p);return(i?'L':'M')+x.toFixed(1)+' '+y.toFixed(1);}).join(' ')+'Z';
    const polygon=p=>p.map(ring).join(' ');
    const svg=make('svg',{viewBox:`0 0 ${w} ${h}`,role:'img','aria-label':'Interactive ONS December 2025 regional boundaries of England with simulated examples'});
    matching.forEach(({feature,name})=>{const region=resolve(name);const shapes=feature.geometry.type==='Polygon'?[feature.geometry.coordinates]:feature.geometry.coordinates;
      const path=make('path',{d:shapes.map(polygon).join(' '),'fill-rule':'evenodd','data-region':region,role:'button',tabindex:0,'aria-label':'Select '+region});const title=make('title');title.textContent=region+' · simulated rate';path.append(title);
      path.addEventListener('click',()=>selectRegion(region));path.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();selectRegion(region);}});svg.append(path);
    });$('mapMount').replaceChildren(svg);$('mapStatus').textContent='ONS December 2025 region geometry. Shading and all prescribing figures are simulated.';colourMap();
  }
  function colourMap(){document.querySelectorAll('#mapMount path[data-region]').forEach(path=>{const name=path.dataset.region;path.setAttribute('fill',shade(rate(name,period)));path.dataset.selected=String(name===selected);});}
  // Public ONS regional geometry; no identity or application data is transmitted.
  const endpoint='https://services1.arcgis.com/ESMARspQHYMw9BZ9/arcgis/rest/services/Regions_December_2025_Boundaries_EN_BSC/FeatureServer/0/query';
  const params=new URLSearchParams({where:'1=1',outFields:'*',outSR:'4326',returnGeometry:'true',f:'geojson'});
  buildFallback();
  if(typeof fetch==='function'){
    const controller=typeof AbortController==='function'?new AbortController():null;
    const timer=controller?setTimeout(()=>controller.abort(),7000):null;
    fetch(endpoint+'?'+params,{mode:'cors',credentials:'omit',cache:'force-cache',...(controller?{signal:controller.signal}:{})})
      .then(r=>{if(!r.ok)throw Error('ONS geometry unavailable');return r.json();}).then(buildFromGeometry).catch(()=>{/* Keep functional schematic fallback */}).finally(()=>{if(timer!==null)clearTimeout(timer);});
  }
  function drawChart(){
    const svg=$('trendChart');svg.replaceChildren();
    const W=960,H=380,L=58,R=18,T=18,B=56;const x=i=>L+(W-L-R)*(i/11), y=v=>H-B-(H-T-B)*v/100;
    for(const val of [0,25,50,75,100]){const yy=y(val);svg.append(make('line',{x1:L,y1:yy,x2:W-R,y2:yy,stroke:'#e4e8ed','stroke-width':1}));const text=make('text',{x:L-14,y:yy+5,'text-anchor':'end',fill:'#92929a','font-size':14});text.textContent=val;svg.append(text);}
    [0,3,6,9,11].forEach(i=>{const text=make('text',{x:x(i),y:H-22,'text-anchor':i===0?'start':i===11?'end':'middle',fill:'#92929a','font-size':14});text.textContent=labels[i].replace(' 20',' ’');svg.append(text);});
    const cursor=make('line',{x1:x(period),x2:x(period),y1:T,y2:H-B,stroke:'#a8a8b0','stroke-dasharray':'5 6','stroke-width':1.5});svg.append(cursor);
    [[selected,'#073f84'],[compared,'#7e9fca']].forEach(([name,color])=>{const values=labels.map((_,i)=>rate(name,i));const d=values.map((v,i)=>(i?'L':'M')+x(i).toFixed(1)+' '+y(v).toFixed(1)).join(' ');svg.append(make('path',{d,fill:'none',stroke:color,'stroke-width':3.5,'stroke-linecap':'round','stroke-linejoin':'round'}));svg.append(make('circle',{cx:x(period),cy:y(values[period]),r:6.5,fill:color,stroke:'#fff','stroke-width':2.8}));});
    $('legendFirst').textContent=selected;$('legendSecond').textContent=compared;
  }
  function update(){
    const current=rate(selected,period),other=rate(compared,period),high=Math.max(...examples.map(([n])=>rate(n,period)));
    $('selectedRegion').textContent=selected;
    $('selectedValue').textContent=current.toFixed(1);
    const allMean=examples.reduce((a,[n])=>a+rate(n,period),0)/examples.length;
    $('comparedMean').textContent=current>=allMean?'Above example mean':'Below example mean';
    $('regionIndex').textContent=Math.round(100*current/high)+' / 100';
    $('currentPeriod').textContent=labels[period];$('periodTag').textContent=labels[period]+' · sample';$('periodLabel').textContent=labels[period];
    regionButtons.querySelectorAll('button').forEach(button=>{const name=button.dataset.region;button.setAttribute('aria-pressed',String(name===selected));button.querySelector('.region-rate').textContent=rate(name,period).toFixed(1);});
    $('trendSelected').textContent=current.toFixed(1);$('trendCompared').textContent=other.toFixed(1);$('trendDifference').textContent=Math.abs(current-other).toFixed(1);
    $('chartDescription').textContent='Synthetic example values for '+selected+' and '+compared+', July 2025 through June 2026. Sample period '+labels[period]+'.';
    colourMap();if(tab==='trends')drawChart();
  }
  $('samplePeriod').addEventListener('input',e=>{period=Number(e.target.value);update();});
  $('resetView').addEventListener('click',()=>{selected='North East';compared='South West';comparison.value=compared;period=11;$('samplePeriod').value='11';setTab('geography');update();});
  setTab('geography');update();
})();