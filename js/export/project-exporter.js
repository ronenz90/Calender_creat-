/**
 * Project Export / Import using JSZip
 */

function loadJSZip() {
  return new Promise((resolve, reject) => {
    if (window.JSZip) return resolve(window.JSZip);
    const s = document.createElement('script');
    s.src = "vendor/jszip.min.js";
    s.onload = () => resolve(window.JSZip);
    s.onerror = () => reject(new Error('JSZip failed to load'));
    document.head.appendChild(s);
  });
}

export async function exportProjectToZip(project, getImageFn) {
  const JSZip = await loadJSZip();
  const zip = new JSZip();

  const meta = {
    schemaVersion: project.schemaVersion || 1,
    exportedAt: new Date().toISOString(),
    app: 'HebrewCalendarDesigner'
  };

  // Clone project without large data
  const projectCopy = JSON.parse(JSON.stringify(project));
  zip.file('project.json', JSON.stringify(projectCopy, null, 2));
  zip.file('metadata.json', JSON.stringify(meta, null, 2));

  const imagesFolder = zip.folder('images');
  if (project.months) {
    for (const month of project.months) {
      if (month.images) {
        for (const imgId of month.images) {
          try {
            const img = await getImageFn(imgId);
            if (img && img.dataUrl) {
              const base64 = img.dataUrl.split(',')[1];
              const ext = (img.type || 'image/jpeg').includes('png') ? 'png' : 'jpg';
              imagesFolder.file(`${imgId}.${ext}`, base64, { base64: true });
            }
          } catch (e) {
            console.warn('Skip image', imgId, e);
          }
        }
      }
    }
  }

  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
  const filename = `calendar-project-${(project.name || 'export').replace(/\s+/g, '_')}.zip`;
  return { blob, filename };
}

export async function importProjectFromZip(file, saveProjectFn, saveImageFn) {
  const JSZip = await loadJSZip();
  const zip = await JSZip.loadAsync(file);

  const projectFile = zip.file('project.json');
  if (!projectFile) throw new Error('קובץ ZIP לא תקין – חסר project.json');

  const projectText = await projectFile.async('string');
  let project;
  try {
    project = JSON.parse(projectText);
  } catch {
    throw new Error('קובץ project.json פגום');
  }

  if (!project.schemaVersion || project.schemaVersion > 1) {
    throw new Error('גרסת Schema לא נתמכת');
  }

  // New ID
  project.id = crypto.randomUUID ? crypto.randomUUID() : 'imp-' + Date.now();
  project.name = (project.name || 'מיובא') + ' (מיובא)';
  project.createdAt = new Date().toISOString();
  project.updatedAt = project.createdAt;

  // Import images
  const imagesFolder = zip.folder('images');
  if (imagesFolder) {
    const files = Object.keys(zip.files).filter(k => k.startsWith('images/') && !k.endsWith('/'));
    for (const path of files) {
      const name = path.split('/').pop();
      const id = name.replace(/\.(jpg|jpeg|png|webp)$/i, '');
      const data = await zip.file(path).async('base64');
      const ext = name.split('.').pop().toLowerCase();
      const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
      const dataUrl = `data:${mime};base64,${data}`;
      await saveImageFn({
        id,
        projectId: project.id,
        dataUrl,
        name,
        type: mime
      });
    }
  }

  await saveProjectFn(project);
  return project;
}
