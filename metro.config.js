const path = require("path");
const fs = require("fs");
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// npm sometimes nests react-native-css-interop under nativewind/node_modules
// instead of hoisting it, which breaks react-native core's own
// `import "react-native-css-interop/jsx-runtime"` (it can't see into a
// sibling package's private node_modules). Point Metro at wherever it
// actually landed so bundling works regardless of npm's placement choice.
function resolvePackageDir(name) {
  const candidates = [
    path.join(__dirname, "node_modules", name),
    path.join(__dirname, "node_modules", "nativewind", "node_modules", name),
  ];
  const found = candidates.find((p) => fs.existsSync(p));
  if (!found) throw new Error(`Could not resolve ${name} in node_modules`);
  return found;
}

// ensure Node core modules like buffer are polyfilled in production bundles
config.resolver = {
  ...config.resolver,
  extraNodeModules: {
    ...(config.resolver.extraNodeModules || {}),
    buffer: require.resolve("buffer"), // point at the package entry file
    "react-native-css-interop": resolvePackageDir("react-native-css-interop"),
  },
  assetExts: config.resolver.assetExts.filter((ext) => ext !== "svg"),
  sourceExts: [...config.resolver.sourceExts, "svg"],
};

config.transformer = {
  ...config.transformer,
  babelTransformerPath: require.resolve("react-native-svg-transformer"),
};

// note: serializer override removed; extraNodeModules is sufficient for buffer polyfill

module.exports = withNativeWind(config, { input: "./global.css" });
