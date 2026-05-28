import type { ReactElement } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { Dashboard } from '@pages/dashboard';
import { Labs } from '@pages/labs';
import { Roadmap } from '@pages/roadmap';
import { Progress } from '@pages/progress';
import { DailyTasks } from '@pages/daily-tasks';
import { LoginPage } from '@pages/login';
import { LabDetailPage } from '@pages/lab-detail';
import { LabsExplorationPage } from '@pages/labs-exploration';
import { AuthGuard } from '@features/auth';

function guard(element: ReactElement) {
    return <AuthGuard>{element}</AuthGuard>;
}

export const appRouter = createBrowserRouter([
    { path: '/login',                              element: <LoginPage /> },
    { path: '/',                                   element: guard(<Dashboard />) },
    { path: '/labs',                               element: guard(<Labs />) },
    { path: '/labs/:labId',                        element: guard(<LabDetailPage />) },
    { path: '/labs/:labId/session/:sandboxId',     element: guard(<Labs />) },
    { path: '/roadmap',                            element: guard(<Roadmap />) },
    { path: '/progress',                           element: guard(<Progress />) },
    { path: '/daily-tasks',                        element: guard(<DailyTasks />) },
    { path: '/explore',                            element: guard(<LabsExplorationPage />) },
]);