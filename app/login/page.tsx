import type { Metadata } from 'next';
import LoginForm from '@/components/login/LoginForm';

export const metadata: Metadata = {
  title: 'Sign in | Causeway',
  description: 'Sign in to Causeway — AML / fraud detection for Union Bank of India.',
};

export default function LoginPage() {
  return <LoginForm />;
}