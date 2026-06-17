import { state } from './state.ts';
import { settingsModal, modalTitle, settingEnabled, globalFields } from './dom.ts';

let _settingsFolder: string | null = null;

export function openSettingsModal(folder: string): void {
  const plugin = state.plugins.find(p => p.folder === folder);
  if (!plugin) return;
  _settingsFolder = folder;

  modalTitle.textContent  = `${plugin.name} — Settings`;
  settingEnabled.checked  = plugin.enabled;
  globalFields.innerHTML  = '';

  for (const field of plugin.globalSettingsSchema ?? []) {
    const wrap       = document.createElement('div');
    wrap.className   = 'settings-field';
    const lbl        = document.createElement('label');
    lbl.textContent  = field.label;
    lbl.htmlFor      = `gf-${field.key}`;
    const inp        = document.createElement('input');
    inp.id           = `gf-${field.key}`;
    inp.name         = field.key;
    inp.type         = field.type === 'password' ? 'password'
                     : field.type === 'number'   ? 'number'
                     :                             'text';
    inp.value        = String(plugin.globalSettings?.[field.key] ?? field.defaultValue ?? '');
    wrap.append(lbl, inp);
    if (field.description) {
      const desc       = document.createElement('div');
      desc.className   = 'field-desc';
      desc.textContent = field.description;
      wrap.appendChild(desc);
    }
    globalFields.appendChild(wrap);
  }

  settingsModal.classList.remove('hidden');
}

export async function saveSettings(): Promise<void> {
  const folder = _settingsFolder;
  if (!folder) return;

  const settings: Record<string, unknown> = {};
  globalFields.querySelectorAll<HTMLInputElement>('input[name]').forEach(inp => {
    settings[inp.name] = inp.type === 'number' ? Number(inp.value) : inp.value;
  });

  await fetch(`/api/plugins/${folder}/config`, {
    method:  'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ enabled: settingEnabled.checked, globalSettings: settings }),
  });

  const plugin = state.plugins.find(p => p.folder === folder);
  if (plugin) {
    plugin.enabled        = settingEnabled.checked;
    plugin.globalSettings = settings;
  }

  settingsModal.classList.add('hidden');
  const { renderTabs, setTabActive } = await import('./tabs.ts');
  renderTabs();
  setTabActive(state.activePlugin);
}
