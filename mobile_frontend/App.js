import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as PaperProvider } from 'react-native-paper';
import { Provider as ReduxProvider } from 'react-redux';
import { store } from './src/store/store';
import AppNavigator from './src/navigation/AppNavigator';
import Toast from 'react-native-toast-message';
import { useUserStore } from './src/store/userStore';
import './src/i18n';

const App = () => {
  const loadStoredUser = useUserStore(state => state.loadStoredUser);

  useEffect(() => {
    loadStoredUser();
  }, [loadStoredUser]);

  return (
    <ReduxProvider store={store}>
      <PaperProvider>
        <SafeAreaProvider>
          <AppNavigator />
          <Toast />
        </SafeAreaProvider>
      </PaperProvider>
    </ReduxProvider>
  );
};

export default App;
