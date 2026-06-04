const STORAGE_KEY = 'radio.useLocalTime';

function getStoredValue(): boolean {
  if (typeof localStorage === 'undefined') return false;
  return localStorage.getItem(STORAGE_KEY) === 'true';
}

function createSettingsStore() {
  let useLocalTime = $state<boolean>(getStoredValue());

  function setUseLocalTime(val: boolean) {
    useLocalTime = val;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, String(val));
    }
  }

  function toggleUseLocalTime() {
    setUseLocalTime(!useLocalTime);
  }

  return {
    get useLocalTime() { return useLocalTime; },
    setUseLocalTime,
    toggleUseLocalTime,
  };
}

export const settingsStore = createSettingsStore();
