import { useNavigate } from 'react-router-dom';
import { useRef, useState } from 'react';
import { useRecoilState } from 'recoil';
import { userAtom } from '@repo/store/userAtom';
import { getBackendUrl } from '../lib/utils';

const Login = () => {
  const navigate = useNavigate();
  const guestName = useRef<HTMLInputElement>(null);
  const [_, setUser] = useRecoilState(userAtom);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const BACKEND_URL = getBackendUrl();

  const google = () => {
    window.open(`${BACKEND_URL}/auth/google`, '_self');
  };

  const github = () => {
    window.open(`${BACKEND_URL}/auth/github`, '_self');
  };

  const loginAsGuest = async () => {
    setError(null);
    setLoading(true);
    try {
      console.log('Attempting to connect to:', `${BACKEND_URL}/auth/guest`);
      const response = await fetch(`${BACKEND_URL}/auth/guest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          name: (guestName.current && guestName.current.value) || '',
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to login: ${response.statusText}`);
      }

      const user = await response.json();
      setUser(user);
      navigate('/');
    } catch (err) {
      console.error('Login error:', err);
      const errorMessage = err instanceof Error && err.message.includes('Failed to fetch')
        ? `Cannot connect to backend at ${BACKEND_URL}. Make sure the backend server is running on port 3000.`
        : err instanceof Error 
          ? err.message 
          : 'Failed to connect to server. Please make sure the backend is running.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen text-textMain">
      <h1 className="text-4xl font-bold mb-8 text-center text-green-500 drop-shadow-lg">
        Enter the Game World
      </h1>
      <div className="bg-bgAuxiliary2 rounded-lg shadow-lg p-8 flex flex-col md:flex-row">
        <div className="mb-8 md:mb-0 md:mr-8 justify-center flex flex-col">
          <div
            className="flex items-center justify-center px-4 py-2 rounded-md mb-4 cursor-pointer transition-colors hover:bg-gray-600 duration-300"
            onClick={google}
          >
            <img src="google.svg" alt="" className="w-6 h-6 mr-2" />
            Sign in with Google
          </div>
          <div
            className="flex items-center justify-center px-4 py-2 rounded-md cursor-pointer hover:bg-gray-600 transition-colors duration-300"
            onClick={github}
          >
            <img src="github.svg" alt="" className="w-6 h-6 mr-2" />
            Sign in with Github
          </div>
        </div>
        <div className="flex flex-col items-center md:ml-8">
          <div className="flex items-center mb-4">
            <div className="bg-gray-600 h-1 w-12 mr-2"></div>
            <span className="text-gray-400">OR</span>
            <div className="bg-gray-600 h-1 w-12 ml-2"></div>
          </div>
          <input
            type="text"
            ref={guestName}
            placeholder="Username"
            className="border px-4 py-2 rounded-md mb-4 w-full md:w-64"
          />
          {error && (
            <div className="text-red-500 text-sm mb-4 text-center max-w-64">
              {error}
            </div>
          )}
          <button
            className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => loginAsGuest()}
            disabled={loading}
          >
            {loading ? 'Connecting...' : 'Enter as guest'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
