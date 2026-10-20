import asyncio,time,json
from pathlib import Path
from playwright.async_api import async_playwright
Path('/tmp/browser/full-flow').mkdir(parents=True, exist_ok=True)
async def main():
 async with async_playwright() as p:
  for engine in ['chromium','webkit']:
   b=await getattr(p,engine).launch(headless=True)
   page=await b.new_page(viewport={'width':440,'height':727}); errors=[]
   page.on('pageerror',lambda e:errors.append(str(e)))
   await page.goto('http://localhost:8080/studio?blank=true');await page.locator('canvas').wait_for()
   await page.get_by_role('button',name='Studio menu',exact=True).click()
   await page.get_by_role('button',name='New project',exact=True).click()
   await page.get_by_role('textbox',name='New project name').fill('End to end desk')
   await page.get_by_role('button',name='Create project',exact=True).click()
   await page.get_by_role('button',name='AI commands',exact=True).click()
   await page.get_by_role('textbox',name='Instruction',exact=True).fill('Add exactly one desk named Reload-proof desk at x 0 z 0, dimensions width 1.4 metres, height 0.75 metres, depth 0.7 metres. Keep the existing floor.')
   t=time.monotonic();await page.get_by_role('button',name='Propose',exact=True).click()
   await page.get_by_role('region',name='Proposed changes').wait_for(timeout=90000)
   print(engine,'AI review seconds',round(time.monotonic()-t,1))
   await page.get_by_role('button',name='Apply selected',exact=True).click()
   await page.get_by_role('button',name='Close AI commands',exact=True).click()
   async def scene():
    return await page.evaluate("JSON.parse(localStorage.getItem('voxelmind.current-world.v2')||'null')?.scene")
   await page.wait_for_timeout(800)
   applied=await scene();assert len([o for o in applied['objects'] if o['name']=='Reload-proof desk'])==1
   await page.screenshot(path=f'/tmp/browser/full-flow/{engine}-applied.png')
   await page.get_by_role('button',name='Undo',exact=True).click();await page.wait_for_timeout(700)
   undone=await scene();assert not any(o['name']=='Reload-proof desk' for o in undone['objects'])
   print(engine,'UNDO desk absent')
   await page.get_by_role('button',name='Redo',exact=True).click();await page.wait_for_timeout(700)
   redone=await scene();assert redone==applied;print(engine,'REDO exact snapshot restored')
   await page.reload();await page.locator('canvas').wait_for();await page.wait_for_timeout(1000)
   restored=await scene();print(engine,'RELOAD',restored['title'],len(restored['objects']))
   await page.screenshot(path=f'/tmp/browser/full-flow/{engine}-reload.png')
   assert restored==applied,'Reload replaced the project'
   assert await page.get_by_role('textbox',name='Project name',exact=True).input_value()=='End to end desk'
   assert await page.get_by_role('button',name='Enter VR',exact=True).is_disabled()
   print(engine,'PASS project flow and unsupported VR button',errors)
   await b.close()
asyncio.run(main())
