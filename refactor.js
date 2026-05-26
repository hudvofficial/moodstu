const { Project } = require("ts-morph");
const fs = require("fs");
const path = require("path");

async function main() {
  const project = new Project({
    tsConfigFilePath: "tsconfig.json",
  });

  const sourceFile = project.getSourceFileOrThrow("app/actions/gallery-actions.ts");

  const adminFuncs = [
    "createGallery", "deleteGallery", "updateGallerySettings", "setGalleryPassword",
    "setGalleryCoverImage", "syncDriveFolder", "getGallerySummariesByContract",
    "getGalleriesByContract", "getGalleryByContract", "shareGallery",
    "prepareGalleryShare", "ensureGalleryShareLinks"
  ];

  const publicFuncs = [
    "getPublicGallery", "getPublicGalleryPreview", "getPublicGalleryImagesPaginated",
    "getPublicGalleryStats", "verifyGalleryPassword", "getGalleryPreviewMetadata",
    "fetchSharedGalleryByAccessUrl", "getPublicGalleryWithAccess", "getGalleryShareDetails"
  ];

  const selectionFuncs = [
    "toggleImageSelection", "toggleImageStar", "updateClientNote",
    "updateGalleryImageNote", "getSelectedImages", "createSelectionBatchFromCurrentSelection",
    "createGalleryFilterJob", "reorderImages"
  ];

  // 1. Get all imports
  const imports = sourceFile.getImportDeclarations().map(i => i.getText()).join("\n");

  // 2. Extract shared items (types, interfaces, constants, non-exported functions)
  let coreContent = imports + "\n\n";
  const coreExports = [];

  // Constants
  const variableStatements = sourceFile.getVariableStatements();
  for (const stmt of variableStatements) {
    if (!stmt.isExported()) {
      coreContent += "export " + stmt.getText() + "\n\n";
      coreExports.push(...stmt.getDeclarations().map(d => d.getName()));
    }
  }

  // Interfaces & Types
  const interfaces = sourceFile.getInterfaces();
  for (const intf of interfaces) {
    if (!intf.isExported()) {
      coreContent += "export " + intf.getText() + "\n\n";
      coreExports.push(intf.getName());
    } else {
        // if exported, also put in core
        coreContent += intf.getText() + "\n\n";
        coreExports.push(intf.getName());
    }
  }

  const types = sourceFile.getTypeAliases();
  for (const t of types) {
    if (!t.isExported()) {
      coreContent += "export " + t.getText() + "\n\n";
      coreExports.push(t.getName());
    } else {
        coreContent += t.getText() + "\n\n";
        coreExports.push(t.getName());
    }
  }

  // Functions
  const functions = sourceFile.getFunctions();
  const funcMap = new Map();
  for (const f of functions) {
    funcMap.set(f.getName(), f.getText());
    if (!f.isExported()) {
      coreContent += "export " + f.getText() + "\n\n";
      coreExports.push(f.getName());
    }
  }

  // Create core file
  const corePath = "app/actions/gallery-core.ts";
  fs.writeFileSync(corePath, coreContent);
  const coreFile = project.addSourceFileAtPath(corePath);

  // Helper to create action files
  function createActionFile(name, funcList) {
    let content = `"use server";\n\n` + imports + "\n\n";
    content += `import { ${coreExports.join(", ")} } from "./gallery-core";\n\n`;
    
    for (const fName of funcList) {
      if (funcMap.has(fName)) {
        content += funcMap.get(fName) + "\n\n";
      }
    }
    
    const filePath = `app/actions/${name}.ts`;
    fs.writeFileSync(filePath, content);
    const sf = project.addSourceFileAtPath(filePath);
    sf.fixMissingImports();
    sf.fixUnusedIdentifiers();
    sf.saveSync();
  }

  createActionFile("gallery-admin-actions", adminFuncs);
  createActionFile("gallery-public-actions", publicFuncs);
  createActionFile("gallery-selection-actions", selectionFuncs);

  // Re-write gallery-actions.ts as index
  fs.writeFileSync("app/actions/gallery-actions.ts", `
export * from './gallery-admin-actions';
export * from './gallery-public-actions';
export * from './gallery-selection-actions';
export * from './gallery-core';
  `.trim());

  coreFile.fixMissingImports();
  coreFile.fixUnusedIdentifiers();
  coreFile.saveSync();

  console.log("Refactor completed successfully!");
}

main().catch(console.error);
