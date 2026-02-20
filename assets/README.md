# Editable Game Assets

Replace these files to change the game's art:

- `player.svg` - player car sprite
- `platform.svg` - platform texture
- `coin.svg` - coin sprite
- `flag.svg` - finish flag

You can keep the same filenames and use PNG, JPG, or WebP if you also update the paths in `game.js`.

Current default paths in `game.js`:

```js
const assetPaths = {
  player: "./assets/player.svg",
  platform: "./assets/platform.svg",
  coin: "./assets/coin.svg",
  flag: "./assets/flag.svg",
};
```
