/* eslint-disable @typescript-eslint/no-unused-vars */

import './App.css';
import './themes.css';

import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Landing } from './screens/Landing';
import { Game } from './screens/Game';
import { BotGame } from './screens/BotGame';
import { AnalysisBoard } from './screens/AnalysisBoard';
import OpeningExplorer from './screens/OpeningExplorer';
import Login from './screens/Login';
import { Suspense } from 'react';
import { RecoilRoot } from 'recoil';
import { Loader } from './components/Loader';
import { Layout } from './layout';
import { Settings } from './screens/Settings';
import { Themes } from './components/themes';
import { ThemesProvider } from './context/themeContext';
import { BotDifficultySelector } from './components/BotDifficultySelector';

function App() {
  return (
    <div className="min-h-screen bg-bgMain text-textMain">
      <RecoilRoot>
        <Suspense fallback={<Loader />}>
          <ThemesProvider>
            <AuthApp />
          </ThemesProvider>
        </Suspense>
      </RecoilRoot>
    </div>
  );
}

function AuthApp() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Bot and analysis routes should come AFTER specific routes to prevent catching wrong patterns */}
        <Route
          path="/"
          element={
            <Layout>
              <Landing />
            </Layout>
          }
        />
        <Route
          path="/bot-difficulty"
          element={
            <Layout>
              <BotDifficultySelector />
            </Layout>
          }
        />
        <Route path="/login" element={<Login />} />
        <Route
          path="/analysis"
          element={
            <Layout>
              <AnalysisBoard />
            </Layout>
          }
        />
        <Route
          path="/openings"
          element={
            <Layout>
              <OpeningExplorer />
            </Layout>
          }
        />
        <Route
          path="/settings"
          element={
            <Layout>
              <Settings />
            </Layout>
          }
        >
          <Route index element={<Themes />} />
          <Route path="themes" element={<Themes />} />
        </Route>
        {/* Specific game routes BEFORE generic game route */}
        <Route
          path="/game/bot-easy"
          element={
            <Layout>
              <BotGame />
            </Layout>
          }
        />
        <Route
          path="/game/bot-medium"
          element={
            <Layout>
              <BotGame />
            </Layout>
          }
        />
        <Route
          path="/game/bot-hard"
          element={
            <Layout>
              <BotGame />
            </Layout>
          }
        />
        <Route
          path="/game/:gameId"
          element={
            <Layout>
              <Game />
            </Layout>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
