import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
// import fcmReducer from './slices/fcmSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    // fcm: fcmReducer
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }),
}); 