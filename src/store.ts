import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { soundSynthesizer } from './utils/SoundSynthesizer';

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
  shape: 'box' | 'sphere' | 'cylinder' | 'cone' | 'rocket';
  scale?: [number, number, number];
};

export type ChatMessage = {
  id: string;
  playerId: string;
  text: string;
  timestamp: number;
};

const createStarterObjects = (): GameObject[] => ([
  { id: uuidv4(), position: [-2, 0, 2], type: 'dynamic', color: '#ff9831', shape: 'box', scale: [1, 1, 1] },
  { id: uuidv4(), position: [-4, 0, 4], type: 'dynamic', color: '#ff9831', shape: 'box', scale: [1, 1, 1] },
]);

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
  mergeObjectsIntoRocket: (rocket: { position: [number, number, number]; height: number; clearIds?: string[] }) => void;
  resetRound: () => void;
  resetGame: () => void;
}

export const useStore = create<GameState>((set) => ({
  worldDescription: "A world of mystery and magic. Keep the background stable. Render high quality video game graphics in the Studio Ghibli style 2D Japanese animation, kawaii art style, flat colors, no shading, 2D.",
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

    // Play pickup sound
    soundSynthesizer.playPickupSound();

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

    // Play drop sound
    soundSynthesizer.playDropSound();

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

  objects: createStarterObjects(),
  addObject: (obj) => set((state) => ({ objects: [...state.objects, obj] })),
  addObjects: (newObjs) => set((state) => ({ objects: [...state.objects, ...newObjs] })),
  removeObject: (id) => set((state) => ({ objects: state.objects.filter(o => o.id !== id) })),

  messages: [],
  addMessage: (playerId, text) => set((state) => ({
    messages: [...state.messages, { id: uuidv4(), playerId, text, timestamp: Date.now() }]
  })),

  hasWon: false,
  winHeight: 6,
  setHasWon: (hasWon) => set({ hasWon }),
  mergeObjectsIntoRocket: (rocket) => set((state) => {
    const updatedPlayers = Object.fromEntries(
      Object.entries(state.players).map(([id, player]) => [id, { ...player, heldObjectId: null }])
    );

    const rocketHeight = Math.max(4, rocket.height);
    const scaleFactor = Math.max(2.8, rocketHeight / 2);
    const clearIds = new Set(rocket.clearIds ?? []);
    const remainingObjects = state.objects.filter(obj => !clearIds.has(obj.id));
    const rocketObject: GameObject = {
      id: uuidv4(),
      position: [rocket.position[0], 0, rocket.position[2]],
      type: 'static',
      color: '#f7f3ff',
      shape: 'rocket',
      scale: [scaleFactor, scaleFactor, scaleFactor]
    };

    return {
      objects: [...remainingObjects, rocketObject],
      players: updatedPlayers
    };
  }),
  resetRound: () => set((state) => {
    const updatedPlayers = Object.fromEntries(
      Object.entries(state.players).map(([id, player]) => [id, { ...player, heldObjectId: null }])
    );
    return {
      hasWon: false,
      objects: createStarterObjects(),
      players: updatedPlayers
    };
  }),
  resetGame: () => set({
    hasWon: false,
    messages: [],
    worldDescription: "Mushroom world. Keep the background stable. Video game graphics in the Studio Ghibli style 2D Japanese animation, kawaii art style, flat colors, no shading, 2D.",
    isDreaming: false,
  }),
}));
