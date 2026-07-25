import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const baseUrl = 'http://127.0.0.1:4173';
const outDir = 'analysis-test-results';
mkdirSync(outDir, { recursive: true });

const report = { startedAt:new Date().toISOString(), passed:false, checks:[], errors:[], metrics:{} };
const check=(name,ok,details='')=>{report.checks.push({name,ok:Boolean(ok),details});if(!ok)throw new Error(`${name}${details?`: ${details}`:''}`);};
const px=value=>Number.parseFloat(String(value||'0'))||0;
const iPhoneUa='Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';

async function openCashier(browser,{phone,width,height,name}){
  const context=await browser.newContext({
    viewport:{width,height},screen:{width,height},deviceScaleFactor:phone?3:1,
    isMobile:phone,hasTouch:phone,userAgent:phone?iPhoneUa:undefined,serviceWorkers:'allow'
  });
  const page=await context.newPage();
  page.on('pageerror',error=>report.errors.push(`${name}: ${String(error)}`));
  page.on('console',message=>{if(message.type()==='error')report.errors.push(`${name}: ${message.text()}`);});
  await page.goto(`${baseUrl}/?test=fonts-only-v21-${name}`,{waitUntil:'domcontentloaded'});
  await page.locator('#staffGrid .staff-card').first().waitFor({timeout:20000});
  await page.locator('#staffGrid .staff-card').filter({hasText:'Amir'}).first().click();
  await page.locator('#app:not(.hidden)').waitFor({timeout:15000});
  const table=page.locator('.table-button').filter({hasText:/^K3$/}).first();
  await table.click();
  await page.locator('#orderContent:not(.hidden)').waitFor();
  await page.locator('.product-tile').first().waitFor();
  return {context,page};
}

let browser;
try{
  browser=await chromium.launch({headless:true});

  {
    const {context,page}=await openCashier(browser,{phone:true,width:390,height:844,name:'iphone390'});
    const metrics=await page.evaluate(()=>{
      const cs=node=>node?getComputedStyle(node):null;
      const grid=document.querySelector('.product-grid');
      const tile=document.querySelector('.product-tile');
      const floor=document.querySelector('.floor-canvas');
      const category=document.querySelector('.category-button');
      const tabs=[...document.querySelectorAll('.catalog-tabs .catalog-tab')];
      const columns=cs(grid)?.gridTemplateColumns.split(/\s+/).filter(Boolean).length||0;
      return {
        columns,
        tileHeight:Math.round(tile?.getBoundingClientRect().height||0),
        productFont:cs(tile?.querySelector('strong'))?.fontSize||'',
        priceFont:cs(tile?.querySelector('span'))?.fontSize||'',
        categoryFont:cs(category)?.fontSize||'',
        searchFont:cs(document.querySelector('.product-search input'))?.fontSize||'',
        viewFont:cs(document.querySelector('.view-switch'))?.fontSize||'',
        floorHeight:Math.round(floor?.getBoundingClientRect().height||0),
        railParent:document.querySelector('#categoryRail')?.parentElement?.className||'',
        tabsVisible:tabs.length===3&&tabs.every(tab=>cs(tab)?.display!=='none'),
        orderHeadParent:document.querySelector('.order-head')?.parentElement?.id||'',
        docWidth:document.documentElement.clientWidth,
        docScrollWidth:document.documentElement.scrollWidth
      };
    });
    report.metrics.iphone390=metrics;
    check('De oude v18 mobiele structuur blijft staan',metrics.railParent.includes('order-main')&&metrics.orderHeadParent==='orderContent',JSON.stringify(metrics));
    check('De drie bestaande catalogustabknoppen blijven zichtbaar',metrics.tabsVisible,String(metrics.tabsVisible));
    check('De productkolommen zijn niet opnieuw ontworpen',metrics.columns===2,`kolommen=${metrics.columns}`);
    check('De bestaande producttegelhoogte blijft vrijwel gelijk',metrics.tileHeight>=80&&metrics.tileHeight<=86,`hoogte=${metrics.tileHeight}`);
    check('Alleen de productnaam is bescheiden vergroot',px(metrics.productFont)>=11&&px(metrics.productFont)<=12,metrics.productFont);
    check('De productprijs is bescheiden vergroot',px(metrics.priceFont)>=10&&px(metrics.priceFont)<=11,metrics.priceFont);
    check('De categorieletter is iets groter maar de rail blijft staan',px(metrics.categoryFont)>=9&&px(metrics.categoryFont)<=10.2,metrics.categoryFont);
    check('Zoeken en hoofdweergaven zijn leesbaarder',px(metrics.searchFont)>=11&&px(metrics.viewFont)>=11.5,`${metrics.searchFont}/${metrics.viewFont}`);
    check('De tafelkaart is niet verkleind of heringedeeld',metrics.floorHeight===500,`hoogte=${metrics.floorHeight}`);
    check('Geen horizontale documentoverflow',metrics.docScrollWidth<=metrics.docWidth+2,`${metrics.docScrollWidth}/${metrics.docWidth}`);

    const tile=page.locator('.product-tile').filter({hasText:'Aperol Spritz'}).first();
    await tile.scrollIntoViewIfNeeded();
    await page.evaluate(()=>{
      const target=[...document.querySelectorAll('.product-tile')].find(node=>node.textContent.includes('Aperol Spritz'));
      const top=(target?.getBoundingClientRect().top||0)+window.scrollY;
      window.scrollTo(0,Math.max(1,top-220));
    });
    await page.waitForTimeout(100);
    const before=await page.evaluate(()=>({y:window.scrollY,table:window.__kassaAppApi?.getSelectedTableId?.()||''}));
    await tile.click();
    await page.locator('#ticketList .ticket-row').waitFor();
    await page.waitForTimeout(850);
    const after=await page.evaluate(()=>({y:window.scrollY,table:window.__kassaAppApi?.getSelectedTableId?.()||'',qty:window.__kassaAppApi?.getOrder?.('K3')?.items?.find(item=>item.productId==='p1')?.qty||0}));
    check('Producttik springt niet terug naar de kaart',Math.abs(after.y-before.y)<=5,`${before.y}→${after.y}`);
    check('Producttik verandert de gekozen tafel niet',before.table==='K3'&&after.table==='K3',`${before.table}→${after.table}`);
    check('Producttik voegt nog steeds exact één toe',after.qty===1,`qty=${after.qty}`);
    check('Min en kruis blijven aanwezig',await page.locator('#ticketList .rk-minus-button').count()===1&&await page.locator('#ticketList [data-remove]').count()===1,'min/x');
    await page.screenshot({path:`${outDir}/v21-iphone-390.png`,fullPage:true});
    await context.close();
  }

  {
    const {context,page}=await openCashier(browser,{phone:false,width:1440,height:900,name:'desktop'});
    const metrics=await page.evaluate(()=>{
      const cs=node=>node?getComputedStyle(node):null;
      const grid=document.querySelector('.product-grid');
      const tile=document.querySelector('.product-tile');
      return {
        columns:cs(grid)?.gridTemplateColumns.split(/\s+/).filter(Boolean).length||0,
        productFont:cs(tile?.querySelector('strong'))?.fontSize||'',
        priceFont:cs(tile?.querySelector('span'))?.fontSize||''
      };
    });
    report.metrics.desktop=metrics;
    check('Desktopindeling blijft volledig onaangeraakt',metrics.columns===5&&px(metrics.productFont)===10&&px(metrics.priceFont)===9,JSON.stringify(metrics));
    await context.close();
  }

  check('Geen onverwachte JavaScript-fouten',report.errors.length===0,report.errors.join('\n'));
  report.passed=true;
}catch(error){report.failure=String(error?.stack||error);}finally{
  report.finishedAt=new Date().toISOString();
  writeFileSync(`${outDir}/v21-report.json`,JSON.stringify(report,null,2));
  writeFileSync(`${outDir}/v21-report.md`,[
    '# Registratiekassa v21 — alleen grotere letters',
    '',`**Resultaat: ${report.passed?'GESLAAGD':'MISLUKT'}**`,'',
    ...report.checks.map(item=>`- ${item.ok?'✅':'❌'} ${item.name}${item.details?` — ${item.details}`:''}`),
    report.failure?`\n## Fout\n\n\`\`\`text\n${report.failure}\n\`\`\``:''
  ].join('\n'));
  if(browser)await browser.close();
}
if(!report.passed)process.exitCode=1;
