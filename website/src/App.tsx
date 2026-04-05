import { Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
// MainLayout handles Navbar/Footer/GlobalBackground
import HomePage from './pages/HomePage';
// import LoginPage from './pages/LoginPage';
import TermsPage from './pages/TermsPage';
import PrivacyPage from './pages/PrivacyPage';
// import CliAuthPage from './pages/CliAuthPage';
import DocsLayout from './layouts/DocsLayout';
import MainLayout from './layouts/MainLayout';
import DocsIntroduction from './pages/docs/DocsIntroduction';

import QuickstartPage from './pages/docs/QuickstartPage';
import InstallationPage from './pages/docs/InstallationPage';
import SetupPage from './pages/docs/SetupPage';
import DecisionNodesPage from './pages/docs/DecisionNodesPage';
import McpServerPage from './pages/docs/McpServerPage';
import ContextEnginePage from './pages/docs/ContextEnginePage';
import CliReferencePage from './pages/docs/CliReferencePage';
import WorkflowsPage from './pages/docs/WorkflowsPage';

function ScrollToTop() {
    const { pathname, hash } = useLocation();

    useEffect(() => {
        if (hash) {
            // Wait for the page to render, then scroll to the element
            setTimeout(() => {
                const el = document.getElementById(hash.slice(1));
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth' });
                }
            }, 100);
        } else {
            window.scrollTo(0, 0);
        }
    }, [pathname, hash]);

    return null;
}

function App() {
    return (
        <>
            <ScrollToTop />
            <Routes>
                {/* Main Application Layout (Marketing, App, Settings) */}
                <Route element={<MainLayout />}>
                    <Route path="/" element={<HomePage />} />
                    {/* <Route path="/login" element={<LoginPage />} /> */}
                    <Route path="/terms" element={<TermsPage />} />
                    <Route path="/privacy" element={<PrivacyPage />} />
                    {/* <Route path="/cli-auth" element={<CliAuthPage />} /> */}
                </Route>

                {/* Documentation Portal Layout */}
                <Route path="/docs" element={<DocsLayout />}>
                    <Route index element={<DocsIntroduction />} />
                    <Route path="quickstart" element={<QuickstartPage />} />
                    <Route path="installation" element={<InstallationPage />} />
                    <Route path="setup" element={<SetupPage />} />
                    <Route path="decisions" element={<DecisionNodesPage />} />
                    <Route path="mcp" element={<McpServerPage />} />
                    <Route path="context" element={<ContextEnginePage />} />
                    <Route path="workflows" element={<WorkflowsPage />} />
                    <Route path="cli" element={<CliReferencePage />} />
                    {/* Fallback for sub-routes */}
                    <Route path="*" element={<DocsIntroduction />} />
                </Route>
            </Routes>
        </>
    );
}

export default App;
