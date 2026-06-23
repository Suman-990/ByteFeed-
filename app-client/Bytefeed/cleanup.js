const fs = require('fs');
const path = require('path');

const dirsToRemove = [
  'app/screens',
  'app/components',
  'app/navigation'
];

const filesToRemove = [
  'app/auth/LoginScreen.tsx',
  'app/auth/RegisterScreen.tsx'
];

console.log("Cleaning up old React Navigation files to prevent Expo Router conflicts...");

for (const d of dirsToRemove) {
  const p = path.join(__dirname, d);
  if (fs.existsSync(p)) {
    fs.rmSync(p, { recursive: true, force: true });
    console.log('Removed directory:', d);
  }
}

for (const f of filesToRemove) {
  const p = path.join(__dirname, f);
  if (fs.existsSync(p)) {
    fs.rmSync(p, { force: true });
    console.log('Removed file:', f);
  }
}

console.log("Cleanup complete! You can now start the app with `npm start`.");
