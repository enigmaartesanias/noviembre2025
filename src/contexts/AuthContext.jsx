import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient'; // Asegúrate de que esta ruta sea correcta

// Crea el contexto de autenticación
const AuthContext = createContext(null);

// Hook personalizado para usar el contexto de autenticación
export const useAuth = () => {
  return useContext(AuthContext);
};

// Proveedor de autenticación que maneja el estado del usuario
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // Estado para saber si la autenticación está cargando

  useEffect(() => {
    // Suscribirse a los cambios de estado de autenticación de Supabase
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user || null); // Establece el usuario si hay sesión, o null si no
        setLoading(false); // La autenticación ha terminado de cargar
      }
    );

    // Obtener la sesión inicial al cargar la aplicación
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
      setLoading(false);
    });

    // Limpiar el listener cuando el componente se desmonte
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // El valor que se proporcionará a los componentes que usen useAuth()
  const value = { user, loading };

  return (
    <AuthContext.Provider value={value}>
      {/* Muestra un indicador de carga mientras se verifica la autenticación */}
      {loading ? <div style={{ textAlign: 'center', padding: '20px' }}>Cargando..</div> : children}
    </AuthContext.Provider>
  );
};