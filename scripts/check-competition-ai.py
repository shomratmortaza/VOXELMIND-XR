import asyncio,json,time
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path('/tmp/browser/competition')
ROOT.mkdir(parents=True, exist_ok=True)
def normalize(v):
 if isinstance(v,dict):return {k:normalize(x) for k,x in v.items() if x is not None}
 if isinstance(v,list):return [normalize(x) for x in v]
 return v
async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(headless=True)
  page=await browser.new_page(viewport={'width':1280,'height':1800});errors=[];modules={}
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.on('request',lambda r:modules.update({'scene':r.url}) if '/scene/store.ts' in r.url else None)
  await page.goto('http://localhost:8080',wait_until='domcontentloaded')
  await page.evaluate("localStorage.setItem('voxelmind.onboarding.done','1')")
  await page.goto('http://localhost:8080/studio?blank=true',wait_until='domcontentloaded')
  await page.locator('canvas').wait_for(timeout=60000);await page.wait_for_timeout(4000)
  if await page.get_by_role('button',name='Close AI commands',exact=True).is_visible():await page.get_by_role('button',name='Close AI commands',exact=True).click()
  await page.get_by_role('button',name='Studio menu',exact=True).click()
  await page.get_by_role('button',name='AI commands',exact=True).click()
  await page.get_by_label('Instruction',exact=True).fill('Add one executive desk, 1.4 metres wide, 0.75 metres tall, 0.7 metres deep, at the centre. No other furniture.')
  start=time.monotonic();await page.get_by_role('button',name='Propose',exact=True).click()
  await page.get_by_role('button',name='Apply selected',exact=True).wait_for(timeout=180000)
  seconds=round(time.monotonic()-start,2)
  await page.get_by_role('region',name='Proposed changes').screenshot(path=str(ROOT/'ai-review.png'))
  await page.get_by_role('button',name='Apply selected',exact=True).click();await page.wait_for_timeout(2500)
  await page.evaluate('async u=>{window.sceneStore=(await import(u)).useStudio}',modules['scene'])
  applied=await page.evaluate('sceneStore.getState().scene')
  assert any(o['kind']=='desk' for o in applied['objects']),applied
  await page.get_by_role('button',name='Undo',exact=True).click()
  assert not await page.evaluate("sceneStore.getState().scene.objects.some(o=>o.kind==='desk')")
  await page.get_by_role('button',name='Redo',exact=True).click()
  assert normalize(applied)==normalize(await page.evaluate('sceneStore.getState().scene'))
  if await page.get_by_role('button',name='Close AI commands',exact=True).is_visible():await page.get_by_role('button',name='Close AI commands',exact=True).click()
  await page.get_by_role('button',name='Studio menu',exact=True).click()
  await page.get_by_role('button',name='Project actions',exact=True).click()
  async with page.expect_download() as dl:await page.get_by_role('button',name='Export',exact=True).click()
  download=await dl.value;path=await download.path();exported=json.loads(Path(path).read_text())
  assert normalize(exported)==normalize(applied)
  await page.wait_for_timeout(1500);await page.reload(wait_until='domcontentloaded');await page.wait_for_timeout(5000)
  await page.evaluate('async u=>{window.sceneStore=(await import(u)).useStudio}',modules['scene'])
  assert normalize(applied)==normalize(await page.evaluate('sceneStore.getState().scene'))
  await page.screenshot(path=str(ROOT/'ai-restored.png'))
  await page.set_viewport_size({'width':824,'height':674});await page.wait_for_timeout(1500)
  assert await page.evaluate('document.documentElement.scrollWidth<=window.innerWidth')
  await page.get_by_role('button',name='Enter VR',exact=True).click();await page.get_by_role('dialog').wait_for()
  await page.screenshot(path=str(ROOT/'824-vr-feedback.png'))
  result={'signedOutLiveAI':True,'reviewSeconds':seconds,'deskApplied':True,'undoRedo':True,'jsonExport':True,'reloadExact':True,'fit824x674':True,'pageErrors':errors}
  print(json.dumps(result));(ROOT/'ai-results.json').write_text(json.dumps(result,indent=2));assert not errors,errors
  await browser.close()
asyncio.run(main())
