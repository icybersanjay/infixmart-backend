import { useSettings } from '../context/SettingsContext';

// Convenience hook — consumers import this instead of importing the context directly.
const useStoreSettings = () => useSettings();

export default useStoreSettings;
