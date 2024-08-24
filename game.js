const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let coins = parseInt(localStorage.getItem('coins')) || 0;
let frames = JSON.parse(localStorage.getItem('frames')) || Array.from({ length: 12 }).map(() => null);
let winPrice = parseInt(localStorage.getItem('winPrice')) || 100;
const winKunsTextures = ['djinn', 'uma', 'taaka']; // 基本モンスターのテクスチャ
const attributeStones = { 火: 50, 水: 50, 土: 50, 風: 50, 天: 50 };
let monsterData = [];
let evolutions = [];
const winSize = 60;
const spawnInterval = 3000; // 3 seconds for spawning monsters
const coinGenerationInterval = 10000; // 10 seconds for general coin generation

async function fetchMonsterData() {
    try {
        const response = await fetch('data.json');
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        monsterData = data.monsters;
        evolutions = data.evolutions;
    } catch (error) {
        console.error('Failed to fetch monster data', error);
    }
}

function drawFrames() {
    frames.forEach((monster, index) => {
        const frame = document.getElementById(`frame${index}`);
        if (monster) {
            if (!frame.querySelector('img')) {
                const img = document.createElement('img');
                img.src = monster.texture;
                frame.appendChild(img);
            } else {
                frame.querySelector('img').src = monster.texture;
            }
        } else {
            frame.innerHTML = ''; // Clear frame if empty
        }
    });
}

async function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error(`Failed to load image at ${src}`));
        img.src = src;
    });
}

async function spawnMonster() {
    const texture = winKunsTextures[Math.floor(Math.random() * winKunsTextures.length)];
    try {
        const image = await loadImage(`images/${texture}.png`);
        const power = monsterData.find(monster => monster.id === texture)?.power || 10;

        const emptyIndex = frames.indexOf(null);
        if (emptyIndex !== -1) {
            frames[emptyIndex] = {
                x: Math.random() * (canvas.width - winSize),
                y: Math.random() * (canvas.height - winSize),
                image: image,
                power: power,
                texture: `images/${texture}.png`,
                attribute: null // Start without an attribute
            };
            localStorage.setItem('frames', JSON.stringify(frames));
            drawFrames();
        }
    } catch (error) {
        console.error('Failed to load monster image', error);
    }
}

function buyMonster() {
    if (coins >= winPrice) {
        coins -= winPrice;
        winPrice += 50; // Increase price for the next purchase
        localStorage.setItem('coins', coins);
        localStorage.setItem('winPrice', winPrice);
        document.getElementById('price').innerText = winPrice;
        updateShop();
    } else {
        alert('コインが足りません');
    }
}

function buyAttributeStone(attribute) {
    if (coins >= attributeStones[attribute]) {
        coins -= attributeStones[attribute];
        localStorage.setItem('coins', coins);
        updateCoins();
        alert(`${attribute}の石を購入しました`);
    } else {
        alert('コインが足りません');
    }
}

function showMonsterInfo(frameIndex) {
    const monster = frames[frameIndex];
    if (monster) {
        alert(`Frame ${frameIndex}: ${monster.texture} (Power: ${monster.power}, Attribute: ${monster.attribute || 'None'})`);
    } else {
        alert(`Frame ${frameIndex} is empty`);
    }
}

async function mergeMonsters(frameIndex1, frameIndex2) {
    const monster1 = frames[frameIndex1];
    const monster2 = frames[frameIndex2];

    if (monster1 && monster2) {
        alert(`マージするモンスターの情報:\nFrame ${frameIndex1}: ${monster1.texture} (Power: ${monster1.power})\nFrame ${frameIndex2}: ${monster2.texture} (Power: ${monster2.power})`);

        if (monster1.texture === monster2.texture) {
            const textureIndex = winKunsTextures.indexOf(monster1.texture.split('/').pop().split('.')[0]);
            const nextIndex = textureIndex + 1;

            if (nextIndex < winKunsTextures.length) {
                const newTexture = winKunsTextures[nextIndex];
                try {
                    const newImage = await loadImage(`images/${newTexture}.png`);
                    frames[frameIndex1] = {
                        x: (monster1.x + monster2.x) / 2,
                        y: (monster1.y + monster2.y) / 2,
                        image: newImage,
                        power: monster1.power + monster2.power,
                        texture: `images/${newTexture}.png`,
                        attribute: monster1.attribute || monster2.attribute
                    };
                    frames[frameIndex2] = null;
                    localStorage.setItem('frames', JSON.stringify(frames));
                    drawFrames();
                } catch (error) {
                    alert('新しいモンスター画像を読み込めませんでした');
                }
            } else {
                alert('これ以上マージできません');
            }
        } else {
            alert('異なるモンスターです');
        }
    } else {
        alert('モンスターが選択されていません');
    }
}

async function evolveMonster(frameIndex, attribute) {
    const monster = frames[frameIndex];
    console.log(`進化させるモンスター:`, monster, `属性:`, attribute);
    
    if (monster && monster.attribute === attribute) {
        const monsterId = monster.texture.split('/').pop().split('.')[0];
        console.log(`モンスターID: ${monsterId}`);

        const evolution = evolutions.find(evo => evo.from === monsterId && evo.attribute === attribute);
        console.log(`進化データ:`, evolution);

        if (evolution) {
            const newMonster = monsterData.find(m => m.id === evolution.to);
            console.log(`新モンスター:`, newMonster);

            if (newMonster) {
                try {
                    const newImage = await loadImage(`images/${newMonster.texture}.png`);
                    frames[frameIndex] = {
                        x: monster.x,
                        y: monster.y,
                        image: newImage,
                        power: newMonster.power,
                        texture: `images/${newMonster.texture}.png`,
                        attribute: newMonster.attribute || monster.attribute
                    };
                    localStorage.setItem('frames', JSON.stringify(frames));
                    drawFrames();
                } catch (error) {
                    alert('進化後の画像を読み込めませんでした');
                }
            } else {
                alert('進化先のモンスターが見つかりません');
            }
        } else {
            alert('進化に必要な属性がありません');
        }
    } else {
        alert('指定されたフレームにモンスターがいないか、属性が一致しません');
    }
}

function deleteMonster(frameIndex) {
    frames[frameIndex] = null;
    localStorage.setItem('frames', JSON.stringify(frames));
    drawFrames();
}

function resetGame() {
    if (confirm('本当にゲームをリセットしますか？')) {
        localStorage.clear();
        location.reload();
    }
}

function updateCoins() {
    document.getElementById('coins').innerText = `コイン: ${coins}`;
}

function updateShop() {
    document.getElementById('price').innerText = winPrice;
    document.getElementById('availableMonsters').innerText = `利用可能: ${frames.filter(frame => frame !== null).length}`;
}

document.getElementById('buyMonster').addEventListener('click', buyMonster);
document.getElementById('mergeMonster').addEventListener('click', () => {
    const frameIndex1 = parseInt(prompt('最初のフレーム番号を入力してください (例: 0)'));
    const frameIndex2 = parseInt(prompt('2つ目のフレーム番号を入力してください (例: 1)'));
    if (!isNaN(frameIndex1) && !isNaN(frameIndex2)) {
        mergeMonsters(frameIndex1, frameIndex2);
    } else {
        alert('無効なフレーム番号です');
    }
});
document.getElementById('deleteMonster').addEventListener('click', () => {
    const frameIndex = parseInt(prompt('削除するフレーム番号を入力してください (例: 0)'));
    if (!isNaN(frameIndex)) {
        deleteMonster(frameIndex);
    } else {
        alert('無効なフレーム番号です');
    }
});
document.getElementById('evolveMonster').addEventListener('click', () => {
    const frameIndex = parseInt(prompt('進化させるモンスターのフレーム番号を入力してください (例: 0)'));
    const attribute = prompt('進化に必要な属性を入力してください (例: 火)');
    if (!isNaN(frameIndex) && attribute) {
        evolveMonster(frameIndex, attribute);
    } else {
        alert('無効な入力です');
    }
});
document.getElementById('resetGame').addEventListener('click', resetGame);

document.getElementById('buyFire').addEventListener('click', () => buyAttributeStone('火'));
document.getElementById('buyWater').addEventListener('click', () => buyAttributeStone('水'));
document.getElementById('buyEarth').addEventListener('click', () => buyAttributeStone('土'));
document.getElementById('buyWind').addEventListener('click', () => buyAttributeStone('風'));
document.getElementById('buySky').addEventListener('click', () => buyAttributeStone('天'));

function startGame() {
    updateCoins();
    updateShop();
    setInterval(spawnMonster, spawnInterval);
    setInterval(() => {
        coins += 10; // Generate coins over time
        localStorage.setItem('coins', coins);
        updateCoins();
    }, coinGenerationInterval);
}

fetchMonsterData().then(startGame);
