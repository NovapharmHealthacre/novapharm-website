// Filter only approved public catalogue cards; prices and availability remain server-authoritative.
const normalize = value => String(value ?? "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("en-GB").replace(/\s+/g," ").trim();
export function matchesCollectionProduct(description, query) {
  const words = normalize(query).split(" ").filter(Boolean);
  const haystack = normalize(description);
  return words.every(word => haystack.includes(word));
}
function initialize() {
  const input=document.querySelector("[data-npr-collection-query]");
  const status=document.querySelector("[data-npr-collection-status]");
  const empty=document.querySelector("[data-npr-collection-empty]");
  const sections=[...document.querySelectorAll("[data-npr-collection-section]")];
  if(!input || !status || !sections.length) return;
  const groups=sections.map(section=>({
    section,
    cards:[...section.querySelectorAll(".npr-card")].map(card=>({
      card,
      // Product title, manufacturer, pack and category are static allowlisted data.
      description:card.querySelector(".npr-card-copy")?.textContent || ""
    }))
  }));
  const total=groups.reduce((count,group)=>count+group.cards.length,0);
  function update(){
    let visible=0;
    for(const group of groups){
      let inGroup=0;
      for(const item of group.cards){
        const match=matchesCollectionProduct(item.description,input.value);
        item.card.hidden=!match;
        if(match){inGroup++;visible++;}
      }
      group.section.hidden=inGroup===0;
    }
    status.textContent=input.value.trim()? `Showing ${visible} of ${total} matching products` : `Showing ${visible} products`;
    if(empty) empty.hidden=visible!==0;
  }
  input.addEventListener("input",update);
  update();
}
if(typeof document!=="undefined"){
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initialize,{once:true});
  else initialize();
}
