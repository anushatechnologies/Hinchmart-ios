// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Exclude Android / iOS build outputs and Gradle caches from Metro watching
const defaultBlockList = Array.isArray(config.resolver.blockList)
  ? config.resolver.blockList
  : config.resolver.blockList
  ? [config.resolver.blockList]
  : [];

config.resolver.blockList = [
  ...defaultBlockList,
  /.*[/\\]android[/\\](?:app[/\\])?build[/\\].*/,
  /.*[/\\]node_modules[/\\].*[/\\]android[/\\]build[/\\].*/,
  /.*[/\\]node_modules[/\\].*[/\\]build[/\\](?:classes|kotlin|intermediates|\.transforms)[/\\].*/,
  /.*[/\\]\.gradle[/\\].*/,
];

module.exports = config;

