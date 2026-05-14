import MenuScene    from './scenes/MenuScene.js';
import Level1Scene   from './scenes/Level1Scene.js';
import Level2Scene   from './scenes/Level2Scene.js';
import Level3Scene   from './scenes/Level3Scene.js';
import Level4Scene   from './scenes/Level4Scene.js';
import Level5Scene   from './scenes/Level5Scene.js';
import GameOverScene from './scenes/GameOverScene.js';

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 450,
  backgroundColor: '#050810',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 700 },
      debug: false,
    },
  },
  scene: [MenuScene, Level1Scene, Level2Scene, Level3Scene, Level4Scene, Level5Scene, GameOverScene],
};

new Phaser.Game(config);
