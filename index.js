import { registerBackgroundHandler } from './src/services/notificationService';

// Register Firebase messaging background handler before app startup
registerBackgroundHandler();

import 'expo-router/entry';

