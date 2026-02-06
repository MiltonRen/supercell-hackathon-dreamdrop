import { useEffect, useRef } from 'react';
import { useStore, GameObject } from '../store';
import { v4 as uuidv4 } from 'uuid';
import { GoogleGenAI } from '@google/genai';

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
      try {
        const prompt = `
Current World Description: "${worldDescription}"
Player "${playerId}" says: "${text}"
Goal: Update the world description based on the player's intent. Keep it concise (1-2 sentences).
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
      }
    }

    // Rule 2: "make" -> Create Object
    if (lower.includes("make")) {
      try {
        const prompt = `
Player "${playerId}" says: "${text}"
Goal: Extract the object the player wants to make.
Return a JSON object with:
{
  "label": string (short name),
  "color": string (hex code),
  "shape": "box" | "sphere" | "cylinder"
}
Only return JSON.
              `;

        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: prompt,
          config: {
            responseMimeType: 'application/json'
          }
        });

        const responseText = response.text;

        if (responseText) {
          // Clean markdown json if present (though responseMimeType should handle it)
          const jsonStr = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
          const data = JSON.parse(jsonStr);

          const newObj: GameObject = {
            id: uuidv4(),
            position: [Math.random() * 10 - 5, 5, Math.random() * 10 - 5],
            type: 'dynamic',
            label: data.label || 'Unknown',
            color: data.color || 'white',
            shape: data.shape || 'box',
            scale: [1, 1, 1]
          };
          addObject(newObj);
        }
      } catch (e) {
        console.error("Gemini Object Creation Failed", e);
      }
    }
  };
}
