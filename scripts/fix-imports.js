const fs = require('fs');
const path = require('path');

const fileMap = {
  updateGallerySettings: 'gallery-admin-actions',
  setGalleryPassword: 'gallery-admin-actions',
  setGalleryCoverImage: 'gallery-admin-actions',
  syncDriveFolder: 'gallery-admin-actions',
  shareGallery: 'gallery-admin-actions',
  prepareGalleryShare: 'gallery-admin-actions',
  ensureGalleryShareLinks: 'gallery-admin-actions',
  createGallery: 'gallery-admin-actions',
  deleteGallery: 'gallery-admin-actions',
  getGallerySummariesByContract: 'gallery-admin-actions',
  getGalleriesByContract: 'gallery-admin-actions',
  getGalleryByContract: 'gallery-admin-actions',

  reorderImages: 'gallery-selection-actions',
  updateImageNotes: 'gallery-selection-actions',
  toggleImageStar: 'gallery-selection-actions',
  batchSelectImages: 'gallery-selection-actions',

  prepareGalleryDownload: 'gallery-public-actions',
  getDownloadProgress: 'gallery-public-actions',
  unlockGalleryDownload: 'gallery-public-actions',
  addGalleryComment: 'gallery-public-actions',
  removeGalleryComment: 'gallery-public-actions',
  toggleGalleryReaction: 'gallery-public-actions',
  
  GallerySettingsPayload: 'gallery-core',
  GallerySummary: 'gallery-core',
  Gallery: 'gallery-core',
  GalleryShareDetails: 'gallery-core',
  GalleryShareLink: 'gallery-core'
};

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else { 
      if(file.endsWith('.ts') || file.endsWith('.tsx')) results.push(file);
    }
  });
  return results;
}

const files = [...walk('./components/contracts'), ...walk('./components/gallery'), ...walk('./app/gallery')];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes('@/app/actions/gallery-actions')) {
    console.log('Fixing ' + file);
    // Find import { ... } from "@/app/actions/gallery-actions"
    const regex = /import\s+(type\s+)?{([^}]+)}\s+from\s+['"]@\/app\/actions\/gallery-actions['"];?/g;
    let newContent = content;
    let match;
    while ((match = regex.exec(content)) !== null) {
      const isType = match[1] ? true : false;
      const imports = match[2].split(',').map(s => s.trim()).filter(s => s);
      const groups = {};
      imports.forEach(imp => {
        let name = imp;
        if(name.startsWith('type ')) name = name.replace('type ', '');
        if(name.includes(' as ')) name = name.split(' as ')[0].trim();
        const dest = fileMap[name] || 'gallery-core';
        if (!groups[dest]) groups[dest] = [];
        groups[dest].push(imp);
      });
      
      let replacement = '';
      for (const dest in groups) {
        replacement += `import ${isType ? 'type ' : ''}{ ${groups[dest].join(', ')} } from "@/app/actions/${dest}";\n`;
      }
      
      newContent = newContent.replace(match[0], replacement.trim());
    }
    fs.writeFileSync(file, newContent, 'utf8');
  }
});
console.log('Done');
