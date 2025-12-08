import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '@chainlit/react-client';

import { useQuery } from 'hooks/query';

export default function AuthCallback() {
  const { user, setUserFromAPI } = useAuth();
  const navigate = useNavigate();
  const query = useQuery();

  // Fetch user in cookie-based oauth.
  useEffect(() => {
    if (!user) setUserFromAPI();
  }, []);

  useEffect(() => {
    if (user) {
      if (query.get('referer')) {
        const params = new URLSearchParams();
        query.forEach((value, key) => {
          if (key !== 'referer') {
            params.append(key, value);
          }
        });
        navigate(`${query.get('referer')}?${params.toString()}`);
        return;
      }
      navigate('/');
    }
  }, [user]);

  return null;
}
