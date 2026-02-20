# Editable Game Assets

Replace these files to change the game's art:

- `level-clear.gif` - played after each level clear
- `background.png` - background image (also supports gif/jpg/webp/svg)
- `player.svg` - player car sprite
- `platform.svg` - platform texture
- `coin.svg` - coin sprite
- `flag.svg` - finish flag

You can also use `.png`, `.jpg`, `.jpeg`, or `.webp` with the same base names.
Examples:

- `player.png`
- `platform.webp`
- `coin.jpg`
- `flag.jpeg`

The loader tries modern image files first, then falls back to SVG defaults.

Current configuration in `game.js`:

```js
const assetSources = {
  levelClear: ["./assets/level-clear.gif", "...", "./assets/06c1f71f...gif"],
  background: ["./assets/background.png", "...", "./assets/Isopoly_01.gif"],
  player: ["./assets/player.png", "...", "./assets/player.svg"],
  platform: ["./assets/platform.png", "...", "./assets/platform.svg"],
  coin: ["./assets/coin.png", "...", "./assets/coin.svg"],
  flag: ["./assets/flag.png", "...", "./assets/flag.svg"],
};
```
