import { createBrowserRouter } from 'react-router-dom';
import { Dashboard } from '@pages/dashboard';
import { Labs } from '@pages/labs';
import { Roadmap } from '@pages/roadmap';
import { Progress } from '@pages/progress';
import { DailyTasks } from '@pages/daily-tasks';

export const appRouter = createBrowserRouter([
    { path: '/', element: <Dashboard /> },
    { path: '/labs', element: <Labs /> },
    { path: '/roadmap', element: <Roadmap /> },
    { path: '/progress', element: <Progress /> },
    { path: '/daily-tasks', element: <DailyTasks /> }
]);