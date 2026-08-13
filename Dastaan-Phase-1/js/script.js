const section = document.querySelector('.cinema-scroll');
const html = document.documentElement;
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");

let targetMouseX = 0, targetMouseY = 0;
let mouseX = 0, mouseY = 0;
let targetScroll = 0, smoothScroll = 0;
let initialized = false, rafPending = false;

const clamp = (v, min = 0, max = 1) => Math.min(max, Math.max(min, v));
const smoothstep = (e0, e1, v) => {
  const x = clamp((v - e0) / (e1 - e0));
  return x * x * (3 - 2 * x);
};
const lerp = (a, b, t) => a + (b - a) * t;
const segmentInOut = (s, a, b, c, d) => {
  const enter = smoothstep(a, b, s), exit = smoothstep(c, d, s);
  return { enter, exit, active: enter * (1 - exit) };
};
const getScrollDistance = () => clamp(-section.getBoundingClientRect().top, 0, section.offsetHeight - window.innerHeight);

function requestTick() {
  if (!rafPending) {
    rafPending = true;
    requestAnimationFrame(update);
  }
}

function update() {
  rafPending = false;
  targetScroll = getScrollDistance();
  
  if (!initialized || reduceMotion.matches) {
    smoothScroll = targetScroll;
    initialized = true;
  } else {
    smoothScroll = lerp(smoothScroll, targetScroll, 0.14);
  }
  if (Math.abs(smoothScroll - targetScroll) < 0.08) smoothScroll = targetScroll;
  
  mouseX = lerp(mouseX, targetMouseX, 0.12);
  mouseY = lerp(mouseY, targetMouseY, 0.12);

  const frame2 = segmentInOut(smoothScroll, 560, 900, 1300, 1620);
  const frame3 = segmentInOut(smoothScroll, 1760, 2140, 2540, 2700);
  const progress = clamp(smoothScroll / 2700);
  const introExit = smoothstep(90, 650, smoothScroll);
  const sightsEnterRaw = smoothstep(2760, 3560, smoothScroll);
  const sightsEnter = Math.pow(sightsEnterRaw, 1.55);
  const sightsControlsEnter = smoothstep(3360, 3660, smoothScroll);
  
  const blurActive = clamp(frame2.active + frame3.active);
  const frame2Opacity = frame2.active * (1 - frame3.enter);
  const splitDrift = Math.pow(frame2.enter, 1.5);
  const panel2Opacity = frame2.active * (1 - frame2.exit);
  const panel3Opacity = frame3.active * (1 - frame3.exit);
  const backScale = 0.76 + progress * 0.2 + frame2.enter * 0.18 + frame3.enter * 0.16;
  const sharedHeroY = progress * -74;
  const sharedHeroScale = progress * 0.23;
  const sightsScreenTop = Math.min(220, Math.max(112, window.innerHeight * 0.19)) - 50;
  const sightsParentTop = window.innerHeight - (window.innerHeight - sightsScreenTop) / backScale;
  
  const mx = reduceMotion.matches ? 0 : mouseX;
  const my = reduceMotion.matches ? 0 : mouseY;
  
  html.style.setProperty('--mx', mx.toFixed(4));
  html.style.setProperty('--my', my.toFixed(4));
  
  html.style.setProperty('--back-opacity', (1 - frame2.active * 0.06).toFixed(4));
  html.style.setProperty('--back-x', `${mouseX * -12}px`);
  html.style.setProperty('--back-y', `${mouseY * -4}px`);
  html.style.setProperty('--back-scale', backScale.toFixed(4));
  
  html.style.setProperty('--four-y', `${10 + progress * 10}vh`);
  html.style.setProperty('--four-scale', (0.78 + progress * 0.16).toFixed(4));
  
  html.style.setProperty('--bazaar-y', `${20 - progress * 8}vh`);
  
  html.style.setProperty('--blur-px', `${blurActive * 3}px`);
  html.style.setProperty('--back-brightness', (1 - blurActive * 0.4).toFixed(4));
  
  html.style.setProperty('--bazaar-blur-px', `${frame2.active * 3}px`);
  html.style.setProperty('--bazaar-brightness', (1 - frame2.active * 0.4 - frame3.active * 0.06).toFixed(4));
  html.style.setProperty('--bazaar-saturation', (1 + frame3.active * 0.18).toFixed(4));
  
  html.style.setProperty('--shade-opacity', "1");
  html.style.setProperty('--shade-z', frame2.active > 0.02 ? "2" : "0");
  html.style.setProperty('--shade-top-alpha', (blurActive * 0.465).toFixed(4));
  html.style.setProperty('--shade-mid-alpha', (blurActive * 0.42).toFixed(4));
  html.style.setProperty('--shade-bottom-alpha', (blurActive * 0.51).toFixed(4));
  
  html.style.setProperty('--title-y', `${introExit * -210}px`);
  html.style.setProperty('--title-scale', (1 - introExit * 0.08).toFixed(4));
  html.style.setProperty('--title-opacity', (1 - introExit).toFixed(4));
  
  html.style.setProperty('--bridge-x', `calc(-50% + ${mouseX * 18}px)`);
  html.style.setProperty('--bridge-y', `${mouseY * 8 + sharedHeroY - frame2.exit * 760}px`);
  html.style.setProperty('--bridge-bottom', `${5 - frame2.enter * 13}vh`);
  html.style.setProperty('--bridge-width', `${67.2 + frame2.enter * 37.8}vw`);
  html.style.setProperty('--bridge-scale', (1.02 + sharedHeroScale + frame2.exit * 0.46).toFixed(4));
  
  html.style.setProperty('--split-left-x', `calc(-50% + ${-splitDrift * 46}vw + ${mouseX * 22}px)`);
  html.style.setProperty('--split-left-y', `${mouseY * 10 + sharedHeroY - splitDrift * 180}px`);
  html.style.setProperty('--split-left-scale', (1 + sharedHeroScale + frame2.enter * 0.74).toFixed(4));
  html.style.setProperty('--split-right-x', `calc(-50% + ${splitDrift * 46}vw + ${mouseX * 22}px)`);
  html.style.setProperty('--split-right-y', `${mouseY * 10 + sharedHeroY - splitDrift * 180}px`);
  html.style.setProperty('--split-right-scale', (1 + sharedHeroScale + frame2.enter * 0.74).toFixed(4));
  
  html.style.setProperty('--frame2-opacity', frame2Opacity.toFixed(4));
  html.style.setProperty('--frame2-x', `calc(-50% + ${mouseX * 10}px)`);
  html.style.setProperty('--frame2-y', `calc(-50% + ${mouseY * 8 - frame2.exit * 150}px)`);
  html.style.setProperty('--frame2-scale', (1.06 + frame2.enter * 0.08 + frame2.exit * 0.08).toFixed(4));
  
  html.style.setProperty('--intro-copy-y', `${introExit * 90}px`);
  html.style.setProperty('--intro-copy-opacity', (1 - introExit).toFixed(4));
  html.style.setProperty('--panel2-opacity', panel2Opacity.toFixed(4));
  html.style.setProperty('--panel2-y', `calc(-50% + ${-frame2.exit * 86 + (1 - frame2.enter) * 58}px)`);
  html.style.setProperty('--panel3-opacity', panel3Opacity.toFixed(4));
  html.style.setProperty('--panel3-y', `calc(-50% + ${-frame3.exit * 86 + (1 - frame3.enter) * 58}px)`);
  
  // Water cards scroll-driven inverted arch animation
  const waterCards = [
    document.getElementById('water-card-1'),
    document.getElementById('water-card-2'),
    document.getElementById('water-card-3'),
    document.getElementById('water-card-4'),
    document.getElementById('water-card-5')
  ];

  const cardStart = 3300;
  const cardInterval = 650;
  
  waterCards.forEach((card, idx) => {
    if (!card) return;
    
    const start = cardStart + idx * cardInterval;
    const end = start + cardInterval;
    
    let t;
    let opacity = 0;
    let pointerEvents = "none";
    
    if (smoothScroll < start) {
      t = 0;
      opacity = 0;
    } else if (smoothScroll > end) {
      t = 1;
      opacity = 0;
    } else {
      t = (smoothScroll - start) / cardInterval;
      pointerEvents = "auto";
      
      // Soft opacity transition near edges
      if (t < 0.08) {
        opacity = t / 0.08;
      } else if (t > 0.92) {
        opacity = (1 - t) / 0.08;
      } else {
        opacity = 1;
      }
    }
    
    // Speed distribution: Card emerges and submerges quickly, but crawls/slows down in the middle (near t = 0.5) for readability
    const easedT = 0.4 * t + 0.6 * (0.5 + 4 * Math.pow(t - 0.5, 3));
    
    // Semicircle angle from right (-0.12 radians) to left (pi + 0.12 radians)
    const theta = -0.12 + easedT * (Math.PI + 0.24);
    
    const W = window.innerWidth;
    const H = window.innerHeight;
    
    // Responsive layout sizing
    const cardWidth = W < 640 ? 240 : (W < 1100 ? 280 : 320);
    const cardHeight = W < 640 ? 320 : (W < 1100 ? 380 : 420);
    
    const centerX = W / 2;
    const rx = W * 0.36; // horizontal radius (36% of viewport width)
    const ry = H * 0.44; // vertical radius (44% of viewport height)
    
    // Water shoreline/surface vertical line
    const baselineY = H * 0.82; 
    
    const x = centerX + rx * Math.cos(theta) - cardWidth / 2;
    const y = baselineY - ry * Math.sin(theta) - cardHeight / 2;
    
    // Responsive scale and rotation calculations
    const baseScale = W < 640 ? 0.72 : (W < 1100 ? 0.86 : 1.0);
    const scale = baseScale * (0.85 + 0.15 * Math.sin(theta));
    
    // Sleek 3D and tangent rotation effects
    const zRot = -12 * Math.cos(theta); // tilt into curve
    const yRot = -15 * Math.cos(theta); // face travel direction
    
    card.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) scale(${scale.toFixed(4)}) rotateZ(${zRot.toFixed(2)}deg) rotateY(${yRot.toFixed(2)}deg)`;
    card.style.opacity = opacity.toFixed(4);
    card.style.pointerEvents = pointerEvents;
  });

  if (Math.abs(smoothScroll - targetScroll) > 0.08 ||
      Math.abs(mouseX - targetMouseX) > 0.001 ||
      Math.abs(mouseY - targetMouseY) > 0.001) {
    rafPending = true;
    requestAnimationFrame(update);
  }
}

window.addEventListener('scroll', requestTick, { passive: true });
window.addEventListener('resize', () => {
  requestTick();
});
window.addEventListener('pointermove', (e) => {
  targetMouseX = e.clientX / window.innerWidth - 0.5;
  targetMouseY = e.clientY / window.innerHeight - 0.5;
  requestTick();
}, { passive: true });

window.addEventListener('load', () => {
  requestTick();
});

function observeElements() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });
  
  document.querySelectorAll('.observe-fade, .observe-panel').forEach(el => observer.observe(el));
}
window.addEventListener('DOMContentLoaded', () => {
  observeElements();
  
  const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
  const siteHeader = document.querySelector('.site-header');
  if(mobileMenuToggle && siteHeader) {
    mobileMenuToggle.addEventListener('click', () => {
      siteHeader.classList.toggle('menu-open');
    });
  }
});