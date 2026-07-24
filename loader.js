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
  const [css,originalJs]=await Promise.all([unpack('assets/styles.css.gz.b64'),unpack('assets/app.js.gz.b64')]);
  let js=originalJs;

  // De geverifieerde Flowchart-werking gebruikt eerst browsertranscriptie en
  // lokale kaartcontrole. De externe AI-server is uitsluitend een optionele
  // terugval wanneer de lokale parser niets betrouwbaar vindt.
  const voiceHandler=/async function handleFinalVoiceTranscript\(transcript\)\s*\{[\s\S]*?\n\s*\}\n\n\s*function removeOneVoiceProduct/;
  const replacement=`async function handleFinalVoiceTranscript(transcript) {
    $('voiceTranscript').textContent = transcript;

    const removals = parseRemoval(transcript);
    if (removals.length) {
      removals.forEach(productId => removeOneVoiceProduct(productId));
      voiceInterim = [];
      voiceIgnored.clear();
      renderVoiceDraft();
      return;
    }

    const parsed = parseVoiceProducts(transcript).filter(item => !voiceIgnored.has(item.productId));
    if (parsed.length) {
      parsed.forEach(item => addProduct(item.productId, item.qty, 'voice'));
      showToast(\`${'${parsed.reduce((n,item)=>n+item.qty,0)}'} item(s) via lokale spraakcontrole toegevoegd.\`);
      voiceInterim = [];
      voiceIgnored.clear();
      renderVoiceDraft();
      return;
    }

    if (getAiServerUrl()) {
      try {
        const actions = await requestAiActions(transcript);
        if (actions.length) {
          const changed = applyAiActions(actions);
          if (changed) showToast(\`${'${changed}'} item(s) door de optionele AI-terugval verwerkt.\`);
          voiceInterim = [];
          voiceIgnored.clear();
          renderVoiceDraft();
          return;
        }
      } catch {
        showToast('Optionele AI niet bereikbaar; lokale spraak blijft actief.');
      }
    }

    voiceInterim = [];
    voiceIgnored.clear();
    renderVoiceDraft();
    showToast('Geen betrouwbaar product gevonden. Probeer de productnaam opnieuw.');
  }

  function removeOneVoiceProduct`;
  js=js.replace(voiceHandler,replacement);
  if(js===originalJs) console.warn('Flowchart-spraakpatch kon niet worden toegepast; de bestaande lokale parser blijft actief.');

  js=js
    .replace("button.textContent = connected ? 'AI verbonden' : 'AI-server';","button.textContent = connected ? 'Extra AI aan' : 'Extra AI';")
    .replace('Plak de Tailscale HTTPS-link van de kassaserver. Laat leeg om de AI-server te verwijderen.','Plak optioneel de Tailscale HTTPS-link voor extra AI-herkenning. Laat leeg om die uitbreiding te verwijderen.')
    .replace('AI-server verwijderd; lokale spraak blijft werken.','Extra AI verwijderd; de geverifieerde lokale spraakcontrole blijft werken.');

  const style=document.createElement('style');
  style.textContent=css;
  document.head.appendChild(style);
  (0,eval)(js);
})().catch(error=>{
  document.body.innerHTML=`<pre style="color:white;background:#07101b;padding:20px;white-space:pre-wrap">Registratiekassa kon niet starten:\n${error.stack||error}</pre>`;
});
