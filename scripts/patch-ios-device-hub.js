/* eslint-env node */
// Backport Device Hub launching to the CLI bundled with React Native 0.74.
// Upstream: https://github.com/react-native-community/cli/pull/2806
// Remove this patch and its npm hooks when upgrading to a CLI with native support.
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const modulesRoot = path.join(projectRoot, 'node_modules');
const cliRoot = path.join(
  modulesRoot,
  '@react-native-community/cli-platform-apple',
);
const target = path.join(
  cliRoot,
  'build/commands/runCommand/runOnSimulator.js',
);
// Never modify a globally installed or externally linked CLI.
if (!fs.realpathSync(target).startsWith(modulesRoot + path.sep)) {
  throw new Error(
    'Device Hub patch requires a project-local CLI installation.',
  );
}
const {version} = JSON.parse(
  fs.readFileSync(path.join(cliRoot, 'package.json'), 'utf8'),
);
if (version !== '13.6.9') {
  throw new Error(
    `Review the MediCareApp Device Hub patch for CLI ${version}; expected 13.6.9.`,
  );
}

const original =
  "  _child_process().default.execFileSync('open', [`${activeDeveloperDir}/Applications/Simulator.app`, '--args', '-CurrentDeviceUDID', simulator.udid]);";
const replacement = `  // MediCareApp: project-local Xcode 27 Device Hub compatibility.
  const fs = require('node:fs');
  const path = require('node:path');
  const simulatorApp = path.join(activeDeveloperDir, 'Applications', 'Simulator.app');
  const deviceHubApp = path.join(activeDeveloperDir, '..', 'Applications', 'DeviceHub.app');
  if (fs.existsSync(simulatorApp)) {
    _child_process().default.execFileSync('open', [simulatorApp, '--args', '-CurrentDeviceUDID', simulator.udid]);
  } else if (fs.existsSync(deviceHubApp)) {
    _child_process().default.execFileSync('open', ['-a', deviceHubApp, 'devices://device/open?id=' + encodeURIComponent(simulator.udid)]);
  } else {
    throw new Error('Neither Simulator.app nor DeviceHub.app exists in the selected Xcode installation: ' + activeDeveloperDir);
  }`;

const source = fs.readFileSync(target, 'utf8');
if (source.includes(replacement)) {
  console.log('MediCareApp Device Hub compatibility is already applied.');
} else {
  if (source.split(original).length !== 2) {
    throw new Error(
      'CLI launcher has changed; refusing to apply an unrecognized patch.',
    );
  }
  fs.writeFileSync(target, source.replace(original, replacement));
  console.log('Applied MediCareApp Device Hub compatibility (local CLI only).');
}
