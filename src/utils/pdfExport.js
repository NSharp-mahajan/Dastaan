/**
 * Dastaan Itinerary PDF Generator
 * Generates a clean, print-friendly luxury PDF document using jsPDF.
 * Handles long multi-page itineraries, page breaks, missing fields, and custom venues gracefully.
 */
import { jsPDF } from 'jspdf';

/**
 * Safe string converter to prevent undefined/null errors in jsPDF.text
 */
function safeStr(val, fallback = '') {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'string') return val;
  if (typeof val === 'number') return String(val);
  if (typeof val === 'object') {
    if (val.name) return String(val.name);
    if (val.title) return String(val.title);
    if (val.label) return String(val.label);
    if (val.category) return String(val.category);
    return fallback;
  }
  return String(val);
}

/**
 * Formats a date string into an editorial friendly format (e.g. "Sun, Nov 01, 2026")
 */
function formatDateFriendly(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  } catch {
    return '';
  }
}

/**
 * Generates and downloads a print-ready Dastaan itinerary PDF.
 *
 * @param {Object} trip - The trip data object
 * @param {Object} [options]
 * @param {boolean} [options.download=true] - Whether to trigger browser download
 * @param {string} [options.filename] - Custom output filename
 * @param {Array} [options.days] - Optional pre-computed days list
 * @param {string} [options.destName] - Optional destination title
 * @param {string} [options.countryName] - Optional country title
 * @param {Array} [options.breakdown] - Optional budget breakdown
 * @param {number} [options.budget] - Optional trip budget
 * @param {number} [options.travelers] - Optional travelers count
 * @param {string} [options.travelStyle] - Optional travel style
 * @param {string} [options.tagline] - Optional trip tagline
 * @returns {Promise<{ success: boolean, doc: jsPDF, filename: string }>}
 */
export async function exportItineraryToPdf(trip, options = {}) {
  const { download = true, filename } = options;

  if (!trip || typeof trip !== 'object') {
    throw new Error('Valid trip data is required to export itinerary as PDF.');
  }

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;
  const bottomThreshold = pageHeight - 18;

  // Dastaan Signature Color Palette
  const TEAL_DEEP = [7, 29, 26];       // #071D1A (Primary luxury teal)
  const GOLD = [180, 142, 60];         // #B48E3C (Dastaan Gold Accent for print)
  const GOLD_LIGHT = [245, 238, 220];   // #F5EEDC (Time & category pill background)
  const CHARCOAL = [30, 41, 59];       // #1E293B (Headings & titles)
  const TEXT_BODY = [51, 65, 85];      // #334155 (Descriptions)
  const TEXT_MUTED = [100, 116, 139];  // #64748B (Metadata, addresses, hours)
  const CARD_BG = [248, 250, 252];     // #F8FAFC (Day header background)
  const BORDER_COLOR = [226, 232, 240];// #E2E8F0 (Subtle dividers)

  let y = margin;

  const safePrint = (text, x, yPos, opt) => {
    if (text === null || text === undefined) return;
    if (Array.isArray(text)) {
      const validLines = text.map(t => safeStr(t)).filter(Boolean);
      if (validLines.length === 0) return;
      doc.text(validLines, x, yPos, opt);
      return;
    }
    const s = safeStr(text);
    if (!s) return;
    doc.text(s, x, yPos, opt);
  };

  const checkPageBreak = (neededHeight) => {
    if (y + neededHeight > bottomThreshold) {
      doc.addPage();
      y = margin;
      drawSubsequentHeader();
      return true;
    }
    return false;
  };

  const drawMainHeader = () => {
    // Top Luxury Header Banner
    doc.setFillColor(...TEAL_DEEP);
    doc.roundedRect(margin, y, contentWidth, 22, 2, 2, 'F');

    // Brand Wordmark
    doc.setTextColor(214, 181, 109);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    safePrint('D A S T A A N', margin + 8, y + 9.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    safePrint('CURATED TRAVEL JOURNAL & BESPOKE ITINERARY', margin + 8, y + 16);

    // Verified badge
    doc.setFillColor(214, 181, 109);
    doc.roundedRect(pageWidth - margin - 38, y + 5, 30, 12, 1.5, 1.5, 'F');
    doc.setTextColor(...TEAL_DEEP);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    safePrint('VERIFIED TRIP', pageWidth - margin - 23, y + 12.5, { align: 'center' });

    y += 28;
  };

  const resolvedDest = safeStr(options.destName || trip.destination?.name || trip.destination || 'Curated Escape');
  const resolvedCountry = safeStr(options.countryName || trip.destination?.country || '');

  const drawSubsequentHeader = () => {
    doc.setFillColor(...TEAL_DEEP);
    doc.rect(margin, y, contentWidth, 9, 'F');

    doc.setTextColor(214, 181, 109);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    safePrint('DASTAAN', margin + 6, y + 6);

    const destTitle = resolvedDest.toUpperCase();
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    safePrint(`ITINERARY: ${destTitle}`, pageWidth - margin - 6, y + 6, { align: 'right' });

    y += 14;
  };

  // 1. Initial Page Header
  drawMainHeader();

  // 2. Destination & Summary Information
  const destNameUpper = resolvedDest.toUpperCase();
  const countryUpper = resolvedCountry.toUpperCase();
  const titleText = countryUpper ? `${destNameUpper}, ${countryUpper}` : destNameUpper;

  doc.setTextColor(...CHARCOAL);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  safePrint(titleText, margin, y);
  y += 6.5;

  // Key trip specifications
  const daysList = Array.isArray(options.days) && options.days.length > 0
    ? options.days
    : (Array.isArray(trip.itinerary?.days) ? trip.itinerary.days : []);

  const durationCount = options.duration || trip.duration || daysList.length || 1;
  const travelersCount = Number(options.travelers || trip.travelers) || 1;
  const travelStyle = safeStr(options.travelStyle || trip.travelStyle || 'Balanced');
  const totalBudget = options.budget ? Number(options.budget) : (trip.budget ? Number(trip.budget) : null);
  const perPerson = totalBudget ? Math.round(totalBudget / Math.max(1, travelersCount)) : null;

  const specParts = [
    `${durationCount} Days`,
    `${travelersCount} ${travelersCount === 1 ? 'Traveler' : 'Travelers'}`,
    `${travelStyle} Style`
  ];
  if (totalBudget) {
    specParts.push(`INR ${totalBudget.toLocaleString('en-IN')} Total (INR ${perPerson.toLocaleString('en-IN')}/person)`);
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...TEXT_MUTED);
  safePrint(specParts.join('   •   '), margin, y);
  y += 5;

  // Travel dates if specified
  const startStr = formatDateFriendly(trip.startDate);
  const endStr = formatDateFriendly(trip.endDate);
  if (startStr) {
    const dateLine = endStr && endStr !== startStr ? `Travel Dates: ${startStr} – ${endStr}` : `Departure Date: ${startStr}`;
    safePrint(dateLine, margin, y);
    y += 5;
  }

  // Interests / Experiences if available
  const interests = Array.isArray(trip.interests) ? trip.interests : [];
  if (interests.length > 0) {
    safePrint(`Tailored Experiences: ${interests.map(i => safeStr(i)).join(', ')}`, margin, y);
    y += 5;
  }

  // Tagline or overview editorial
  const tagline = safeStr(options.tagline || trip.itinerary?.tagline || trip.itinerary?.overview);
  if (tagline) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(...TEXT_BODY);
    const splitTagline = doc.splitTextToSize(`"${tagline}"`, contentWidth);
    safePrint(splitTagline, margin, y);
    y += (splitTagline.length * 3.8) + 2;
  }

  // Decorative Gold & Charcoal Rule
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.4);
  doc.line(margin, y, margin + 40, y);
  doc.setDrawColor(...BORDER_COLOR);
  doc.setLineWidth(0.2);
  doc.line(margin + 42, y, pageWidth - margin, y);
  y += 6;

  // 3. Render Day-by-Day Journey
  if (daysList.length === 0) {
    checkPageBreak(15);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(...TEXT_MUTED);
    safePrint('No activities scheduled for this journey yet.', margin, y);
    y += 10;
  }

  for (let dIdx = 0; dIdx < daysList.length; dIdx++) {
    const day = daysList[dIdx];
    if (!day) continue;

    const dayNum = day.dayNum || (dIdx + 1);
    const dayTitle = safeStr(day.dayTitle || `EXPLORING ${destNameUpper}`);
    const dayDateStr = formatDateFriendly(day.date);

    checkPageBreak(25);

    // Day Header Pill Banner
    doc.setFillColor(...CARD_BG);
    doc.setDrawColor(...BORDER_COLOR);
    doc.roundedRect(margin, y, contentWidth, 10, 1.5, 1.5, 'FD');

    // Gold accent bar on left edge
    doc.setFillColor(...GOLD);
    doc.rect(margin, y, 3, 10, 'F');

    // Day title
    doc.setTextColor(...TEAL_DEEP);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    const dayHeaderLabel = `DAY ${String(dayNum).padStart(2, '0')}: ${dayTitle.toUpperCase()}`;
    safePrint(dayHeaderLabel, margin + 6, y + 6.8);

    // Day date aligned to the right
    if (dayDateStr) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(...TEXT_MUTED);
      safePrint(dayDateStr, pageWidth - margin - 4, y + 6.8, { align: 'right' });
    }

    y += 13;

    // Day Activities
    const activities = Array.isArray(day.activities) ? day.activities : [];
    if (activities.length === 0) {
      checkPageBreak(10);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(...TEXT_MUTED);
      safePrint('Rest, exploration, and flexible personal time scheduled for this day.', margin + 4, y);
      y += 8;
    }

    for (let aIdx = 0; aIdx < activities.length; aIdx++) {
      const act = activities[aIdx];
      if (!act) continue;

      const actTitle = safeStr(act.title || 'Landmark Visit');
      const actTime = safeStr(act.time || '10:00');
      const actCat = safeStr(act.cat || 'EXPLORE').toUpperCase();
      const actDesc = safeStr(act.desc || '');

      const descLines = actDesc ? doc.splitTextToSize(actDesc, contentWidth - 10) : [];
      let extraHeight = 0;
      if (act.address) extraHeight += 3.8;
      if (act.openingHours && (Array.isArray(act.openingHours) ? act.openingHours.length > 0 : Boolean(act.openingHours))) {
        extraHeight += 3.8;
      }
      const totalActHeight = 7.5 + (descLines.length * 3.4) + extraHeight + 3;

      checkPageBreak(totalActHeight);

      // Time pill
      doc.setFillColor(...GOLD_LIGHT);
      doc.roundedRect(margin, y, 14, 5.2, 1, 1, 'F');
      doc.setTextColor(...GOLD);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      safePrint(actTime, margin + 7, y + 3.8, { align: 'center' });

      // Title
      doc.setTextColor(...CHARCOAL);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      safePrint(actTitle, margin + 17, y + 3.8);

      // Category Pill Tag
      const titleWidth = doc.getTextWidth(actTitle) || 20;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(...TEXT_MUTED);
      safePrint(`[ ${actCat} ]`, margin + 19 + titleWidth, y + 3.6);

      y += 7;

      // Description
      if (descLines.length > 0) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.8);
        doc.setTextColor(...TEXT_BODY);
        safePrint(descLines, margin + 4, y);
        y += (descLines.length * 3.4) + 1;
      }

      // Address
      if (act.address) {
        const addressText = safeStr(act.address);
        if (addressText) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7);
          doc.setTextColor(...TEXT_MUTED);
          safePrint(`Address: ${addressText}`, margin + 4, y);
          y += 3.8;
        }
      }

      // Operating Hours & Visit Duration
      if (act.openingHours) {
        let hoursSnippet = '';
        if (Array.isArray(act.openingHours) && act.openingHours.length > 0) {
          hoursSnippet = safeStr(act.openingHours[0]);
        } else if (typeof act.openingHours === 'string') {
          hoursSnippet = act.openingHours;
        }

        if (hoursSnippet) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7);
          doc.setTextColor(...TEXT_MUTED);
          const durationSnippet = act.visitDurationHours ? ` · Recommended Visit: ~${act.visitDurationHours}h` : '';
          safePrint(`Hours: ${hoursSnippet}${durationSnippet}`, margin + 4, y);
          y += 3.8;
        }
      }

      // Divider line between activities in the same day
      if (aIdx < activities.length - 1) {
        doc.setDrawColor(240, 243, 246);
        doc.setLineWidth(0.2);
        doc.line(margin + 4, y, pageWidth - margin, y);
        y += 3.5;
      } else {
        y += 4;
      }
    }

    y += 3;
  }

  // 4. Budget Allocation Table (if available)
  const rawBreakdown = Array.isArray(options.breakdown) && options.breakdown.length > 0
    ? options.breakdown
    : (Array.isArray(trip.itinerary?.breakdown) ? trip.itinerary.breakdown : []);

  if (rawBreakdown.length > 0) {
    checkPageBreak(35);

    doc.setFillColor(...CARD_BG);
    doc.setDrawColor(...BORDER_COLOR);
    doc.roundedRect(margin, y, contentWidth, 8, 1, 1, 'FD');

    doc.setFillColor(...GOLD);
    doc.rect(margin, y, 2.5, 8, 'F');

    doc.setTextColor(...TEAL_DEEP);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    safePrint('ESTIMATED BUDGET ALLOCATION', margin + 5, y + 5.5);
    y += 11;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    for (const item of rawBreakdown) {
      if (!item) continue;
      checkPageBreak(5);

      const categoryName = safeStr(item.name || item.category || item.label || 'Expense');
      const pctNum = item.pct !== undefined ? item.pct : (item.percentage !== undefined ? item.percentage : 0);
      const amountVal = item.amount !== undefined && !isNaN(Number(item.amount))
        ? Number(item.amount)
        : (totalBudget ? Math.round((totalBudget * Number(pctNum)) / 100) : 0);

      doc.setTextColor(...CHARCOAL);
      safePrint(categoryName, margin + 4, y);

      const amountStr = totalBudget
        ? `₹${amountVal.toLocaleString('en-IN')} (${pctNum}%)`
        : `${pctNum}%`;

      doc.setTextColor(...TEXT_MUTED);
      safePrint(amountStr, pageWidth - margin - 4, y, { align: 'right' });
      y += 4.2;
    }
    y += 4;
  }

  // 5. Add Running Footers and Page Numbers to Every Page
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);

    doc.setDrawColor(...BORDER_COLOR);
    doc.setLineWidth(0.2);
    doc.line(margin, pageHeight - 11, pageWidth - margin, pageHeight - 11);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...TEXT_MUTED);
    safePrint('Dastaan · Curated Travel Journeys · www.dastaan.travel', margin, pageHeight - 6.5);
    safePrint(`Page ${p} of ${totalPages}`, pageWidth - margin, pageHeight - 6.5, { align: 'right' });
  }

  // 6. Generate Filename & Trigger Download
  const cleanDestSlug = resolvedDest
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'itinerary';
  const outFileName = filename || `Dastaan-${cleanDestSlug}-Itinerary.pdf`;

  if (download && typeof window !== 'undefined') {
    try {
      doc.save(outFileName);
    } catch (saveErr) {
      console.warn('[pdfExport] doc.save fallback to Blob link:', saveErr);
      const blob = doc.output('blob');
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = outFileName;
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
      }, 500);
    }
  }

  return {
    success: true,
    doc,
    filename: outFileName
  };
}
