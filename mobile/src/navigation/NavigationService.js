import { createNavigationContainerRef } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef();

class NavigationService {
  navigate(name, params) {
    if (navigationRef.isReady()) {
      navigationRef.navigate(name, params);
    }
  }

  goBack() {
    if (navigationRef.isReady() && navigationRef.canGoBack()) {
      navigationRef.goBack();
    }
  }

  reset(name, params) {
    if (navigationRef.isReady()) {
      navigationRef.reset({
        index: 0,
        routes: [{ name, params }],
      });
    }
  }

  getCurrentRoute() {
    if (navigationRef.isReady()) {
      return navigationRef.getCurrentRoute();
    }
    return null;
  }

  // Helper methods for specific screens
  navigateToAuthorityForm() {
    this.navigate('AuthorityForm');
  }

  navigateToPinForm(authorityId) {
    this.navigate('PinForm', { authorityId });
  }

  navigateToMapWithAuthority(authorityId) {
    this.navigate('Map', { authorityId, focusOnAuthority: true });
  }

  navigateToAlertDetails(alertId) {
    this.navigate('AlertDetails', { alertId });
  }

  navigateToOfflineDownload() {
    this.navigate('Offline');
  }

  // Auth navigation
  navigateToLogin() {
    this.reset('Login');
  }

  navigateToHome() {
    this.reset('MainTabs');
  }
}

// Export singleton instance
const navigationService = new NavigationService();
export default navigationService;
