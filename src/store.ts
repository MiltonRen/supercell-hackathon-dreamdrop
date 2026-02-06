import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';

export type Player = {
  id: string;
  position: [number, number, number];
  color: string;
  heldObjectId?: string | null;
};

export type GameObject = {
  id: string;
  position: [number, number, number];
  type: 'static' | 'dynamic';
  label: string;
  color: string;
  shape: 'box' | 'sphere' | 'cylinder';
  scale?: [number, number, number];
};

export type ChatMessage = {
  id: string;
  playerId: string;
  text: string;
  timestamp: number;
};

interface GameState {
  // World State
  worldDescription: string;
  setWorldDescription: (desc: string) => void;

  // Players
  players: Record<string, Player>;
  currentPlayerId: string | null;
  addPlayer: (id: string, color: string) => void;
  updatePlayerPosition: (id: string, position: [number, number, number]) => void;
  setCurrentPlayer: (id: string) => void;
  pickupObject: (playerId: string, objectId: string) => void;
  dropObject: (playerId: string, newPosition: [number, number, number]) => void;

  // Objects
  objects: GameObject[];
  addObject: (obj: GameObject) => void;
  removeObject: (id: string) => void;

  // Chat
  messages: ChatMessage[];
  addMessage: (playerId: string, text: string) => void;
}

export const useStore = create<GameState>((set) => ({
  worldDescription: "A cozy farm village",
  setWorldDescription: (desc) => set({ worldDescription: desc }),

  players: {},
  currentPlayerId: null,
  addPlayer: (id, color) => set((state) => ({
    players: {
      ...state.players,
      [id]: { id, position: [0, 1, 0], color, heldObjectId: null }
    }
  })),
  updatePlayerPosition: (id, position) => set((state) => {
    const player = state.players[id];
    if (!player) return {};
    return {
      players: {
        ...state.players,
        [id]: { ...player, position }
      }
    };
  }),
  setCurrentPlayer: (id) => set({ currentPlayerId: id }),
  pickupObject: (playerId, objectId) => set((state) => {
    const player = state.players[playerId];
    if (!player) return {};
    return {
      players: {
        ...state.players,
        [playerId]: { ...player, heldObjectId: objectId }
      }
    };
  }),
  dropObject: (playerId, newPosition) => set((state) => {
    const player = state.players[playerId];
    if (!player || !player.heldObjectId) return {};

    // Update player (drop)
    const updatedPlayers = {
      ...state.players,
      [playerId]: { ...player, heldObjectId: null }
    };

    // Update object position
    const updatedObjects = state.objects.map(obj =>
      obj.id === player.heldObjectId
        ? { ...obj, position: newPosition }
        : obj
    );

    return {
      players: updatedPlayers,
      objects: updatedObjects
    };
  }),

  objects: [
    { id: 'barn', position: [-5, 2, -5], type: 'static', label: 'Big Barn', color: '#8B4513', shape: 'box', scale: [4, 4, 4] },
    { id: 'tree1', position: [5, 2, -3], type: 'static', label: 'Oak Tree', color: '#228B22', shape: 'cylinder', scale: [2, 4, 2] },
    { id: 'well', position: [2, 1, 4], type: 'static', label: 'Old Well', color: '#808080', shape: 'cylinder', scale: [2, 2, 2] },
    { id: 'crate1', position: [2, 0.5, 0], type: 'static', label: 'Small Crate', color: '#CD853F', shape: 'box', scale: [1, 1, 1] },
  ],
  addObject: (obj) => set((state) => ({ objects: [...state.objects, obj] })),
  removeObject: (id) => set((state) => ({ objects: state.objects.filter(o => o.id !== id) })),

  messages: [],
  addMessage: (playerId, text) => set((state) => ({
    messages: [...state.messages, { id: uuidv4(), playerId, text, timestamp: Date.now() }]
  })),
}));
