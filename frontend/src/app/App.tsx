import { RouterProvider } from 'react-router-dom';
import { appRouter } from './router';
import './styles/global.css';

export const App = () => {
  return (
    <div className="app-root">
      <RouterProvider router={appRouter} />
    </div>
  );
};