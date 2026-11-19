(() => {
  "use strict";
  const root=document.querySelector("[data-np-order-lookup]");
  if(!root)return;
  const form=root.querySelector("form"), input=root.querySelector("input[name='order_ref']");
  const status=root.querySelector("[data-np-order-status]"), button=root.querySelector("button[type='submit']");
  const UUID="[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}";
  const NUT=new RegExp("^NUT-"+UUID+"$"),ESCO=new RegExp("^ESCO-"+UUID+"$"),REQ=new RegExp("^ESCO-REQ-"+UUID+"$");
  const API={
    nut:"https://7cs8kxkj5d.execute-api.eu-north-1.amazonaws.com",
    esco:"https://vflz5z5jfc.execute-api.eu-north-1.amazonaws.com"
  };
  const labels={
    AWAITING_STRIPE:"Payment pending",
    PROCESSING:"Order status processing",
    OPENING_CHECKOUT:"Opening secure checkout",
    APPROVED_FOR_PAYMENT:"Payment pending",
    CHECKOUT_OPEN:"Awaiting payment confirmation",
    PAID:"Payment confirmed",
    PAYMENT_FAILED:"Payment not completed",
    RECEIVED_AWAITING_CONFIRMATION:"Order request received, awaiting confirmation",
    AWAITING_CUSTOMER_ACCEPTANCE:"Awaiting your acceptance",
    ACCEPTED_AWAITING_PAYMENT:"Order accepted, awaiting payment",
    CANCELLED:"Order request cancelled"
  };
  function show(message,kind){
    status.hidden=false;status.textContent=message;
    status.dataset.state=kind||"info";
  }
  form.addEventListener("submit",async e=>{
    e.preventDefault();
    if(button.disabled)return;
    const value=String(input.value||"").trim().toLowerCase();
    const prefix=value.startsWith("nut-")?"NUT-":value.startsWith("esco-req-")?"ESCO-REQ-":value.startsWith("esco-")?"ESCO-":"";
    const ref=prefix+value.substring(prefix.length);
    let url;
    if(NUT.test(ref))url=API.nut+"/status/"+encodeURIComponent(ref);
    else if(REQ.test(ref))url=API.esco+"/order-request-status/"+encodeURIComponent(ref);
    else if(ESCO.test(ref))url=API.esco+"/status/"+encodeURIComponent(ref);
    else {show("Enter the complete order reference exactly as shown on your confirmation page.","error");return;}
    button.disabled=true;show("Checking the secure order service…","info");
    try {
      const response=await fetch(url,{credentials:"omit",cache:"no-store",headers:{accept:"application/json"}});
      if(response.status===404){show("This reference was not found. Check the order ID or contact NovaPharm.","error");return;}
      if(!response.ok)throw new Error("status_service_unavailable");
      const data=await response.json();
      if(!data||data.orderId!==ref||typeof data.status!=="string"||!Object.hasOwn(labels,data.status))
        throw new Error("unrecognized_response");
      const result=labels[data.status];
      show(result+(data.status==="PAID"?". Shipment and delivery tracking are separate from payment confirmation.":"."),"success");
    } catch(e) {
      show("The order-status service is unavailable. Your order has not been changed; please try the existing Nutraxin or ESCO order page.","error");
    } finally{button.disabled=false;}
  });
})();