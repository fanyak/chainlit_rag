import getRouterBasename from '@/lib/router';
import App from 'App';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  useApi,
  useAuth,
  useChatInteract,
  useConfig
} from '@chainlit/react-client';

export default function AppWrapper() {
  const [translationLoaded, setTranslationLoaded] = useState(false);
  const { isAuthenticated, isReady } = useAuth();
  const { language: languageInUse } = useConfig();
  const { i18n } = useTranslation();
  const { windowMessage } = useChatInteract();

  function handleChangeLanguage(languageBundle: any): void {
    i18n.addResourceBundle(languageInUse, 'translation', languageBundle);
    i18n.changeLanguage(languageInUse);
  }

  const { data: translations } = useApi<any>(
    `/project/translations?language=${languageInUse}`
  );

  useEffect(() => {
    if (!translations) return;
    handleChangeLanguage(translations.translation);
    setTranslationLoaded(true);
  }, [translations]);

  useEffect(() => {
    const handleWindowMessage = (event: MessageEvent) => {
      windowMessage(event.data);
    };
    window.addEventListener('message', handleWindowMessage);
    return () => window.removeEventListener('message', handleWindowMessage);
  }, [windowMessage]);

  if (!translationLoaded) return null;

  // Public routes that don't require authentication
  const publicRoutes = [
    '/login',
    '/login/callback',
    '/order',
    '/privacy',
    '/terms',
    '/contact',
    '/guide'
  ];

  const currentPath = window.location.pathname;
  const basename = getRouterBasename();
  const isPublicRoute = publicRoutes.some(
    (route) => currentPath === basename + route
  );

  if (isReady && !isAuthenticated && !isPublicRoute) {
    window.location.href = basename + '/login';
  }
  return <App />;
}
