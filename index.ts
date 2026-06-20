import { registerRootComponent } from 'expo';

import App from './App';

// registerRootComponent chama AppRegistry.registerComponent('main', () => App);
// Garante que o ambiente esteja configurado corretamente tanto no Expo Go quanto em builds nativos.
registerRootComponent(App);
