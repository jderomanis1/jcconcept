"""Build an allowlisted, dependency-free Pages directory. No private photos or tooling ship."""
from pathlib import Path
import shutil
from PIL import Image, ImageOps, ImageDraw, ImageFont
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / '_site'
if OUT.exists():
    shutil.rmtree(OUT)
OUT.mkdir()
FILES = ['index.html','404.html','robots.txt','sitemap.xml','config.js','base.css','studio.css','site.js','studio-core.js','studio-ui.js']
ASSETS = ['favicon.svg','studio-room.webp','room-illustration.svg','projects/interior.webp','projects/preparation.webp','projects/garage.webp','projects/workshop.webp']
for name in FILES:
    shutil.copy2(ROOT / name, OUT / name)
for name in ASSETS:
    dst = OUT / 'assets' / name
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(ROOT / 'assets' / name, dst)
# Raster social card is built, not a broken/unsupported SVG Open Graph reference.
card = Image.new('RGB',(1200,630),'#f8f6f0')
photo = ImageOps.fit(Image.open(ROOT/'assets/studio-room.webp').convert('RGB'),(540,630))
card.paste(photo,(660,0)); d = ImageDraw.Draw(card)
def font(size, bold=False):
    path='/usr/share/fonts/truetype/dejavu/DejaVuSans'+('-Bold' if bold else '')+'.ttf'
    return ImageFont.truetype(path,size)
d.text((52,43),'CIMO',font=font(56,True),fill='#181715')
d.text((55,113),'HOME REFRESHMENTS',font=font(19),fill='#625f57')
for y,text in [(210,'A fresh color.'),(287,'A space that'),(364,'feels like you.')]:
    d.text((52,y),text,font=font(48,True),fill='#181715' if y<364 else '#984e37')
d.text((55,500),'Painting in Rochester, NY',font=font(24),fill='#625f57')
d.text((55,548),'585-880-9905',font=font(28,True),fill='#984e37')
d.rounded_rectangle((841,581,1184,618),6,fill='#f8f6f0')
d.text((853,590),'Sample room, not a Cimo project.',font=font(17),fill='#181715')
card.save(OUT/'assets/social-card.png',optimize=True)
(OUT/'.nojekyll').write_text('')
print('Staged',len(list(OUT.rglob('*'))),'public entries.')
