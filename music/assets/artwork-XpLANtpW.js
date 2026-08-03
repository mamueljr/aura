import{R as e,U as t,n}from"./library-D2v6eeMC.js";var r=new Map,i=new Map;async function a(t){let a=r.get(t);if(a)return a;let o=i.get(t);if(o)return o;let s=(async()=>{let i=await e.covers.get(t);if(!i)return null;let a=i.blob??await n(i);if(!a)return null;let o=URL.createObjectURL(a);return r.set(t,o),o})().finally(()=>i.delete(t));return i.set(t,s),s}var o=[[`#8b5cf6`,`#22d3ee`],[`#f472b6`,`#8b5cf6`],[`#22d3ee`,`#34d399`],[`#fb923c`,`#f472b6`],[`#34d399`,`#8b5cf6`],[`#60a5fa`,`#22d3ee`],[`#f472b6`,`#fb923c`],[`#a78bfa`,`#f472b6`]];function s(e){let n=parseInt(t(e||`?`).slice(0,8),36),[r,i]=o[n%o.length],a=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
  <defs><linearGradient id="g" gradientTransform="rotate(${(n>>3)%360} 0.5 0.5)">
  <stop offset="0%" stop-color="${r}"/><stop offset="100%" stop-color="${i}"/>
  </linearGradient></defs>
  <rect width="200" height="200" fill="url(#g)"/>
  <circle cx="100" cy="100" r="55" fill="rgba(0,0,0,0.18)"/>
  <text x="100" y="100" font-family="system-ui,sans-serif" font-size="64" font-weight="700"
    fill="rgba(255,255,255,0.92)" text-anchor="middle" dominant-baseline="central">${c((e.trim()[0]||`♪`).toUpperCase())}</text>
  </svg>`;return`data:image/svg+xml;utf8,${encodeURIComponent(a)}`}function c(e){return e.replace(/[<>&'"]/g,e=>`&#${e.charCodeAt(0)};`)}export{a as n,s as t};