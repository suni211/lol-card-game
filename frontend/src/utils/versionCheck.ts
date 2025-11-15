// Auto-refresh when new version is deployed
export function startVersionCheck() {
  const checkInterval = 30000; // 30초마다 체크

  setInterval(async () => {
    try {
      const response = await fetch('/version.json?' + Date.now());
      const data = await response.json();

      const currentVersion = localStorage.getItem('app_version');

      if (!currentVersion) {
        localStorage.setItem('app_version', data.version);
      } else if (currentVersion !== data.version) {
        console.log('New version detected, reloading...');
        localStorage.setItem('app_version', data.version);
        window.location.reload();
      }
    } catch (error) {
      console.error('Version check failed:', error);
    }
  }, checkInterval);
}
