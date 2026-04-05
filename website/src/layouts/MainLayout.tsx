import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import GlobalBackground from '../components/GlobalBackground';

export default function MainLayout() {
    return (
        <div className="min-h-screen flex flex-col bg-[#0a0a0a] relative overflow-hidden">
            <GlobalBackground />
            <div className="relative z-10 flex flex-col min-h-screen">
                <Navbar />
                <main className="flex-1 pt-24">
                    <Outlet />
                </main>
                <Footer />
            </div>
        </div>
    );
}
