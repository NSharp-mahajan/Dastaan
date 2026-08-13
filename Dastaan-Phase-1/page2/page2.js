/**
 * DASTAAN / TRIPFIT — PAGE 2 (TRIP PREFERENCES)
 * Vanilla JavaScript Implementation (Visual Polish & Motion Upgrade)
 * Handles input state, multi-select interests, single-select travel style,
 * vertical counter animations, progress bar tracking, cinematic transition,
 * localStorage persistence, and navigation.
 */

document.addEventListener('DOMContentLoaded', () => {
  
  // Trigger sequential entrance reveal animations on load
  requestAnimationFrame(() => {
    document.body.classList.add('page-loaded');
  });

  // ==========================================
  // 1. STATE INITIALIZATION
  // ==========================================
  const state = {
    destination: '',
    days: 3,
    budget: 8000,
    interests: new Set(),
    travelStyle: 'Balanced'
  };

  // ==========================================
  // 2. DOM ELEMENT REFERENCES
  // ==========================================
  const form = document.getElementById('trip-preferences-form');
  const mainContentArea = document.getElementById('main-content-area');
  
  // Destination elements
  const destInput = document.getElementById('destination-input');
  const clearDestBtn = document.getElementById('clear-destination');
  const suggestionChips = document.querySelectorAll('.chip-suggestion');
  
  // Days elements
  const daysDisplay = document.getElementById('days-count');
  const btnDecrementDays = document.getElementById('btn-decrement-days');
  const btnIncrementDays = document.getElementById('btn-increment-days');
  const daysPresets = document.querySelectorAll('.days-presets .preset-btn');
  
  // Budget elements
  const budgetInput = document.getElementById('budget-input');
  const budgetPresets = document.querySelectorAll('.budget-presets .preset-btn');
  
  // Interests elements
  const interestChips = document.querySelectorAll('.interest-chip');
  const interestsBadge = document.getElementById('interests-count-badge');
  
  // Travel Style elements
  const styleCards = document.querySelectorAll('.style-card');
  
  // Progress Bar elements
  const step1 = document.getElementById('step-1');
  const step2 = document.getElementById('step-2');
  const progressFill1 = document.getElementById('progress-fill-1');

  // Error Banner elements
  const errorBanner = document.getElementById('error-banner');
  const errorMessage = document.getElementById('error-message');
  const errorCloseBtn = document.getElementById('error-close-btn');

  // Transition & Modal elements
  const continueBtn = document.getElementById('continue-btn');
  const journeyTransitionOverlay = document.getElementById('journey-transition-overlay');
  const transDestName = document.getElementById('trans-dest-name');
  const successModal = document.getElementById('success-modal');
  const summaryDest = document.getElementById('summary-dest');
  const summaryDays = document.getElementById('summary-days');
  const summaryBudget = document.getElementById('summary-budget');
  const modalDetailsBox = document.getElementById('modal-details-box');
  const modalEditBtn = document.getElementById('modal-edit-btn');
  const modalProceedBtn = document.getElementById('modal-proceed-btn');

  // ==========================================
  // 3. PROGRESS TRACKER ANIMATION
  // ==========================================
  function updateProgressTracker() {
    const isDestValid = state.destination.trim().length > 0;
    const isInterestsValid = state.interests.size > 0;
    const isFormValid = isDestValid && isInterestsValid && state.days > 0 && state.budget > 0;

    if (isFormValid) {
      step1.classList.add('completed');
      step2.classList.add('active');
      if (progressFill1) progressFill1.style.width = '100%';
    } else {
      step1.classList.remove('completed');
      step2.classList.remove('active');
      if (progressFill1) {
        const fillPercent = (isDestValid ? 50 : 0) + (isInterestsValid ? 30 : 0);
        progressFill1.style.width = `${fillPercent}%`;
      }
    }
  }

  // ==========================================
  // 4. RESTORE PREVIOUS STATE (LOCAL STORAGE)
  // ==========================================
  function restoreSavedPreferences() {
    try {
      const savedData = localStorage.getItem('tripPreferences');
      if (savedData) {
        const parsed = JSON.parse(savedData);
        if (parsed.destination) {
          destInput.value = parsed.destination;
          state.destination = parsed.destination;
          toggleClearBtn();
          updateSuggestionChipSelection(parsed.destination);
        }
        if (parsed.days && !isNaN(parsed.days)) {
          updateDays(parseInt(parsed.days), false);
        }
        if (parsed.budget && !isNaN(parsed.budget)) {
          updateBudget(parseInt(parsed.budget));
        }
        if (Array.isArray(parsed.interests) && parsed.interests.length > 0) {
          state.interests.clear();
          interestChips.forEach(chip => {
            const interestName = chip.getAttribute('data-interest');
            if (parsed.interests.includes(interestName)) {
              chip.classList.add('active');
              state.interests.add(interestName);
            } else {
              chip.classList.remove('active');
            }
          });
          updateInterestsBadge();
        }
        if (parsed.travelStyle) {
          selectTravelStyle(parsed.travelStyle);
        }
      }
    } catch (e) {
      console.warn('Could not parse stored tripPreferences:', e);
    }
    updateProgressTracker();
  }

  // ==========================================
  // 5. DESTINATION INPUT & POPULAR CHIPS
  // ==========================================
  function toggleClearBtn() {
    if (destInput.value.trim().length > 0) {
      clearDestBtn.style.display = 'block';
    } else {
      clearDestBtn.style.display = 'none';
    }
  }

  function updateSuggestionChipSelection(currentDest) {
    suggestionChips.forEach(chip => {
      const chipVal = chip.getAttribute('data-dest');
      if (chipVal.toLowerCase() === currentDest.trim().toLowerCase()) {
        chip.classList.add('selected');
      } else {
        chip.classList.remove('selected');
      }
    });
  }

  destInput.addEventListener('input', (e) => {
    state.destination = e.target.value;
    toggleClearBtn();
    updateSuggestionChipSelection(e.target.value);
    updateProgressTracker();
    clearError();
  });

  clearDestBtn.addEventListener('click', () => {
    destInput.value = '';
    state.destination = '';
    toggleClearBtn();
    updateSuggestionChipSelection('');
    updateProgressTracker();
    destInput.focus();
  });

  // Suggestion chips handler
  suggestionChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const destValue = chip.getAttribute('data-dest');
      destInput.value = destValue;
      state.destination = destValue;
      toggleClearBtn();
      updateSuggestionChipSelection(destValue);
      updateProgressTracker();
      clearError();
    });
  });

  // ==========================================
  // 6. DAYS COUNTER & VERTICAL NUMBER ANIMATION
  // ==========================================
  function updateDays(newDays, animate = true) {
    const clamped = Math.min(30, Math.max(1, newDays));
    state.days = clamped;

    if (animate) {
      daysDisplay.classList.add('num-slide');
      setTimeout(() => {
        daysDisplay.textContent = clamped;
        daysDisplay.classList.remove('num-slide');
      }, 100);
    } else {
      daysDisplay.textContent = clamped;
    }

    // Update active preset button highlight
    daysPresets.forEach(btn => {
      const pDays = parseInt(btn.getAttribute('data-days'));
      if (pDays === clamped) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    updateProgressTracker();
  }

  btnDecrementDays.addEventListener('click', () => {
    updateDays(state.days - 1);
  });

  btnIncrementDays.addEventListener('click', () => {
    updateDays(state.days + 1);
  });

  daysPresets.forEach(btn => {
    btn.addEventListener('click', () => {
      const pDays = parseInt(btn.getAttribute('data-days'));
      updateDays(pDays);
    });
  });

  // ==========================================
  // 7. BUDGET INPUT & PRESETS
  // ==========================================
  function updateBudget(newBudget) {
    const validVal = isNaN(newBudget) || newBudget < 0 ? 0 : newBudget;
    state.budget = validVal;
    budgetInput.value = validVal;

    budgetPresets.forEach(btn => {
      const pBudget = parseInt(btn.getAttribute('data-budget'));
      if (pBudget === validVal) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    updateProgressTracker();
  }

  budgetInput.addEventListener('input', (e) => {
    const val = parseInt(e.target.value);
    state.budget = isNaN(val) ? 0 : val;
    clearError();
    
    budgetPresets.forEach(btn => {
      const pBudget = parseInt(btn.getAttribute('data-budget'));
      if (pBudget === state.budget) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    updateProgressTracker();
  });

  budgetPresets.forEach(btn => {
    btn.addEventListener('click', () => {
      const pBudget = parseInt(btn.getAttribute('data-budget'));
      updateBudget(pBudget);
    });
  });

  // ==========================================
  // 8. INTERESTS MULTI-SELECT CHIPS
  // ==========================================
  function updateInterestsBadge() {
    const count = state.interests.size;
    if (count === 0) {
      interestsBadge.textContent = 'Required: Select at least 1';
      interestsBadge.style.color = '#FAD0C4';
      interestsBadge.style.background = 'rgba(200, 121, 85, 0.15)';
    } else {
      interestsBadge.textContent = `${count} Selected`;
      interestsBadge.style.color = 'var(--accent-gold)';
      interestsBadge.style.background = 'rgba(214, 181, 109, 0.12)';
    }
  }

  interestChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const interest = chip.getAttribute('data-interest');
      if (state.interests.has(interest)) {
        state.interests.delete(interest);
        chip.classList.remove('active');
      } else {
        state.interests.add(interest);
        chip.classList.add('active');
      }
      updateInterestsBadge();
      updateProgressTracker();
      clearError();
    });
  });

  // ==========================================
  // 9. TRAVEL STYLE SINGLE-SELECT CARDS
  // ==========================================
  function selectTravelStyle(selectedStyleName) {
    state.travelStyle = selectedStyleName;
    styleCards.forEach(card => {
      const styleName = card.getAttribute('data-style');
      if (styleName === selectedStyleName) {
        card.classList.add('active');
      } else {
        card.classList.remove('active');
      }
    });
  }

  styleCards.forEach(card => {
    card.addEventListener('click', () => {
      const styleName = card.getAttribute('data-style');
      selectTravelStyle(styleName);
      clearError();
    });
  });

  // ==========================================
  // 10. ERROR HANDLING & VALIDATION
  // ==========================================
  function showError(msg, targetElement) {
    errorMessage.textContent = msg;
    errorBanner.style.display = 'flex';
    
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (targetElement.focus) targetElement.focus();
    }
  }

  function clearError() {
    errorBanner.style.display = 'none';
  }

  errorCloseBtn.addEventListener('click', clearError);

  function validatePreferences() {
    state.destination = destInput.value.trim();
    
    // 1. Destination check
    if (!state.destination) {
      showError('Please enter a destination to begin your journey.', destInput);
      return false;
    }

    // 2. Days check
    if (!state.days || state.days < 1 || state.days > 30) {
      showError('Please set a valid duration between 1 and 30 days.', daysDisplay);
      return false;
    }

    // 3. Budget check
    if (state.budget <= 0 || isNaN(state.budget)) {
      showError('Please set a valid approximate budget for your trip.', budgetInput);
      return false;
    }

    // 4. Interests check (at least 1 required)
    if (state.interests.size === 0) {
      const interestsGrid = document.getElementById('interests-grid');
      showError('Please select at least one interest that defines your journey.', interestsGrid);
      return false;
    }

    // 5. Travel Style check
    if (!state.travelStyle) {
      const styleGrid = document.getElementById('style-cards-grid');
      showError('Please choose your preferred travel pace.', styleGrid);
      return false;
    }

    clearError();
    return true;
  }

  // ==========================================
  // 11. FORM SUBMISSION & CINEMATIC TRANSITION
  // ==========================================
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    
    if (!validatePreferences()) {
      return;
    }

    // Construct the structured JS object
    const tripPreferences = {
      destination: state.destination,
      days: state.days,
      budget: state.budget,
      interests: Array.from(state.interests),
      travelStyle: state.travelStyle,
      updatedAt: new Date().toISOString()
    };

    // Save to localStorage
    try {
      localStorage.setItem('tripPreferences', JSON.stringify(tripPreferences));
      console.log('Saved tripPreferences:', tripPreferences);
    } catch (err) {
      console.error('Error saving to localStorage:', err);
    }

    // Step 1: CTA compression
    continueBtn.style.transform = 'scale(0.97)';
    
    // Step 2: Content page exit slide
    mainContentArea.classList.add('page-exiting');

    // Step 3: Show Journey Creation Overlay after 200ms
    setTimeout(() => {
      transDestName.textContent = state.destination;
      journeyTransitionOverlay.style.display = 'flex';
    }, 200);

    // Step 4: Show Modal Summary after sweeping route line animation finishes
    setTimeout(() => {
      journeyTransitionOverlay.style.display = 'none';
      mainContentArea.classList.remove('page-exiting');
      continueBtn.style.transform = '';
      displaySuccessModal(tripPreferences);
    }, 1400);
  });

  // Modal display logic
  function displaySuccessModal(prefs) {
    summaryDest.textContent = prefs.destination;
    summaryDays.textContent = prefs.days;
    summaryBudget.textContent = `₹${prefs.budget.toLocaleString('en-IN')}`;
    
    modalDetailsBox.innerHTML = `
      <div style="margin-bottom: 8px;"><strong>Interests:</strong> ${prefs.interests.join(', ')}</div>
      <div><strong>Travel Style:</strong> ${prefs.travelStyle}</div>
    `;
    
    successModal.style.display = 'flex';
  }

  modalEditBtn.addEventListener('click', () => {
    successModal.style.display = 'none';
  });

  modalProceedBtn.addEventListener('click', () => {
    // Navigate to Page 3 (Place Discovery)
    window.location.href = '../page3/page3.html';
  });

  // ==========================================
  // 12. EXPOSE PUBLIC HELPER METHOD
  // ==========================================
  window.getTripPreferences = function() {
    try {
      const data = localStorage.getItem('tripPreferences');
      return data ? JSON.parse(data) : {
        destination: state.destination,
        days: state.days,
        budget: state.budget,
        interests: Array.from(state.interests),
        travelStyle: state.travelStyle
      };
    } catch (e) {
      return {
        destination: state.destination,
        days: state.days,
        budget: state.budget,
        interests: Array.from(state.interests),
        travelStyle: state.travelStyle
      };
    }
  };

  // Restore any previously saved data on initial load
  restoreSavedPreferences();
});
