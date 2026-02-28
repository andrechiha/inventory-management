import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { router } from '@/routes';

export default function App() {
  const init = useAuthStore((s) => s.init);

  useEffect(() => {
    const unsubscribe = init();
    return unsubscribe;
  }, [init]);

  return <RouterProvider router={router} />;
}
