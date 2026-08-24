const DEMO_ROOM_URL = 'https://images.unsplash.com/photo-1722348673544-f76ef2b195fa?auto=format&fit=crop&w=1600&q=86';

function buildPalette() {
  const desktop = $('#palette');
  const mobile = $('#mobile-palette');
  let currentGroup = '';
  let groupWrap = null;
  for (const [group, name, color] of palette) {
    if (group !== currentGroup) {
      currentGroup = group;
      const section = document.createElement('section');
      section.className = 'palette-group';
      const heading = document.createElement('h4');
      heading.textContent = group;
      groupWrap = document.createElement('div');
      groupWrap.className = 'palette-group-swatches';
      section.append(heading, groupWrap);
      desktop.append(section);
    }
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'swatch';
    button.dataset.name = name;
    button.dataset.color = color;
    button.draggable = true;
    button.setAttribute('aria-label', `${name}, ${color}`);
    button.title = `${name} · ${color.toUpperCase()}`;
    const dot = document.createElement('span');
    dot.className = 'swatch-dot';
    dot.style.background = color;
    const label = document.createElement('span');
    label.className = 'swatch-name';
    label.textContent = name;
    button.append(dot, label);
    button.addEventListener('click', () => Studio.setColor(name, color));
    button.addEventListener('dragstart', (event) => event.dataTransfer.setData('text/plain', JSON.stringify({ name, color })));
    groupWrap.append(button);
    const mobileButton = document.createElement('button');
    mobileButton.type = 'button';
    mobileButton.className = 'mobile-swatch';
    mobileButton.dataset.color = color;
    mobileButton.setAttribute('aria-label', name);
    mobileButton.title = name;
    mobileButton.style.background = color;
    mobileButton.addEventListener('click', () => Studio.setColor(name, color));
    mobile.append(mobileButton);
  }
  Studio.setColor('Terracotta', '#a85e49');
}

function buildQuickStart() {
  const workspace = $('.studio-workspace');
  const quick = document.createElement('div');
  quick.className = 'studio-quickstart';
  quick.setAttribute('aria-label', 'Color Studio quick start');
  quick.innerHTML = '<span><b>1</b> Try a sample or upload a photo</span><span><b>2</b> Tap the area you want to change</span><span><b>3</b> Pick a color and compare</span>';
  workspace.before(quick);
}

function simplifySurfaceControls() {
  const sections = $$('#studio-controls > section');
  if (sections.length < 3) return;
  sections[0].querySelector('h3').textContent = '1. Tap the Area';
  sections[1].querySelector('h3').textContent = '2. Pick a Color';
  sections[2].querySelector('h3').textContent = '3. Compare & Request';

  const explanation = sections[0].querySelector('p:last-of-type');
  explanation.textContent = 'Start with Tap Area. If the edge is imperfect, use Add or Remove. Most photos need nothing else.';

  const details = document.createElement('details');
  details.className = 'studio-advanced';
  const summary = document.createElement('summary');
  summary.textContent = 'Fine-tune selection';
  const body = document.createElement('div');
  body.className = 'studio-advanced-body';
  const toleranceLabel = $('#tolerance').closest('label');
  const rangeEnds = $('.range-ends', sections[0]);
  const brushLabel = $('#brush-size').closest('label');
  const selectionToggle = $('.selection-toggle', sections[0]);
  body.append(toleranceLabel, rangeEnds, brushLabel, selectionToggle);
  details.append(summary, body);
  explanation.before(details);

  $('#tolerance').value = '30';
  $('#tolerance-value').value = '30';
}

function buildDemoRoom() {
  const uploadZone = $('#upload-zone');
  const row = document.createElement('div');
  row.className = 'studio-demo-row';
  row.innerHTML = '<span>No photo handy?</span><button type="button" class="studio-demo-button">Try a sample room</button>';
  uploadZone.after(row);
  const button = $('.studio-demo-button', row);
  button.addEventListener('click', async () => {
    button.disabled = true;
    const prior = button.textContent;
    button.textContent = 'Loading sample…';
    $('#studio-status').textContent = 'Loading a sample room…';
    try {
      const response = await fetch(DEMO_ROOM_URL, { mode: 'cors' });
      if (!response.ok) throw new Error('sample unavailable');
      const blob = await response.blob();
      const file = new File([blob], 'cimo-sample-room.jpg', { type: blob.type || 'image/jpeg' });
      await Studio.load(file);
      row.hidden = true;
      $('#studio-status').textContent = 'Sample ready. Tap the area you want to change, then pick a color.';
    } catch {
      $('#studio-status').textContent = 'The sample room could not load. Upload your own photo to continue.';
    } finally {
      button.disabled = false;
      button.textContent = prior;
    }
  });
  return row;
}

buildPalette();
buildQuickStart();
simplifySurfaceControls();
const demoRow = buildDemoRoom();

$('#photo-input').addEventListener('change', async (event) => {
  await Studio.load(event.target.files[0]);
  if (event.target.files[0]) demoRow.hidden = true;
});
const uploadZone = $('#upload-zone');
uploadZone.addEventListener('dragover', (event) => { event.preventDefault(); uploadZone.classList.add('drag'); });
uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('drag'));
uploadZone.addEventListener('drop', async (event) => {
  event.preventDefault();
  uploadZone.classList.remove('drag');
  if (event.dataTransfer.files.length !== 1) {
    $('#studio-status').textContent = 'Please choose one image only.';
    return;
  }
  await Studio.load(event.dataTransfer.files[0]);
  demoRow.hidden = true;
});
$$('.tool').forEach((button) => button.addEventListener('click', () => Studio.setTool(button.dataset.tool)));
$$('[data-mobile-tool]').forEach((button) => button.addEventListener('click', () => Studio.setTool(button.dataset.mobileTool)));
$('#tolerance').addEventListener('input', (event) => { $('#tolerance-value').value = event.target.value; });
$('#brush-size').addEventListener('input', (event) => { $('#brush-value').value = event.target.value; });
$('#custom-color').addEventListener('input', (event) => Studio.setColor(`Custom ${event.target.value.toUpperCase()}`, event.target.value));
$('#show-selection').addEventListener('change', (event) => Studio.setSelectionVisible(event.target.checked));
$('#undo').addEventListener('click', () => Studio.undo());
$('#reset').addEventListener('click', () => Studio.reset());
$('#compare-range').addEventListener('input', (event) => {
  $('#show-original').setAttribute('aria-pressed', 'false');
  $('#show-preview').setAttribute('aria-pressed', 'false');
  Studio.render(event.target.value);
});
$('#show-original').addEventListener('click', () => Studio.setView(0));
$('#show-preview').addEventListener('click', () => Studio.setView(100));
