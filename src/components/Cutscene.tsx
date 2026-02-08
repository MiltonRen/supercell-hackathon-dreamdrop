import { useEffect, useMemo, useRef, useState } from 'react';
import { fetchInsecureJwtToken, ReactorProvider, ReactorView, useReactor } from '@reactor-team/js-sdk';
import { useStore } from '../store';

type CutsceneProps = {
  mode: 'local' | 'decart';
  onEnter: () => void;
};

function ReactorStage({
  prompt,
  onStarted,
  onError,
}: {
  prompt: string;
  onStarted?: () => void;
  onError?: (message: string) => void;
}) {
  const { status, sendCommand } = useReactor((state) => ({
    status: state.status,
    sendCommand: state.sendCommand,
  }));
  const hasStartedRef = useRef(false);
  const retryTimeoutRef = useRef<number | null>(null);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (status !== 'ready' || hasStartedRef.current) return;

    let cancelled = false;
    const MAX_ATTEMPTS = 12;
    const attemptStart = async (attempt: number) => {
      if (cancelled || hasStartedRef.current) return;
      try {
        await sendCommand('schedule_prompt', {
          new_prompt: prompt,
          timestamp: 0,
        });
        await sendCommand('start', {});
        hasStartedRef.current = true;
        setStarted(true);
        onStarted?.();
      } catch (error) {
        if (cancelled || hasStartedRef.current) return;
        const message = error instanceof Error ? error.message : '';
        const isChannelNotOpen = message.toLowerCase().includes('data channel not open');
        if (attempt < MAX_ATTEMPTS) {
          const delay = isChannelNotOpen ? 750 : 1250;
          retryTimeoutRef.current = window.setTimeout(() => {
            attemptStart(attempt + 1);
          }, delay);
        } else {
          console.error('[Cutscene] Failed to start Reactor generation:', error);
          onError?.(message || 'Failed to start Reactor generation.');
        }
      }
    };

    retryTimeoutRef.current = window.setTimeout(() => {
      attemptStart(0);
    }, 750);

    return () => {
      cancelled = true;
      if (retryTimeoutRef.current !== null) {
        window.clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
    };
  }, [status, sendCommand, prompt]);

  const statusLabel = started
    ? 'Generating cutscene in realtime...'
    : status === 'ready'
      ? 'Connected'
      : status === 'connecting'
        ? 'Connecting...'
        : status === 'waiting'
          ? 'Waiting for GPU...'
          : 'Disconnected';

  return (
    <>
      <ReactorView className="cutscene__video" videoObjectFit="cover" />
      <div className="cutscene__status">{statusLabel}</div>
    </>
  );
}

export function Cutscene({ mode, onEnter }: CutsceneProps) {
  const worldDescription = useStore(state => state.worldDescription);
  const cutscenePrompt = useMemo(() => (
    `${worldDescription} outside of this world, 4 round mushmallow characters arrives before a gate that leads to this world, and walks in`
  ), [worldDescription]);

  const apiKey = import.meta.env.VITE_REACTOR_API_KEY as string | undefined;
  const shouldUseReactor = Boolean(apiKey?.trim()) && mode !== 'local';

  const [jwtToken, setJwtToken] = useState<string | null>(null);
  const [jwtStatus, setJwtStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [jwtError, setJwtError] = useState<string | null>(null);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    if (!shouldUseReactor) {
      setJwtToken(null);
      setJwtStatus('idle');
      setJwtError(null);
      setRuntimeError(null);
      setHasStarted(false);
      return;
    }

    let isActive = true;
    setJwtStatus('loading');
    setJwtError(null);
    setRuntimeError(null);
    setHasStarted(false);

    fetchInsecureJwtToken(apiKey!.trim())
      .then((token) => {
        if (!isActive) return;
        setJwtToken(token);
        setJwtStatus('ready');
      })
      .catch((error: unknown) => {
        if (!isActive) return;
        setJwtToken(null);
        setJwtStatus('error');
        setJwtError(error instanceof Error ? error.message : 'Failed to fetch Reactor token');
      });

    return () => {
      isActive = false;
    };
  }, [shouldUseReactor, apiKey]);

  useEffect(() => {
    if (!shouldUseReactor || jwtStatus !== 'ready' || hasStarted) return;
    const timeoutId = window.setTimeout(() => {
      if (!hasStarted) {
        setRuntimeError('Connection timed out. Check network access to Reactor and try again.');
      }
    }, 25000);
    return () => window.clearTimeout(timeoutId);
  }, [shouldUseReactor, jwtStatus, hasStarted]);

  const canRenderReactor = shouldUseReactor && jwtStatus === 'ready' && !!jwtToken && !runtimeError;
  const showLoading = shouldUseReactor && jwtStatus === 'loading';

  return (
    <div className="cutscene">
      <div className="cutscene__media">
        {!canRenderReactor ? (
          <div className="cutscene__fallback">
            {showLoading ? (
              <>
                <div className="cutscene__fallback-title">Authorizing Reactor...</div>
                <div className="cutscene__fallback-text">
                  {cutscenePrompt}
                </div>
              </>
            ) : (
              <>
                <div className="cutscene__fallback-title">Cutscene Ready</div>
                <div className="cutscene__fallback-text">
                  {cutscenePrompt}
                </div>
                <div className="cutscene__fallback-note">
                  {mode === 'local'
                    ? 'Debug Mode: Reactor cutscene is disabled.'
                    : 'Set VITE_REACTOR_API_KEY in .env to view the cutscene generated in real time.'}
                </div>
                {(jwtError || runtimeError) && (
                  <div className="cutscene__fallback-error">
                    {runtimeError ? `Reactor error: ${runtimeError}` : `Reactor auth failed: ${jwtError}`}
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          <ReactorProvider modelName="livecore" jwtToken={jwtToken ?? undefined} autoConnect={true}>
            <ReactorStage
              prompt={cutscenePrompt}
              onStarted={() => setHasStarted(true)}
              onError={(message) => setRuntimeError(message)}
            />
          </ReactorProvider>
        )}
      </div>

      <div className="cutscene__overlay">
        <button className="cutscene__enter" onClick={onEnter}>
          Enter World
        </button>
      </div>
    </div>
  );
}
