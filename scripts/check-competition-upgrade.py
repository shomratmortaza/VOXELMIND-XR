import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path('/tmp/browser/competition')
ROOT.mkdir(parents=True, exist_ok=True)
async def run(p, mode):
 browser=await p.chromium.launch(headless=True,args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 context=await browser.new_context(viewport={'width':1280,'height':1800})
 if mode=='iwsdk':
  async def sdk(route):
   response=await route.fetch();text=await response.text();text=text.replace('return value === "iwsdk"','return true');print('SDK override',response.url,'return true' in text);await route.fulfill(response=response,body=text)
  await context.route('**/*iwsdk-config*',sdk)
 page=await context.new_page();errors=[];modules={}
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('request',lambda r: modules.update({'sdkHand':r.url}) if '/IWSDKHand.tsx' in r.url else None)
 page.on('request',lambda r: modules.update({'xr':r.url}) if '/studio/xr-store.ts' in r.url else modules.update({'scene':r.url}) if '/scene/store.ts' in r.url else modules.update({'runtime':r.url}) if '/lib/xr-runtime.ts' in r.url else None)
 await page.goto('http://localhost:8080',wait_until='domcontentloaded')
 await page.evaluate("localStorage.setItem('voxelmind.onboarding.done','1')")
 await page.goto('http://localhost:8080/studio?blank=true',wait_until='domcontentloaded')
 await page.locator('canvas').wait_for(timeout=60000);await page.wait_for_timeout(5000)
 await page.get_by_role('button',name='Enter VR',exact=True).click()
 await page.get_by_role('dialog').wait_for();await page.get_by_role('dialog').screenshot(path=str(ROOT/(mode+'-fallback.png')))
 assert await page.get_by_text('Open this world on your headset',exact=True).count()==1
 await page.get_by_role('dialog').get_by_role('button',name='Close',exact=True).click()
 await page.evaluate('async m=>{window.xrStore=(await import(m.xr)).getXRStore();window.sceneStore=(await import(m.scene)).useStudio;window.runtimeStore=(await import(m.runtime)).useXRRuntime}',modules)
 await page.evaluate("sceneStore.getState().addPart('chair',[0,0.45,0]);window.id=sceneStore.getState().selectedId;sceneStore.getState().setSnapStep(0)")
 await page.wait_for_timeout(5000)
 await page.add_script_tag(path=str(Path(__file__).resolve().parents[1] / 'node_modules/iwer/build/iwer.js'))
 await page.evaluate("()=>{window.device=new IWER.XRDevice(IWER.metaQuest3);device.installRuntime({forceInstall:true});device.position.set(0,1.6,0);device.controllers.left.position.set(-3,1.3,-0.3);device.controllers.right.position.set(3,1.3,-0.3);window.requests=[];const original=navigator.xr.requestSession.bind(navigator.xr);navigator.xr.requestSession=(mode,init)=>{requests.push({mode,init,gesture:navigator.userActivation.isActive});return window.deny?Promise.reject(new DOMException('denied','NotAllowedError')):original(mode,init)};window.dispatchEvent(new Event('focus'))}")
 await page.wait_for_timeout(4500)
 await page.evaluate('window.deny=true');await page.get_by_role('button',name='Enter VR',exact=True).click()
 await page.get_by_text('VR permission was declined.',exact=False).wait_for(timeout=15000)
 assert await page.evaluate('xrStore.getState().session==null')
 await page.evaluate('window.deny=false');await page.get_by_role('button',name='Enter VR',exact=True).click()
 await page.get_by_text('Immersive session running',exact=True).wait_for(timeout=30000)
 await page.wait_for_timeout(6000)
 assert await page.evaluate('requests.every(r=>r.gesture)')
 await page.screenshot(path=str(ROOT/(mode+'-entry.png')))
 await page.evaluate("sceneStore.getState().setXRScale('life')")
 await page.wait_for_timeout(2000)
 await page.evaluate("()=>{const o=sceneStore.getState().scene.objects.find(o=>o.id===id),origin=xrStore.getState().origin.position;window.before=JSON.parse(JSON.stringify(o));window.past=sceneStore.getState().past.length;device.controllers.right.position.set(o.position[0]-origin.x,o.position[1]-origin.y,o.position[2]-origin.z);device.controllers.right.quaternion.set(0,0,0,1)}")
 await page.wait_for_timeout(1400);await page.evaluate("device.controllers.right.updateButtonValue('squeeze',1)");await page.wait_for_timeout(1200)
 await page.evaluate('device.controllers.right.position.x+=0.5');await page.wait_for_timeout(1200)
 await page.evaluate("device.controllers.right.updateButtonValue('squeeze',0)");await page.wait_for_timeout(4500)
 move=await page.evaluate("({before,after:sceneStore.getState().scene.objects.find(o=>o.id===id),undo:sceneStore.getState().past.length-past})")
 assert abs(move['after']['position'][0]-move['before']['position'][0]-.5)<.06,move
 assert move['undo']==1,move
 await page.evaluate("device.primaryInputMode='hand';device.hands.left.position.set(-3,1.3,-.3);device.hands.right.position.set(3,1.3,-.3)")
 await page.wait_for_timeout(4000)
 assert await page.evaluate("xrStore.getState().inputSourceStates.some(s=>s.type==='hand')")
 await page.evaluate("()=>{const o=sceneStore.getState().scene.objects.find(o=>o.id===id),origin=xrStore.getState().origin.position;window.handBefore=JSON.parse(JSON.stringify(o));device.hands.right.position.set(o.position[0]-origin.x,o.position[1]-origin.y,o.position[2]-origin.z);device.hands.right.quaternion.set(0,0,0,1)}")
 await page.wait_for_timeout(1400);await page.evaluate('device.hands.right.updatePinchValue(1)');await page.wait_for_timeout(1300)
 await page.evaluate('device.hands.right.position.x+=.5');await page.wait_for_timeout(1300);await page.evaluate('device.hands.right.updatePinchValue(0)');await page.wait_for_timeout(4500)
 hand=await page.evaluate("({before:handBefore,after:sceneStore.getState().scene.objects.find(o=>o.id===id)})")
 assert abs(hand['after']['position'][0]-hand['before']['position'][0]-.5)<.06,hand
 await page.screenshot(path=str(ROOT/(mode+'-hand-scene.png')))
 if mode=='iwsdk':
  assert 'sdkHand' in modules, 'SDK hand module did not load'
 saved=await page.evaluate('JSON.stringify(sceneStore.getState().scene)')
 await page.evaluate('xrStore.getState().session.end()')
 await page.get_by_text('Immersive session running',exact=True).wait_for(state='hidden')
 assert await page.evaluate('xrStore.getState().session==null && xrStore.getState().inputSourceStates.length===0')
 assert saved==await page.evaluate('JSON.stringify(sceneStore.getState().scene)')
 await page.get_by_role('button',name='Enter VR',exact=True).click()
 await page.get_by_text('Immersive session running',exact=True).wait_for(timeout=30000)
 await page.wait_for_timeout(1800)
 await page.evaluate('xrStore.getState().session.end()')
 await page.get_by_text('Immersive session running',exact=True).wait_for(state='hidden')
 await page.get_by_role('button',name='Undo',exact=True).click();await page.get_by_role('button',name='Redo',exact=True).click()
 assert saved==await page.evaluate('JSON.stringify(sceneStore.getState().scene)')
 await page.wait_for_timeout(1500);await page.reload(wait_until='domcontentloaded');await page.wait_for_timeout(5000)
 await page.evaluate('async m=>{window.sceneStore=(await import(m.scene)).useStudio;window.xrStore=(await import(m.xr)).getXRStore()}',modules)
 assert json.loads(saved)==await page.evaluate('sceneStore.getState().scene')
 await page.screenshot(path=str(ROOT/(mode+'-restored.png')))
 result={'mode':mode,'unsupportedFeedback':True,'deniedEntry':True,'gestureEntry':True,'controllerMove':move,'handMove':hand,'exitCleanup':True,'undoRedoReload':True,'pageErrors':errors}
 assert not errors,errors
 print(json.dumps(result));(ROOT/(mode+'-results.json')).write_text(json.dumps(result,indent=2))
 await browser.close()
async def main():
 async with async_playwright() as p:
  for mode in ['native','iwsdk']:await run(p,mode)
asyncio.run(main())
