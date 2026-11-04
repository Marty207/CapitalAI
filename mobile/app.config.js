const appJson = require("./app.json");

/** @type {import('expo/config').ExpoConfig} */
module.exports = () => {
  const expo = appJson.expo;
  const redirectUri = process.env.EXPO_PUBLIC_PLAID_REDIRECT_URI;

  let associatedDomains = [];
  if (redirectUri) {
    try {
      associatedDomains = [`applinks:${new URL(redirectUri).hostname}`];
    } catch {
      // Invalid redirect URI; skip associated domains until env is fixed.
    }
  }

  return {
    ...expo,
    ios: {
      ...expo.ios,
      associatedDomains,
    },
  };
};
