from pathlib import Path
import runpy, shutil, json
from PIL import Image, ImageOps
root=Path(__file__).resolve().parents[1]
runpy.run_path(str(Path(__file__).with_name('stage_painting.py')),run_name='__main__')
for name in ['gallery.html','gallery.js','additions.css']:
    shutil.copy2(root/name,root/'_site'/name)
data=json.loads((root/'gallery-data.json').read_text())
for name in set(p[k] for p in data['photos'] for k in ['full','thumb']):
    assert name.startswith('assets/') and '..' not in Path(name).parts
    out=root/'_site'/name;out.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(root/name,out)
im=Image.open(root/'assets/gallery/published-5-full.webp').convert('RGB')
ImageOps.fit(im,(1200,630),method=Image.Resampling.LANCZOS).save(root/'_site/assets/gallery-social.jpg','JPEG',quality=88)
