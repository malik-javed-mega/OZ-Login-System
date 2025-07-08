import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';

const AuthCallback = () => {
    const [searchParams] = useSearchParams();
    const hasPostedMessage = useRef(false);

    useEffect(() => {
        const code = searchParams.get('code');
        const state = searchParams.get('state');

        console.log('AuthCallback: Received params:', { code, state });

        if (code && !hasPostedMessage.current) {
            try {
                // Get the origin from the opener (parent window)
                const origin = window.opener?.location?.origin;
                console.log('AuthCallback: Parent origin:', origin);

                if (!window.opener) {
                    console.error('AuthCallback: No opener window found');
                    return;
                }

                // Send the code back to the parent window
                console.log('AuthCallback: Sending postMessage');
                window.opener.postMessage(
                    { 
                        type: 'AUTH_CALLBACK',
                        code,
                        state 
                    }, 
                    origin
                );
                
                // Mark message as sent
                hasPostedMessage.current = true;

                // Close this window after a short delay
                setTimeout(() => {
                    console.log('AuthCallback: Closing window');
                    window.close();
                }, 500);
            } catch (error) {
                console.error('AuthCallback: Error:', error);
            }
        } else if (!code) {
            console.error('AuthCallback: No code received');
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