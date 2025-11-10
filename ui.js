export const el=(tag,attrs={},children=[])=>{
  const n=document.createElement(tag);
  Object.entries(attrs).forEach(([k,v])=>{
    if(k==="class")n.className=v;
    else if(k.startsWith("on")&&typeof v==="function")n.addEventListener(k.slice(2).toLowerCase(),v);
    else n.setAttribute(k,v);
  });
  (Array.isArray(children)?children:[children]).forEach(c=>n.append(c?.nodeType?c:document.createTextNode(c??"")));
  return n;
};
export const table=(headers,rows)=>{
  const thead=el("thead",{},[el("tr",{},headers.map(h=>el("th",{},[h])))]);
  const tbody=el("tbody",{},rows.map(r=>el("tr",{},r.map(c=>el("td",{},[c])))));
  return el("table",{class:"table"},[thead,tbody]);
};
