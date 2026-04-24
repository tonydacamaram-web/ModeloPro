import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../context/AuthContext';

const LoginPage = () => {
  const { iniciarSesion, cargando, error, usuario } = useAuth();
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors } } = useForm();

  useEffect(() => {
    if (usuario) navigate('/dashboard', { replace: true });
  }, [usuario, navigate]);

  const onSubmit = async (datos) => {
    const ok = await iniciarSesion(datos.login, datos.password);
    if (ok) navigate('/dashboard', { replace: true });
  };

  return (
    <div className="min-h-screen bg-gp-base flex items-center justify-center p-4">
      {/* Fondo con gradiente sutil */}
      <div className="absolute inset-0 bg-gradient-to-br from-gp-fucsia-dim via-gp-base to-gp-dorado-dim opacity-60 pointer-events-none" />

      <div className="relative bg-gp-card border border-gp-border rounded-2xl shadow-2xl p-8 w-full max-w-sm">
        {/* Logo La Modelo */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <img
              src="/logo-la-modelo.png"
              alt="La Modelo"
              className="w-28 h-28 object-contain drop-shadow-lg"
            />
          </div>
          <h1 className="text-2xl font-bold text-gp-text">GestiónPro</h1>
          <p className="text-sm text-gp-text3 mt-1">Sistema de Gestión — La Modelo</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gp-text2 mb-1">
              Usuario o correo electrónico
            </label>
            <input
              type="text"
              autoComplete="username"
              className={`input-campo ${errors.login ? 'input-error' : ''}`}
              placeholder="usuario o correo@ejemplo.com"
              {...register('login', { required: 'El usuario o email es requerido' })}
            />
            {errors.login && <p className="text-xs text-gp-error mt-1">{errors.login.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gp-text2 mb-1">
              Contraseña
            </label>
            <input
              type="password"
              autoComplete="current-password"
              className={`input-campo ${errors.password ? 'input-error' : ''}`}
              placeholder="••••••••"
              {...register('password', { required: 'La contraseña es requerida' })}
            />
            {errors.password && <p className="text-xs text-gp-error mt-1">{errors.password.message}</p>}
          </div>

          <button type="submit" disabled={cargando} className="btn-primario w-full mt-2">
            {cargando ? 'Iniciando sesión...' : 'Iniciar sesión'}
          </button>
        </form>

        <p className="text-center text-xs text-gp-text3 mt-6">
          GestiónPro · Venezuela · Bimoneda VES/USD
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
