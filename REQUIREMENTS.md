# DreamDrop

## Game idea

Let's build this web game jam project. I want to render a web-based 3d top down cozy social game, where the players can run around, pick up stuff and drop them, and send text messages. With the unique tweak that the players text messages change the world or create new objects! I want to do it with Decart AI realtime video restyling - their doc (https://docs.platform.decart.ai/models/realtime/video-restyling). So we would use some very basic 3d library to generate a very simple raw game render, then feed that rendered video into Decart to render the final version players see (can keep the raw render version in a small window next to it), and the video rendered will react to the player's text inputs by changing the realtime prompt. For the project we can use fake multiplayer (all controlled by one local machine, so no complex network stuff)

## Technology (important: check package.json for what you already have)

- Frontend: React (Vite) + React Three Fiber (@react-three)
- 3D Physics/Logic: Rapier.js (@react-three/rapier)
- Realtime Video Rendering: Decart Realtime SDK (@decartai/sdk)
  - Use mirage_v2 model only: https://docs.platform.decart.ai/models/realtime/video-restyling
  - The API key is located in .env file (DECART_API_KEY)
- LLM: Google Gemini (@google/genai)
  - For the model, use Gemini 3 Flash only: https://ai.google.dev/gemini-api/docs/models#gemini-3-flash
  - The API key is located in .env file (GEMINI_API_KEY)

## The Architecture Flow
1. The "Raw" Scene (Source): You render a very basic scene using solid colors and no textures (brown ground, simple white chibi models as players, gray shapes as non-interactive objects, yellow shapes as interactive objects).
2. The Capture: You use the captureStream() method on the HTML5 Canvas to get a video feed of your "ugly" game.
3. The Message Processing Engine: When a player types a message, that text is processed and conditionally alters the world_description, or creates a new object in the scene, or do nothing.
4. The Rendering Engine: The raw video stream + the current Global Prompt are sent to Decart. The frontend receives the restyled stream and displays it in a large video element, while the "Raw" view sits in a small window next to it for debugging purpose.

## How to set up the raw world scene
- The raw game scene initializes with a few hard coded non-interactive objects (as bigger background elements) and interactive objects (about player size). The objects are overlayed with simple text labels to explain what they are.
- Maintain a world_description variable, initialized to "A cozy farm village". This variable will be used as the prompt for Decart realtime.

## How does player's text input change the world
- Run a simple rule-based scan on each text message player send
- if the message contains exact word "world", take the world_description and the message, feed them into the LLM to steer the world_description into the direction of the message's edit intent.
- if the message contains exact word "make", take the message and feed it into the LLM to generate a new interactive object into the scene. Overlay a simple text label on top of the object in the raw scene to explain what it is.

## How messages are entered and displayed
- We don't want to include the message in the rendering pipeline. Instead, let's put it next to the rendered video as a side panel chat log.
- There is a input box at the bottom of the side panel, typing messages into it and hit enter will send it under the name of the player you currently control.

## How players are controlled
- For this POC we do a fake multiplayer, where multiple players can be controlled by the same local machine.
- Simply press key "[" and "]" to switch between players, and use WASD to move the current player. Space key to pick up and drop objects.
- When a player is not currently being controlled, it will be controlled by a simple AI, which will make it wander around the scene slowly, picking up things and dropping them randomly.
