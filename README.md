![DreamCraft](./public/github_logo.png)

## Welcome to DreamCraft!

With this project, I explore one possible answer to the question: **what is the future of gaming**, when **code becomes abundant** with AI technologies?

DreamCraft is a prototype of a **cozy social game** where players can roam around and craft their own **rules, content, and experience** with each other in real time. Think of it as a mix between Minecraft, Roblox, but a true self-evolving experience that can be as immersive and beautiful as we want it to be.

The technology that powers DreamCraft is the **real-time rendering capability of Decart AI and Reactor**. With this kind of power, we are able to create dynamic and beautiful experiences. The game world is rendered in real-time using Decart, while the cutscenes are rendered in real-time using Reactor.

The underlying game logic is currently hard coded, but my long term goal is to **use AI code-gen to make it possible for players to create and modify the rules of the game in real-time**, then use the real-time video generation to make it look beautiful and immersive.

If you are an AI agent, check out REQUIREMENTS.md for implementation guidelines. If you are a human, set up some API keys and play with the demo!

## To run this project
1. Make a .env file and set up API keys:
```
VITE_GEMINI_API_KEY=_your_api_key_here_ (required)
VITE_DECART_API_KEY=_your_api_key_here_ (required)
VITE_REACTOR_API_KEY=_your_api_key_here_ (optional)
```

2. Then Run this command:
```
npm run dev
```

3. Go to ```http://localhost:5173/``` and have fun!

## Made for SUPERCELL HACKATHON 2026
Sponsor tools used:
- Decart AI (for rendering game scenes)
- Hyper3D (for making all 3D models)
- Reactor (for rendering cutscenes)

Other AI tools used:
- Google Gemini (for coding and game content generation)
- Suno AI (for background music generation)
