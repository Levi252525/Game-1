# Tiny Platformer

A simple browser platformer built with plain HTML, CSS, and JavaScript.

## Play locally

1. Open `index.html` in your browser.
2. Press **Start** to begin.
3. Move with **Arrow Left/Right** or **A / D**.
4. Jump with **Arrow Up**, **W**, or **Space**.
5. Press **Enter** to pause/resume.
6. Press **R** to restart.

## Goal

- Collect every coin.
- Reach the flag at the far right to win.
- Falling off the map ends the run.
- Your best coin count is saved in `localStorage`.

## Change game assets

This project now loads art files from the `assets/` folder.

Replace these files to re-skin the game:

- `assets/background.png` (or `background.gif` / `background.webp` / `background.jpg`)
- `assets/player.svg`
- `assets/platform.svg`
- `assets/coin.svg`
- `assets/flag.svg`

You can also use `PNG`, `JPG`, or `WebP` with the same base names.
Example: upload `assets/player.png` and it will be used automatically.

The game currently auto-detects your uploaded `assets/Isopoly_01.gif` and uses it as the background.
