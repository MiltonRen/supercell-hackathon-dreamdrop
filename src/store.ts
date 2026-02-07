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
  isDreaming: boolean;
  setIsDreaming: (isDreaming: boolean) => void;

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
  addObjects: (objs: GameObject[]) => void;
  removeObject: (id: string) => void;

  // Chat
  messages: ChatMessage[];
  addMessage: (playerId: string, text: string) => void;

  // Win Condition
  hasWon: boolean;
  winHeight: number;
  setHasWon: (hasWon: boolean) => void;
  resetGame: () => void;
}

export const useStore = create<GameState>((set) => ({
  worldDescription: "A mushroom farm where cute mushmallow characters run around and stack wood blocks. Keep the background stable. Render high quality video game graphics in the Studio Ghibli animation art style.",
  setWorldDescription: (desc) => set({ worldDescription: desc }),

  players: {},
  currentPlayerId: null,
  addPlayer: (id, color) => set((state) => ({
    players: {
      ...state.players,
      [id]: { id, position: [0, 1, 0], color, heldObjectId: null }
    }
  })),
  isDreaming: false,
  setIsDreaming: (isDreaming) => set({ isDreaming }),
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
    // { id: 'static_1', position: [-20, 0, -20], type: 'static', color: '#fff', shape: 'box', scale: [4, 4, 4] },
    // { id: 'static_2', position: [20, 0, -15], type: 'static', color: '#fff', shape: 'box', scale: [2, 4, 2] },
    // { id: 'static_3', position: [15, 0, 20], type: 'static', color: '#fff', shape: 'box', scale: [2, 2, 2] },
    { id: 'dynamic_1', position: [-2, 0, 2], type: 'dynamic', color: '#ff9831', shape: 'box', scale: [1, 1, 1] },
    { id: 'dynamic_2', position: [-4, 0, 4], type: 'dynamic', color: '#ff9831', shape: 'box', scale: [1, 1, 1] },
  ],
  addObject: (obj) => set((state) => ({ objects: [...state.objects, obj] })),
  addObjects: (newObjs) => set((state) => ({ objects: [...state.objects, ...newObjs] })),
  removeObject: (id) => set((state) => ({ objects: state.objects.filter(o => o.id !== id) })),

  messages: [],
  addMessage: (playerId, text) => set((state) => ({
    messages: [...state.messages, { id: uuidv4(), playerId, text, timestamp: Date.now() }]
  })),

  hasWon: false,
  winHeight: 12,
  setHasWon: (hasWon) => set({ hasWon }),
  resetGame: () => set({
    hasWon: false,
    messages: [],
    worldDescription: "A miniature mushroom farm where cute mushmallow people run around and build cabins with wood blocks. Keep the background stable. Video game graphics in the Studio Ghibli animation style.",
    isDreaming: false,
  }),
}));
