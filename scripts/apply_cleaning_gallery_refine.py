from pathlib import Path
import re

root = Path(__file__).resolve().parents[1]
index = root / 'index.html'
text = index.read_text()

new_cleaning = '''  <section class="cleaning-section wrap" id="cleaning" aria-labelledby="cleaning-title">
    <div class="cleaning-intro">
      <p class="eyebrow">Cleaning referral</p>
      <h2 id="cleaning-title">A cleaner home.<br><em>One easy connection.</em></h2>
      <p>Need cleaning too? Cimo can connect you with a trusted family cleaning partner for the spaces that need extra attention. Tell Justin what you need and he can make the introduction.</p>
      <div class="cleaning-actions"><a class="button" href="#contact" data-service="Cleaning referral">Ask Justin about cleaning <span aria-hidden="true">↗</span></a><a class="text-link" href="sms:+15858809905">Text Justin</a></div>
      <p class="booking-note">No separate booking flow here. This is simply a referral option alongside Cimo's painting work.</p>
    </div>
    <div class="cleaning-overview" aria-label="Cleaning services available by referral">
      <article class="cleaning-card"><span class="cleaning-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 10h16M6 10V7h5v3M5 10v8h14v-8M9 14h2M14 14h3"/></svg></span><h3>Kitchens &amp; bathrooms</h3><p>Focused cleaning for kitchens, bathrooms and other high-use areas that need extra attention.</p></article>
      <article class="cleaning-card"><span class="cleaning-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M3 11.5 12 4l9 7.5M5.5 10v9h13v-9M9 19v-5h6v5M18.5 4.5l.6 1.4 1.4.6-1.4.6-.6 1.4-.6-1.4-1.4-.6 1.4-.6z"/></svg></span><h3>Deep &amp; whole-home</h3><p>For larger layouts, multiple rooms, high-traffic zones, deeper cleaning or special requests.</p></article>
      <article class="cleaning-card"><span class="cleaning-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 7h14v12H5zM8 7V5h8v2M9 12h6M12 9v6M18 4l1 1 2-2"/></svg></span><h3>Move-in / move-out</h3><p>Extra cleaning support when a home needs a reset before moving in or after moving out.</p></article>
    </div>
  </section>
'''

pattern = r'  <section class="cleaning-section wrap" id="cleaning"[\s\S]*?</section>\n'
text, count = re.subn(pattern, new_cleaning, text, count=1)
if count != 1:
    raise SystemExit(f'Expected one cleaning section, replaced {count}')

text = text.replace('additions.css?v=20260910-gallery', 'additions.css?v=20260910-refine')
text = text.replace('Interiors &amp; trim', 'Indoor work')
text = text.replace('Outdoor details', 'Outdoor work')
text = text.replace('>Preparation<', '>Preparation &amp; protection<')

if 'setmore.com' in re.search(r'<section class="cleaning-section wrap" id="cleaning"[\s\S]*?</section>', text).group(0):
    raise SystemExit('Cleaning section still links to Setmore')
if text.count('class="cleaning-card"') != 3:
    raise SystemExit('Expected exactly three cleaning referral cards')

index.write_text(text)
print('Updated on-site Cleaning referral overview and gallery teaser labels.')
