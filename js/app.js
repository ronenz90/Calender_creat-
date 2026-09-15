/**
 * Hebrew Calendar Designer - Full Client-Side App
 * Relative paths only → GitHub Pages ready
 */

import { getAllProjects, getProject, saveProject, deleteProject, saveImage, getImage, deleteImagesForProject } from './storage/indexeddb.js';
import { isLeapYear, getMonthNames, getMonthData, getYearMonths, formatHebrewYear, toGematria, DAY_SHORT } from './calendar/calendar-engine.js';
import { exportProjectToZip, importProjectFromZip } from './export/project-exporter.js';

window.__calendarEngine = { getMonthData, DAY_SHORT };

let currentView = 'dashboard';
let currentProject = null;
let currentMonthIndex = 0;
let wizardStep = 1;
let wizardData = { name: 'לוח שנה חדש', year: 5787, designId: 'classic' };
let imageCache = {};

const TEMPLATES = [
  { id: 'classic', name: 'קלאסי', colors: { primary: '#1a365d', bg: '#f8f4e8', accent: '#c9a227' } },
  { id: 'modern', name: 'מודרני', colors: { primary: '#2d3748', bg: '#edf2f7', accent: '#4299e1' } },
  { id: 'family', name: 'משפחתי', colors: { primary: '#744210', bg: '#fefcbf', accent: '#dd6b20' } },
  { id: 'elegant', name: 'יוקרתי', colors: { primary: '#1a202c', bg: '#f7fafc', accent: '#b7791f' } },
  { id: 'kids', name: 'ילדים', colors: { primary: '#2b6cb0', bg: '#ebf8ff', accent: '#ed8936' } },
  { id: 'minimal', name: 'מינימלי', colors: { primary: '#4a5568', bg: '#ffffff', accent: '#718096' } }
];

const LAYOUTS = [
  { id: '1', name: 'תמונה אחת', slots: 1 },
  { id: '2', name: 'שתי תמונות', slots: 2 },
  { id: '3', name: 'גדולה + 2', slots: 3 },
  { id: '4', name: 'רשת 2×2', slots: 4 },
  { id: '5', name: 'גיבור + 4', slots: 5 },
  { id: '6', name: 'רשת 3×2', slots: 6 }
];

function uuid() {
  return crypto.randomUUID ? crypto.randomUUID() : 'id-' + Date.now() + '-' + Math.random().toString(36).slice(2);
}

function showToast(msg, duration = 2800) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.add('hidden'), duration);
}

function showView(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  const el = document.getElementById('view-' + name);
  if (el) el.classList.add('active');
  currentView = name;
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}

async function renderDashboard() {
  try {
    const projects = await getAllProjects();
    const list = document.getElementById('projects-list');
    const empty = document.getElementById('empty-state');
    list.innerHTML = '';
    if (!projects || projects.length === 0) {
      empty.classList.remove('hidden');
      return;
    }
    empty.classList.add('hidden');
    projects.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
    for (const p of projects) {
      const design = TEMPLATES.find(t => t.id === p.designId) || TEMPLATES[0];
      const monthsCount = isLeapYear(p.hebrewYear) ? 13 : 12;
      const yearStr = formatHebrewYear(p.hebrewYear);
      const card = document.createElement('div');
      card.className = 'project-card';
      card.innerHTML = `
        <div class="project-preview" style="background:${design.colors.bg};color:${design.colors.primary}">📅</div>
        <div class="project-info">
          <h3>${escapeHtml(p.name)}</h3>
          <div class="project-meta">
            ${yearStr} · ${p.hebrewYear} · ${monthsCount} חודשים · ${design.name}<br>
            עודכן: ${new Date(p.updatedAt).toLocaleDateString('he-IL')}
          </div>
          <div class="project-actions">
            <button class="btn btn-primary btn-open" data-id="${p.id}">פתח</button>
            <button class="btn btn-secondary btn-dup" data-id="${p.id}">שכפל</button>
            <button class="btn btn-secondary btn-export" data-id="${p.id}">ייצא</button>
            <button class="btn btn-danger btn-del" data-id="${p.id}">מחק</button>
          </div>
        </div>`;
      list.appendChild(card);
    }
    list.querySelectorAll('.btn-open').forEach(b => b.addEventListener('click', () => openProject(b.dataset.id)));
    list.querySelectorAll('.btn-dup').forEach(b => b.addEventListener('click', () => duplicateProject(b.dataset.id)));
    list.querySelectorAll('.btn-del').forEach(b => b.addEventListener('click', () => confirmDelete(b.dataset.id)));
    list.querySelectorAll('.btn-export').forEach(b => b.addEventListener('click', () => doExportZip(b.dataset.id)));
  } catch (e) {
    console.error(e);
    showToast('שגיאה בטעינת הפרויקטים');
  }
}

function initWizard() {
  const yearSelect = document.getElementById('hebrew-year');
  yearSelect.innerHTML = '';
  for (let y = 5787; y <= 5820; y++) {
    const opt = document.createElement('option');
    opt.value = y;
    opt.textContent = formatHebrewYear(y) + ' — ' + y;
    if (y === 5787) opt.selected = true;
    yearSelect.appendChild(opt);
  }
  const grid = document.getElementById('template-grid');
  grid.innerHTML = '';
  TEMPLATES.forEach(t => {
    const el = document.createElement('div');
    el.className = 'template-card' + (t.id === wizardData.designId ? ' selected' : '');
    el.dataset.id = t.id;
    el.innerHTML = '<div class="swatch" style="background:' + t.colors.primary + '"></div><span>' + t.name + '</span>';
    el.addEventListener('click', () => {
      grid.querySelectorAll('.template-card').forEach(c => c.classList.remove('selected'));
      el.classList.add('selected');
      wizardData.designId = t.id;
    });
    grid.appendChild(el);
  });
}

function updateWizardUI() {
  document.querySelectorAll('.wizard-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('wizard-step-' + wizardStep)?.classList.add('active');
  document.querySelectorAll('.wizard-steps .step').forEach(s => {
    s.classList.toggle('active', parseInt(s.dataset.step) === wizardStep);
  });
  document.getElementById('btn-wizard-prev').classList.toggle('hidden', wizardStep === 1);
  document.getElementById('btn-wizard-next').classList.toggle('hidden', wizardStep === 3);
  document.getElementById('btn-wizard-create').classList.toggle('hidden', wizardStep !== 3);
}

async function createProjectFromWizard() {
  const name = (document.getElementById('project-name').value || '').trim() || 'לוח שנה חדש';
  const year = parseInt(document.getElementById('hebrew-year').value, 10) || 5787;
  const designId = wizardData.designId || 'classic';
  const months = getYearMonths(year);
  const project = {
    id: uuid(),
    name,
    hebrewYear: year,
    designId,
    schemaVersion: 1,
    settings: { paper: 'A4', orientation: 'landscape', locale: 'IL' },
    months: months.map(m => ({
      monthId: m.id,
      monthIndex: m.index,
      name: m.name,
      layout: '1',
      template: designId,
      images: [],
      imageSettings: {}
    })),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  try {
    await saveProject(project);
    showToast('הלוח נוצר בהצלחה ✨');
    await openProject(project.id);
  } catch (e) {
    console.error(e);
    showToast('שגיאה ביצירת הפרויקט');
  }
}

async function openProject(id) {
  try {
    currentProject = await getProject(id);
    if (!currentProject) {
      showToast('הפרויקט לא נמצא');
      return;
    }
    currentMonthIndex = 0;
    imageCache = {};
    document.getElementById('editor-title').textContent = currentProject.name;
    showView('editor');
    await renderEditor();
  } catch (e) {
    console.error(e);
    showToast('שגיאה בפתיחת הפרויקט');
  }
}

async function renderEditor() {
  if (!currentProject) return;
  const month = currentProject.months[currentMonthIndex];
  if (!month) return;
  document.getElementById('current-month-name').textContent = month.name;

  const thumbs = document.getElementById('months-thumbs');
  thumbs.innerHTML = '';
  currentProject.months.forEach((m, i) => {
    const btn = document.createElement('button');
    btn.className = 'month-thumb' + (i === currentMonthIndex ? ' active' : '');
    btn.textContent = m.name;
    btn.addEventListener('click', async () => {
      currentMonthIndex = i;
      await renderEditor();
    });
    thumbs.appendChild(btn);
  });

  const layoutOpts = document.getElementById('layout-options');
  layoutOpts.innerHTML = '';
  LAYOUTS.forEach(l => {
    const btn = document.createElement('button');
    btn.className = 'layout-btn' + (month.layout === l.id ? ' selected' : '');
    btn.textContent = l.name;
    btn.addEventListener('click', async () => {
      const applyAll = document.querySelector('input[name="apply-layout"]:checked')?.value === 'all';
      if (applyAll) currentProject.months.forEach(m => m.layout = l.id);
      else month.layout = l.id;
      await autoSave();
      await renderEditor();
    });
    layoutOpts.appendChild(btn);
  });

  const designOpts = document.getElementById('design-options');
  designOpts.innerHTML = '';
  TEMPLATES.forEach(t => {
    const btn = document.createElement('button');
    btn.className = 'design-btn' + ((month.template || currentProject.designId) === t.id ? ' selected' : '');
    btn.innerHTML = '<span class="swatch" style="background:' + t.colors.primary + '"></span> ' + t.name;
    btn.addEventListener('click', async () => {
      const applyAll = document.querySelector('input[name="apply-design"]:checked')?.value === 'all';
      if (applyAll) {
        currentProject.months.forEach(m => m.template = t.id);
        currentProject.designId = t.id;
      } else month.template = t.id;
      await autoSave();
      await renderEditor();
    });
    designOpts.appendChild(btn);
  });

  await renderImagesList(month);
  await renderPreview(month);
}

async function renderImagesList(month) {
  const list = document.getElementById('images-list');
  list.innerHTML = '';
  if (!month.images || month.images.length === 0) {
    list.innerHTML = '<p style="color:#718096;font-size:0.9rem;">אין תמונות עדיין. העלה תמונות כדי להתחיל.</p>';
    return;
  }
  for (const id of month.images) {
    let dataUrl = imageCache[id];
    if (!dataUrl) {
      const img = await getImage(id);
      if (img) { dataUrl = img.dataUrl; imageCache[id] = dataUrl; }
    }
    const item = document.createElement('div');
    item.className = 'image-item';
    item.innerHTML = '<img src="' + (dataUrl || '') + '" alt="" width="48" height="48"><span style="flex:1;font-size:0.85rem;">תמונה</span><button class="btn btn-danger" data-id="' + id + '" style="padding:0.2rem 0.5rem;font-size:0.8rem;">×</button>';
    item.querySelector('button').addEventListener('click', async () => {
      month.images = month.images.filter(i => i !== id);
      await autoSave();
      await renderEditor();
    });
    list.appendChild(item);
  }
}

async function renderPreview(month) {
  const container = document.getElementById('page-preview');
  const template = TEMPLATES.find(t => t.id === (month.template || currentProject.designId)) || TEMPLATES[0];
  const monthData = getMonthData(currentProject.hebrewYear, month.monthIndex);

  let imagesHtml = '';
  const imgIds = month.images || [];
  if (imgIds.length === 0) {
    imagesHtml = '<div class="image-placeholder">אזור תמונות — העלה תמונות מהתפריט</div>';
  } else {
    imagesHtml = '<div class="images-area layout-' + (month.layout || '1') + '">';
    for (let i = 0; i < Math.min(imgIds.length, 6); i++) {
      let src = imageCache[imgIds[i]];
      if (!src) {
        const img = await getImage(imgIds[i]);
        if (img) { src = img.dataUrl; imageCache[imgIds[i]] = src; }
      }
      if (src) imagesHtml += '<div class="img-slot"><img src="' + src + '" alt=""></div>';
    }
    imagesHtml += '</div>';
  }

  let cal = '<div class="cal-grid"><div class="cal-header">';
  DAY_SHORT.forEach(d => { cal += '<div class="cal-day-name">' + d + '</div>'; });
  cal += '</div><div class="cal-body">';
  const firstDow = monthData.days[0]?.dayOfWeek ?? 0;
  for (let i = 0; i < firstDow; i++) cal += '<div class="cal-cell empty"></div>';
  monthData.days.forEach(day => {
    const cls = ['cal-cell'];
    if (day.isShabbat) cls.push('shabbat');
    if (day.holidays.length) cls.push('holiday');
    const hol = day.holidays[0]?.name || '';
    cal += '<div class="' + cls.join(' ') + '"><div class="he-day">' + day.hebrewDayGematria + '</div><div class="gr-day">' + day.gregorianDate.getDate() + '/' + (day.gregorianDate.getMonth() + 1) + '</div>' + (hol ? '<div class="hol-name" title="' + hol + '">' + hol + '</div>' : '') + '</div>';
  });
  cal += '</div></div>';

  container.innerHTML = '<div class="page" style="background:' + template.colors.bg + ';border-color:' + template.colors.primary + '"><div class="page-top" style="background:' + template.colors.primary + '18">' + imagesHtml + '</div><div class="page-bottom"><h2 class="month-title" style="color:' + template.colors.primary + '">' + escapeHtml(month.name) + '</h2>' + cal + '</div></div>';
}

async function autoSave() {
  if (!currentProject) return;
  const status = document.getElementById('save-status');
  status.textContent = 'שומר...';
  try {
    currentProject.updatedAt = new Date().toISOString();
    await saveProject(currentProject);
    status.textContent = '✓ נשמר';
  } catch (e) {
    status.textContent = 'שגיאה בשמירה';
    console.error(e);
  }
}

async function duplicateProject(id) {
  try {
    const orig = await getProject(id);
    if (!orig) return;
    const copy = JSON.parse(JSON.stringify(orig));
    copy.id = uuid();
    copy.name = (orig.name || 'לוח') + ' (עותק)';
    copy.createdAt = new Date().toISOString();
    copy.updatedAt = copy.createdAt;
    await saveProject(copy);
    showToast('הפרויקט שוכפל');
    await renderDashboard();
  } catch (e) {
    showToast('שגיאה בשכפול');
  }
}

function confirmDelete(id) {
  const modal = document.getElementById('confirm-modal');
  document.getElementById('confirm-title').textContent = 'מחיקת פרויקט';
  document.getElementById('confirm-message').textContent = 'האם אתה בטוח שברצונך למחוק את הפרויקט? הפעולה אינה ניתנת לביטול.';
  modal.classList.remove('hidden');
  const okBtn = document.getElementById('btn-confirm-ok');
  const cancelBtn = document.getElementById('btn-confirm-cancel');
  const cleanup = () => { okBtn.onclick = null; cancelBtn.onclick = null; modal.classList.add('hidden'); };
  okBtn.onclick = async () => {
    try {
      await deleteImagesForProject(id);
      await deleteProject(id);
      showToast('הפרויקט נמחק');
      await renderDashboard();
    } catch (e) { showToast('שגיאה במחיקה'); }
    cleanup();
  };
  cancelBtn.onclick = cleanup;
}

function setupImageUpload() {
  const zone = document.getElementById('upload-zone');
  const input = document.getElementById('image-input');
  document.getElementById('btn-select-images').addEventListener('click', () => input.click());
  zone.addEventListener('click', e => { if (e.target === zone || e.target.tagName === 'P') input.click(); });
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('dragover'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
  zone.addEventListener('drop', e => { e.preventDefault(); zone.classList.remove('dragover'); handleFiles(e.dataTransfer.files); });
  input.addEventListener('change', () => { handleFiles(input.files); input.value = ''; });
}

async function handleFiles(files) {
  if (!currentProject || !files?.length) return;
  const month = currentProject.months[currentMonthIndex];
  let added = 0;
  for (const file of Array.from(files)) {
    if (!file.type.match(/^image\/(jpeg|png|webp)$/i)) { showToast('סוג קובץ לא נתמך'); continue; }
    if (file.size > 12 * 1024 * 1024) { showToast('התמונה גדולה מדי (מקס 12MB)'); continue; }
    try {
      const dataUrl = await readFileAsDataURL(file);
      const optimized = await optimizeImage(dataUrl, 2000);
      const id = uuid();
      await saveImage({ id, projectId: currentProject.id, dataUrl: optimized, name: file.name, type: file.type });
      month.images.push(id);
      imageCache[id] = optimized;
      added++;
    } catch (e) { console.error(e); showToast('שגיאה בהעלאת תמונה'); }
  }
  if (added) {
    const count = month.images.length;
    if (count === 1) month.layout = '1';
    else if (count === 2) month.layout = '2';
    else if (count === 3) month.layout = '3';
    else if (count === 4) month.layout = '4';
    else if (count === 5) month.layout = '5';
    else month.layout = '6';
    await autoSave();
    showToast(added + ' תמונות נוספו');
    await renderEditor();
  }
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function optimizeImage(dataUrl, maxSize = 1800) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      let w = img.width, h = img.height;
      if (w <= maxSize && h <= maxSize) { resolve(dataUrl); return; }
      const r = Math.min(maxSize / w, maxSize / h);
      w = Math.round(w * r); h = Math.round(h * r);
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      c.getContext('2d').drawImage(img, 0, 0, w, h);
      resolve(c.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

async function generatePDF() {
  if (!currentProject) return;
  const modal = document.getElementById('pdf-modal');
  modal.classList.remove('hidden');
  document.getElementById('pdf-status').textContent = 'מכין את לוח השנה...';
  document.getElementById('pdf-detail').textContent = '';
  document.getElementById('pdf-progress').style.width = '0%';
  document.getElementById('btn-download-pdf').classList.add('hidden');
  document.getElementById('btn-close-pdf').classList.add('hidden');

  try {
    if (!window.jspdf) {
      await new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'vendor/jspdf.umd.min.js';
        s.onload = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
      });
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageW = 297, pageH = 210, margin = 7;
    const topH = pageH * 0.52;
    const total = currentProject.months.length;

    for (let i = 0; i < total; i++) {
      if (i > 0) doc.addPage();
      document.getElementById('pdf-detail').textContent = 'חודש ' + (i + 1) + ' מתוך ' + total;
      document.getElementById('pdf-progress').style.width = ((i + 1) / total * 100) + '%';

      const month = currentProject.months[i];
      const template = TEMPLATES.find(t => t.id === (month.template || currentProject.designId)) || TEMPLATES[0];
      const monthData = getMonthData(currentProject.hebrewYear, month.monthIndex);
      const rgb = hexToRgb(template.primary);
      const bgRgb = hexToRgb(template.bg);

      doc.setFillColor(...bgRgb);
      doc.rect(0, 0, pageW, pageH, 'F');
      doc.setFillColor(rgb[0], rgb[1], rgb[2]);
      doc.setGState(new doc.GState({ opacity: 0.08 }));
      doc.rect(margin, margin, pageW - 2 * margin, topH - margin, 'F');
      doc.setGState(new doc.GState({ opacity: 1 }));

      const imgIds = (month.images || []).slice(0, 6);
      if (imgIds.length) {
        const slots = getSlots(month.layout || '1', margin + 2, margin + 2, pageW - 2 * margin - 4, topH - margin - 4);
        for (let s = 0; s < Math.min(imgIds.length, slots.length); s++) {
          let dataUrl = imageCache[imgIds[s]];
          if (!dataUrl) {
            const img = await getImage(imgIds[s]);
            if (img) dataUrl = img.dataUrl;
          }
          if (dataUrl) {
            try {
              const slot = slots[s];
              doc.addImage(dataUrl, 'JPEG', slot.x, slot.y, slot.w, slot.h, undefined, 'FAST');
            } catch (e) {}
          }
        }
      } else {
        doc.setFontSize(12);
        doc.setTextColor(140);
        doc.text('הוסף תמונות', pageW / 2, topH / 2, { align: 'center' });
      }

      doc.setFontSize(20);
      doc.setTextColor(...rgb);
      doc.text(month.name, pageW / 2, topH + 9, { align: 'center' });
      drawFullCalendar(doc, monthData, margin, topH + 12, pageW - 2 * margin, pageH - topH - 18, template);
    }

    document.getElementById('pdf-status').textContent = 'ה-PDF מוכן!';
    document.getElementById('btn-download-pdf').classList.remove('hidden');
    document.getElementById('btn-close-pdf').classList.remove('hidden');
    const filename = 'לוח_' + (currentProject.name || 'שנה').replace(/\s+/g, '_') + '_' + currentProject.hebrewYear + '.pdf';

    document.getElementById('btn-download-pdf').onclick = () => {
      doc.save(filename);
      showToast('ה-PDF הורד בהצלחה');
      modal.classList.add('hidden');
    };
    document.getElementById('btn-close-pdf').onclick = () => modal.classList.add('hidden');
  } catch (e) {
    console.error(e);
    document.getElementById('pdf-status').textContent = 'שגיאה ביצירת PDF';
    document.getElementById('pdf-detail').textContent = e.message || '';
    document.getElementById('btn-close-pdf').classList.remove('hidden');
    document.getElementById('btn-close-pdf').onclick = () => modal.classList.add('hidden');
  }
}

function hexToRgb(hex) {
  hex = (hex || '#1a365d').replace('#', '');
  if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  const n = parseInt(hex, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function getSlots(layout, x, y, w, h) {
  const g = 1.5;
  switch (layout) {
    case '1': return [{ x, y, w, h }];
    case '2': return [{ x, y, w: w/2 - g/2, h }, { x: x + w/2 + g/2, y, w: w/2 - g/2, h }];
    case '3': return [{ x, y, w: w*0.62 - g/2, h }, { x: x + w*0.62 + g/2, y, w: w*0.38 - g/2, h: h/2 - g/2 }, { x: x + w*0.62 + g/2, y: y + h/2 + g/2, w: w*0.38 - g/2, h: h/2 - g/2 }];
    case '4': return [{ x, y, w: w/2 - g/2, h: h/2 - g/2 }, { x: x + w/2 + g/2, y, w: w/2 - g/2, h: h/2 - g/2 }, { x, y: y + h/2 + g/2, w: w/2 - g/2, h: h/2 - g/2 }, { x: x + w/2 + g/2, y: y + h/2 + g/2, w: w/2 - g/2, h: h/2 - g/2 }];
    case '5': return [{ x, y, w, h: h*0.55 - g/2 }, { x, y: y + h*0.55 + g/2, w: w/4 - g, h: h*0.45 - g/2 }, { x: x + w/4 + g/2, y: y + h*0.55 + g/2, w: w/4 - g, h: h*0.45 - g/2 }, { x: x + w/2 + g/2, y: y + h*0.55 + g/2, w: w/4 - g, h: h*0.45 - g/2 }, { x: x + 3*w/4 + g/2, y: y + h*0.55 + g/2, w: w/4 - g, h: h*0.45 - g/2 }];
    case '6': return [{ x, y, w: w/3 - g, h: h/2 - g/2 }, { x: x + w/3 + g/2, y, w: w/3 - g, h: h/2 - g/2 }, { x: x + 2*w/3 + g/2, y, w: w/3 - g, h: h/2 - g/2 }, { x, y: y + h/2 + g/2, w: w/3 - g, h: h/2 - g/2 }, { x: x + w/3 + g/2, y: y + h/2 + g/2, w: w/3 - g, h: h/2 - g/2 }, { x: x + 2*w/3 + g/2, y: y + h/2 + g/2, w: w/3 - g, h: h/2 - g/2 }];
    default: return [{ x, y, w, h }];
  }
}

function drawFullCalendar(doc, monthData, x, y, w, h, template) {
  const cellW = w / 7;
  const headerH = 7;
  const rows = 6;
  const cellH = (h - headerH) / rows;
  const rgb = hexToRgb(template.primary);

  doc.setFillColor(...rgb);
  doc.rect(x, y, w, headerH, 'F');
  doc.setFontSize(8);
  doc.setTextColor(255);
  DAY_SHORT.forEach((d, i) => doc.text(d, x + i * cellW + cellW / 2, y + 5, { align: 'center' }));

  doc.setDrawColor(210);
  doc.setLineWidth(0.15);
  for (let r = 0; r <= rows; r++) doc.line(x, y + headerH + r * cellH, x + w, y + headerH + r * cellH);
  for (let c = 0; c <= 7; c++) doc.line(x + c * cellW, y + headerH, x + c * cellW, y + headerH + rows * cellH);

  const firstDow = monthData.days[0]?.dayOfWeek ?? 0;
  monthData.days.forEach((day, idx) => {
    const pos = firstDow + idx;
    const col = pos % 7;
    const row = Math.floor(pos / 7);
    if (row >= rows) return;
    const cx = x + col * cellW;
    const cy = y + headerH + row * cellH;
    if (day.isShabbat) { doc.setFillColor(240, 255, 244); doc.rect(cx + 0.3, cy + 0.3, cellW - 0.6, cellH - 0.6, 'F'); }
    if (day.holidays.length) { doc.setFillColor(255, 245, 245); doc.rect(cx + 0.3, cy + 0.3, cellW - 0.6, cellH - 0.6, 'F'); }
    doc.setFontSize(9);
    doc.setTextColor(...rgb);
    doc.text(day.hebrewDayGematria, cx + 2, cy + 5);
    doc.setFontSize(6);
    doc.setTextColor(100);
    doc.text(String(day.gregorianDate.getDate()), cx + cellW - 2, cy + 5, { align: 'right' });
    if (day.holidays[0]) {
      doc.setFontSize(5);
      doc.setTextColor(180, 40, 40);
      doc.text(day.holidays[0].name.slice(0, 11), cx + cellW / 2, cy + cellH - 2, { align: 'center' });
    }
  });
}

async function doExportZip(id) {
  try {
    showToast('מכין ZIP...');
    const project = id ? await getProject(id) : currentProject;
    if (!project) return;
    const { blob, filename } = await exportProjectToZip(project, getImage);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    showToast('הפרויקט יוצא בהצלחה');
  } catch (e) {
    console.error(e);
    showToast('שגיאה בייצוא: ' + (e.message || ''));
  }
}

function setupImport() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.zip,application/zip';
  input.hidden = true;
  document.body.appendChild(input);
  document.getElementById('btn-import')?.addEventListener('click', () => input.click());
  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    if (!file) return;
    try {
      showToast('מייבא פרויקט...');
      const project = await importProjectFromZip(file, saveProject, saveImage);
      showToast('הפרויקט יובא בהצלחה');
      await renderDashboard();
      await openProject(project.id);
    } catch (e) {
      console.error(e);
      showToast('שגיאה בייבוא: ' + (e.message || 'קובץ לא תקין'));
    }
    input.value = '';
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('btn-new-project').addEventListener('click', () => {
    wizardStep = 1;
    wizardData = { name: 'לוח שנה חדש', year: 5787, designId: 'classic' };
    document.getElementById('project-name').value = 'לוח שנה חדש';
    initWizard();
    updateWizardUI();
    showView('wizard');
  });
  document.getElementById('btn-first-project')?.addEventListener('click', () => document.getElementById('btn-new-project').click());

  document.getElementById('btn-wizard-back').addEventListener('click', () => showView('dashboard'));
  document.getElementById('btn-wizard-prev').addEventListener('click', () => { if (wizardStep > 1) { wizardStep--; updateWizardUI(); } });
  document.getElementById('btn-wizard-next').addEventListener('click', () => { if (wizardStep < 3) { wizardStep++; updateWizardUI(); } });
  document.getElementById('btn-wizard-create').addEventListener('click', createProjectFromWizard);

  document.getElementById('btn-back-dashboard').addEventListener('click', async () => { showView('dashboard'); await renderDashboard(); });
  document.getElementById('btn-prev-month').addEventListener('click', async () => { if (currentMonthIndex > 0) { currentMonthIndex--; await renderEditor(); } });
  document.getElementById('btn-next-month').addEventListener('click', async () => { if (currentProject && currentMonthIndex < currentProject.months.length - 1) { currentMonthIndex++; await renderEditor(); } });
  document.getElementById('btn-export-pdf').addEventListener('click', generatePDF);
  document.getElementById('btn-export-zip')?.addEventListener('click', () => doExportZip());

  document.querySelectorAll('.sidebar-tabs .tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.sidebar-tabs .tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById('tab-' + tab.dataset.tab)?.classList.add('active');
    });
  });

  setupImageUpload();
  setupImport();

  const style = document.createElement('style');
  style.textContent = '.images-area{width:100%;height:100%;display:grid;gap:4px;padding:6px;box-sizing:border-box}.images-area .img-slot{overflow:hidden;border-radius:6px}.images-area .img-slot img{width:100%;height:100%;object-fit:cover;display:block}.layout-1{grid-template-columns:1fr;grid-template-rows:1fr}.layout-2{grid-template-columns:1fr 1fr;grid-template-rows:1fr}.layout-3{grid-template-columns:1.6fr 1fr;grid-template-rows:1fr 1fr}.layout-3 .img-slot:first-child{grid-row:1/3}.layout-4{grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr}.layout-5{grid-template-columns:1fr 1fr 1fr 1fr;grid-template-rows:1.3fr 1fr}.layout-5 .img-slot:first-child{grid-column:1/5}.layout-6{grid-template-columns:1fr 1fr 1fr;grid-template-rows:1fr 1fr}';
  document.head.appendChild(style);

  await renderDashboard();
});
