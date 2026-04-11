const fs = require('fs');
const path = require('path');
const vueFile = 'C:/Users/聖小熊/holybear.tw/.vitepress/theme/FloatingBgmPlayer.vue';
const musicDir = 'C:/Users/聖小熊/holybear.tw/public/music';

const vueContent = fs.readFileSync(vueFile, 'utf8');
const currentSongs = [...vueContent.matchAll(/src:\s*'([^']+)'/g)].map(m => m[1].toLowerCase());

function getFiles(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    for (let file of list) {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(getFiles(file));
        } else {
            if (file.endsWith('.mp3') || file.endsWith('.mp4')) {
                results.push(file);
            }
        }
    }
    return results;
}

const allFiles = getFiles(musicDir);
let zelda_songs = [];
let other_songs = [];

allFiles.forEach(file => {
    let relPath = '/music/' + path.relative(musicDir, file).replace(/\\\\/g, '/');
    if (!currentSongs.includes(relPath.toLowerCase())) {
        let title = path.basename(file).replace('.mp3', '').replace('.mp4', '').replace(/_/g, ' ');
        if (relPath.toLowerCase().includes('zelda')) {
            zelda_songs.push(\  { src: '\', title: '薩爾達傳說：\' }\);
        } else {
            other_songs.push(\  { src: '\', title: '楓之谷 - \' }\);
        }
    }
});

let out = zelda_songs.join(',\\n');
if (zelda_songs.length && other_songs.length) out += ',\\n';
out += other_songs.join(',\\n');
fs.writeFileSync('out.txt', out, 'utf8');
console.log('Done!');
