# Grass Platform Jumper

A tiny browser platformer playground built with plain HTML, CSS, and JavaScript.

## Play locally

1. Open `index.html` in your browser.
2. Move with **Arrow Left/Right** or **A / D**.
3. Jump with **Arrow Up**, **W**, or **Space**.

## What it does

- One open map to run and jump around in.
- Side-scrolling camera that follows the player.
- Simple respawn if you fall off-screen.

## Using your own platform image

The game tries to load platform art from common filenames, including:

- `assets/platform.png` / `.jpg` / `.jpeg` / `.webp` / `.svg`
- `assets/grass-platform.png` / `.jpg` / `.jpeg` / `.webp`
- `assets/grass.png` / `.jpg` / `.jpeg` / `.webp`

If one is found, it is drawn on every platform automatically.
