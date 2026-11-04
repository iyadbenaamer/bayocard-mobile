/**
 * Fingerprint configuration for the `fingerprint` runtime version policy.
 *
 * @type {import('@expo/fingerprint').Config}
 */
module.exports = {
  ignorePaths: [
    /*
      @react-native-masked-view/masked-view rewrites its own manifest while
      Gradle configures it: android/build.gradle reads
      android/src/main/AndroidManifest.xml, strips the `package="..."`
      attribute on AGP 7+ (the namespace now lives in build.gradle) and writes
      the file back inside node_modules.

      That makes the package directory hash depend on whether a native build
      has ever run against this checkout. EAS fingerprints the project before
      Gradle executes, so its copy is pristine, while any machine that has run
      `npm run android` has the stripped copy - and the two runtime versions
      then disagree, which fails the build under this policy.

      The file is one line of boilerplate that the library derives from
      build.gradle anyway, so excluding it costs no real signal. The rest of
      the package still hashes normally, so a genuine version bump is still
      picked up.
    */
    "node_modules/@react-native-masked-view/masked-view/android/src/main/AndroidManifest.xml",
    /*
      Same failure mode, different source: Gradle compiles the Gradle plugins
      shipped inside node_modules (e.g. expo-updates-gradle-plugin) in place,
      and Kotlin 2.x keeps a .kotlin/sessions/*.salive marker next to them
      for as long as the Gradle daemon lives (up to 3 hours after a local
      build). The default ignore list covers their build/ and .gradle/
      output but not .kotlin/, so running `eas build` or `eas update` in
      that window computed a local runtime version EAS couldn't match. The
      directory only ever holds compiler session state.
    */
    "**/*-gradle-plugin/.kotlin/**/*",
  ],
};
