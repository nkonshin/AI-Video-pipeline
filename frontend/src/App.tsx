import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Layout } from './components/layout/Layout';
import DashboardPage from './pages/DashboardPage';
import CreateVideoPage from './pages/CreateVideoPage';
import VideosPage from './pages/VideosPage';
import VideoDetailPage from './pages/VideoDetailPage';
import ScenariosPage from './pages/ScenariosPage';
import PublishingPage from './pages/PublishingPage';
import SettingsPage from './pages/SettingsPage';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<DashboardPage />} />
            <Route path="create" element={<CreateVideoPage />} />
            <Route path="videos" element={<VideosPage />} />
            <Route path="videos/:id" element={<VideoDetailPage />} />
            <Route path="scenarios" element={<ScenariosPage />} />
            <Route path="publishing" element={<PublishingPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
