import { create } from 'zustand'

export type ConnectionStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'disconnected'

interface SandboxState {
  sandboxId: string | null
  labId: string | null
  terminalStatus: ConnectionStatus
  canvasStatus: ConnectionStatus
  setSandbox: (sandboxId: string, labId: string) => void
  setTerminalStatus: (status: ConnectionStatus) => void
  setCanvasStatus: (status: ConnectionStatus) => void
  clearSandbox: () => void
}

export const useSandboxStore = create<SandboxState>((set) => ({
  sandboxId: null,
  labId: null,
  terminalStatus: 'idle',
  canvasStatus: 'idle',
  setSandbox: (sandboxId, labId) => set({ sandboxId, labId }),
  setTerminalStatus: (terminalStatus) => set({ terminalStatus }),
  setCanvasStatus: (canvasStatus) => set({ canvasStatus }),
  clearSandbox: () =>
    set({
      sandboxId: null,
      labId: null,
      terminalStatus: 'idle',
      canvasStatus: 'idle',
    }),
}))
