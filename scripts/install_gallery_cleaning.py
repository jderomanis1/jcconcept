"""Install the scoped gallery/cleaning additions; reruns are idempotent."""
from pathlib import Path
import html, json, re, shutil

ROOT = Path(__file__).resolve().parents[1]
E = html.escape
BOOKING = 'https://cimohomerefreshments.setmore.com/'
THEMES = {'all':'All work','interiors':'Interiors & trim','outdoors':'Outdoor details','preparation':'Preparation','workshop':'Workshop & metalwork'}
# Descriptive details, not fabricated before/after pairs or separate-job counts.
ROWS = [
 ('porch-railing','outdoors','Porch railing & entry','Finish detail','Black metal railing beside a white porch column. A closer look at the detail work.','Black metal handrail beside front steps, a white column and potted flowers',5,1400,1050),
 ('hallway','interiors','Gray walls & white trim','Interior detail','A hallway view showing wall color, paneled doors and contrasting white trim.','Gray hallway walls with white paneled doors and trim','interior-finish.avif',800,600),
 ('covered-porch','outdoors','Covered porch refresh','Outdoor detail','Porch flooring, painted framing and railing, viewed from inside the covered space.','Covered porch with a gray floor, light painted ceiling beams and white railing',2,1400,1050),
 ('stained-post','outdoors','Stained wood post','Stain detail','Warm wood stain on an outdoor light post. The work-area protection is still in place.','Stained wooden outdoor lamp post with protective cloth around its base',1,1050,1400),
 ('window-preparation','preparation','Protecting the window details','In progress','Masking around a bay window and visible wall repairs before the finish coats.','Bay window surrounded by protective masking and visible wall preparation','surface-prep-detail.avif',800,600),
 ('porch-entry','outdoors','Porch from the garden','Outdoor detail','A second view of the porch, showing the white railing and entry from the garden path.','White porch railing and entry seen from a garden path',3,1400,1050),
 ('workshop-shelving','workshop','Workshop metalwork preparation','In progress','Metal shelving with taped edges during preparation. Shown as work in progress, not a completed workshop renovation.','Dark metal workshop shelving with blue painter\u2019s tape along the shelf edges','workshop-prep.avif',800,600),
 ('railing-closeup','outdoors','The railing, up close','Finish detail','A close view of the black handrail finish and its curved metalwork.','Close-up of black painted metal handrail beside green planting',4,1050,1400),
]
photos=[]
for id,theme,title,status,caption,alt,asset,width,height in ROWS:
    full=f'assets/gallery/published-{asset}-full.webp' if isinstance(asset,int) else f'assets/projects/{asset}'
    thumb=f'assets/gallery/published-{asset}-thumb.webp' if isinstance(asset,int) else full
    for path in (full,thumb):
        assert (ROOT/path).is_file(),f'Missing reviewed photo: {path}'
    photos.append(dict(id=id,theme=theme,title=title,status=status,caption=caption,alt=alt,full=full,thumb=thumb,width=width,height=height))
# Retain the additional approved door detail when its complete verified asset exists.
if (ROOT/'assets/gallery/door-detail.avif').is_file():
    photos.insert(5,dict(id='door-detail',theme='interiors',title='Paneled door & casing',status='Interior detail',caption='A close view of a white paneled door and the surrounding painted trim.',alt='White paneled interior door and surrounding white casing against gray walls',full='assets/gallery/door-detail.avif',thumb='assets/gallery/door-detail.avif',width=825,height=1100))
(ROOT/'gallery-data.json').write_text(json.dumps({'themes':THEMES,'photos':photos},indent=2,ensure_ascii=False)+'\n')

home=(ROOT/'index.html').read_text()
if 'additions.css' not in home:
    home=home.replace('</head>','  <link rel="stylesheet" href="additions.css?v=20260910-gallery">\n</head>',1)
if not re.search(r'id=[\"\']gallery[\"\']',home):
    cards=[]
    for theme,id in [('interiors','hallway'),('outdoors','porch-railing'),('preparation','window-preparation')]:
        p=next(p for p in photos if p['id']==id)
        cards.append(f'<a class="theme-card" href="gallery.html?theme={theme}"><img src="{p["thumb"]}" width="{p["width"]}" height="{p["height"]}" alt="{E(p["alt"])}" loading="lazy" decoding="async"><span>{E(THEMES[theme])}<i aria-hidden="true">\u2197</i></span></a>')
    teaser='<section class="gallery-preview wrap" id="gallery" aria-labelledby="gallery-title"><div class="section-heading"><p class="eyebrow">The photo gallery</p><h2 id="gallery-title">The work.<br><em>The little details.</em></h2><p>Explore selected photos of Justin\u2019s painting, outdoor details and preparation. Real project photos, with work in progress clearly identified.</p><a class="text-link" href="gallery.html">View the photo gallery \u2197</a></div><div class="gallery-preview-grid">'+''.join(cards)+'</div></section>\n'
    # Add after the services and before the process when its anchor is available.
    match=re.search(r'<section\b[^>]*\bid=[\"\'](?:process|standard)[\"\'][^>]*>',home)
    if match: home=home[:match.start()]+teaser+home[match.start():]
    else: home=home.replace('</main>',teaser+'</main>',1)
if not re.search(r'id=[\"\']cleaning[\"\']',home):
    cleaning='''<section class="cleaning-section wrap" id="cleaning" aria-labelledby="cleaning-title"><div><p class="eyebrow">Cleaning</p><h2 id="cleaning-title">A fresh start.<br><em>Beyond the paint.</em></h2><p>Kitchens, bathrooms or a whole-home refresh. Discuss the spaces that need attention and explore cleaning options on Cimo\u2019s booking page.</p><div class="cleaning-actions"><a class="button" href="https://cimohomerefreshments.setmore.com/" target="_blank" rel="noopener noreferrer" aria-describedby="cleaning-booking-note">Cleaning &amp; booking options \u2197</a><a class="text-link" href="tel:+15858809905">Call Justin</a></div><p class="booking-note" id="cleaning-booking-note">Opens Setmore in a new tab. Choose a phone consultation, on-site walkthrough or full-home evaluation.</p></div><div class="cleaning-details"><article><h3>Kitchens &amp; bathrooms</h3><p>Focused cleaning for the rooms you use every day.</p></article><article><h3>Deep &amp; whole-home cleaning</h3><p>Discuss high-traffic areas, priorities and a cleaning plan suited to your home.</p></article><article><h3>Move-in / move-out cleaning</h3><p>Talk through the cleaning your space needs before a move or after a departure.</p></article><p class="booking-note">Cleaning appointments are arranged separately. Painting preparation and project cleanup remain part of the painting process.</p></div></section>\n'''
    old=re.search(r'<aside\b[^>]*class=[\"\'][^\"\']*cleaning-callout[^\"\']*[\"\'][^>]*>[\s\S]*?</aside>',home)
    if old: home=home[:old.start()]+cleaning+home[old.end():]
    else:
        match=re.search(r'<section\b[^>]*\bid=[\"\']contact[\"\'][^>]*>',home)
        if match: home=home[:match.start()]+cleaning+home[match.start():]
        else: home=home.replace('</main>',cleaning+'</main>',1)
# Keep the familiar header; add only the requested destinations.
nav=re.search(r'(<nav\b[^>]*\bid=[\"\']site-nav[\"\'][^>]*>)([\s\S]*?)(</nav>)',home)
assert nav,'Header navigation not found'
inner=nav.group(2)
if 'gallery.html' not in inner:
    extra='<a href="gallery.html">Gallery</a><a href="#cleaning">Cleaning</a>'
    before=re.search(r'<a\b[^>]*href=[\"\']#(?:process|standard|why|contact)[\"\']',inner)
    pos=before.start() if before else len(inner)
    inner=inner[:pos]+extra+inner[pos:]
home=home[:nav.start()]+nav.group(1)+inner+nav.group(3)+home[nav.end():]
footer_match=re.search(r'<footer\b[\s\S]*?</footer>',home)
if footer_match and 'gallery.html' not in footer_match.group():
    footer=footer_match.group();links='<a href="gallery.html">Gallery</a><a href="#cleaning">Cleaning</a>'
    if '</nav>' in footer: footer=footer.replace('</nav>',links+'</nav>',1)
    else: footer=footer.replace('</footer>','<nav aria-label="More services">'+links+'</nav></footer>')
    home=home[:footer_match.start()]+footer+home[footer_match.end():]
(ROOT/'index.html').write_text(home)
css=ROOT/'additions.css'
if 'gallery-preview{padding-block' not in css.read_text():
    with css.open('a') as out: out.write('\n.gallery-preview{padding-block:65px}.gallery-preview .section-heading{margin-bottom:28px}.gallery-preview .section-heading h2{font-size:clamp(2rem,4vw,3.2rem)}.gallery-preview .section-heading p:not(.eyebrow){max-width:650px;color:var(--muted);margin:18px 0}.gallery-filters[hidden]{display:none}.gallery-card[hidden]{display:none}\n')
header=re.search(r'<header\b[\s\S]*?</header>',home).group()
footer=re.search(r'<footer\b[\s\S]*?</footer>',home).group()
for old,new in [('href="#home"','href="./"'),('href="#','href="./#')]:
    header=header.replace(old,new);footer=footer.replace(old,new)
header=header.replace('<a href="gallery.html">Gallery</a>','<a href="gallery.html" aria-current="page">Gallery</a>')
fontlinks='\n'.join(m.group() for m in re.finditer(r'<link\b[^>]*>',home) if 'preload' in m.group() and 'font' in m.group())
filterhtml=''.join(f'<button type="button" data-theme="{key}" data-label="{E(label)}" aria-pressed="{str(key=="all").lower()}">{E(label)} <span class="filter-count">{len(photos) if key=="all" else sum(p["theme"]==key for p in photos)}</span></button>' for key,label in THEMES.items())
cards=[]
for i,p in enumerate(photos):
    attrs=' '.join(f'data-{key}="{E(str(p[key]))}"' for key in ('id','theme','title','status','caption'))
    cards.append(f'''<li class="gallery-card" data-theme="{p['theme']}"><figure><a class="gallery-photo" href="{p['full']}" {attrs} target="_blank" rel="noopener" aria-label="View {E(p['title'])}"><img src="{p['thumb']}" width="{p['width']}" height="{p['height']}" alt="{E(p['alt'])}" loading="{'eager' if i<3 else 'lazy'}" decoding="async"><span class="photo-open-label" aria-hidden="true">View photo \u2197</span></a><figcaption><h2>{E(p['title'])}</h2><span class="photo-status" data-progress="{str(p['status']=='In progress').lower()}">{E(p['status'])}</span><p>{E(p['caption'])}</p></figcaption></figure></li>''')
page=f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Project Photo Gallery | Cimo Home Refreshments | Rochester, NY</title><meta name="description" content="Explore Justin\u2019s painting photos, interior trim, outdoor details, preparation and workshop metalwork. Cimo Home Refreshments in the Rochester, NY area."><link rel="canonical" href="https://jderomanis1.github.io/jcconcept/gallery.html"><meta name="theme-color" content="#f8f6f0"><meta property="og:title" content="A closer look at Cimo\u2019s work"><meta property="og:type" content="website"><meta property="og:url" content="https://jderomanis1.github.io/jcconcept/gallery.html"><meta property="og:image" content="https://jderomanis1.github.io/jcconcept/assets/gallery-social.jpg">{fontlinks}<link rel="stylesheet" href="base.css?v=20260909"><link rel="stylesheet" href="additions.css?v=20260910-gallery"><script src="gallery.js?v=20260910-gallery" defer></script></head><body class="gallery-page"><a class="skip-link" href="#main">Skip to gallery</a>{header}<main id="main"><section class="gallery-intro wrap"><div class="gallery-breadcrumb"><a href="./#gallery">\u2190 Back to home</a><span aria-hidden="true">/</span><span>Photo gallery</span></div><p class="eyebrow">Selected project photos</p><h1>A closer look.<br><em>A little more possibility.</em></h1><p>Explore Justin\u2019s interior painting, outdoor details and preparation work. Finished details and work in progress are labeled so you know what you\u2019re looking at.</p></section><section class="wrap" aria-label="Project photographs"><div class="gallery-tools"><div class="gallery-filters" role="group" aria-label="Filter photos by theme" hidden>{filterhtml}</div><p class="gallery-results" id="gallery-results" role="status" aria-live="polite">{len(photos)} photos \u00b7 All work</p><noscript><p>Browse the photos below. A photo opens in a new tab, so the gallery stays here for you.</p></noscript></div><ul class="gallery-grid">{''.join(cards)}</ul><div class="gallery-footer-cta"><div><h2>What would you like to refresh?</h2><p>Tell Justin about your space and the finish you have in mind.</p><a class="text-link" href="./#gallery">\u2190 Back to home</a></div><a class="button" href="./#contact">Get a Free Estimate</a></div></section></main>{footer}<dialog class="photo-dialog" id="photo-dialog" aria-labelledby="viewer-title" aria-describedby="viewer-description"><div class="photo-viewer"><div class="viewer-top"><a href="./#gallery" id="viewer-home">\u2190 Home</a><button type="button" id="photo-close">\u00d7 Back to gallery</button></div><div class="viewer-stage" id="viewer-stage"><img id="viewer-image" alt="" hidden><p class="viewer-loading" id="viewer-loading" role="status">Loading photo\u2026</p><div class="viewer-error" id="viewer-error" role="alert" hidden>This photo could not load. Try the next photo, or return to the gallery.<a id="viewer-original" href="gallery.html" target="_blank" rel="noopener">Open photo in a new tab \u2197</a></div></div><div class="viewer-bottom"><div class="viewer-caption"><span class="photo-status" id="viewer-status"></span><h2 id="viewer-title">Project photograph</h2><p id="viewer-description"></p></div><div class="viewer-controls"><span class="viewer-count" id="viewer-count" role="status" aria-live="polite"></span><button type="button" id="photo-prev" aria-label="Previous photo">\u2190 Previous</button><button type="button" id="photo-next" aria-label="Next photo">Next \u2192</button><span class="viewer-help">Arrow keys to browse \u00b7 Escape to close</span></div></div></div></dialog></body></html>'''
(ROOT/'gallery.html').write_text(page)
# Wrap the existing staging implementation, preserving its original public allowlist.
stage=ROOT/'scripts/stage.py';original=ROOT/'scripts/stage_painting.py'
if not original.exists(): shutil.copyfile(stage,original)
stage.write_text('''from pathlib import Path
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
''')
sitemap=ROOT/'sitemap.xml'
if sitemap.exists() and 'gallery.html' not in sitemap.read_text(): sitemap.write_text(sitemap.read_text().replace('</urlset>','  <url><loc>https://jderomanis1.github.io/jcconcept/gallery.html</loc><lastmod>2026-09-10</lastmod></url>\n</urlset>'))
(ROOT/'docs/GALLERY_CLEANING_REVIEW.md').write_text('''# Gallery and Cleaning additions

Preserves the approved website design and all original runtime JavaScript, stylesheets and Color Studio assets. Adds a separate gallery and compact home-page Cleaning section, with Gallery and Cleaning in navigation.

Gallery uses the owner-published Setmore photos and previously reviewed owner project photos only. No stock garage photo, Color Studio templates, invented before/after pairs, customer names, addresses or unverified whole-project claims. Work in progress is labeled. Photos are served locally. Source provenance remains in gallery-published-sources.json and project-photo-sources.json.

The viewer offers theme filters, previous/next, arrow keys, Escape, touch swiping, visible close and Home controls, deep links, browser Back, focus/scroll restoration and image-error recovery. Without JavaScript, every photo and Home link is still available.

Cleaning content is based on https://cimohomerefreshments.setmore.com/ as reviewed September 10, 2026: kitchens/bathrooms, deep/whole-home and move-in/out cleaning; phone consultation, on-site walkthrough and full-home evaluation. No cleaning prices are copied or embedded. The external booking site opens in a new tab and retains its own content. No appointment is booked automatically. No unapproved cleaner profile or contact is published.

Painting remains the primary service. Cleaning is arranged separately from the preparation and cleanup included with painting.
''')
print(f'Installed {len(photos)} reviewed gallery photographs and Cleaning navigation/content.')
