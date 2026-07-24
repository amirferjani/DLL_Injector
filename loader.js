(async()=>{
  const cssParts=['assets/styles.01.txt', 'assets/styles.02.txt', 'assets/styles.03.txt', 'assets/styles.04.txt'];
  const jsParts=['assets/app.01.txt', 'assets/app.02.txt', 'assets/app.03.txt', 'assets/app.04.txt', 'assets/app.05.txt', 'assets/app.06.txt'];
  const fetchText=async p=>{const r=await fetch(p);if(!r.ok)throw new Error(`Kon ${p} niet laden`);return r.text();};
  const style=document.createElement('style');
  style.textContent=(await Promise.all(cssParts.map(fetchText))).join('\n');
  document.head.appendChild(style);
  const code=(await Promise.all(jsParts.map(fetchText))).join('\n');
  (0,eval)(code);
})().catch(error=>{document.body.innerHTML=`<pre style="color:white;background:#07101b;padding:20px;white-space:pre-wrap">Registratiekassa kon niet starten:
${error.stack||error}</pre>`;});
