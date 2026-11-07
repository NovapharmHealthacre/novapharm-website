/* NovaPharm Medicines Terminal concept: synthetic-only, local visual interaction.
   No network, identities, private data or external health data is accessed. */
(() => {
  "use strict";
  const preview = document.querySelector("[data-medicines-terminal-preview]");
  if (!preview) return;
  const canvas = preview.querySelector("[data-npi-chart]");
  const updateButton = preview.querySelector("[data-npi-update]");
  const status = preview.querySelector("[data-npi-status]");
  const controls = Array.from(preview.querySelectorAll("[data-npi-series]"));
  if (!(canvas instanceof HTMLCanvasElement) || !updateButton || !status || controls.length !== 4) return;
  const series = [
    { label: "North East", color: "#0055b7", values: [58, 60, 61, 63, 64, 66, 67, 69, 71, 74, 76, 79] },
    { label: "Midlands", color: "#3188ee", values: [43, 44, 45, 46, 47, 48, 49, 51, 52, 54, 56, 58] },
    { label: "London", color: "#7496ea", values: [30, 30, 32, 31, 33, 34, 34, 35, 36, 37, 39, 40] },
    { label: "South West", color: "#9ebcf3", values: [18, 19, 20, 19, 21, 22, 23, 24, 25, 25, 26, 27] }
  ];
  const selected = new Set([0, 1, 2, 3]);
  const draw = () => {
    const context = canvas.getContext("2d");
    if (!context) return;
    const bounds = canvas.getBoundingClientRect();
    const width = Math.max(180, bounds.width || 500);
    const height = Math.max(100, bounds.height || 150);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.clearRect(0, 0, width, height);
    const left = 2, right = width - 4, top = 5, bottom = height - 9;
    context.lineWidth = 1;
    context.strokeStyle = "#e8edf6";
    for (let i = 0; i <= 4; i++) {
      const y = top + (bottom - top) * i / 4;
      context.beginPath();
      context.moveTo(left, y);
      context.lineTo(right, y);
      context.stroke();
    }
    context.strokeStyle = "#eff3f9";
    for (let i = 0; i < 12; i++) {
      const x = left + (right - left) * i / 11;
      context.beginPath();
      context.moveTo(x, top);
      context.lineTo(x, bottom);
      context.stroke();
    }
    const point = (index, value) => ({
      x: left + (right - left) * index / 11,
      y: bottom - (bottom - top) * value / 100
    });
    series.forEach(({ color, values }, seriesIndex) => {
      if (!selected.has(seriesIndex)) return;
      context.beginPath();
      context.strokeStyle = color;
      context.lineWidth = 2.1;
      context.lineJoin = "round";
      context.lineCap = "round";
      values.forEach((value, index) => {
        const { x, y } = point(index, value);
        if (index === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      });
      context.stroke();
      values.forEach((value, index) => {
        const { x, y } = point(index, value);
        context.beginPath();
        context.fillStyle = color;
        context.arc(x, y, 2.2, 0, Math.PI * 2);
        context.fill();
      });
    });
  };
  updateButton.addEventListener("click", () => {
    selected.clear();
    controls.forEach((input, index) => {
      if (input.checked) selected.add(index);
    });
    const count = selected.size;
    status.textContent = count === 0 ? "Select a region to display a sample series" : count + " synthetic " + (count === 1 ? "series" : "series") + " shown";
    draw();
  });
  window.addEventListener("resize", draw, { passive: true });
  if (typeof ResizeObserver !== "undefined") {
    const observer = new ResizeObserver(draw);
    observer.observe(canvas);
  }
  draw();
})();


/* Official geometry, not official prescribing: ONS 2026 super-generalised ICB shapes.
   Source rights: Office for National Statistics and Ordnance Survey.
   No credentials, medical records, accounts or analytics are fetched.
   Sample colours are intentionally unrelated to the example KPI figures. */
(() => {
  "use strict";
  const mount=document.querySelector("[data-npi-real-map]");
  const status=document.querySelector("[data-npi-map-status]");
  if(!mount||!status)return;
  const endpoint="https://services1.arcgis.com/ESMARspQHYMw9BZ9/arcgis/rest/services/Integrated_Care_Boards_April_2026_Boundaries_EN_BSC/FeatureServer/0/query";
  const params=new URLSearchParams({where:"1=1",outFields:"*",outSR:"4326",returnGeometry:"true",f:"geojson"});
  const shades=["#dceafb","#c8e0fc","#a7d0fc","#79b7f4","#4997df","#2677c8","#1057a5"];
  const svgNS="http://www.w3.org/2000/svg";
  const ringPoints=[];
  const visit=(v)=>{
    if(!Array.isArray(v))return;
    if(v.length>=2&&Number.isFinite(v[0])&&Number.isFinite(v[1])){ringPoints.push(v);return;}
    v.forEach(visit);
  };
  const create=(tag)=>document.createElementNS(svgNS,tag);
  const controller=typeof AbortController==="function"?new AbortController():null;
  const stop=controller?setTimeout(()=>controller.abort(),8000):null;
  fetch(endpoint+"?"+params.toString(),{
    method:"GET",mode:"cors",credentials:"omit",cache:"force-cache",
    ...(controller?{signal:controller.signal}:{})
  }).then(res=>{
    if(!res.ok)throw new Error("ONS geometry unavailable");
    return res.json();
  }).then(data=>{
    const features=(data.features||[]).filter(f=>f.geometry&&["Polygon","MultiPolygon"].includes(f.geometry.type));
    if(features.length<20||features.length>100)throw new Error("Unexpected boundary count");
    features.forEach(f=>visit(f.geometry.coordinates));
    if(ringPoints.length<100)throw new Error("Insufficient geometry");
    const cos=Math.cos(52*Math.PI/180);
    const xs=ringPoints.map(([lon])=>lon*cos),ys=ringPoints.map(([,lat])=>lat);
    const loX=Math.min(...xs),hiX=Math.max(...xs),loY=Math.min(...ys),hiY=Math.max(...ys);
    if(!(hiX>loX&&hiY>loY))throw new Error("Invalid geometry");
    const width=360,height=420,pad=12;
    const scale=Math.min((width-2*pad)/(hiX-loX),(height-2*pad)/(hiY-loY));
    const offsetX=(width-(hiX-loX)*scale)/2,offsetY=(height-(hiY-loY)*scale)/2;
    const toX=lon=>(lon*cos-loX)*scale+offsetX;
    const toY=lat=>(hiY-lat)*scale+offsetY;
    const toPath=poly=>poly.map(ring=>{
      if(!ring||ring.length<3)return "";
      return ring.map(([lon,lat],i)=>(i?"L":"M")+toX(lon).toFixed(1)+" "+toY(lat).toFixed(1)).join(" ")+"Z";
    }).join(" ");
    const svg=create("svg");
    svg.setAttribute("viewBox","0 0 360 420");
    svg.setAttribute("role","presentation");
    svg.setAttribute("aria-hidden","true");
    features.forEach((feature,index)=>{
      const props=feature.properties||{};
      const name=Object.entries(props).find(([key,value])=>/ICB.*NM|NAME/i.test(key)&&typeof value==="string")?.[1]||"England Integrated Care Board";
      const paths=feature.geometry.type==="Polygon"?[feature.geometry.coordinates]:feature.geometry.coordinates;
      const path=create("path");
      path.setAttribute("d",paths.map(toPath).join(" "));
      // Decorative, deterministic colour sequence: NOT regional prescribing activity.
      path.setAttribute("fill",shades[(index*3+2)%shades.length]);
      path.setAttribute("fill-rule","evenodd");
      const title=create("title");title.textContent=name+" · ONS boundary; sample shading only";
      path.append(title);
      svg.append(path);
    });
    mount.replaceChildren(svg);
    status.textContent="ONS April 2026 ICB geography · illustrative colour index · no NHS prescribing data";
  }).catch(()=>{
    status.textContent="Official map unavailable · schematic fallback shown · no measured prescribing data";
  }).finally(()=>{if(stop!==null)clearTimeout(stop);});
})();
