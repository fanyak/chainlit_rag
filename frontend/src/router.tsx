import getRouterBasename from '@/lib/router';
import { Navigate, createBrowserRouter } from 'react-router-dom';

import Contact from './pages/Contact';
import Order from './pages/Order';
import OrderFail from './pages/OrderFail';
import OrderSuccess from './pages/OrderSuccess';
import Privacy from './pages/Privacy';
import Profile from './pages/Profile';
import Terms from './pages/Terms';
import AuthCallback from 'pages/AuthCallback';
import Element from 'pages/Element';
import Env from 'pages/Env';
import Home from 'pages/Home';
import Login from 'pages/Login';
import Thread from 'pages/Thread';

export const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <Home />
    },
    {
      path: '/env',
      element: <Env />
    },
    {
      path: '/thread/:id?',
      element: <Thread />
    },
    {
      path: '/element/:id',
      element: <Element />
    },
    {
      path: '/login',
      element: <Login />
    },
    {
      path: '/login/callback',
      element: <AuthCallback />
    },
    {
      path: '/share/:id',
      element: <Thread />
    },
    {
      path: '/order',
      element: <Order />
    },
    {
      path: '/order/success',
      element: <OrderSuccess />
    },
    {
      path: '/order/fail',
      element: <OrderFail />
    },
    {
      path: '/privacy',
      element: <Privacy />
    },
    {
      path: '/terms',
      element: <Terms />
    },
    {
      path: '/contact',
      element: <Contact />
    },
    {
      path: '/account',
      element: <Profile />
    },
    {
      path: '*',
      element: <Navigate replace to="/" />
    }
  ],
  { basename: getRouterBasename() }
);
