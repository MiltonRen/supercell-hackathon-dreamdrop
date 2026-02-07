import { useEffect, useRef, useState } from 'react';
import { createDecartClient, models, RealTimeClient } from '@decartai/sdk';
import { useStore } from '../store';

export function DecartStream() {
  const worldDescription = useStore(state => state.worldDescription);
  const videoRef = useRef<HTMLVideoElement>(null);
  const clientRef = useRef<RealTimeClient | null>(null);
  const [status, setStatus] = useState<string>('Waiting for Start');
  const [started, setStarted] = useState(false);

  // Function to initialize everything after user interaction
  const startExperience = async () => {
    setStarted(true);

    // Find the canvas from R3F
    const canvas = document.querySelector('canvas');
    if (!canvas) {
      setStatus("Canvas not found");
      return;
    }

    const stream = canvas.captureStream(30);

    // Create Client
    const apiKey = import.meta.env.VITE_DECART_API_KEY;
    if (!apiKey) {
      setStatus("Missing API Key");
      console.error("Missing VITE_DECART_API_KEY");
      return;
    }

    try {
      setStatus("Connecting...");
      const client = createDecartClient({ apiKey });

      // Connect
      const realtimeClient = await client.realtime.connect(stream, {
        model: models.realtime('mirage_v2'), // Using mirage_v2 as requested
        onRemoteStream: (remoteStream) => {
          if (videoRef.current) {
            videoRef.current.srcObject = remoteStream;
            // Play inside the interaction callback chain
            videoRef.current.play().catch(e => console.error("Video play failed", e));
          }
        },
        initialState: {
          prompt: { text: worldDescription, enhance: true }
        }
      });

      clientRef.current = realtimeClient;
      setStatus("Connected");

      realtimeClient.on('connectionChange', (state) => {
        setStatus(`State: ${state}`);
      });

      realtimeClient.on('error', (err) => {
        console.error("Decart Error:", err);
        setStatus(`Error: ${err.message}`);
      });

    } catch (err: any) {
      console.error("Failed to connect", err);
      setStatus(`Failed: ${err.message}`);
    }
  };

  useEffect(() => {
    // Auto start on mount
    startExperience();

    return () => {
      if (clientRef.current) {
        clientRef.current.disconnect();
      }
    };
  }, []);

  // Update prompt when worldDescription changes
  useEffect(() => {
    if (clientRef.current && clientRef.current.isConnected()) {
      clientRef.current.setPrompt(worldDescription, { enhance: true })
        .catch(err => console.error("Failed to update prompt", err));
    }
  }, [worldDescription]);

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      pointerEvents: 'none', // Pass through events to underlay if needed, though video covers it
      display: 'flex',
      flexDirection: 'row'
    }}>
      {/* Main Decart View */}
      <div style={{ flex: 1, position: 'relative', background: 'black' }}>
        <video
          ref={videoRef}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          autoPlay
          playsInline
        />
      </div>
    </div>
  );
}
