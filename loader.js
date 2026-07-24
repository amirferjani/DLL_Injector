(async()=>{
  const unpack=async path=>{
    const response=await fetch(path,{cache:'no-store'});
    if(!response.ok) throw new Error(`Kon ${path} niet laden (${response.status})`);
    const b64=(await response.text()).trim();
    const bytes=Uint8Array.from(atob(b64),char=>char.charCodeAt(0));
    if(!('DecompressionStream' in window)) throw new Error('Deze browser is te oud voor de nieuwe kassaversie. Update Safari of Chrome.');
    const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    return new Response(stream).text();
  };
  const [css,js]=await Promise.all([unpack('assets/styles.css.gz.b64'),unpack('assets/app.js.gz.b64')]);
  const style=document.createElement('style');
  style.textContent=css;
  document.head.appendChild(style);
  (0,eval)(js);
})().catch(error=>{
  document.body.innerHTML=`<pre style="color:white;background:#07101b;padding:20px;white-space:pre-wrap">Registratiekassa kon niet starten:\n${error.stack||error}</pre>`;
});
