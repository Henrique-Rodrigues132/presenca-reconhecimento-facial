// Metro config do Expo com suporte a empacotar modelos TensorFlow Lite (.tflite)
// como asset, para que `require('./assets/models/mobilefacenet.tflite')` funcione
// com react-native-fast-tflite.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.assetExts.push('tflite');

module.exports = config;
