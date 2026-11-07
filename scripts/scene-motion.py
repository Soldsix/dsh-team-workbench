"""Inspect authored harbor motion with controlled timestamps and actual scene geometry."""
import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
import os
from pathlib import Path
import threading
from playwright.sync_api import sync_playwright

parser = argparse.ArgumentParser()
parser.add_argument('--project', required=True)
parser.add_argument('--output', required=True)
args = parser.parse_args()
project = Path(args.project).resolve()
output = Path(args.output).resolve()
output.mkdir(parents=True, exist_ok=True)


class Handler(SimpleHTTPRequestHandler):
    def log_message(self, *unused):
        pass


server = ThreadingHTTPServer(('127.0.0.1', 0), partial(Handler, directory=str(project / 'dist')))
threading.Thread(target=server.serve_forever, daemon=True).start()
report = {'passed': False, 'controlledTimestampSampling': True, 'unbatchedGeometryInspection': True,
    'cameraOverridesForInspection': True, 'sourceChanged': False, 'browserErrors': [], 'consoleErrors': [], 'samples': []}
try:
    with sync_playwright() as driver:
        chrome = os.environ.get('CHROME_BINARY') or ('C:/Program Files/Google/Chrome/Application/chrome.exe' if os.name == 'nt' else None)
        browser = driver.chromium.launch(headless=True, **({'executable_path': chrome} if chrome else {}))
        page = browser.new_page(viewport={'width': 1440, 'height': 1080})
        page.on('pageerror', lambda error: report['browserErrors'].append(str(error)))
        page.on('console', lambda message: report['consoleErrors'].append(message.text) if message.type == 'error' else None)
        origin = f'http://127.0.0.1:{server.server_address[1]}'
        page.route('**/*', lambda route: route.continue_() if route.request.url.startswith(origin + '/') else route.abort())
        page.add_init_script('''(() => {
          let timestamp = 0;
          const request = window.requestAnimationFrame.bind(window);
          window.__qaMotionTime = seconds => {timestamp = seconds * 1000;};
          window.requestAnimationFrame = callback => request(() => callback(timestamp));
        })()''')
        page.goto(origin, wait_until='networkidle')
        page.wait_for_function('window.__sceneQA?.report.frame > 2', timeout=45000)
        report['initial'] = page.evaluate('window.__sceneQA.stats()')
        report['inspectionSetup'] = page.evaluate('''() => {
          const qa = window.__sceneQA;
          const sun = qa.scene.children.find(node => node.isDirectionalLight && node.castShadow);
          if (!sun?.userData.cloudIllumination) throw new Error('No cloud illumination metadata');
          const originalSun = sun.userData.cloudIllumination.baseIntensity;
          const old = qa.world;
          qa.rebuild({batching:false});
          old.traverse(node => {
            node.geometry?.dispose();
            const materials = Array.isArray(node.material) ? node.material : node.material ? [node.material] : [];
            for (const material of materials) {material.map?.dispose();material.dispose();}
          });
          qa.controls.enableDamping = false;
          qa.controls.minDistance = .2;
          qa.controls.maxPolarAngle = Math.PI;
          const bird = qa.world.getObjectByName('gull-lander-01');
          const rope = qa.world.getObjectByName('dynamic-mooring-rope');
          if (!bird || !rope) throw new Error('Named landing bird or tension rope is missing');
          return {originalSun, ropeGeometry:rope.geometry.uuid,
            directionalLights:qa.scene.children.filter(node=>node.isDirectionalLight).map(node=>({shadow:node.castShadow,intensity:node.intensity}))};
        }''')
        page.evaluate('''() => {
          window.__qaMotionGeometries = new Set();
          window.__sceneQA.world.traverse(node => {if(node.geometry) window.__qaMotionGeometries.add(node.geometry);});
          window.__qaMotionBounds = root => {
            let combined;
            root.traverse(node => {
              if (!node.geometry?.attributes.position?.count) return;
              node.geometry.computeBoundingBox();
              const box = node.geometry.boundingBox.clone().applyMatrix4(node.matrixWorld);
              if (combined) combined.union(box); else combined = box;
            });
            if (!combined || combined.isEmpty()) throw new Error('No measurable geometry');
            return {min:combined.min.toArray(),max:combined.max.toArray()};
          };
          window.__qaMotionSample = () => {
            const qa = window.__sceneQA;
            qa.world.updateWorldMatrix(true,true);
            const bird = qa.world.getObjectByName('gull-lander-01');
            const legs = qa.world.getObjectByName('gull-lander-01-legs');
            const wings = [];
            bird.traverse(node => {if(node.isGroup && /wing/.test(node.name)) wings.push({name:node.name,rotation:node.rotation.toArray().slice(0,3)})});
            const supports = [];
            qa.world.getObjectByName('12-moorings').traverse(node => {
              if(node.name === 'iron-bollard') {
                const point = node.getWorldPosition(node.position.clone()).toArray();
                supports.push({point,bounds:window.__qaMotionBounds(node)});
              }
            });
            const support = supports.sort((a,b) => Math.hypot(a.point[0]-2.8,a.point[2]-2.7)-Math.hypot(b.point[0]-2.8,b.point[2]-2.7))[0];
            const rope = qa.world.getObjectByName('dynamic-mooring-rope');
            const positions = rope.geometry.attributes.position;
            const ring = start => {
              const result = [0,0,0];
              for(let i=start;i<start+8;i++) for(let axis=0;axis<3;axis++) result[axis]+=positions.array[i*3+axis]/8;
              return rope.localToWorld(rope.position.clone().set(...result)).toArray();
            };
            let finite = true, minimumOverQuay = Infinity;
            for(let i=0;i<positions.count;i++) {
              const point = [positions.getX(i),positions.getY(i),positions.getZ(i)];
              finite &&= point.every(Number.isFinite);
              if(point[2]>2.4) minimumOverQuay=Math.min(minimumOverQuay,point[1]);
            }
            const sun = qa.scene.children.find(node=>node.isDirectionalLight && node.castShadow);
            const geometries = new Set();
            let geometryReferencesStable = true;
            qa.world.traverse(node => {
              if (!node.geometry) return;
              geometries.add(node.geometry);
              geometryReferencesStable &&= window.__qaMotionGeometries.has(node.geometry);
            });
            const bands = [], beacon = [];
            qa.world.getObjectByName('31-sun-clouds').traverse(node=>{
              if(node.geometry?.type === 'TorusGeometry' && Math.abs(node.geometry.parameters.arc-Math.PI)<1e-6) bands.push(node.material.opacity);
            });
            qa.world.getObjectByName('23-lighthouse').traverse(node=>{
              if(node.geometry?.type === 'ConeGeometry' && Math.abs(node.geometry.parameters.height-1.6)<1e-6 && node.material.transparent) beacon.push(node.material.opacity);
            });
            return {birdPosition:bird.getWorldPosition(bird.position.clone()).toArray(), feet:window.__qaMotionBounds(legs), wings,
              support, rope:{geometry:rope.geometry.uuid,start:ring(0),middle:ring(Math.floor(positions.count/16)*8),end:ring(positions.count-8),finite,minimumOverQuay},
              sunIntensity:sun.intensity,fillIntensities:qa.scene.children.filter(node=>node.isDirectionalLight && !node.castShadow).map(node=>node.intensity),
              rainbowOpacity:Math.max(0,...bands),beaconOpacity:Math.max(0,...beacon),
              gpuRegisteredGeometries:qa.renderer.info.memory.geometries,sceneGeometryCount:geometries.size,
              geometryReferencesStable:geometryReferencesStable && geometries.size===window.__qaMotionGeometries.size};
          };
        }''')
        times = [0,3,6,8,10,13,17,20,24,32,40,48,60,61.5,62,63,84,88,90,92,98,99,100,120,180,210]
        for seconds in times:
            page.evaluate('window.__qaMotionTime', seconds)
            page.evaluate('async () => {for(let i=0;i<3;i++)await new Promise(resolve=>requestAnimationFrame(resolve));}')
            sample = page.evaluate('window.__qaMotionSample()')
            sample['seconds'] = seconds
            report['samples'].append(sample)
            if seconds in [0,8,20,24]:
                page.evaluate('''() => {
                  const qa=window.__sceneQA, p=qa.world.getObjectByName('gull-lander-01').position;
                  qa.camera.position.set(p.x+1.4,p.y+.8,p.z+1.7);qa.controls.target.copy(p);qa.controls.update();
                }''')
                page.evaluate('async () => {await new Promise(resolve=>requestAnimationFrame(resolve));}')
                page.screenshot(path=str(output / f'gull-{seconds:02d}s.png'))
        samples = {row['seconds']:row for row in report['samples']}
        report['rebuildSunBaselines'] = page.evaluate('''async () => {
          const qa=window.__sceneQA, values=[];
          for(let i=0;i<3;i++) {
            const old=qa.world;
            qa.rebuild();
            old.traverse(node=>{
              node.geometry?.dispose();
              for(const material of (Array.isArray(node.material)?node.material:node.material?[node.material]:[])) {material.map?.dispose();material.dispose();}
            });
            await new Promise(resolve=>requestAnimationFrame(resolve));
            values.push(qa.scene.children.find(node=>node.isDirectionalLight && node.castShadow).userData.cloudIllumination.baseIntensity);
          }
          return values;
        }''')
        perch = samples[0]
        landed_again = samples[24]
        flight = samples[8]
        base = report['inspectionSetup']['originalSun']
        first_anchor = perch['rope']['start']
        starts = [max(abs(a-b) for a,b in zip(row['rope']['start'],first_anchor)) for row in report['samples']]
        ends = [sum((a-b)**2 for a,b in zip(row['rope']['end'],perch['rope']['end']))**.5 for row in report['samples']]
        sag = [row['rope']['middle'][1] - (row['rope']['start'][1]+row['rope']['end'][1])/2 for row in report['samples']]
        report['checks'] = {
            'actualSupportAtLanding': abs(perch['feet']['min'][1]-perch['support']['bounds']['max'][1])<.01
                and abs(landed_again['feet']['min'][1]-landed_again['support']['bounds']['max'][1])<.01,
            'takesOffAndReturns': flight['birdPosition'][1]-perch['birdPosition'][1]>2 and max(abs(a-b) for a,b in zip(perch['birdPosition'],landed_again['birdPosition']))<1e-5,
            'foldedWingsAtRest': len(perch['wings'])==2 and all(abs(wing['rotation'][1])>1 for wing in perch['wings'])
                and all(abs(wing['rotation'][1])<.4 for wing in flight['wings']),
            'fixedRopeAnchor': max(starts)<1e-5,
            'movingRopeEndAndSag': max(ends)>.005 and max(sag)-min(sag)>.005,
            'ropeClearsConcrete': min(row['rope']['minimumOverQuay'] for row in report['samples'])>.8,
            'ropeFiniteAndGeometryReused': all(row['rope']['finite'] and row['rope']['geometry']==report['inspectionSetup']['ropeGeometry'] for row in report['samples']),
            'subtleCloudIllumination': all(abs(row['sunIntensity']/base-1)<=.030001 for row in report['samples'])
                and max(row['sunIntensity'] for row in report['samples'])-min(row['sunIntensity'] for row in report['samples'])>.01,
            'fillUnchanged': all(row['fillIntensities']==perch['fillIntensities'] for row in report['samples']),
            'rebuildPreservesSunBaseline': all(abs(value-base)<1e-9 for value in report['rebuildSunBaselines']),
            'rareBeaconAndRainbow': samples[62]['beaconOpacity']>.1 and samples[63]['beaconOpacity']==0
                and samples[92]['rainbowOpacity']>.1 and samples[99]['rainbowOpacity']==0,
            'sceneGeometryReferencesStable': all(row['geometryReferencesStable'] for row in report['samples']),
            'noUI': page.locator('body > :not(canvas):not(script)').count()==0,
        }
        report['passed'] = all(report['checks'].values()) and not report['browserErrors'] and not report['consoleErrors']
        browser.close()
finally:
    server.shutdown()
    server.server_close()
    (output / 'result.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'passed':report['passed'],'checks':report.get('checks'), 'samples':len(report['samples'])}))
