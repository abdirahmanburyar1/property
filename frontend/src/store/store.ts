import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import authReducer, { type User } from './slices/authSlice';
import propertyReducer from './slices/propertySlice';
import paymentReducer from './slices/paymentSlice';
import uiReducer from './slices/uiSlice';

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

const authPersistConfig = {
  key: 'auth',
  storage,
  whitelist: ['token', 'user', 'isAuthenticated'],
};

export const store = configureStore({
  reducer: {
    auth: persistReducer<AuthState>(authPersistConfig, authReducer),
    property: propertyReducer,
    payment: paymentReducer,
    ui: uiReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
});

export const persistor = persistStore(store);

type StoreState = ReturnType<typeof store.getState>;
export type RootState = Omit<StoreState, 'auth'> & { auth: AuthState };
export type AppDispatch = typeof store.dispatch;
