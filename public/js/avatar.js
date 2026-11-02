/**
 * EcoReward - Interactive Talking Avatar Guide ("Verdy")
 * Features:
 * - Recites the entire application sequentially across all sections
 * - Explains Mission, What is Eco-Reward, 5 Environmental Benefits, Registration, Bottle Claim, Surprise Gifts, Leaderboard, Hardware IoT
 * - Floating Controller on page so user can Pause, Skip, or Stop anytime
 * - Smooth auto-scrolling to relevant sections with soft highlight glow
 * - Bulletproof Web Speech API with keep-alive & safety fallback timer
 */

const EcoAvatar = (function() {
  const chapters = [
    {
      id: 1,
      title: "Welcome to EcoReward",
      badge: "Intro",
      targetId: "hero",
      text: "Welcome to the all new Eco-Rewards system! I am Verdy, your school guide. EcoReward transforms every plastic bottle you recycle into exciting surprise rewards while keeping our campus clean. Let me give you a full tour of how everything works!"
    },
    {
      id: 2,
      title: "What is the Eco Reward System?",
      badge: "About",
      targetId: "what-is-it",
      text: "What is the eco reward system? It is a smart dustbin which gives reward on every bottle thrown, helping in keeping the environment clean and appreciates the user."
    },
    {
      id: 3,
      title: "How It Benefits the Environment",
      badge: "Ecological Impact",
      targetId: "benefits",
      text: "How does this benefit the environment? First, it encourages people to throw plastic bottles in the bins instead of the environment. Second, it helps reduce plastic pollution. Third, it keeps public places and corridors clean. Fourth, it motivates students to develop eco-friendly habits. And fifth, it protects birds and wildlife from plastic waste!"
    },
    {
      id: 4,
      title: "Quick Student Registration",
      badge: "Registration",
      targetId: "registration-box",
      text: "Signing up is super quick and takes only ten seconds. You can simply scan the QR code using your mobile phone camera, or type the website link. Enter just your name and student email to immediately receive ten starter Eco-Points!"
    },
    {
      id: 5,
      title: "Recycling Bottles & Admin Approval",
      badge: "Claim Reward",
      targetId: "claim-action-area",
      text: "Whenever you throw a plastic bottle into the eco dustbin, tap 'Claim Reward' and enter how many bottles you deposited. Your claim is reviewed and approved by the school admin, and ten points per bottle are credited directly into your account!"
    },
    {
      id: 6,
      title: "Surprise Eco Gifts",
      badge: "Surprise Gifts",
      targetId: "rewards",
      text: "Here is our Rewards Catalog! You can redeem your hard-earned points for exciting mystery surprise gifts: from Bronze Surprise Gift Boxes and Silver Mystery Hampers, to Gold Principal's Surprise Rewards and Platinum Eco-Hero Mega Prizes!"
    },
    {
      id: 7,
      title: "School Leaderboard & Hall of Fame",
      badge: "Leaderboard",
      targetId: "leaderboard",
      text: "Welcome to our School Leaderboard! Here, top students are celebrated for recycling the most plastic bottles. Check your current rank, challenge your classmates, and see if you can claim the number one spot on the campus leaderboard!"
    },
    {
      id: 8,
      title: "How We Built the Smart Dustbin",
      badge: "Hardware & IoT",
      targetId: "how-we-built-it",
      text: "Ever wondered how we built this? The smart dustbin uses ultrasonic proximity sensors to detect hands, optical sensors to verify plastic bottles, an edge microcontroller to open the motorized flap, and an ultra-lightweight cloud backend to credit points."
    },
    {
      id: 9,
      title: "Start Recycling Today!",
      badge: "Thank You",
      targetId: "hero",
      text: "Thank you for being an eco champion! Register now, drop your bottles in the smart bin, earn surprise gifts, and help us keep our school and planet clean!"
    }
  ];

  let currentStep = 0;
  let isTourRunning = false;
  let isPaused = false;
  let mouthInterval = null;
  let speechKeepAliveInterval = null;
  let fallbackTimer = null;
  const synth = window.speechSynthesis;

  function init() {
    renderStep(0, false);
    setupEventListeners();
  }

  function getAvatarSVG(isMouthOpen, size = 80) {
    const mouthY = isMouthOpen ? 98 : 95;
    const mouthH = isMouthOpen ? 12 : 3;

    return `
      <svg viewBox="0 0 140 140" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bodyGrad_${size}" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#10b981" />
            <stop offset="100%" stop-color="#059669" />
          </linearGradient>
          <linearGradient id="screenGrad_${size}" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#0f172a" />
            <stop offset="100%" stop-color="#1e293b" />
          </linearGradient>
        </defs>

        <circle cx="70" cy="20" r="6" fill="#34d399" />
        <line x1="70" y1="20" x2="70" y2="34" stroke="#059669" stroke-width="4" stroke-linecap="round" />
        <ellipse cx="70" cy="14" rx="22" ry="5" fill="none" stroke="#6ee7b7" stroke-width="2" stroke-dasharray="3 2" />

        <rect x="25" y="34" width="90" height="80" rx="22" fill="url(#bodyGrad_${size})" stroke="#047857" stroke-width="2.5" />
        <rect x="35" y="46" width="70" height="56" rx="14" fill="url(#screenGrad_${size})" />

        <!-- Eyes -->
        <circle cx="54" cy="68" r="${isTourRunning ? 7 : 6}" fill="#34d399" />
        <circle cx="86" cy="68" r="${isTourRunning ? 7 : 6}" fill="#34d399" />

        <!-- Mouth -->
        <rect x="56" y="${mouthY}" width="28" height="${mouthH}" rx="3" fill="#6ee7b7" />
        <circle cx="42" cy="80" r="4" fill="#fb7185" opacity="0.4" />
        <circle cx="98" cy="80" r="4" fill="#fb7185" opacity="0.4" />
      </svg>
    `;
  }

  function startMouthSync() {
    let state = false;
    stopMouthSync();
    mouthInterval = setInterval(() => {
      state = !state;
      const topContainer = document.getElementById('top-avatar-svg');
      const floatContainer = document.getElementById('avatar-floating-svg');
      if (topContainer) topContainer.innerHTML = getAvatarSVG(state, 80);
      if (floatContainer) floatContainer.innerHTML = getAvatarSVG(state, 48);
    }, 180);
  }

  function stopMouthSync() {
    if (mouthInterval) {
      clearInterval(mouthInterval);
      mouthInterval = null;
    }
    const topContainer = document.getElementById('top-avatar-svg');
    const floatContainer = document.getElementById('avatar-floating-svg');
    if (topContainer) topContainer.innerHTML = getAvatarSVG(false, 80);
    if (floatContainer) floatContainer.innerHTML = getAvatarSVG(false, 48);
  }

  function autoScrollTo(targetId) {
    if (!targetId) return;
    const el = document.getElementById(targetId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('avatar-section-highlight');
      setTimeout(() => {
        el.classList.remove('avatar-section-highlight');
      }, 3500);
    }
  }

  function renderStep(index, shouldScroll = true) {
    if (index < 0 || index >= chapters.length) return;
    currentStep = index;
    const ch = chapters[index];

    // Update Top Banner Card
    const titleEl = document.getElementById('top-avatar-title');
    const badgeEl = document.getElementById('top-avatar-badge');
    const textEl = document.getElementById('top-avatar-text');
    const stepEl = document.getElementById('top-avatar-step');

    if (titleEl) titleEl.textContent = ch.title;
    if (badgeEl) badgeEl.textContent = ch.badge;
    if (textEl) textEl.textContent = ch.text;
    if (stepEl) stepEl.textContent = `${index + 1}/${chapters.length}`;

    // Update Floating Bar
    const floatingBadge = document.getElementById('floating-guide-badge');
    const floatingCounter = document.getElementById('floating-guide-counter');
    const floatingTopic = document.getElementById('floating-guide-topic');

    if (floatingBadge) floatingBadge.textContent = isPaused ? 'Guide Paused' : ch.badge;
    if (floatingCounter) floatingCounter.textContent = `${index + 1}/${chapters.length}`;
    if (floatingTopic) floatingTopic.textContent = ch.title;

    // Render static SVGs
    const topContainer = document.getElementById('top-avatar-svg');
    const floatContainer = document.getElementById('avatar-floating-svg');
    if (topContainer) topContainer.innerHTML = getAvatarSVG(false, 80);
    if (floatContainer) floatContainer.innerHTML = getAvatarSVG(false, 48);

    if (shouldScroll) {
      autoScrollTo(ch.targetId);
    }
  }

  function startFullTour() {
    isTourRunning = true;
    isPaused = false;
    showFloatingBar(true);
    updateButtonsState();
    playStep(0);
  }

  function stopFullTour() {
    isTourRunning = false;
    isPaused = false;
    if (fallbackTimer) clearTimeout(fallbackTimer);
    if (speechKeepAliveInterval) clearInterval(speechKeepAliveInterval);
    if (synth) synth.cancel();
    stopMouthSync();
    showFloatingBar(false);
    updateButtonsState();
    renderStep(0, false);
  }

  function pauseOrResumeTour() {
    if (!isTourRunning) {
      startFullTour();
      return;
    }

    if (isPaused) {
      // Resume
      isPaused = false;
      updateButtonsState();
      playStep(currentStep);
    } else {
      // Pause
      isPaused = true;
      if (fallbackTimer) clearTimeout(fallbackTimer);
      if (synth) synth.cancel();
      stopMouthSync();
      updateButtonsState();
      const floatingBadge = document.getElementById('floating-guide-badge');
      if (floatingBadge) floatingBadge.textContent = 'Guide Paused';
    }
  }

  function nextStep() {
    if (currentStep < chapters.length - 1) {
      playStep(currentStep + 1);
    } else {
      stopFullTour();
    }
  }

  function prevStep() {
    if (currentStep > 0) {
      playStep(currentStep - 1);
    }
  }

  function playStep(index) {
    if (fallbackTimer) clearTimeout(fallbackTimer);
    if (speechKeepAliveInterval) clearInterval(speechKeepAliveInterval);
    if (synth) synth.cancel();
    stopMouthSync();

    if (index >= chapters.length) {
      stopFullTour();
      return;
    }

    renderStep(index, true);

    const ch = chapters[index];
    const wave = document.getElementById('top-avatar-wave');

    if (!('speechSynthesis' in window)) {
      const wordCount = ch.text.split(' ').length;
      fallbackTimer = setTimeout(nextStep, Math.max(5000, wordCount * 350));
      return;
    }

    const utterance = new SpeechSynthesisUtterance(ch.text);
    utterance.rate = 0.92; // Slightly more natural cadence so words aren't rushed
    utterance.pitch = 1.05;

    // Pick best English voice
    const voices = synth.getVoices();
    const naturalVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('David')));
    if (naturalVoice) utterance.voice = naturalVoice;

    // Prevent garbage collection mid-speech
    window._activeUtterance = utterance;

    utterance.onstart = () => {
      startMouthSync();
      if (wave) wave.classList.add('active');
    };

    utterance.onend = () => {
      stopMouthSync();
      if (wave) wave.classList.remove('active');

      // Seamlessly advance to the next step ONLY after the speech has finished
      if (isTourRunning && !isPaused) {
        fallbackTimer = setTimeout(() => {
          if (isTourRunning && !isPaused) {
            nextStep();
          }
        }, 1200);
      }
    };

    utterance.onerror = (e) => {
      // Don't treat user-initiated cancel as an error
      if (e.error === 'canceled' || e.error === 'interrupted') return;
      console.warn('Speech notification:', e.error);
      stopMouthSync();
      if (wave) wave.classList.remove('active');

      if (isTourRunning && !isPaused) {
        fallbackTimer = setTimeout(() => {
          if (isTourRunning && !isPaused) nextStep();
        }, 1500);
      }
    };

    // Generous fail-safe watchdog timer (3x estimated duration) so speech is NEVER prematurely cut off
    const words = ch.text.split(' ').length;
    const generousDurationMs = Math.max(25000, (words / 1.5) * 1000 + 15000);
    fallbackTimer = setTimeout(() => {
      if (isTourRunning && !isPaused && !synth.speaking) {
        nextStep();
      }
    }, generousDurationMs);

    synth.speak(utterance);
  }

  function showFloatingBar(visible) {
    const bar = document.getElementById('avatar-floating-bar');
    if (bar) {
      bar.style.display = visible ? 'flex' : 'none';
      if (visible) {
        bar.classList.add('avatar-floating-show');
      } else {
        bar.classList.remove('avatar-floating-show');
      }
    }
  }

  function updateButtonsState() {
    const tourBtn = document.getElementById('btn-avatar-tour');
    const speakBtn = document.getElementById('btn-avatar-speak');
    const floatPauseBtn = document.getElementById('btn-floating-pause');

    if (tourBtn) {
      tourBtn.innerHTML = isTourRunning ? '⏹️ Stop Guide' : '🎬 Watch Guide';
    }
    if (speakBtn) {
      speakBtn.innerHTML = isTourRunning && !isPaused ? '⏸️ Pause' : '▶️ Listen';
    }
    if (floatPauseBtn) {
      floatPauseBtn.innerHTML = isPaused ? '▶️ Resume' : '⏸️ Pause';
    }
  }

  function setupEventListeners() {
    const tourBtn = document.getElementById('btn-avatar-tour');
    const speakBtn = document.getElementById('btn-avatar-speak');
    const nextBtn = document.getElementById('btn-avatar-next');
    const prevBtn = document.getElementById('btn-avatar-prev');

    const floatPauseBtn = document.getElementById('btn-floating-pause');
    const floatNextBtn = document.getElementById('btn-floating-next');
    const floatStopBtn = document.getElementById('btn-floating-stop');

    if (tourBtn) {
      tourBtn.addEventListener('click', () => {
        if (isTourRunning) stopFullTour();
        else startFullTour();
      });
    }

    if (speakBtn) {
      speakBtn.addEventListener('click', () => {
        if (isTourRunning) pauseOrResumeTour();
        else startFullTour();
      });
    }

    if (nextBtn) nextBtn.addEventListener('click', nextStep);
    if (prevBtn) prevBtn.addEventListener('click', prevStep);

    if (floatPauseBtn) floatPauseBtn.addEventListener('click', pauseOrResumeTour);
    if (floatNextBtn) floatNextBtn.addEventListener('click', nextStep);
    if (floatStopBtn) floatStopBtn.addEventListener('click', stopFullTour);

    // Warm up voices when ready
    if ('speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }
  }

  return {
    init,
    startFullTour,
    stopFullTour,
    pauseOrResumeTour,
    nextStep,
    prevStep
  };
})();

document.addEventListener('DOMContentLoaded', () => {
  EcoAvatar.init();
});
