const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Permet à Metro de bundler les fichiers .db comme assets binaires
config.resolver.assetExts.push('db');

// react-dom est un package web utilisé par @expo/log-box.
// Sur Android/iOS, Metro ne peut pas le résoudre — on le redirige vers un stub vide.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform !== 'web' && moduleName === 'react-dom/client') {
    return { type: 'empty' };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
