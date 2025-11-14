import React, { useEffect, useRef, useState } from 'react';
import { useTasks } from '../context/TaskContext';
// FIX: Removed incorrect import for CredentialResponse, which is a global type defined in google.d.ts.

const GOOGLE_CLIENT_ID = "939572655563-393g05o2ec4a8s1gg1s6mkd1u91bf1ge.apps.googleusercontent.com";

const Login: React.FC = () => {
  const { loginWithGoogle, loginWithEmail, signupWithEmail } = useTasks();
  const googleButtonRef = useRef<HTMLDivElement>(null);
  
  const [isLoginView, setIsLoginView] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!window.google || !googleButtonRef.current) {
        return;
    }

    const handleCredentialResponse = async (response: CredentialResponse) => {
        setIsLoading(true);
        await loginWithGoogle(response);
        setIsLoading(false);
    };

    try {
        window.google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: handleCredentialResponse,
        });

        window.google.accounts.id.renderButton(
            googleButtonRef.current,
            { theme: "outline", size: "large", text: "signin_with", width: "300" }
        );
        // Do not prompt automatically, let user click
        // window.google.accounts.id.prompt(); 
    } catch (error) {
        console.error("Error initializing Google Sign-In", error);
    }

  }, [loginWithGoogle]);
  
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    if (isLoginView) {
      await loginWithEmail(email, password);
    } else {
      await signupWithEmail(name, email, password);
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 py-12">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-brand-primary mx-auto" viewBox="0 0 20 20" fill="currentColor">
                <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
            </svg>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900 dark:text-white">
            {isLoginView ? 'Sign in to your account' : 'Create a new account'}
          </h2>
           <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">to continue to Team Task Manager</p>
        </div>
        
        <div className="bg-white dark:bg-dark-card p-8 rounded-lg shadow-lg">
          <form className="space-y-6" onSubmit={handleEmailAuth}>
            {!isLoginView && (
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Full Name</label>
                <input id="name" name="name" type="text" value={name} onChange={e => setName(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-brand-primary focus:border-brand-primary bg-gray-50 dark:bg-gray-700" />
              </div>
            )}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email address</label>
              <input id="email" name="email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-brand-primary focus:border-brand-primary bg-gray-50 dark:bg-gray-700" />
            </div>
            <div>
              <label htmlFor="password"  className="block text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
              <input id="password" name="password" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-brand-primary focus:border-brand-primary bg-gray-50 dark:bg-gray-700" />
            </div>
             <button type="submit" disabled={isLoading} className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-primary hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary disabled:bg-indigo-400 disabled:cursor-not-allowed">
              {isLoading ? 'Processing...' : (isLoginView ? 'Sign In' : 'Sign Up')}
            </button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 dark:border-gray-600" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white dark:bg-dark-card text-gray-500 dark:text-gray-400">Or continue with</span>
              </div>
            </div>
            <div className="mt-6 flex justify-center">
              <div ref={googleButtonRef} />
            </div>
          </div>
           <div className="text-sm text-center mt-6">
            <button onClick={() => { setIsLoginView(!isLoginView); setEmail(''); setPassword(''); setName('');}} className="font-medium text-brand-primary hover:text-indigo-500">
                {isLoginView ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;