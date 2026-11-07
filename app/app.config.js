// The settings in app.json, plus the web address's sub-folder for the live site (GitHub Pages serves the app at /User-App).
// The tests and development build without it, at the root.
module.exports = ({ config }) => ({
  ...config,
  experiments: { ...config.experiments, baseUrl: process.env.EXPO_BASE_URL || '' },
});
