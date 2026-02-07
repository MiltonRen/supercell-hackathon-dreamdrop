import { useEffect, useRef } from 'react';
import { useStore, GameObject } from '../store';
import { v4 as uuidv4 } from 'uuid';
import { GoogleGenAI } from '@google/genai';
import { soundSynthesizer } from '../utils/SoundSynthesizer';

export function useGameLogic() {
  const messages = useStore(state => state.messages);
  const worldDescription = useStore(state => state.worldDescription);
  const setWorldDescription = useStore(state => state.setWorldDescription);
  const addObject = useStore(state => state.addObject);

  const processedMessageIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Process new messages
    messages.forEach(msg => {
      if (processedMessageIds.current.has(msg.id)) return;
      processedMessageIds.current.add(msg.id);

      processMessage(msg.text, msg.playerId);
    });
  }, [messages]);

  const processMessage = async (text: string, playerId: string) => {
    const lower = text.toLowerCase();

    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      console.error("Missing VITE_GEMINI_API_KEY");
      return;
    }

    const ai = new GoogleGenAI({ apiKey });

    // Rule 1: "world" -> Update World Description
    if (lower.includes("world")) {
      const setIsDreaming = useStore.getState().setIsDreaming;
      setIsDreaming(true);
      try {
        const prompt = `
Current World Description: "${worldDescription}"
Player "${playerId}" says: "${text}"
Goal: Update the world description based on the player's intent. Keep the rendering guideline + Studio Ghibli animation style the same. Keep it concise.
New World Description:
             `;

        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: prompt,
        });

        const responseText = response.text;
        if (responseText) {
          console.log("Updating world:", responseText);
          setWorldDescription(responseText.trim());
        }

      } catch (e) {
        console.error("Gemini World Update Failed", e);
      } finally {
        const setIsDreaming = useStore.getState().setIsDreaming;
        setIsDreaming(false);
        soundSynthesizer.playGenerateSound();
      }
    }

    // Rule 2: "make" -> Create Object
    if (lower.includes("make")) {
      try {
        const isBunch = lower.includes("bunch") || lower.includes("some") || lower.includes("many") || lower.includes("more");
        const count = isBunch ? 40 : 1;
        const MAP_RANGE = 22;
        const randomSpawnPosition = (): [number, number, number] => ([
          (Math.random() * 2 - 1) * MAP_RANGE,
          4 + Math.random() * 5,
          (Math.random() * 2 - 1) * MAP_RANGE
        ]);
        const addObjects = useStore.getState().addObjects;
        const newObjs: GameObject[] = [];

        for (let i = 0; i < count; i++) {
          const pos = randomSpawnPosition();

          newObjs.push({
            id: uuidv4(),
            position: pos,
            type: 'dynamic',
            color: '#ff9831',
            shape: 'box',
            scale: [1, 1, 1]
          });
        }
        addObjects(newObjs);

        // Play generate sound
        soundSynthesizer.playGenerateSound();
      } catch (e) {
        console.error("Object Creation Failed", e);
      }
    }
  };
}
