/** On-demand recovery of a missing Team projection from its Session log. */
import { useEffect, useRef, useState } from 'react';
/**
 * Request a missing Team projection when its view is opened, with an explicit fresh retry.
 * @param sessionId - Conversation whose root Team should be loaded.
 * @param active - Whether the Team view is visible.
 * @param missing - Whether the shared Session store lacks its Team value.
 * @param refresh - Projection reader supplied by the browser plugin.
 * @returns loading state and a retry action for a missing value.
 */
export function useTeamProjectionRecovery(sessionId, active, missing, refresh) {
    const [state, setState] = useState('idle');
    const generation = useRef(0);
    useEffect(() => () => { generation.current++; }, []);
    useEffect(() => {
        if (!active || !missing)
            return;
        const current = ++generation.current;
        setState('loading');
        void refresh(sessionId).then(() => { if (generation.current === current)
            setState('settled'); }, () => { if (generation.current === current)
            setState('error'); });
        return () => { if (generation.current === current)
            generation.current++; };
    }, [active, missing, refresh, sessionId]);
    const retry = () => {
        if (state === 'loading')
            return;
        const current = ++generation.current;
        setState('loading');
        void refresh(sessionId, true).then(() => { if (generation.current === current)
            setState('settled'); }, () => { if (generation.current === current)
            setState('error'); });
    };
    return { state, retry };
}
