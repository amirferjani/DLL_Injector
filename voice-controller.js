(()=>{
  function installAccurateDutchVoice(){
    const api=window.__kassaVoiceApi;
    if(!api?.handle) return;
    const topButton=document.getElementById('voiceTopButton');
    const mainButton=document.getElementById('voiceButton');
    if(!topButton&&!mainButton) return;

    let active=false;
    let mode='';
    let browserRecognition=null;
    let stream=null;
    let audioContext=null;
    let analyser=null;
    let monitorFrame=0;
    let recorder=null;
    let chunks=[];
    let speechSeen=false;
    let lastLoudAt=0;
    let segmentStartedAt=0;
    let finishing=false;
    let transcribeQueue=Promise.resolve();

    const isStandalone=window.matchMedia?.('(display-mode: standalone)').matches||window.navigator.standalone===true;
    document.documentElement.classList.toggle('rk-standalone',isStandalone);

    const cleanDutch=text=>String(text||'').toLocaleLowerCase('nl-BE')
      .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
      .replace(/\b(?:er\s+is\s+(?:tof|toff|top|stop)|aristof+|eristov|eristof+|ristof+)\b/g,'eristoff')
      .replace(/\b(?:porno|porn)\s+star\s+martini\b/g,'pornstar martini')
      .replace(/\b(?:voor een )?star\s+martini\b/g,'pornstar martini')
      .replace(/\bbombay\s+(?:safier|saffier|safire)\b/g,'bombay sapphire')
      .replace(/\bjack\s+daniel\b/g,'jack daniels')
      .replace(/\bwodka\b/g,'vodka')
      .replace(/\s+/g,' ').trim();

    const setUi=(on,label,transcript)=>{
      const stateText=document.getElementById('voiceStateText');
      const stateDot=document.getElementById('voiceStateDot');
      const transcriptNode=document.getElementById('voiceTranscript');
      if(stateText) stateText.textContent=label;
      if(stateDot) stateDot.classList.toggle('active',on);
      if(transcriptNode&&transcript!==undefined) transcriptNode.textContent=transcript;
      [topButton,mainButton].filter(Boolean).forEach(button=>{
        button.setAttribute('aria-pressed',String(on));
        button.classList.toggle('active',on);
      });
      const topLabel=topButton?.querySelector('.mic-label');
      if(topLabel) topLabel.textContent=on?'Stop':'Spraak';
      if(mainButton) mainButton.textContent=on?'Stop microfoon':'Start microfoon';
    };

    const transcriberUrl=(base,path)=>{
      const url=new URL(base,location.href);
      url.protocol='https:';
      url.port='8443';
      url.pathname=path;
      url.search='';
      url.hash='';
      return url.toString();
    };

    const serverReady=async base=>{
      if(!base||!window.MediaRecorder||!navigator.mediaDevices?.getUserMedia) return false;
      try{
        const controller=new AbortController();
        const timer=setTimeout(()=>controller.abort(),2500);
        const response=await fetch(transcriberUrl(base,'/health'),{cache:'no-store',signal:controller.signal,headers:{Accept:'application/json'}});
        clearTimeout(timer);
        if(!response.ok) return false;
        const data=await response.json();
        return Boolean(data.ok&&data.configured);
      }catch{return false;}
    };

    const blobToBase64=async blob=>{
      const bytes=new Uint8Array(await blob.arrayBuffer());
      let binary='';
      const step=0x8000;
      for(let index=0;index<bytes.length;index+=step) binary+=String.fromCharCode(...bytes.subarray(index,index+step));
      return btoa(binary);
    };

    const transcribeBlob=async(blob,base)=>{
      if(!blob||blob.size<900) return;
      setUi(true,'Nederlands transcriberen…','De bestelling wordt in het Nederlands herkend.');
      const phrases=(api.phrases?.()||[]).slice(0,350);
      const controller=new AbortController();
      const timer=setTimeout(()=>controller.abort(),35000);
      try{
        const response=await fetch(transcriberUrl(base,'/transcribe'),{
          method:'POST',
          headers:{'Content-Type':'application/json',Accept:'application/json'},
          body:JSON.stringify({audio:await blobToBase64(blob),mimeType:blob.type||'audio/mp4',phrases}),
          signal:controller.signal
        });
        if(!response.ok) throw new Error(`HTTP ${response.status}`);
        const data=await response.json();
        const text=cleanDutch(data.text);
        if(text){
          const transcriptNode=document.getElementById('voiceTranscript');
          if(transcriptNode) transcriptNode.textContent=text;
          api.preview?.(text);
          await Promise.resolve(api.handle(text));
        }
      }catch(error){
        console.warn('Nederlandse servertranscriptie mislukt.',error);
        const transcriptNode=document.getElementById('voiceTranscript');
        if(transcriptNode) transcriptNode.textContent='Transcriptie tijdelijk niet bereikbaar. Probeer opnieuw.';
      }finally{
        clearTimeout(timer);
        if(active) setUi(true,'Ik luister in het Nederlands…','Zeg productnamen van de kaart.');
      }
    };

    const preferredMime=()=>{
      const candidates=['audio/mp4','audio/webm;codecs=opus','audio/webm','audio/ogg;codecs=opus'];
      return candidates.find(type=>window.MediaRecorder?.isTypeSupported?.(type))||'';
    };

    const cleanupServer=()=>{
      cancelAnimationFrame(monitorFrame);
      monitorFrame=0;
      try{audioContext?.close();}catch{}
      audioContext=null;
      analyser=null;
      stream?.getTracks().forEach(track=>track.stop());
      stream=null;
      recorder=null;
      finishing=false;
    };

    const startSegment=(base)=>{
      if(!active||!stream) return;
      const mime=preferredMime();
      chunks=[];
      speechSeen=false;
      lastLoudAt=Date.now();
      segmentStartedAt=Date.now();
      finishing=false;
      recorder=mime?new MediaRecorder(stream,{mimeType:mime}):new MediaRecorder(stream);
      recorder.ondataavailable=event=>{if(event.data?.size) chunks.push(event.data);};
      recorder.onstop=()=>{
        const blob=new Blob(chunks,{type:recorder?.mimeType||mime||'audio/mp4'});
        if(speechSeen&&blob.size>900) transcribeQueue=transcribeQueue.then(()=>transcribeBlob(blob,base));
        if(active) setTimeout(()=>startSegment(base),80); else cleanupServer();
      };
      recorder.start();
    };

    const finishSegment=()=>{
      if(finishing||!recorder||recorder.state!=='recording') return;
      finishing=true;
      try{recorder.stop();}catch{finishing=false;}
    };

    const monitorAudio=base=>{
      if(!active||mode!=='server'||!analyser) return;
      const data=new Uint8Array(analyser.fftSize);
      analyser.getByteTimeDomainData(data);
      let sum=0;
      for(const sample of data){const value=(sample-128)/128;sum+=value*value;}
      const rms=Math.sqrt(sum/data.length);
      const now=Date.now();
      if(rms>0.025){speechSeen=true;lastLoudAt=now;}
      const age=now-segmentStartedAt;
      if(recorder?.state==='recording'&&((speechSeen&&now-lastLoudAt>720&&age>900)||age>7000)) finishSegment();
      monitorFrame=requestAnimationFrame(()=>monitorAudio(base));
    };

    const startServerMode=async base=>{
      stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true,channelCount:1}});
      const AudioContextClass=window.AudioContext||window.webkitAudioContext;
      if(AudioContextClass){
        audioContext=new AudioContextClass();
        const source=audioContext.createMediaStreamSource(stream);
        analyser=audioContext.createAnalyser();
        analyser.fftSize=1024;
        source.connect(analyser);
      }
      mode='server';
      setUi(true,'Ik luister in het Nederlands…','Nauwkeurige NL-transcriptie met woorden van de kaart.');
      startSegment(base);
      if(analyser) monitorAudio(base);
    };

    const startBrowserMode=()=>{
      const SpeechRecognition=window.SpeechRecognition||window.webkitSpeechRecognition;
      if(!SpeechRecognition) throw new Error('Spraakherkenning wordt niet ondersteund. Open de kassa via het beginscherm.');
      browserRecognition=new SpeechRecognition();
      browserRecognition.lang='nl-BE';
      browserRecognition.continuous=true;
      browserRecognition.interimResults=true;
      browserRecognition.maxAlternatives=5;
      try{
        const Phrase=window.SpeechRecognitionPhrase;
        if(Phrase&&'phrases' in browserRecognition){
          const phrases=(api.phrases?.()||[]).map(text=>new Phrase(text,/erist/i.test(text)?8:5));
          try{browserRecognition.phrases=phrases;}catch{phrases.forEach(phrase=>browserRecognition.phrases.push(phrase));}
        }
      }catch(error){console.info('Spraakbias niet beschikbaar in deze Apple-versie.',error);}
      browserRecognition.onstart=()=>setUi(true,'Ik luister in het Nederlands…','Apple-spraakherkenning · taal nl-BE.');
      browserRecognition.onresult=event=>{
        let interim='';
        for(let index=event.resultIndex;index<event.results.length;index++){
          const alternatives=Array.from(event.results[index]);
          const ranked=alternatives.map(alternative=>{
            const text=cleanDutch(alternative.transcript);
            const hits=(api.parse?.(text)||[]).reduce((total,item)=>total+(item.qty||1),0);
            const eristoff=/\beristoff\b/.test(text)?500:0;
            return {text,score:hits*1000+eristoff+Number(alternative.confidence||0)};
          }).sort((a,b)=>b.score-a.score);
          const text=ranked[0]?.text||cleanDutch(alternatives[0]?.transcript);
          if(event.results[index].isFinal){
            if(text) api.handle(text);
          }else interim+=`${text} `;
        }
        if(interim.trim()){
          const text=interim.trim();
          const transcriptNode=document.getElementById('voiceTranscript');
          if(transcriptNode) transcriptNode.textContent=text;
          api.preview?.(text);
        }
      };
      browserRecognition.onerror=event=>{
        if(event.error==='not-allowed'||event.error==='service-not-allowed'){
          stop();
          setUi(false,'Microfoon geweigerd',isStandalone?'Geef microfoontoegang in Instellingen.':'Open deze website via het beginscherm; Safari blokkeert de microfoon soms.');
        }
      };
      browserRecognition.onend=()=>{
        if(active&&mode==='browser') setTimeout(()=>{try{browserRecognition.start();}catch{}},120);
      };
      mode='browser';
      browserRecognition.start();
    };

    const stop=()=>{
      active=false;
      if(mode==='server'){
        cancelAnimationFrame(monitorFrame);
        if(recorder?.state==='recording') finishSegment(); else cleanupServer();
      }
      if(mode==='browser'){
        try{browserRecognition?.stop();}catch{}
        browserRecognition=null;
      }
      mode='';
      api.clearPreview?.();
      setUi(false,'Spraak uit','Zeg bijvoorbeeld: “Eristoff cola, een Bombay tonic en een Pornstar Martini”.');
    };

    const start=async()=>{
      if(active) return;
      active=true;
      setUi(true,'Microfoon starten…','Alleen Nederlandse bestellingen worden verwerkt.');
      const base=api.serverUrl?.()||'';
      try{
        if(await serverReady(base)) await startServerMode(base);
        else startBrowserMode();
      }catch(error){
        console.warn(error);
        active=false;
        cleanupServer();
        setUi(false,'Microfoon niet beschikbaar',error.message||'Open de kassa via het beginscherm en geef microfoontoegang.');
      }
    };

    const intercept=event=>{
      event.preventDefault();
      event.stopImmediatePropagation();
      if(active) stop(); else start();
    };
    [topButton,mainButton].filter(Boolean).forEach(button=>button.addEventListener('click',intercept,true));
  }

  requestAnimationFrame(installAccurateDutchVoice);
})();
