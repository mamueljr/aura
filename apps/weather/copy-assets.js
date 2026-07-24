const fs = require('fs');
const path = require('path');

const files = ['index.html', 'style.css', 'app.js', 'manifest.json', 'sw.js'];
const folders = ['assets'];

const distDir = path.join(__dirname, 'www');

// Recrear la carpeta www para evitar basura
if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true, force: true });
}
fs.mkdirSync(distDir);

// Copiar archivos principales
files.forEach(f => {
  if (fs.existsSync(f)) {
    fs.copyFileSync(f, path.join(distDir, f));
    console.log(`Copiado ${f} a www/`);
  }
});

// Copiar carpetas completas (como assets)
folders.forEach(folder => {
  if (fs.existsSync(folder)) {
    copyFolderSync(folder, path.join(distDir, folder));
    console.log(`Copiada carpeta ${folder}/ a www/`);
  }
});

function copyFolderSync(from, to) {
  fs.mkdirSync(to, { recursive: true });
  fs.readdirSync(from).forEach(element => {
    const stat = fs.lstatSync(path.join(from, element));
    if (stat.isFile()) {
      fs.copyFileSync(path.join(from, element), path.join(to, element));
    } else if (stat.isDirectory()) {
      copyFolderSync(path.join(from, element), path.join(to, element));
    }
  });
}
