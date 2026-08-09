// src/hooks/use-agent.ts
import { useState, useEffect } from 'react';
import { agentEngine, AppState } from '@/utils/agentEngine';

export function useAgentState(): AppState {
  const [state, setState] = useState<AppState>(() => agentEngine.getState());

  useEffect(() => {
    // Subscribe to state modifications in the agent engine
    const unsubscribe = agentEngine.subscribe(() => {
      setState(agentEngine.getState());
    });
    return unsubscribe;
  }, []);

  return state;
}
