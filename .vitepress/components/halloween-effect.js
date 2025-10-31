// 萬聖節蝙蝠動畫 + 南瓜燈怪物（大且顯眼，漸變動畫）
export function showHalloweenEffect() {
  if (!document.body.classList.contains('halloween-theme')) return;
  // 蝙蝠動畫
  if (!document.getElementById('halloween-bats')) {
    const batCount = 8;
    const batContainer = document.createElement('div');
    batContainer.id = 'halloween-bats';
    batContainer.style.position = 'fixed';
    batContainer.style.pointerEvents = 'none';
    batContainer.style.top = '0';
    batContainer.style.left = '0';
    batContainer.style.width = '100vw';
    batContainer.style.height = '100vh';
    batContainer.style.zIndex = '9999';
    for(let i=0;i<batCount;i++){
      const bat = document.createElement('img');
  bat.src = '/image/halloween/halloween2.png';
      bat.style.position = 'absolute';
      bat.style.width = '48px';
      bat.style.height = 'auto';
      bat.style.top = Math.random()*80+10+'vh';
      bat.style.left = Math.random()*90+'vw';
      bat.style.opacity = '0.8';
      bat.style.transition = 'transform 0.8s cubic-bezier(.68,-0.55,.27,1.55)';
      batContainer.appendChild(bat);
      setInterval(()=>{
        bat.style.transform = `translateY(${Math.random()*40-20}px) rotate(${Math.random()*40-20}deg)`;
      }, 1200+Math.random()*800);
    }
    document.body.appendChild(batContainer);
  }
  // 南瓜燈怪物（大且顯眼，漸變動畫）
  if (!document.getElementById('halloween-pumpkin')) {
    const pumpkin = document.createElement('div');
    pumpkin.id = 'halloween-pumpkin';
    pumpkin.style.position = 'fixed';
    pumpkin.style.left = '50%';
    pumpkin.style.bottom = '0';
    pumpkin.style.transform = 'translateX(-50%)';
    pumpkin.style.zIndex = '9998';
    pumpkin.style.pointerEvents = 'auto';
    pumpkin.style.width = '320px';
    pumpkin.style.height = '320px';
    pumpkin.innerHTML = `
      <div style="position:relative;width:100%;height:100%;cursor:pointer;" id="pumpkin-click-area">
        <img src="/image/halloween/halloween1.png" style="width:100%;filter:drop-shadow(0 0 48px #ff9800) brightness(1.2);transition:filter 1.2s;" id="pumpkin-img">
        <div id="pumpkin-glow" style="position:absolute;left:80px;top:120px;width:160px;height:80px;background:radial-gradient(circle,#fff200 60%,#ff9800 100%);border-radius:50%;opacity:0.7;filter:blur(16px);transition:background 1.2s;"></div>
      </div>
    `;
    document.body.appendChild(pumpkin);
    // 點擊南瓜燈顯示提示
    setTimeout(() => {
      const clickArea = document.getElementById('pumpkin-click-area');
      if (clickArea) {
        clickArea.addEventListener('click', () => {
          alert('Helloween! 小熊祝你萬聖節快樂!');
        });
      }
    }, 100);
    // 漸變動畫
    let glowColors = [
      ['#fff200', '#ff9800'],
      ['#ff9800', '#ff5722'],
      ['#fff200', '#ff5722'],
      ['#ff9800', '#fff200']
    ];
    let idx = 0;
    setInterval(()=>{
      idx = (idx+1)%glowColors.length;
      const glow = document.getElementById('pumpkin-glow');
      if(glow) glow.style.background = `radial-gradient(circle,${glowColors[idx][0]} 60%,${glowColors[idx][1]} 100%)`;
      const img = document.getElementById('pumpkin-img');
      if(img) img.style.filter = `drop-shadow(0 0 48px ${glowColors[idx][1]}) brightness(1.2)`;
    }, 1200);
  }
}
