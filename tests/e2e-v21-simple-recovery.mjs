import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const baseUrl='http://127.0.0.1:4173';
const outDir='analysis-test-results';
mkdirSync(outDir,{recursive:true});

const report={startedAt:new Date().toISOString(),passed:false,checks:[],browserErrors:[],metrics:{}};
const check=(name,ok,details='')=>{
  report.checks.push({name,ok:Boolean(ok),details});
  if(!ok) throw new Error(`${name}${details?`: ${details}`:''}`);
};
const px=value=>Number.parseFloat(String(value||'0'))||0;
const iPhoneUa='Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';

async function openCashier(browser,{width,height,phone,name}){
  const context=await browser.newContext({
    viewport:{width,height},
    screen:{width,height},
    deviceScaleFactor:phone?3:1,
    isMobile:phone,
    hasTouch:phone,
    userAgent:phone?iPhoneUa:undefined,
    serviceWorkers:'allow'
  });
  const page=await context.newPage();
  page.on('pageerror',error=>report.browserErrors.push(`${name}: ${String(error)}`));
  page.on('console',message=>{if(message.type()==='error') report.browserErrors.push(`${name} console: ${message.text()}`);});
  await page.goto(`${baseUrl}/?test=simple-recovery-v21-${name}`,{waitUntil:'domcontentloaded'});
  await page.locator('#staffGrid .staff-card').first().waitFor({timeout:20000});
  await page.evaluate(()=>{
    document.querySelector('#bossLoginButton')?.click();
    const input=document.querySelector('#bossPin');
    if(input) input.value='0607';
    document.querySelector('#bossPinSubmit')?.click();
  });
  await page.locator('#app:not(.hidden)').waitFor({timeout:15000});
  await page.evaluate(()=>{
    const table=[...document.querySelectorAll('.table-button')].find(node=>node.textContent.trim().startsWith('K3'));
    table?.click();
  });
  await page.locator('#orderContent:not(.hidden)').waitFor({timeout:15000});
  await page.locator('.product-tile').first().waitFor({timeout:15000});
  if(phone) await page.waitForFunction(()=>document.documentElement.dataset.rkMobileVersion==='21',null,{timeout:15000});
  return {context,page};
}

async function metrics(page){
  return page.evaluate(()=>{
    const cs=node=>node?getComputedStyle(node):null;
    const grid=document.querySelector('.product-grid');
    const tile=document.querySelector('.product-tile');
    const rail=document.querySelector('#categoryRail');
    const tabs=document.querySelector('.catalog-tabs');
    const orderMain=document.querySelector('.order-main');
    return {
      mobileVersion:document.documentElement.dataset.rkMobileVersion||'',
      hasBrokenV19:document.documentElement.classList.contains('rk-phone')||document.documentElement.classList.contains('rk-order-v20'),
      columns:cs(grid)?.gridTemplateColumns.split(/\s+/).filter(Boolean).length||0,
      tileName:cs(tile?.querySelector('strong'))?.fontSize||'',
      tilePrice:cs(tile?.querySelector('span'))?.fontSize||'',
      categoryFont:cs(document.querySelector('.category-button'))?.fontSize||'',
      railParent:rail?.parentElement===orderMain?'order-main':rail?.parentElement?.id||rail?.parentElement?.className||'',
      tabsDisplay:cs(tabs)?.display||'',
      actionButtons:[...document.querySelectorAll('.order-head-actions button')].map(node=>({id:node.id,text:node.textContent.trim(),display:cs(node)?.display})),
      docWidth:document.documentElement.clientWidth,
      scrollWidth:document.documentElement.scrollWidth
    };
  });
}

let browser;
try{
  browser=await chromium.launch({headless:true});

  {
    const {context,page}=await openCashier(browser,{width:390,height:844,phone:true,name:'iphone390'});
    const value=await metrics(page);
    report.metrics.iphone390=value;
    check('V21 mobiele herstelcode is actief',value.mobileVersion==='21',value.mobileVersion);
    check('Mislukte v19/v20-layoutklassen zijn niet actief',!value.hasBrokenV19,String(value.hasBrokenV19));
    check('Oorspronkelijke productgridstructuur blijft behouden',value.columns===2,`kolommen=${value.columns}`);
    check('Categorieën blijven links in de oorspronkelijke order-main',value.railParent==='order-main',value.railParent);
    check('Oorspronkelijke catalogustabrij blijft zichtbaar',value.tabsDisplay!=='none',value.tabsDisplay);
    check('Productnaam is slechts licht vergroot',px(value.tileName)>=11&&px(value.tileName)<=12, value.tileName);
    check('Prijs is slechts licht vergroot',px(value.tilePrice)>=10&&px(value.tilePrice)<=11, value.tilePrice);
    check('Categorietekst is slechts licht vergroot',px(value.categoryFont)>=9&&px(value.categoryFont)<=10, value.categoryFont);
    check('Bestaande rekeningacties zijn niet uit de DOM verwijderd',value.actionButtons.some(item=>item.id==='backFloorButton')&&value.actionButtons.some(item=>item.id==='requestBillButton')&&value.actionButtons.some(item=>item.id==='moveTableButton'),JSON.stringify(value.actionButtons));
    check('Geen horizontale documentoverflow',value.scrollWidth<=value.docWidth+2,`${value.scrollWidth}/${value.docWidth}`);

    const tile=page.locator('.product-tile').filter({hasText:'Aperol Spritz'}).first();
    await tile.scrollIntoViewIfNeeded();
    await page.evaluate(()=>window.scrollTo(0,Math.max(1,document.querySelector('.product-tile')?.getBoundingClientRect().top+window.scrollY-260)));
    await page.waitForTimeout(100);
    const before=await page.evaluate(()=>({y:window.scrollY,table:window.__kassaAppApi?.getSelectedTableId?.()||''}));
    await tile.click();
    await page.locator('#ticketList .ticket-row').waitFor({timeout:10000});
    await page.waitForTimeout(800);
    const after=await page.evaluate(()=>({
      y:window.scrollY,
      table:window.__kassaAppApi?.getSelectedTableId?.()||'',
      qty:window.__kassaAppApi?.getOrder?.('K3')?.items?.find(item=>item.productId==='p1')?.qty||0
    }));
    check('Producttik behoudt de scrollpositie',Math.abs(after.y-before.y)<=5,`${before.y}→${after.y}`);
    check('Producttik verandert de gekozen tafel niet',before.table==='K3'&&after.table==='K3',`${before.table}→${after.table}`);
    check('Producttik voegt het product exact één keer toe',after.qty===1,`qty=${after.qty}`);
    check('Minteken en kruis blijven aanwezig',await page.locator('#ticketList .rk-minus-button').count()===1&&await page.locator('#ticketList [data-remove]').count()===1,'min/x');
    check('Historiekfunctie blijft voor de Baas aanwezig',await page.locator('.order-history-button').count()===1,'historiek');
    await page.screenshot({path:`${outDir}/v21-iphone-390.png`,fullPage:true});
    await context.close();
  }

  {
    const {context,page}=await openCashier(browser,{width:708,height:1050,phone:true,name:'iphone708'});
    const value=await metrics(page);
    report.metrics.iphone708=value;
    check('Brede iPhone behoudt de oorspronkelijke drie kolommen',value.columns===3,`kolommen=${value.columns}`);
    check('Brede iPhone behoudt oorspronkelijke categorieplaatsing',value.railParent==='order-main',value.railParent);
    check('Brede iPhone heeft geen horizontale documentoverflow',value.scrollWidth<=value.docWidth+2,`${value.scrollWidth}/${value.docWidth}`);
    await page.screenshot({path:`${outDir}/v21-iphone-708.png`,fullPage:true});
    await context.close();
  }

  {
    const {context,page}=await openCashier(browser,{width:1440,height:900,phone:false,name:'desktop'});
    const value=await metrics(page);
    report.metrics.desktop=value;
    check('Desktop krijgt geen mobiele herstelklasse',value.mobileVersion==='',value.mobileVersion);
    check('Desktop behoudt de bestaande vijf productkolommen',value.columns===5,`kolommen=${value.columns}`);
    check('Desktoplettergrootte blijft ongewijzigd',px(value.tileName)===10,value.tileName);
    await context.close();
  }

  check('Geen onverwachte JavaScript-paginafouten',report.browserErrors.length===0,report.browserErrors.join('\n'));
  report.passed=true;
}catch(error){
  report.failure=String(error?.stack||error);
}finally{
  report.finishedAt=new Date().toISOString();
  writeFileSync(`${outDir}/v21-report.json`,JSON.stringify(report,null,2));
  writeFileSync(`${outDir}/v21-report.md`,[
    '# Registratiekassa v21 — herstel oude layout met kleine lettervergroting','',
    `**Resultaat: ${report.passed?'GESLAAGD':'MISLUKT'}**`,'',
    ...report.checks.map(item=>`- ${item.ok?'✅':'❌'} ${item.name}${item.details?` — ${item.details}`:''}`),
    report.failure?`\n## Fout\n\n\`\`\`text\n${report.failure}\n\`\`\``:''
  ].join('\n'));
  if(browser) await browser.close();
}
if(!report.passed) process.exitCode=1;
