/**
 * Dastaan Itinerary PDF Generator
 * Generates a clean, print-friendly luxury PDF document using jsPDF.
 * Editorial design system: Deep Forest Teal, Warm Champagne Gold, Ivory & Charcoal.
 * Handles multi-page itineraries, page breaks, clean typography, and budget breakdown.
 */
import { jsPDF } from 'jspdf';

/**
 * Safe string converter to prevent undefined/null errors in jsPDF.text
 */
function safeStr(val, fallback = '') {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'string') return val.trim();
  if (typeof val === 'number') return String(val);
  if (typeof val === 'object') {
    if (val.name) return String(val.name).trim();
    if (val.title) return String(val.title).trim();
    if (val.label) return String(val.label).trim();
    if (val.category) return String(val.category).trim();
    return fallback;
  }
  return String(val).trim();
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
 * Formats currency safely for jsPDF standard fonts.
 * Uses 'INR' instead of Unicode Rupee symbol to prevent corrupted glyphs.
 */
function formatInr(amount) {
  const num = Number(amount) || 0;
  return `INR ${num.toLocaleString('en-IN')}`;
}

/**
 * Generates and downloads a print-ready luxury Dastaan itinerary PDF.
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
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  const bottomThreshold = pageHeight - 16;

  // Dastaan Signature Luxury Palette
  const PALETTE = {
    deepTeal: [10, 37, 33],       // #0A2521 - signature luxury forest teal
    tealSoft: [18, 56, 50],       // #123832 - secondary deep teal
    gold: [197, 155, 75],         // #C59B4B - Dastaan warm gold
    goldDark: [160, 120, 50],     // #A07832 - dark gold accent
    goldLight: [248, 243, 232],   // #F8F3E8 - soft champagne / ivory
    goldBorder: [222, 206, 178],  // #DECEB2 - subtle gold divider
    charcoal: [24, 32, 30],       // #18201E - primary dark text
    bodyText: [58, 70, 68],       // #3A4644 - high-readability body
    mutedText: [112, 126, 124],   // #707E7C - secondary meta
    cardBg: [252, 251, 248],      // #FCFBF8 - warm ivory card fill
    cardBorder: [232, 228, 220],  // #E8E4DC - light card border
    accentGreen: [102, 138, 128], // Sage
    accentCoral: [196, 107, 78],  // Terracotta
    accentGold: [200, 155, 60]    // Ochre
  };

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

  const drawMainHeader = () => {
    // Top Luxury Header Banner
    doc.setFillColor(...PALETTE.deepTeal);
    doc.roundedRect(margin, y, contentWidth, 20, 2, 2, 'F');

    // Brand Wordmark
    doc.setTextColor(...PALETTE.gold);
    doc.setFont('times', 'bold');
    doc.setFontSize(15);
    safePrint('D  A  S  T  A  A  N', margin + 8, y + 8.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(245, 240, 230);
    safePrint('BESPOKE TRAVEL JOURNAL  ·  CURATED ITINERARY', margin + 8, y + 15);

    // Verified badge
    doc.setFillColor(...PALETTE.gold);
    doc.roundedRect(pageWidth - margin - 36, y + 4.5, 28, 11, 1.5, 1.5, 'F');
    doc.setTextColor(...PALETTE.deepTeal);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    safePrint('VERIFIED TRIP', pageWidth - margin - 22, y + 11.5, { align: 'center' });

    y += 26;
  };

  const resolvedDest = safeStr(options.destName || trip.destination?.name || trip.destination || 'Curated Escape');
  const resolvedCountry = safeStr(options.countryName || trip.destination?.country || '');
  const destNameUpper = resolvedDest.toUpperCase();
  const countryUpper = resolvedCountry.toUpperCase();
  const titleText = countryUpper ? `${destNameUpper}, ${countryUpper}` : destNameUpper;

  const drawSubsequentHeader = () => {
    doc.setFillColor(...PALETTE.deepTeal);
    doc.rect(margin, y, contentWidth, 8, 'F');

    doc.setTextColor(...PALETTE.gold);
    doc.setFont('times', 'bold');
    doc.setFontSize(8.5);
    safePrint('DASTAAN', margin + 5, y + 5.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);
    safePrint(`ITINERARY: ${destNameUpper}`, pageWidth - margin - 5, y + 5.5, { align: 'right' });

    y += 12;
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

  // 1. Initial Page Header
  drawMainHeader();

  // 2. Destination Hero & Tagline
  doc.setTextColor(...PALETTE.charcoal);
  doc.setFont('times', 'bold');
  doc.setFontSize(20);
  safePrint(titleText, margin, y);
  y += 6.5;

  const tagline = safeStr(options.tagline || trip.itinerary?.tagline || trip.itinerary?.overview);
  if (tagline) {
    doc.setFont('times', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(...PALETTE.bodyText);
    const splitTagline = doc.splitTextToSize(`"${tagline}"`, contentWidth);
    safePrint(splitTagline, margin, y);
    y += (splitTagline.length * 3.8) + 2;
  }

  // 3. Voyage Specifications Executive Summary Card
  const daysList = Array.isArray(options.days) && options.days.length > 0
    ? options.days
    : (Array.isArray(trip.itinerary?.days) ? trip.itinerary.days : []);

  const durationCount = options.duration || trip.duration || daysList.length || 1;
  const travelersCount = Number(options.travelers || trip.travelers) || 1;
  const travelStyle = safeStr(options.travelStyle || trip.travelStyle || 'Balanced');
  const totalBudget = options.budget ? Number(options.budget) : (trip.budget ? Number(trip.budget) : null);
  const perPerson = totalBudget ? Math.round(totalBudget / Math.max(1, travelersCount)) : null;

  // Executive Specs Box
  const summaryBoxHeight = 15;
  doc.setFillColor(...PALETTE.cardBg);
  doc.setDrawColor(...PALETTE.goldBorder);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, contentWidth, summaryBoxHeight, 1.5, 1.5, 'FD');

  const statCols = [
    { label: 'DURATION', val: `${durationCount} Days` },
    { label: 'PARTY', val: `${travelersCount} ${travelersCount === 1 ? 'Guest' : 'Guests'}` },
    { label: 'STYLE', val: `${travelStyle}` }
  ];
  if (totalBudget) {
    statCols.push({ label: 'TOTAL BUDGET', val: formatInr(totalBudget) });
    statCols.push({ label: 'EST. PER PERSON', val: formatInr(perPerson) });
  }

  const colWidth = contentWidth / statCols.length;
  statCols.forEach((col, idx) => {
    const colX = margin + idx * colWidth;

    // Small divider between stat columns
    if (idx > 0) {
      doc.setDrawColor(...PALETTE.cardBorder);
      doc.setLineWidth(0.2);
      doc.line(colX, y + 2.5, colX, y + summaryBoxHeight - 2.5);
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.2);
    doc.setTextColor(...PALETTE.goldDark);
    safePrint(col.label, colX + colWidth / 2, y + 5.2, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.2);
    doc.setTextColor(...PALETTE.charcoal);
    safePrint(col.val, colX + colWidth / 2, y + 10.8, { align: 'center' });
  });

  y += summaryBoxHeight + 4;

  // Dates or Experiences banner if present
  const startStr = formatDateFriendly(trip.startDate);
  const endStr = formatDateFriendly(trip.endDate);
  const interests = Array.isArray(trip.interests) ? trip.interests : [];

  if (startStr || interests.length > 0) {
    let metaSnippet = '';
    if (startStr) {
      metaSnippet += endStr && endStr !== startStr ? `Dates: ${startStr} – ${endStr}` : `Departure: ${startStr}`;
    }
    if (interests.length > 0) {
      if (metaSnippet) metaSnippet += '   ·   ';
      metaSnippet += `Interests: ${interests.map(i => safeStr(i)).join(', ')}`;
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    doc.setTextColor(...PALETTE.mutedText);
    safePrint(metaSnippet, margin + 1, y);
    y += 5;
  }

  // Decorative Accent Divider
  doc.setDrawColor(...PALETTE.gold);
  doc.setLineWidth(0.4);
  doc.line(margin, y, margin + 35, y);
  doc.setDrawColor(...PALETTE.cardBorder);
  doc.setLineWidth(0.2);
  doc.line(margin + 37, y, pageWidth - margin, y);
  y += 6;

  // 4. Render Day-by-Day Journey
  if (daysList.length === 0) {
    checkPageBreak(15);
    doc.setFont('times', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(...PALETTE.mutedText);
    safePrint('No activities scheduled for this journey yet.', margin, y);
    y += 10;
  }

  for (let dIdx = 0; dIdx < daysList.length; dIdx++) {
    const day = daysList[dIdx];
    if (!day) continue;

    const dayNum = day.dayNum || (dIdx + 1);
    const rawTitle = safeStr(day.dayTitle || `EXPLORING ${destNameUpper}`);

    // Clean up duplicated "Day 1:" or "Day 01:" in day title
    let cleanTitle = rawTitle.replace(/^day\s*\d+[\s:.-]*/i, '').trim();
    if (!cleanTitle) cleanTitle = `EXPLORING ${destNameUpper}`;

    const dayDateStr = formatDateFriendly(day.date);

    checkPageBreak(25);

    // Day Header Bar (Deep Teal with Gold Pill)
    const dayBarHeight = 9.5;
    doc.setFillColor(...PALETTE.deepTeal);
    doc.roundedRect(margin, y, contentWidth, dayBarHeight, 1.2, 1.2, 'F');

    // Gold Day Number Pill
    doc.setFillColor(...PALETTE.gold);
    doc.roundedRect(margin + 2.5, y + 1.8, 16, 5.8, 1, 1, 'F');
    doc.setTextColor(...PALETTE.deepTeal);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    safePrint(`DAY ${String(dayNum).padStart(2, '0')}`, margin + 10.5, y + 5.7, { align: 'center' });

    // Day Title
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.2);
    safePrint(cleanTitle.toUpperCase(), margin + 22, y + 6.2);

    // Day date on the right
    if (dayDateStr) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(...PALETTE.goldLight);
      safePrint(dayDateStr, pageWidth - margin - 4, y + 6.2, { align: 'right' });
    }

    y += dayBarHeight + 3.5;

    // Day Activities
    const activities = Array.isArray(day.activities) ? day.activities : [];
    if (activities.length === 0) {
      checkPageBreak(10);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7.8);
      doc.setTextColor(...PALETTE.mutedText);
      safePrint('Rest, spontaneous exploration, and personal time scheduled for this day.', margin + 6, y);
      y += 8;
    }

    for (let aIdx = 0; aIdx < activities.length; aIdx++) {
      const act = activities[aIdx];
      if (!act) continue;

      const actTitle = safeStr(act.title || 'Landmark Experience');
      const actTime = safeStr(act.time || '10:00');
      const actCat = safeStr(act.cat || act.category || 'EXPLORE').toUpperCase();
      const actDesc = safeStr(act.desc || '');

      const descLines = actDesc ? doc.splitTextToSize(actDesc, contentWidth - 22) : [];
      let extraHeight = 0;
      if (act.address) extraHeight += 3.6;
      if (act.openingHours && (Array.isArray(act.openingHours) ? act.openingHours.length > 0 : Boolean(act.openingHours))) {
        extraHeight += 3.6;
      }
      const totalActHeight = 8 + (descLines.length * 3.4) + extraHeight + 3;

      checkPageBreak(totalActHeight);

      // Time pill
      doc.setFillColor(...PALETTE.goldLight);
      doc.setDrawColor(...PALETTE.goldBorder);
      doc.setLineWidth(0.2);
      doc.roundedRect(margin + 2, y, 15, 5, 1, 1, 'FD');
      doc.setTextColor(...PALETTE.goldDark);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      safePrint(actTime, margin + 9.5, y + 3.6, { align: 'center' });

      // Title
      doc.setTextColor(...PALETTE.charcoal);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.8);
      safePrint(actTitle, margin + 20, y + 3.7);

      // Category Pill Tag
      const titleWidth = doc.getTextWidth(actTitle) || 25;
      const catX = margin + 22 + titleWidth;
      const catWidth = doc.getTextWidth(actCat) + 5;

      if (catX + catWidth < pageWidth - margin - 4) {
        doc.setFillColor(243, 245, 246);
        doc.setDrawColor(...PALETTE.cardBorder);
        doc.roundedRect(catX, y + 0.3, catWidth, 4.4, 0.8, 0.8, 'FD');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(5.8);
        doc.setTextColor(...PALETTE.tealSoft);
        safePrint(actCat, catX + catWidth / 2, y + 3.4, { align: 'center' });
      }

      y += 6.5;

      // Description
      if (descLines.length > 0) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.6);
        doc.setTextColor(...PALETTE.bodyText);
        safePrint(descLines, margin + 6, y);
        y += (descLines.length * 3.4) + 1;
      }

      // Address
      if (act.address) {
        const addressText = safeStr(act.address);
        if (addressText) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(6.8);
          doc.setTextColor(...PALETTE.mutedText);
          safePrint(`Location: ${addressText}`, margin + 6, y);
          y += 3.6;
        }
      }

      // Hours / Duration
      if (act.openingHours) {
        let hoursSnippet = '';
        if (Array.isArray(act.openingHours) && act.openingHours.length > 0) {
          hoursSnippet = safeStr(act.openingHours[0]);
        } else if (typeof act.openingHours === 'string') {
          hoursSnippet = act.openingHours;
        }

        if (hoursSnippet) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(6.8);
          doc.setTextColor(...PALETTE.mutedText);
          const durationSnippet = act.visitDurationHours ? ` · Recommended Visit: ~${act.visitDurationHours}h` : '';
          safePrint(`Hours: ${hoursSnippet}${durationSnippet}`, margin + 6, y);
          y += 3.6;
        }
      }

      // Divider line between activities in same day
      if (aIdx < activities.length - 1) {
        doc.setDrawColor(...PALETTE.cardBorder);
        doc.setLineWidth(0.2);
        doc.line(margin + 6, y + 1, pageWidth - margin - 6, y + 1);
        y += 4;
      } else {
        y += 4.5;
      }
    }

    y += 2.5;
  }

  // 5. Budget Allocation Table (if available)
  const rawBreakdown = Array.isArray(options.breakdown) && options.breakdown.length > 0
    ? options.breakdown
    : (Array.isArray(trip.itinerary?.breakdown) ? trip.itinerary.breakdown : []);

  if (rawBreakdown.length > 0) {
    checkPageBreak(42);

    // Section Header Box
    doc.setFillColor(...PALETTE.deepTeal);
    doc.roundedRect(margin, y, contentWidth, 8.5, 1.2, 1.2, 'F');

    doc.setFillColor(...PALETTE.gold);
    doc.rect(margin, y, 2.5, 8.5, 'F');

    doc.setTextColor(...PALETTE.gold);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    safePrint('TRANSPARENT COST ALLOCATION', margin + 6, y + 3.8);

    doc.setTextColor(255, 255, 255);
    doc.setFont('times', 'bold');
    doc.setFontSize(8.5);
    safePrint('ESTIMATED BUDGET ALLOCATION', margin + 6, y + 7.2);

    if (totalBudget) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.8);
      doc.setTextColor(...PALETTE.goldLight);
      safePrint(`Total: ${formatInr(totalBudget)}  ·  Per Person: ${formatInr(perPerson)} (${travelersCount} ${travelersCount === 1 ? 'Guest' : 'Guests'})`, pageWidth - margin - 4, y + 5.5, { align: 'right' });
    }

    y += 11;

    // Table Column Headers
    doc.setFillColor(...PALETTE.cardBg);
    doc.setDrawColor(...PALETTE.cardBorder);
    doc.rect(margin, y, contentWidth, 5.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(...PALETTE.goldDark);
    safePrint('CATEGORY', margin + 4, y + 3.8);
    safePrint('SHARE', margin + 65, y + 3.8);
    safePrint('TOTAL ESTIMATE', margin + 115, y + 3.8);
    safePrint('PER PERSON', pageWidth - margin - 4, y + 3.8, { align: 'right' });

    y += 7;

    for (let bIdx = 0; bIdx < rawBreakdown.length; bIdx++) {
      const item = rawBreakdown[bIdx];
      if (!item) continue;
      checkPageBreak(6);

      const categoryName = safeStr(item.name || item.category || item.label || 'Expense');
      const pctNum = item.pct !== undefined ? item.pct : (item.percentage !== undefined ? item.percentage : 0);
      const amountVal = item.amount !== undefined && !isNaN(Number(item.amount))
        ? Number(item.amount)
        : (totalBudget ? Math.round((totalBudget * Number(pctNum)) / 100) : 0);

      const itemPerPerson = item.perPersonAmount !== undefined && !isNaN(Number(item.perPersonAmount))
        ? Number(item.perPersonAmount)
        : Math.round(amountVal / Math.max(1, travelersCount));

      // Subtle alternating zebra fill
      if (bIdx % 2 === 1) {
        doc.setFillColor(252, 250, 246);
        doc.rect(margin, y - 2.8, contentWidth, 5.2, 'F');
      }

      // Small color dot
      const dotColor = (categoryName.toLowerCase().includes('accommodat'))
        ? PALETTE.accentGold
        : (categoryName.toLowerCase().includes('food'))
        ? PALETTE.accentCoral
        : (categoryName.toLowerCase().includes('transport'))
        ? PALETTE.accentGreen
        : PALETTE.goldDark;

      doc.setFillColor(...dotColor);
      doc.circle(margin + 5, y - 0.5, 1, 'F');

      // Category Name
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.2);
      doc.setTextColor(...PALETTE.charcoal);
      safePrint(categoryName, margin + 8, y);

      // Percentage Share Pill
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(...PALETTE.mutedText);
      safePrint(`${pctNum}%`, margin + 65, y);

      // Total Estimate
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.2);
      doc.setTextColor(...PALETTE.charcoal);
      safePrint(formatInr(amountVal), margin + 115, y);

      // Per Person Estimate
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(...PALETTE.mutedText);
      safePrint(`${formatInr(itemPerPerson)} / guest`, pageWidth - margin - 4, y, { align: 'right' });

      y += 5.2;
    }

    // Bottom border under table
    doc.setDrawColor(...PALETTE.cardBorder);
    doc.setLineWidth(0.2);
    doc.line(margin, y - 1, pageWidth - margin, y - 1);
    y += 4;
  }

  // 6. Running Footers and Page Numbers on All Pages
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);

    // Decorative bottom accent line
    doc.setDrawColor(...PALETTE.gold);
    doc.setLineWidth(0.3);
    doc.line(margin, pageHeight - 11, margin + 25, pageHeight - 11);
    doc.setDrawColor(...PALETTE.cardBorder);
    doc.setLineWidth(0.2);
    doc.line(margin + 26, pageHeight - 11, pageWidth - margin, pageHeight - 11);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(...PALETTE.mutedText);
    safePrint('Dastaan  ·  Curated Bespoke Journeys  ·  www.dastaan.travel', margin, pageHeight - 6.5);
    safePrint(`Page ${p} of ${totalPages}`, pageWidth - margin, pageHeight - 6.5, { align: 'right' });
  }

  // 7. Output Filename & Download Trigger
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
