const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Exclude native build directories from Metro file watcher to prevent file-map crashes
config.resolver.blockList = [
  /android\/app\/\.cxx\/.*/,
  /android\/app\/build\/.*/,
  /ios\/build\/.*/,
];

module.exports = config;
