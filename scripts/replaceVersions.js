const fs = require('fs');
const path = require('path');

const version = process.argv[2];
if (!version) {
  console.error('Version argument is required');
  process.exit(1);
}

const packagesDir = path.resolve(__dirname, '../packages');

fs.readdirSync(packagesDir).forEach(packageName => {
  const packageJsonPath = path.join(packagesDir, packageName, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    // Update dependencies to the new version if they are in the packages list
    Object.keys(packageJson.dependencies || {}).forEach(dep => {
      if (dep.startsWith('@delandlabs/')) {
        packageJson.dependencies[dep] = version;
      }
    });

    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    console.log(`Updated ${packageJsonPath} with version ${version}`);
  }
});
