import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

const AuthCallback = () => {
    const [searchParams] = useSearchParams();

    useEffect(() => {
        const code = searchParams.get('code');
        const state = searchParams.get('state');

        if (code) {
            // Get the origin from the opener (parent window)
            const origin = window.opener.location.origin;

            // Send the code back to the parent window
            window.opener.postMessage(
                { 
                    type: 'AUTH_CALLBACK',
                    code,
                    state 
                }, 
                origin
            );

            // Close this window after a short delay
            setTimeout(() => {
                window.close();
            }, 500);
        }
    }, [searchParams]);

    return (
        <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            height: '100vh',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        }}>
            <p>Processing login... Please wait.</p>
        </div>
    );
};

export default AuthCallback; 