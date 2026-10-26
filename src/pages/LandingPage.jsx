import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import '../styles/navigation.css';
import '../styles/landing.css';

export default function LandingPage() {
  const sectionRef = useRef(null);
  const cardRefs = useRef([]);

  useEffect(() => {
    const html = document.documentElement;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    let targetMouseX = 0, targetMouseY = 0;
    let mouseX = 0, mouseY = 0;
    let targetScroll = 0, smoothScroll = 0;
    let initialized = false, rafPending = false;
    let animFrameId = null;

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

    const getScrollDistance = () => {
      if (!sectionRef.current) return 0;
      return clamp(-sectionRef.current.getBoundingClientRect().top, 0, sectionRef.current.offsetHeight - window.innerHeight);
    };

    function requestTick() {
      if (!rafPending) {
        rafPending = true;
        animFrameId = requestAnimationFrame(update);
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

      const blurActive = clamp(frame2.active + frame3.active);
      const frame2Opacity = frame2.active * (1 - frame3.enter);
      const splitDrift = Math.pow(frame2.enter, 1.5);
      const panel2Opacity = frame2.active * (1 - frame2.exit);
      const panel3Opacity = frame3.active * (1 - frame3.exit);
      const backScale = 0.76 + progress * 0.2 + frame2.enter * 0.18 + frame3.enter * 0.16;
      const sharedHeroY = progress * -74;
      const sharedHeroScale = progress * 0.23;

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

      // Water cards
      const cardStart = 3300;
      const cardInterval = 650;

      cardRefs.current.forEach((card, idx) => {
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

          if (t < 0.08) {
            opacity = t / 0.08;
          } else if (t > 0.92) {
            opacity = (1 - t) / 0.08;
          } else {
            opacity = 1;
          }
        }

        const easedT = 0.4 * t + 0.6 * (0.5 + 4 * Math.pow(t - 0.5, 3));
        const theta = -0.12 + easedT * (Math.PI + 0.24);

        const W = window.innerWidth;
        const H = window.innerHeight;

        const cardWidth = W < 640 ? 240 : (W < 1100 ? 280 : 320);
        const cardHeight = W < 640 ? 320 : (W < 1100 ? 380 : 420);

        const centerX = W / 2;
        const rx = W * 0.36;
        const ry = H * 0.44;
        const baselineY = H * 0.82;

        const x = centerX + rx * Math.cos(theta) - cardWidth / 2;
        const y = baselineY - ry * Math.sin(theta) - cardHeight / 2;

        const baseScale = W < 640 ? 0.72 : (W < 1100 ? 0.86 : 1.0);
        const scale = baseScale * (0.85 + 0.15 * Math.sin(theta));

        const zRot = -12 * Math.cos(theta);
        const yRot = -15 * Math.cos(theta);

        card.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) scale(${scale.toFixed(4)}) rotateZ(${zRot.toFixed(2)}deg) rotateY(${yRot.toFixed(2)}deg)`;
        card.style.opacity = opacity.toFixed(4);
        card.style.pointerEvents = pointerEvents;
      });

      if (
        Math.abs(smoothScroll - targetScroll) > 0.08 ||
        Math.abs(mouseX - targetMouseX) > 0.001 ||
        Math.abs(mouseY - targetMouseY) > 0.001
      ) {
        rafPending = true;
        animFrameId = requestAnimationFrame(update);
      }
    }

    const handleScroll = () => requestTick();
    const handleResize = () => requestTick();
    const handlePointerMove = (e) => {
      targetMouseX = e.clientX / window.innerWidth - 0.5;
      targetMouseY = e.clientY / window.innerHeight - 0.5;
      requestTick();
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize);
    window.addEventListener('pointermove', handlePointerMove, { passive: true });

    requestTick();

    // Intersection observer for fading elements
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('.observe-fade, .observe-panel').forEach(el => observer.observe(el));

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('pointermove', handlePointerMove);
      if (animFrameId) cancelAnimationFrame(animFrameId);
      observer.disconnect();
    };
  }, []);

  return (
    <main className="site-shell">
      <section className="cinema-scroll" id="cinema" ref={sectionRef} aria-label="Dastaan cinematic scroll story">
        <div className="stage">
          <div className="world">
            <img
              className="scene-img sky-img"
              src="https://raft-blast-61784561.figma.site/_assets/v11/16b5007d9c93971e26ffe4e0e3e37946f6bd538c.png"
              alt=""
            />
            
            <Navbar isFixed={false} />

            <div className="back-stack">
              <img
                className="scene-img back-img back-four"
                src="https://raft-blast-61784561.figma.site/_assets/v11/8a7f8af50e0ce92ec2e228e7b0b4112178c51cf1.png"
                alt=""
              />
              <img
                className="scene-img back-img back-bazaar"
                src="https://raft-blast-61784561.figma.site/_assets/v11/864afe00e41e2fa20a5aa546e15cb807e0f81384.png"
                alt=""
              />
            </div>

            <div className="hero-title hero-sky-content">
              <h1 className="hero-main-title">DASTAAN</h1>
            </div>

            <img
              className="scene-img splitframe-img splitframe-left"
              src="https://raft-blast-61784561.figma.site/_assets/v11/7536d7b60a1fce482cf6edf3f0bffd3bad5d0f8a.png"
              alt=""
            />
            <img
              className="scene-img splitframe-img splitframe-right"
              src="https://raft-blast-61784561.figma.site/_assets/v11/392db6a6a6b98e868bd7f8d3f55bb719d51e5028.png"
              alt=""
            />

            <div className="hero-arch-content">
              <p className="hero-tagline-main">EXPLORE. DISCOVER. JOURNEY.</p>
              <p className="hero-description">Plan your destination, days, budget, and experiences in one personalized trip.</p>
              <Link to="/plan" className="btn-hero-plan">
                PLAN MY TRIP &rarr;
              </Link>
              <div className="scroll-indicator">
                <span className="scroll-text">EXPLORE</span>
                <span className="scroll-line"></span>
              </div>
            </div>

            <div className="water-cards-container">
              {/* Card 1 — DISCOVER */}
              <div className="water-card" id="water-card-1" ref={el => cardRefs.current[0] = el}>
                <div className="card-img-wrapper">
                  <img src="/images/firstImage.jpeg" alt="Mostar Bosnia" className="card-img" />
                </div>
                <div className="card-body">
                  <span className="card-tag">DISCOVER — CHAPTER 01</span>
                  <h3 className="card-title">Mostar, Bosnia</h3>
                  <p className="card-desc">Begin your story at a historic cultural crossroads, where Ottoman stone architecture meets the winding Neretva River.</p>
                  <div className="card-footer">
                    <span className="card-rating">★ 4.9</span>
                    <span className="card-duration">Overview</span>
                  </div>
                </div>
              </div>

              {/* Card 2 — EXPLORE */}
              <div className="water-card" id="water-card-2" ref={el => cardRefs.current[1] = el}>
                <div className="card-img-wrapper">
                  <img src="/images/stari_most_bridge.jpeg" alt="Stari Most Bridge" className="card-img" />
                </div>
                <div className="card-body">
                  <span className="card-tag">EXPLORE — CHAPTER 02</span>
                  <h3 className="card-title">Stari Most Bridge</h3>
                  <p className="card-desc">Walk the iconic 16th-century Ottoman bridge and trace cobblestone alleyways that have stood for centuries.</p>
                  <div className="card-footer">
                    <span className="card-rating">★ 4.9</span>
                    <span className="card-duration">Landmark</span>
                  </div>
                </div>
              </div>

              {/* Card 3 — EXPERIENCE */}
              <div className="water-card" id="water-card-3" ref={el => cardRefs.current[2] = el}>
                <div className="card-img-wrapper">
                  <img src="https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=600&q=80" alt="Bosnian Coffee" className="card-img" />
                </div>
                <div className="card-body">
                  <span className="card-tag">EXPERIENCE — CHAPTER 03</span>
                  <h3 className="card-title">Artisan Old Bazaar</h3>
                  <p className="card-desc">Savor authentic Bosnian coffee copper-poured in Kujundžiluk Bazaar, surrounded by copper crafts and local artisans.</p>
                  <div className="card-footer">
                    <span className="card-rating">★ 4.8</span>
                    <span className="card-duration">Local Vibe</span>
                  </div>
                </div>
              </div>

              {/* Card 4 — PERSONALIZE */}
              <div className="water-card" id="water-card-4" ref={el => cardRefs.current[3] = el}>
                <div className="card-img-wrapper">
                  <img src="https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=600&q=80" alt="Personalize Plan" className="card-img" />
                </div>
                <div className="card-body">
                  <span className="card-tag">PERSONALIZE — CHAPTER 04</span>
                  <h3 className="card-title">Tailored to Your Story</h3>
                  <p className="card-desc">Tell us your budget, pace, and interests. Dastaan customizes stays, routes, and activities directly around you.</p>
                  <div className="card-footer">
                    <span className="card-rating">★ 5.0</span>
                    <span className="card-duration">Flexible</span>
                  </div>
                </div>
              </div>

              {/* Card 5 — JOURNEY */}
              <div className="water-card" id="water-card-5" ref={el => cardRefs.current[4] = el}>
                <div className="card-img-wrapper">
                  <img src="https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=600&q=80" alt="Completed Itinerary" className="card-img" />
                </div>
                <div className="card-body">
                  <span className="card-tag">JOURNEY — CHAPTER 05</span>
                  <h3 className="card-title">Your Custom Story</h3>
                  <p className="card-desc">Receive a seamless day-by-day plan with smart directions and real-time cost breakdown. Less tabs, more travel.</p>
                  <div className="card-footer">
                    <span className="card-rating">★ 4.9</span>
                    <span className="card-duration">Completed</span>
                  </div>
                </div>
              </div>
            </div>

            <img
              className="scene-img bridge-img"
              src="https://raft-blast-61784561.figma.site/_assets/v11/c6a6d8ef49bca43f708aa852692942c45ec950d4.png"
              alt=""
            />
            <img
              className="scene-img frame-two-img"
              src="https://raft-blast-61784561.figma.site/_assets/v11/ba75252bab2b1c510987b74837770f7bc8a6b2d4.png"
              alt=""
            />
            <div className="shade"></div>
          </div>

          <section className="story-panel story-panel-bridge observe-panel" aria-label="Dastaan problem">
            <h2 className="intro-headline">PLANNING A TRIP SHOULDN'T MEAN OPENING 20 TABS.</h2>
            <p className="intro-description">Maps for places. Blogs for recommendations. Booking sites for stays. Spreadsheets for budgets. Dastaan brings the planning together.</p>
            <div className="hero-tags" aria-label="Planning elements">
              <span>Maps</span>
              <span>Travel Blogs</span>
              <span>Booking</span>
              <span>Reviews</span>
              <span>Budget</span>
              <span>Notes</span>
            </div>
          </section>

          <section className="story-panel story-panel-bazaar observe-panel" id="how-it-works" aria-label="How Dastaan Works">
            <h2 className="intro-headline" style={{ fontSize: 'clamp(2rem, 3.5vw, 3.5rem)', marginBottom: '48px', color: 'var(--paper)' }}>
              FROM "WHERE SHOULD I GO?"<br />TO "HERE'S YOUR TRIP."
            </h2>

            <div className="travel-cards-wrapper">
              <svg className="travel-route-line" viewBox="0 0 1000 100" preserveAspectRatio="none">
                <path className="route-path" d="M 100,50 Q 300,10 500,50 T 900,50" fill="none" stroke="rgba(214,181,109,0.25)" strokeWidth="2" strokeDasharray="8 8" />
                <circle cx="100" cy="50" r="4" fill="rgba(214,181,109,0.6)" />
                <circle cx="500" cy="50" r="4" fill="rgba(214,181,109,0.6)" />
                <circle cx="900" cy="50" r="4" fill="rgba(214,181,109,0.6)" />
              </svg>

              <div className="travel-card step-01">
                <span className="step-num">01 &mdash; TELL US</span>
                <ul className="step-list">
                  <li>Destination</li>
                  <li>Duration</li>
                  <li>Budget</li>
                </ul>
                <p className="step-desc">Give Dastaan the constraints that matter to you.</p>
              </div>

              <div className="travel-card step-02">
                <span className="step-num">02 &mdash; WE PLAN</span>
                <ul className="step-list">
                  <li>Places</li>
                  <li>Routes</li>
                  <li>Costs</li>
                </ul>
                <p className="step-desc">Dastaan builds an itinerary around your time and budget.</p>
              </div>

              <div className="travel-card step-03">
                <span className="step-num">03 &mdash; YOU TRAVEL</span>
                <ul className="step-list">
                  <li>One itinerary</li>
                  <li>One plan</li>
                </ul>
                <p className="step-desc">Stop researching.<br />Start travelling.</p>
              </div>
            </div>
          </section>
        </div>
      </section>

      {/* Editorial Section */}
      <section className="editorial-section observe-fade">
        <div className="editorial-bg-pattern">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <pattern id="topo" x="0" y="0" width="400" height="400" patternUnits="userSpaceOnUse">
              <path d="M 0 100 Q 100 50, 200 100 T 400 100 M 0 200 Q 150 150, 250 250 T 400 200 M 0 300 Q 50 350, 150 300 T 400 300" fill="none" stroke="var(--primary)" strokeWidth="0.5" strokeOpacity="0.05" />
            </pattern>
            <rect width="100%" height="100%" fill="url(#topo)" />
          </svg>
        </div>
        <div className="container relative-z">
          <div className="editorial-header">
            <span className="eyebrow">WHAT DASTAAN OPTIMIZES</span>
            <h2 className="editorial-title">BUILT AROUND<br />WHAT MATTERS TO YOU.</h2>
          </div>

          <div className="editorial-features">
            <div className="editorial-feature">
              <span className="feature-num">01</span>
              <h3>BUDGET-AWARE</h3>
              <p>Know what your trip is likely to cost before you go.</p>
              <div className="hover-indicator"></div>
            </div>
            <div className="feature-divider"></div>
            <div className="editorial-feature">
              <span className="feature-num">02</span>
              <h3>TIME-AWARE</h3>
              <p>Spend less time travelling between places and more time experiencing them.</p>
              <div className="hover-indicator"></div>
            </div>
            <div className="feature-divider"></div>
            <div className="editorial-feature">
              <span className="feature-num">03</span>
              <h3>PREFERENCE-AWARE</h3>
              <p>Nature, food, adventure or culture &mdash; your itinerary adapts to you.</p>
              <div className="hover-indicator"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Replanning Simulation Section */}
      <section className="replanning-demo-section observe-fade">
        <div className="container replanning-container">
          <div className="replanning-text">
            <h2 className="section-title">PLANS CHANGE.<br />YOUR ITINERARY<br />SHOULD TOO.</h2>
            <p className="section-desc">Change your budget, time or preferences. Dastaan adapts the plan instead of making you start over.</p>
          </div>

          <div className="replanning-interactive">
            <div className="replan-card old-plan observe-anim">
              <span className="demo-label">YOUR TRIP</span>
              <div className="demo-metric">
                <span className="metric-label">Budget</span>
                <span className="metric-value">₹30,000</span>
              </div>
              <div className="demo-details">
                <span>5 days</span>
                <span style={{ marginLeft: '16px' }}>Balanced</span>
              </div>
            </div>

            <div className="replan-arrow observe-anim">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </div>

            <div className="replan-card new-plan observe-anim">
              <span className="demo-label active-label">DASTAAN REPLANS</span>
              <ul className="replan-list-animated">
                <li>Lower-cost activities &check;</li>
                <li>Adjusted accommodation &check;</li>
                <li>Updated itinerary &check;</li>
                <li>New total</li>
              </ul>
              <div className="demo-metric active-metric">
                <span className="metric-value final-price">₹19,600</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
