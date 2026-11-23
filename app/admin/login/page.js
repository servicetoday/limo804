import Logo from '../../components/Logo';
import LoginForm from './LoginForm';
export const metadata = { title: 'Fleet Admin Sign In | Limo804', robots: { index: false, follow: false } };
export default function LoginPage() {
  return <main className="admin-login"><div className="admin-login-brand"><Logo /></div><section><p className="eyebrow">Limo804 administration</p><h1>Welcome back.</h1><p>Sign in to manage your fleet.</p><LoginForm /></section></main>;
}
