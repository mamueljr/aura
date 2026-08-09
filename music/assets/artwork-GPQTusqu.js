import{c as e,r as t}from"./dexie-react-hooks-C_OS1hkj.js";import{n}from"./library-Bz2N5R83.js";var r=new Map,i=new Map;async function a(e){let a=r.get(e);if(a)return a;let o=i.get(e);if(o)return o;let s=(async()=>{let i=await t.covers.get(e);if(!i)return null;let a=i.blob??await n(i);if(!a)return null;let o=URL.createObjectURL(a);return r.set(e,o),o})().finally(()=>i.delete(e));return i.set(e,s),s}var o=[[`#8b5cf6`,`#22d3ee`],[`#f472b6`,`#8b5cf6`],[`#22d3ee`,`#34d399`],[`#fb923c`,`#f472b6`],[`#34d399`,`#8b5cf6`],[`#60a5fa`,`#22d3ee`],[`#f472b6`,`#fb923c`],[`#a78bfa`,`#f472b6`]];function s(t){let n=parseInt(e(t||`?`).slice(0,8),36),[r,i]=o[n%o.length],a=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
  <defs><linearGradient id="g" gradientTransform="rotate(${(n>>3)%360} 0.5 0.5)">
  <stop offset="0%" stop-color="${r}"/><stop offset="100%" stop-color="${i}"/>
  </linearGradient></defs>
  <rect width="200" height="200" fill="url(#g)"/>
  <circle cx="100" cy="100" r="55" fill="rgba(0,0,0,0.18)"/>
  <text x="100" y="100" font-family="system-ui,sans-serif" font-size="64" font-weight="700"
    fill="rgba(255,255,255,0.92)" text-anchor="middle" dominant-baseline="central">${c((t.trim()[0]||`♪`).toUpperCase())}</text>
  </svg>`;return`data:image/svg+xml;utf8,${encodeURIComponent(a)}`}function c(e){return e.replace(/[<>&'"]/g,e=>`&#${e.charCodeAt(0)};`)}export{a as n,s as t};