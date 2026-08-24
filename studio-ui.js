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
    mobileButton.style.background = color;
    mobileButton.addEventListener('click', () => Studio.setColor(name, color));
    mobile.append(mobileButton);
  }
  Studio.setColor('Terracotta', '#a85e49');
}
buildPalette();

$('#photo-input').addEventListener('change', (event) => Studio.load(event.target.files[0]));
const uploadZone = $('#upload-zone');
uploadZone.addEventListener('dragover', (event) => { event.preventDefault(); uploadZone.classList.add('drag'); });
uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('drag'));
uploadZone.addEventListener('drop', (event) => {
  event.preventDefault();
  uploadZone.classList.remove('drag');
  if (event.dataTransfer.files.length !== 1) {
    $('#studio-status').textContent = 'Please choose one image only.';
    return;
  }
  Studio.load(event.dataTransfer.files[0]);
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
