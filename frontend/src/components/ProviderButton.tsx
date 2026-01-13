import { useState } from 'react';

import { useTranslation } from 'components/i18n/Translator';

import { useResetOnPageRestore } from 'hooks/useResetOnPageRestore';

// import { Auth0 } from 'components/icons/Auth0';
// import { Cognito } from 'components/icons/Cognito';
// import { Descope } from 'components/icons/Descope';
// import { GitHub } from 'components/icons/Github';
// import { Gitlab } from 'components/icons/Gitlab';
// import { Google } from 'components/icons/Google';
// import { Microsoft } from 'components/icons/Microsoft';
// import { Okta } from 'components/icons/Okta';
import { Button } from './ui/button';
import LoadingSpinner from './ui/loading-button-spinner';

// function capitalizeFirstLetter(string: string) {
//   return string.charAt(0).toUpperCase() + string.slice(1);
// }

// function getProviderName(provider: string) {
//   switch (provider) {
//     case 'azure-ad':
//     case 'azure-ad-hybrid':
//       return 'Microsoft';
//     case 'github':
//       return 'GitHub';
//     case 'okta':
//       return 'Okta';
//     case 'descope':
//       return 'Descope';
//     case 'aws-cognito':
//       return 'Cognito';
//     default:
//       return capitalizeFirstLetter(provider);
//   }
// }

// function renderProviderIcon(provider: string) {
//   switch (provider) {
//     case 'google':
//       return <Google />;
//     case 'github':
//       return <GitHub />;
//     case 'azure-ad':
//     case 'azure-ad-hybrid':
//       return <Microsoft />;
//     case 'okta':
//       return <Okta />;
//     case 'auth0':
//       return <Auth0 />;
//     case 'descope':
//       return <Descope />;
//     case 'aws-cognito':
//       return <Cognito />;
//     case 'gitlab':
//       return <Gitlab />;
//     default:
//       return null;
//   }
// }

interface ProviderButtonProps {
  provider: string;
  onClick: () => void;
}

const ProviderButton = ({
  provider: _provider,
  onClick
}: ProviderButtonProps): JSX.Element => {
  const { t } = useTranslation();
  const [isLogging, setIsLogging] = useState(false);

  const handleClick = () => {
    setIsLogging(true);
    onClick();
  };

  // Reset loading state when page is restored from bfcache (browser back button)
  useResetOnPageRestore(() => setIsLogging(false));

  return (
    <Button
      type="button"
      variant="front"
      onClick={handleClick}
      disabled={isLogging}
    >
      {isLogging ? (
        <span className="inline-flex items-center p-2 rounded-sm">
          <LoadingSpinner />
          <span>{t('common.status.logging')}</span>
        </span>
      ) : (
        t('auth.provider.connect')
      )}
    </Button>
  );
};

export { ProviderButton };
