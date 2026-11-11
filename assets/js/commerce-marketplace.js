(() => {
  'use strict';
  const root=document.querySelector('[data-commerce-marketplace]');
  if(!root)return;
  const search=root.querySelector('#mp-search'),brand=root.querySelector('#mp-brand'),category=root.querySelector('#mp-category');
  const sort=root.querySelector('#mp-sort'),grid=root.querySelector('#mp-grid'),counter=root.querySelector('#mp-count');
  const more=root.querySelector('#mp-more'),compareArea=root.querySelector('#mp-compare'),compareContent=root.querySelector('#mp-compare-content');
  let products=[],displayed=24;const selected=new Set();
  const stockApi='https://eyoj5e64zb.execute-api.eu-north-1.amazonaws.com';
  const stockCache=new Map(),pendingSkus=new Set();
  const stockLabel=sku=>{
    const item=stockCache.get(sku);
    if(!item)return stockCache.has(sku)?'Warehouse availability: confirm with seller':'Checking owner-confirmed warehouse stock…';
    if(item.stockEvidence==='owner_confirmed_not_independently_audited' &&
        Number.isSafeInteger(item.ownerConfirmedRemainingUnits) && item.ownerConfirmedRemainingUnits>=0)
      return 'Owner-confirmed warehouse stock: '+item.ownerConfirmedRemainingUnits.toLocaleString('en-GB')+' units';
    return 'Warehouse availability: confirm with seller';
  };
  async function loadStock(rows){
    const fresh=rows.filter(p=>!stockCache.has(p.sku)&&!pendingSkus.has(p.sku));
    for(let i=0;i<fresh.length;i+=24){
      const group=fresh.slice(i,i+24),skus=group.map(x=>x.sku);
      skus.forEach(sku=>pendingSkus.add(sku));
      try{
        const url=stockApi+'/stock?skus='+encodeURIComponent(skus.join(','));
        const res=await fetch(url,{credentials:'omit',cache:'no-store',headers:{accept:'application/json'}});
        if(!res.ok)throw new Error('stock unavailable');
        const data=await res.json();
        if(data.schema!=='novapharm-commerce-stock-public-v1'||data.notPaymentAuthority!==true||
            !Array.isArray(data.items)||data.items.length!==skus.length)throw new Error('stock contract changed');
        for(let j=0;j<skus.length;j++){
          const x=data.items[j];
          stockCache.set(skus[j],x&&x.sku===skus[j]&&x.checkoutAuthority===false?x:null);
        }
      }catch(err){skus.forEach(sku=>stockCache.set(sku,null));}
      finally{skus.forEach(sku=>pendingSkus.delete(sku));render();renderCompare();}
    }
  }
  const fold=v=>String(v??'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const element=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=String(text);return e;};
  const money=v=>Number.isSafeInteger(v)&&v>=0?'£'+(v/100).toFixed(2):'Ask for price';
  const offerLabel=p=>p.brand==='Nutraxin'?'View product':'Explore and enquire';
  const valid=p=>p&&typeof p.id==='string'&&typeof p.title==='string'&&['Nutraxin','ESCO'].includes(p.brand)&&p.availabilityQuantity===null&&p.cardCheckoutAuthority===false;
  const visible=()=>{
    const q=fold(search.value);
    const b=brand.value,c=category.value;
    const found=products.filter(p=>(b==='all'||p.brand===b)&&(c==='all'||p.category===c)&&
      (!q||fold([p.title,p.brand,p.sku,p.model,p.category,p.subcategory,p.pack].filter(Boolean).join(' ')).includes(q)));
    found.sort((a,b)=>sort.value==='brand'?(a.brand.localeCompare(b.brand)||a.title.localeCompare(b.title)):a.title.localeCompare(b.title));
    return found;
  };
  function renderCompare(){
    const items=products.filter(p=>selected.has(p.id));
    compareArea.hidden=items.length===0;compareContent.replaceChildren();
    if(!items.length)return;
    const frame=element('div','mp-compare-scroll'),table=element('table');
    const rows=[['Product',p=>p.title],['Brand',p=>p.brand],['Seller',p=>p.seller],['Category',p=>p.category],['SKU',p=>p.sku],['Model',p=>p.model||'Confirm with supplier'],['Pack',p=>p.pack||'Confirm variant'],['Listed price',p=>money(p.priceMinor)],['Price basis',p=>p.priceBasis],['Owner-confirmed stock',p=>stockLabel(p.sku)]];
    for(const [label,get] of rows){
      const tr=element('tr');tr.append(element('th','',label));
      for(const p of items)tr.append(element('td','',get(p)));
      table.append(tr);
    }
    frame.append(table);compareContent.append(frame);
  }
  function card(p){
    const article=element('article','mp-card');
    const media=element('div','mp-card-picture');
    const img=element('img');img.loading='lazy';img.decoding='async';
    if(/^\/assets\/media\/[a-zA-Z0-9/_-]+\.(?:png|avif|webp|svg)$/.test(p.image)){
      img.src=p.image;
      img.alt=p.photoCaption||('Product reference '+p.title);
      img.addEventListener('error',()=>{img.remove();media.append(element('span','mp-image-pending','Image under review'));},{once:true});
      media.append(img);
    }else{
      media.append(element('span','mp-image-pending','Image under review'));
    }
    const copy=element('div','mp-card-copy');
    copy.append(element('div','mp-card-label',p.brand+' / '+p.category));
    copy.append(element('h3','',p.title));
    copy.append(element('p','mp-card-meta',[p.model?'Model '+p.model:null,p.pack,p.sku].filter(Boolean).join(' · ')));
    copy.append(element('p','mp-card-evidence',p.seller+' · '+p.supplier));
    copy.append(element('div','mp-card-price',money(p.priceMinor)));
    copy.append(element('small','mp-card-price-scope',p.priceBasis));
    copy.append(element('small','mp-card-price-scope',stockLabel(p.sku)));
    copy.append(element('small','mp-card-price-scope','Payment and dispatch require product-specific approval'));
    const actions=element('div','mp-card-actions');
    const link=element('a','mp-card-link',offerLabel(p));
    link.href=/^\/products\/(?:nutraxin|esco)\//.test(p.href)?p.href:'/products/';
    actions.append(link);
    const toggle=element('button','mp-compare-toggle',selected.has(p.id)?'Added to compare':'Compare');
    toggle.type='button';toggle.setAttribute('aria-pressed',selected.has(p.id)?'true':'false');
    toggle.addEventListener('click',()=>{
      if(selected.has(p.id))selected.delete(p.id);
      else if(selected.size<3)selected.add(p.id);
      else{counter.textContent='Compare up to three products. Remove an item first.';return;}
      renderCompare();render();
    });
    actions.append(toggle);copy.append(actions);article.append(media,copy);return article;
  }
  function refreshCategories(){
    const prev=category.value;const categories=[...new Set(products.filter(p=>brand.value==='all'||p.brand===brand.value).map(p=>p.category))].sort();
    category.replaceChildren(element('option','','All categories'));category.firstChild.value='all';
    for(const name of categories){const option=element('option','',name);option.value=name;category.append(option);}
    category.value=categories.includes(prev)?prev:'all';
  }
  function render(){
    const found=visible();
    counter.textContent=found.length+' results across the governed catalogue';
    grid.replaceChildren(...found.slice(0,displayed).map(card));
    void loadStock(found.slice(0,displayed));
    more.hidden=found.length<=displayed;
    if(!found.length)grid.append(element('p','mp-card-meta','No products match. Try another search term or select a different collection.'));
  }
  search.addEventListener('input',()=>{displayed=24;render();});
  brand.addEventListener('change',()=>{displayed=24;refreshCategories();render();});
  category.addEventListener('change',()=>{displayed=24;render();});
  sort.addEventListener('change',render);
  more.addEventListener('click',()=>{displayed+=24;render();});
  fetch('/assets/data/commerce-marketplace.json',{credentials:'omit',cache:'no-cache'})
    .then(response=>{if(!response.ok)throw Error('catalogue unavailable');return response.json();})
    .then(data=>{
      if(data.schema!=='novapharm-public-merchant-discovery-v1'||data.sourceProductCount!==392||data.notPaymentAuthority!==true||
          !Array.isArray(data.products)||data.products.length!==392||!data.products.every(valid))
        throw Error('catalogue integrity mismatch');
      products=data.products;refreshCategories();render();
    })
    .catch(()=>{counter.textContent='Search is temporarily unavailable. You can continue to the Nutraxin and ESCO collections below.';more.hidden=true;});
})();
