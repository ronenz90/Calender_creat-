/**
 * IndexedDB Storage Layer
 */

const DB_NAME = 'HebrewCalendarDesigner';
const DB_VERSION = 1;
const STORE_PROJECTS = 'projects';
const STORE_IMAGES = 'images';

let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(new Error('IndexedDB לא זמין'));
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_PROJECTS)) {
        db.createObjectStore(STORE_PROJECTS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_IMAGES)) {
        db.createObjectStore(STORE_IMAGES, { keyPath: 'id' });
      }
    };
  });
  return dbPromise;
}

async function getAllProjects() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PROJECTS, 'readonly');
    const store = tx.objectStore(STORE_PROJECTS);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

async function getProject(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PROJECTS, 'readonly');
    const req = tx.objectStore(STORE_PROJECTS).get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveProject(project) {
  const db = await openDB();
  project.updatedAt = new Date().toISOString();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PROJECTS, 'readwrite');
    const req = tx.objectStore(STORE_PROJECTS).put(project);
    req.onsuccess = () => resolve(project);
    req.onerror = () => reject(req.error);
  });
}

async function deleteProject(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PROJECTS, 'readwrite');
    const req = tx.objectStore(STORE_PROJECTS).delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function saveImage(image) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_IMAGES, 'readwrite');
    const req = tx.objectStore(STORE_IMAGES).put(image);
    req.onsuccess = () => resolve(image);
    req.onerror = () => reject(req.error);
  });
}

async function getImage(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_IMAGES, 'readonly');
    const req = tx.objectStore(STORE_IMAGES).get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function deleteImagesForProject(projectId) {
  const db = await openDB();
  const all = await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_IMAGES, 'readonly');
    const req = tx.objectStore(STORE_IMAGES).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
  const toDelete = all.filter(img => img.projectId === projectId);
  const tx = db.transaction(STORE_IMAGES, 'readwrite');
  for (const img of toDelete) {
    tx.objectStore(STORE_IMAGES).delete(img.id);
  }
  return new Promise((resolve) => {
    tx.oncomplete = () => resolve();
  });
}

export {
  getAllProjects,
  getProject,
  saveProject,
  deleteProject,
  saveImage,
  getImage,
  deleteImagesForProject
};
