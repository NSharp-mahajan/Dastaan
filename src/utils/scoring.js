/**
 * Recommendation and scoring algorithm for Discover engine
 */

export function calculateMatch(dest, prefs) {
  let score = 0;
  const reasons = [];

  // A. Budget (Max 30%)
  if (prefs.budgetChoice) {
    if (dest.budget <= prefs.budgetChoice) {
      score += 30;
      reasons.push(`Comfortably fits your budget (estimated ₹${dest.budget.toLocaleString('en-IN')})`);
    } else if (dest.budget <= prefs.budgetChoice * 1.25) {
      score += 15;
      reasons.push(`Slightly over your budget choice (estimated ₹${dest.budget.toLocaleString('en-IN')})`);
    } else {
      score += 5;
      reasons.push(`Exceeds your preferred budget (estimated ₹${dest.budget.toLocaleString('en-IN')})`);
    }
  } else {
    score += 30;
  }

  // B. Duration (Max 25%)
  if (prefs.durationRange) {
    let minD = 0, maxD = 99;
    if (prefs.durationRange === "2-3") { minD = 2; maxD = 3; }
    else if (prefs.durationRange === "4-6") { minD = 4; maxD = 6; }
    else if (prefs.durationRange === "6-7") { minD = 6; maxD = 7; }
    else if (prefs.durationRange === "8+") { minD = 8; maxD = 99; }

    if (dest.days >= minD && dest.days <= maxD) {
      score += 25;
      reasons.push(`Fits your timeframe perfectly (${dest.days} days recommended)`);
    } else if (Math.abs(dest.days - minD) <= 1 || Math.abs(dest.days - maxD) <= 1) {
      score += 12;
      reasons.push(`Close to your preferred duration`);
    } else {
      reasons.push(`Requires ${dest.days} days, outside your timeframe`);
    }
  } else {
    score += 25;
  }

  // C. Experiences/Interests (Max 30%)
  if (prefs.interests && prefs.interests.length > 0) {
    const matchCount = prefs.interests.filter(i => dest.interests.includes(i)).length;
    const ratio = matchCount / prefs.interests.length;
    score += Math.round(ratio * 30);
    
    if (matchCount > 0) {
      reasons.push(`Matches ${matchCount} of your chosen experiences`);
    }
  } else {
    score += 30;
  }

  // D. Travel Style / Pace (Max 15%)
  if (dest.styles && dest.styles.includes(prefs.travelStyle)) {
    score += 15;
    reasons.push(`Matches your preference for a ${prefs.travelStyle.toLowerCase()} pace`);
  } else {
    score += 5;
  }

  return {
    score: Math.max(10, Math.min(100, score)),
    reasons
  };
}

export function getFitLabel(score) {
  if (score >= 80) return "GREAT FIT";
  if (score >= 60) return "STRONG FIT";
  return "GOOD FIT";
}
