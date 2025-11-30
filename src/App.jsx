import React from 'react';
import './styles/styles.css';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ScrollToTop from './components/ScrollToTop';

// Páginas
import Home from './pages/Home/Home';
import SobreMi from './pages/SobreMi/SobreMi';
import Contacto from './pages/Contacto/Contacto';
import PoliticasEnvios from './pages/PoliticasEnvios/PoliticasEnvios';
import ShippingPolicies from './pages/ShippingPolicies/ShippingPolicies';
import VideoShorts from './pages/VideoShorts';
import ElTaller from './pages/ElTaller/ElTaller';

// Importamos ProductGridPage (maneja el catálogo dinámico)
import ProductGridPage from './pages/ProductGridPage';

// Componentes
import Header from './components/Header/Header';
import Footer from './components/Footer';
import PublicCarousel from './components/PublicCarousel';
import ProductoDetalle from './components/ProductoDetalle';
import Tienda from './components/Tienda';

// Autenticación
import SignUp from './components/SignUp';
import Login from './components/Login';
import { AuthProvider } from './contexts/AuthContext';
import PrivateRoute from './components/PrivateRoute';

// Panel de administración
import AdminPanel from './components/AdminPanel';
import CarouselAdmin from './components/CarouselAdmin';
import CategoriaAdmin from './components/CategoriaAdmin';
import ProductoAdmin from './components/ProductoAdmin';
import StockAdmin from './components/StockAdmin';

function App() {
    return (
        <AuthProvider>
            <Router>
                <ScrollToTop />
                <Header />
                <Routes>
                    {/* Rutas públicas */}
                    <Route path="/" element={<Home />} />
                    <Route path="/sobremi" element={<SobreMi />} />
                    <Route path="/contacto" element={<Contacto />} />
                    <Route path="/politicasenvios" element={<PoliticasEnvios />} />
                    <Route path="/shippingpolicies" element={<ShippingPolicies />} />
                    <Route path="/videoshorts" element={<VideoShorts />} />
                    <Route path="/el-taller" element={<ElTaller />} />
                    <Route path="/carrusel" element={<PublicCarousel />} />
                    <Route path="/producto/:id" element={<ProductoDetalle />} />
                    <Route path="/tienda" element={<Tienda />} />

                    {/* Rutas dinámicas de ProductGridPage */}
                    <Route path="/catalogo/:material/:categoria" element={<ProductGridPage />} />

                    {/* Rutas de autenticación */}
                    <Route path="/signup" element={<SignUp />} />
                    <Route path="/login" element={<Login />} />

                    {/* Panel de administración - Rutas privadas */}
                    <Route path="/admin" element={<PrivateRoute><AdminPanel /></PrivateRoute>} />
                    <Route path="/admin/carrusel" element={<PrivateRoute><CarouselAdmin /></PrivateRoute>} />
                    <Route path="/admin/categoria" element={<PrivateRoute><CategoriaAdmin /></PrivateRoute>} />
                    <Route path="/admin/productos" element={<PrivateRoute><ProductoAdmin /></PrivateRoute>} />
                    <Route path="/admin/stock" element={<PrivateRoute><StockAdmin /></PrivateRoute>} />
                </Routes>
                <Footer />
            </Router>
        </AuthProvider>
    );
}

export default App;