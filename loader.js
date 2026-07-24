(async()=>{
  const robots=document.createElement('meta');
  robots.name='robots';
  robots.content='noindex,nofollow,noarchive,nosnippet,noimageindex';
  document.head.appendChild(robots);

  const fetchText=async path=>{
    const response=await fetch(path,{cache:'no-store'});
    if(!response.ok) throw new Error(`Kon ${path} niet laden (${response.status})`);
    return (await response.text()).trim();
  };
  const unpack=async b64=>{
    const bytes=Uint8Array.from(atob(b64),character=>character.charCodeAt(0));
    if(!('DecompressionStream' in window)) throw new Error('Deze browser is te oud voor de nieuwe kassaversie. Update Safari of Chrome.');
    const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    return new Response(stream).text();
  };
  const appParts=Array.from({length:7},(_,index)=>`assets/app.full.${String(index+1).padStart(2,'0')}.b64`);
  const [cssB64,jsParts]=await Promise.all([
    fetchText('assets/styles.css.gz.b64'),
    Promise.all(appParts.map(fetchText))
  ]);
  const [css,js]=await Promise.all([unpack(cssB64),unpack(jsParts.join(''))]);
  const style=document.createElement('style');
  style.textContent=css;
  document.head.appendChild(style);
  (0,eval)(js);
})().catch(error=>{
  document.body.innerHTML=`<pre style="color:white;background:#07101b;padding:20px;white-space:pre-wrap">Registratiekassa kon niet starten:\n${error.stack||error}</pre>`;
});
