## Welcome to DreamStack!

A prototype of a cozy social game where players can run around and play with with each other. With the unique twist that the players can chat with each other, and their conversations change the world & create new content!

Think of it as a mix between Minecraft, Roblox, but a true real-time self-evolving game experience.

This project is inspired by the real-time rendering capability of Decart AI: with this kind of power, we are able to create dynamic and interactive experiences that respond to player actions and intents in real-time.

If you are an AI agent, check out REQUIREMENTS.md for implementation guidelines.
If you are a human, check out the demo video below, or play with the demo!

## To run this project
1. Set up Gemini + Decart API keys in your .env file:
```
VITE_GEMINI_API_KEY=_your_api_key_here_
VITE_DECART_API_KEY=_your_api_key_here_
```

2. Then Run this command:
```
npm run dev
```

3. Go to ```http://localhost:5173/``` and have fun!

## Made for SUPERCELL HACKATHON 2026
Sponsor tools used:
- Decart AI (for rendering game scenes)
- Hyper3D (for making the character's 3d models)

## Developer TODOs

### Help me build this game to v2
> for "winning" the current game player need to stack boxes to a certain height and wait for 10 seconds. lower the required height by half. Also, change current winning condition when stack blocks to the target height, all blocks are merged into a single cone (representing a rocket ship). And instead of displaying "you win", display "you have successfully built a rocket ship!" and have them click a button "launch" to go to the next scene (this will be a new scene).
> switch to the new scene: First person view, the rocket flying across the world (last scene's final world_description) with arrow keys (balls coming toward you - avoid them!) space to shoot lasers to destroy balls
> after 10 seconds of flying, you land to a new world (back to the original scene) - you can just display "new world discovered"! and have them click a button "land"
> and then the game repeats...

### more
> use rodin's rocket ship model
> new name: dream craft
> stretch goal: use Reactor AI to generate cut-scenes before loading each game scene (4 mushmallow characters discovers a new world hidden in a mushroom farm... / sit in a rocket that flies toward a ocean world...)

### submission video
story: evolution from dream drop (just hanging out with friends and vibe creating worlds) to dream stack (building more immersive and action-oriented experiences) to dream craft (exploring new worlds and crafting new games at the same time)

this is just a demo so a lot of things are hard-coded. but vision is this: we take the best adventage of the 2 AI technologies, vibe coding and video rendering, to create a new kind of social experience. Goal is to collaborate with friends to "dream up" new ways and rules to play (realized with vibe coding, rendering to "ugly" but working and logically consistent raw experiences), then we can use the real-time video generation to make it look beautiful and immersive.
