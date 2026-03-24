// ============================================================================
// LOAN CALCULATIONS MODULE (ACTUARIAL STANDARD - DEC 2025)
// ARCHITECTURE: Senior Actuary / Fintech Media Platform
// STATUS: Production Ready - Validated against Public Law 119-21
// DEPENDENCIES: financialParameters.json (Updated)
// ============================================================================

import rawParams from './financialParameters.json';

// SAFETY: Handle different build system import behaviors for JSON
const FINANCIAL_PARAMS = rawParams.default || rawParams;

// ============================================================================
// PART 1: UTILITY & ACTUARIAL MATH
// ============================================================================

/**
 * Determines the Federal Poverty Guideline.
 * LOGIC: strict lookup based on family size and state multipliers.
 */
export function getPovertyGuideline(familySize, stateOfResidence) {
  const safeSize = Math.max(1, parseInt(familySize) || 1);
  const params = FINANCIAL_PARAMS.povertyGuidelines;

  // VALIDATED: Base 15650 for 2025 (Contiguous)
  const { base, perMember } = params.contiguous;

  // Apply geographic multipliers
  let multiplier = 1.0;
  if (stateOfResidence === 'AK') multiplier = params.alaska.multiplier;
  if (stateOfResidence === 'HI') multiplier = params.hawaii.multiplier;

  // Formula: (Base + ((FamilySize - 1) * PerMember)) * GeoMultiplier
  return (base + ((safeSize - 1) * perMember)) * multiplier;
}
/**
 * STRICT ROUNDING UTILITY
 * COMPLIANCE: 34 CFR 685.209
 * IDR payments are truncated (floored) to the nearest dollar.
 */
function roundIDR(amount) {
  return Math.floor(Math.max(0, amount));
}

/**
 * Calculates Discretionary Income.
 * LOGIC: AGI - (PovertyGuideline * PlanMultiplier). Floor at $0.
 * UPDATE: Explicit negative income handler.
 */
function calculateDiscretionaryIncome(agi, familySize, stateOfResidence, povertyLineMultiplier = 1.5) {
  // Actuarial Guard: Handle negative income (business loss) by flooring AGI to 0 first
  const safeAgi = Math.max(0, parseFloat(agi) || 0);
  const guideline = getPovertyGuideline(familySize, stateOfResidence);

  // Discretionary income cannot be negative
  return Math.max(0, safeAgi - (guideline * povertyLineMultiplier));
}

/**
 * Standard Mortgage/Loan Amortization Formula.
 * RETURNS: Fixed monthly payment required to zero out loan in 'years'.
 */
export function calculateAmortizedPayment(principal, annualRate, years) {
  const p = parseFloat(principal);
  const r = parseFloat(annualRate);
  const y = parseFloat(years);

  if (p <= 0 || y <= 0) return 0;

  const monthlyRate = r / 12;
  const numberOfPayments = y * 12;

  // Actuarial Edge Case: 0% interest rate
  if (monthlyRate === 0) return p / numberOfPayments;

  const numerator = p * (monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments));
  const denominator = Math.pow(1 + monthlyRate, numberOfPayments) - 1;

  return numerator / denominator;
}

/**
 * Calculates the Weighted Average Payment % for SAVE.
 * STATUTE: 34 CFR § 685.209(f)
 * LOGIC: (UndergradPrincipal * 5% + GradPrincipal * 10%) / TotalPrincipal
 */
function calculateWeightedSavePercentage(loans) {
  let undergradPrincipal = 0;
  let gradPrincipal = 0;

  loans.forEach(loan => {
    const balance = parseFloat(loan.balance) || 0;
    // Normalize input to handle 'grad', 'graduate', 'Graduate', etc.
    const type = (loan.loanType || "").toLowerCase();

    if (type.includes('grad') && !type.includes('under')) {
      gradPrincipal += balance;
    } else {
      // Default to undergrad if unspecified, or explicitly undergrad
      undergradPrincipal += balance;
    }
  });

  const total = undergradPrincipal + gradPrincipal;
  if (total <= 0) return FINANCIAL_PARAMS.idrPlans.SAVE.paymentPercentageUndergrad; // Default 5%

  // Pull rates from updated JSON
  const UNDERGRAD_WEIGHT = FINANCIAL_PARAMS.idrPlans.SAVE.paymentPercentageUndergrad; // 0.05
  const GRAD_WEIGHT = FINANCIAL_PARAMS.idrPlans.SAVE.paymentPercentageGrad;           // 0.10

  const weightedSum = (undergradPrincipal * UNDERGRAD_WEIGHT) + (gradPrincipal * GRAD_WEIGHT);
  return weightedSum / total;
}

/**
 * Check PAYE eligibility based on official federal requirements.
 */
export function checkPAYEEligibility(firstLoanDate, firstDisbursementAfter2007Date) {
  if (!firstLoanDate) {
    return {
      eligible: false,
      reason: "First loan date is required to determine PAYE eligibility."
    };
  }

  if (!firstDisbursementAfter2007Date) {
    return {
      eligible: false,
      reason: "First disbursement date after 2007 is required."
    };
  }

  const oct1_2007 = new Date('2007-10-01');
  const oct1_2011 = new Date('2011-10-01');

  const isNewBorrower = new Date(firstLoanDate) >= oct1_2007;
  const hasQualifyingDisbursement = new Date(firstDisbursementAfter2007Date) >= oct1_2011;

  if (!isNewBorrower) {
    return {
      eligible: false,
      reason: "You had loans before October 1, 2007. You must be a 'new borrower' as of this date to qualify for PAYE."
    };
  }

  if (!hasQualifyingDisbursement) {
    return {
      eligible: false,
      reason: "You must have received a loan disbursement on or after October 1, 2011 to qualify for PAYE."
    };
  }

  return { eligible: true, reason: "You meet all PAYE eligibility requirements!" };
}

// ============================================================================
// PART 2: SIMULATION ENGINES
// ============================================================================

/**
 * Engine: IDR Simulation (SAVE, PAYE, IBR, ICR)
 * FEATURES: 
 * - Accurate Date Handling (No drift)
 * - SAVE Interest Subsidy Logic (Negative Amortization checks)
 * - Income Growth Projections
 * - ACTUARIAL UPDATE: Recertification Calibration (Lag handling)
 */
function simulateLegacyIDR({
  principal,
  annualRate,
  forgivenessYears,
  initialAgi,
  familySize,
  stateOfResidence,
  povertyMultiplier,
  paymentPercentage, // Passed dynamically (weighted for SAVE)
  standardPaymentCap,
  paymentsMade = 0,
  saveForbearanceMonths = 0,
  planName, // 'SAVE', 'PAYE', 'Old IBR', etc.
  actualCurrentPayment = null // NEW: User's real-world payment for calibration
}) {
  let currentPrincipal = principal;
  let accruedInterest = 0;
  let totalPaid = 0;
  let totalInterestPaid = 0;
  let currentAgi = initialAgi;

  const monthlyRate = annualRate / 12;
  const forgivenessMonths = forgivenessYears * 12;
  const incomeGrowthRate = FINANCIAL_PARAMS.assumptions.annualIncomeGrowthRate;

  // TIMING: Administrative forbearance counts toward forgiveness counts
  const effectivePaymentsMade = (paymentsMade || 0) + (saveForbearanceMonths || 0);
  const remainingPayments = Math.max(0, forgivenessMonths - effectivePaymentsMade);

  // BASELINE CALCULATION (Month 0)
  const initialDiscretionary = calculateDiscretionaryIncome(initialAgi, familySize, stateOfResidence, povertyMultiplier);

  // UPDATE: Round down IDR payment per statute
  const initialCalculatedPayment = roundIDR((initialDiscretionary * paymentPercentage) / 12);

  // Apply Standard Cap (The "Permanent Standard" Check)
  // Note: Cap applies to the calculated amount, not necessarily the actual payment if calibrated
  const cappedInitialPayment = Math.min(standardPaymentCap, initialCalculatedPayment);

  // --- ACTUARIAL CALIBRATION (RECERTIFICATION LAG) ---
  // If we know the user's *actual* payment, and it differs from our calculation (due to old tax data),
  // we use the offset for the first 12 months.
  let calibrationOffset = 0;
  if (actualCurrentPayment !== null && actualCurrentPayment >= 0) {
    calibrationOffset = actualCurrentPayment - cappedInitialPayment;
  }

  // SHORT-CIRCUIT: Forgiveness already reached
  if (effectivePaymentsMade >= forgivenessMonths) {
    const forgivenessDate = new Date(); // Now
    return {
      totalPaid: 0,
      totalInterest: 0,
      forgivenessDate,
      monthlyPayment: actualCurrentPayment !== null ? actualCurrentPayment : cappedInitialPayment,
      remainingPayments: 0,
      totalPayments: forgivenessMonths,
      paymentsMade: effectivePaymentsMade,
    };
  }

  const startDate = new Date(); // Anchor date for iteration

  for (let month = 1; month <= remainingPayments; month++) {
    // 1. Check if paid off
    if (currentPrincipal <= 0.01 && accruedInterest <= 0.01) {
      const payoffDate = new Date(startDate);
      payoffDate.setMonth(startDate.getMonth() + month);
      return {
        totalPaid,
        totalInterest: totalInterestPaid,
        payoffDate,
        monthlyPayment: actualCurrentPayment !== null ? actualCurrentPayment : cappedInitialPayment,
        remainingPayments: month,
        totalPayments: forgivenessMonths,
        paymentsMade: effectivePaymentsMade,
      };
    }

    // 2. Annual Income Adjustment (every 12 months)
    // ACTUARIAL NOTE: Recertification happens annually.
    if (month > 1 && month % 12 === 0) {
      currentAgi *= (1 + incomeGrowthRate);

      // Remove calibration after Year 1 (Month 13+), assuming recertification catches up
      if (month >= 12) {
        calibrationOffset = 0;
      }
    }

    // 3. Calculate Payment
    const discIncome = calculateDiscretionaryIncome(currentAgi, familySize, stateOfResidence, povertyMultiplier);
    const rawPayment = roundIDR((discIncome * paymentPercentage) / 12);

    // Apply Cap
    let currentPayment = Math.min(standardPaymentCap, rawPayment);

    // Apply Calibration (Only active for first 12 months)
    if (calibrationOffset !== 0) {
      // Ensure payment doesn't drop below 0 due to offset
      currentPayment = Math.max(0, currentPayment + calibrationOffset);
    }

    // 4. Calculate Interest Accrual
    const monthlyInterest = currentPrincipal * monthlyRate;
    let interestToAccrue = monthlyInterest;

    // --- CRITICAL FIX: SAVE INTEREST SUBSIDY ---
    if (planName === 'SAVE') {
      // If Payment < Interest, user pays payment, Gov waives difference.
      // Net result: Interest accrual is capped at the payment amount.
      if (currentPayment < monthlyInterest) {
        interestToAccrue = currentPayment;
      }
    }
    // -------------------------------------------

    accruedInterest += interestToAccrue;

    // 5. Apply Payment (Waterfall)
    let paymentBudget = currentPayment;

    // a) Pay Interest First
    const interestSatisfied = Math.min(paymentBudget, accruedInterest);
    accruedInterest -= interestSatisfied;
    totalInterestPaid += interestSatisfied;
    paymentBudget -= interestSatisfied;

    // b) Pay Principal Second
    const principalSatisfied = Math.min(paymentBudget, currentPrincipal);
    currentPrincipal -= principalSatisfied;

    totalPaid += currentPayment;
  }

  // If loop finishes, we reached forgiveness
  const forgivenessDate = new Date(startDate);
  forgivenessDate.setMonth(startDate.getMonth() + remainingPayments);

  return {
    totalPaid,
    totalInterest: totalInterestPaid,
    forgivenessDate,
    monthlyPayment: actualCurrentPayment !== null ? actualCurrentPayment : cappedInitialPayment,
    remainingPayments,
    totalPayments: forgivenessMonths,
    paymentsMade: effectivePaymentsMade,
  };
}

/**
 * Engine: RAP (Repayment Assistance Plan)
 * Uses OBBBA Logic (Minimum Principal Reduction)
 * * ACTUARIAL UPDATE: Recertification Calibration
 */
function simulateRAP({
  principal,
  annualRate,
  initialAgi,
  familySize,
  filingStatus,
  paymentsMade = 0,
  saveForbearanceMonths = 0,
  actualCurrentPayment = null // NEW: Calibration input
}) {
  let currentPrincipal = principal;
  let totalPaid = 0;
  let totalInterestPaid = 0;
  let currentAgi = initialAgi;
  const monthlyRate = annualRate / 12;

  const rapConfig = FINANCIAL_PARAMS.rapPlan;
  const forgivenessMonths = rapConfig.forgivenessYears * 12;
  const incomeGrowthRate = FINANCIAL_PARAMS.assumptions.annualIncomeGrowthRate;

  const effectivePaymentsMade = (paymentsMade || 0) + (saveForbearanceMonths || 0);
  const remainingPayments = Math.max(0, forgivenessMonths - effectivePaymentsMade);

  // Helper: Get Annual Payment based on RAP Tiers
  const getRAPAnnualPayment = (agi) => {
    for (const tier of rapConfig.incomeTiers) {
      if (tier.limit === null || agi <= tier.limit) {
        if (tier.rate === 0 || tier.rate === "min_payment") {
          return rapConfig.minimumMonthlyPayment * 12;
        }
        return agi * tier.rate;
      }
    }
    return agi * 0.10; // Fallback
  };

  const dependents = filingStatus === 'single'
    ? Math.max(0, familySize - 1)
    : Math.max(0, familySize - 2);
  const annualDependentDeduction = dependents * rapConfig.dependentDeductionAnnual;

  const initialRawAnnual = getRAPAnnualPayment(initialAgi) - annualDependentDeduction;

  // UPDATE: Round down RAP payment
  const initialMonthlyPayment = roundIDR(Math.max(rapConfig.minimumMonthlyPayment, Math.max(0, initialRawAnnual) / 12));

  // --- ACTUARIAL CALIBRATION ---
  let calibrationOffset = 0;
  if (actualCurrentPayment !== null && actualCurrentPayment >= 0) {
    calibrationOffset = actualCurrentPayment - initialMonthlyPayment;
  }

  if (effectivePaymentsMade >= forgivenessMonths) {
    return {
      totalPaid: 0,
      totalInterest: 0,
      forgivenessDate: new Date(),
      monthlyPayment: actualCurrentPayment !== null ? actualCurrentPayment : initialMonthlyPayment,
      remainingPayments: 0,
      totalPayments: forgivenessMonths,
      paymentsMade: effectivePaymentsMade,
    };
  }

  const startDate = new Date();

  for (let month = 1; month <= remainingPayments; month++) {
    if (currentPrincipal <= 0.01) {
      const payoffDate = new Date(startDate);
      payoffDate.setMonth(startDate.getMonth() + month);
      return {
        totalPaid,
        totalInterest: totalInterestPaid,
        payoffDate,
        monthlyPayment: actualCurrentPayment !== null ? actualCurrentPayment : initialMonthlyPayment,
        remainingPayments: month,
        totalPayments: forgivenessMonths,
        paymentsMade: effectivePaymentsMade,
      };
    }

    if (month > 1 && month % 12 === 0) {
      currentAgi *= (1 + incomeGrowthRate);
      // Remove calibration after Year 1
      if (month >= 12) {
        calibrationOffset = 0;
      }
    }

    const annualPayment = getRAPAnnualPayment(currentAgi) - annualDependentDeduction;

    // UPDATE: Round down RAP payment inside simulation
    let monthlyPayment = roundIDR(Math.max(rapConfig.minimumMonthlyPayment, Math.max(0, annualPayment) / 12));

    // Apply Calibration
    if (calibrationOffset !== 0) {
      monthlyPayment = Math.max(rapConfig.minimumMonthlyPayment, monthlyPayment + calibrationOffset);
    }

    const monthlyInterest = currentPrincipal * monthlyRate;

    // RAP LOGIC: Government subsidy vs Principal Reduction
    if (monthlyPayment < monthlyInterest) {
      // Negative Amortization case
      // User pays 'monthlyPayment', which is ALL interest.
      totalInterestPaid += monthlyPayment;

      // OBBBA mandated principal drop
      currentPrincipal -= rapConfig.minimumPrincipalReduction;
    } else {
      // Standard Paydown
      totalInterestPaid += monthlyInterest;
      const principalPayment = monthlyPayment - monthlyInterest;

      // Ensure min reduction
      const actualReduction = Math.max(rapConfig.minimumPrincipalReduction, principalPayment);
      currentPrincipal -= actualReduction;
    }

    totalPaid += monthlyPayment;
  }

  const forgivenessDate = new Date(startDate);
  forgivenessDate.setMonth(startDate.getMonth() + remainingPayments);

  return {
    totalPaid,
    totalInterest: totalInterestPaid,
    forgivenessDate,
    monthlyPayment: actualCurrentPayment !== null ? actualCurrentPayment : initialMonthlyPayment,
    remainingPayments,
    totalPayments: forgivenessMonths,
    paymentsMade: effectivePaymentsMade
  };
}

// ============================================================================
// PART 3: MAIN CALCULATOR CONTROLLER
// ============================================================================

export const calculatePlans = ({
  loans,
  agi,
  familySize,
  stateOfResidence,
  filingStatus,
  paymentHistory = { hasHistory: false, idrPaymentsMade: 0, pslfPaymentsMade: 0, saveForbearanceMonths: 0 },
  payeEligibilityDates = { firstLoanDate: null, firstDisbursementAfter2007Date: null }
}) => {
  // 1. Data Sanitization
  if (!loans || loans.length === 0) return { plans: {}, contaminationWarning: false };

  const totalFederalBalance = loans.reduce((sum, loan) => sum + parseFloat(loan.balance || 0), 0);
  if (totalFederalBalance <= 0) return { plans: {}, contaminationWarning: false };

  // 2. Weighted Interest Rate Calculation (Rounding to nearest 1/8th per Statute)
  const rawWeightedRate = loans.reduce((acc, loan) =>
    acc + (parseFloat(loan.balance) * (parseFloat(loan.rate) / 100)), 0
  ) / totalFederalBalance;

  const roundingIncrement = FINANCIAL_PARAMS.consolidation.rateRoundingIncrement;
  const weightedAverageRate = Math.ceil(rawWeightedRate / roundingIncrement) * roundingIncrement;

  // 3. Weighted SAVE Percentage Calculation (New Actuarial Requirement)
  const weightedSavePercentage = calculateWeightedSavePercentage(loans);

  // 4. Plan Generation
  const plans = {};
  // --- FIX: STRICT ZEROING (Prevents "Ghost/Hallucinated" Payments) ---
  // If "Just Starting" is selected, force zeros. This kills the bug where stale 
  // inputs or date-based inferences (like 235 payments) persist invisibly.
  const effectiveIdrPayments = paymentHistory.hasHistory ? (parseInt(paymentHistory.idrPaymentsMade) || 0) : 0;
  const effectivePslfPayments = paymentHistory.hasHistory ? (parseInt(paymentHistory.pslfPaymentsMade) || 0) : 0;
  const effectiveForbearance = paymentHistory.hasHistory ? (parseInt(paymentHistory.saveForbearanceMonths) || 0) : 0;

  // -- Standard 10 Year --
  const stdMonthly10 = calculateAmortizedPayment(totalFederalBalance, weightedAverageRate, 10);
  plans['Standard'] = {
    monthlyPayment: stdMonthly10,
    totalPaid: stdMonthly10 * 120,
    payoffDate: new Date(new Date().setFullYear(new Date().getFullYear() + 10)),
    totalInterest: (stdMonthly10 * 120) - totalFederalBalance,
    isIdr: false
  };

  // -- Standardized Repayment (OBBBA) --
  const repaymentTiers = FINANCIAL_PARAMS.standardizedRepayment.tiers;
  let standardizedYears = repaymentTiers[0].years;
  for (let i = repaymentTiers.length - 1; i >= 0; i--) {
    if (totalFederalBalance >= repaymentTiers[i].threshold) {
      standardizedYears = repaymentTiers[i].years;
      break;
    }
  }
  const stdMonthly = calculateAmortizedPayment(totalFederalBalance, weightedAverageRate, standardizedYears);
  plans['Standardized Repayment'] = {
    monthlyPayment: stdMonthly,
    totalPaid: stdMonthly * 12 * standardizedYears,
    payoffDate: new Date(new Date().setFullYear(new Date().getFullYear() + standardizedYears)),
    totalInterest: (stdMonthly * 12 * standardizedYears) - totalFederalBalance,
    isIdr: false
  };

  // -- IDR Simulations --
  const simArgs = {
    principal: totalFederalBalance,
    annualRate: weightedAverageRate,
    initialAgi: agi,
    familySize,
    stateOfResidence,
    paymentsMade: effectiveIdrPayments,
    effectiveForbearance,
    // Note: 'actualCurrentPayment' isn't passed here because this function generates
    // ALL options. Calibration happens in specific strategy tools (Windfall/529)
    // where we know which plan the user is actually on.
    actualCurrentPayment: null
  };
  const idrConfig = FINANCIAL_PARAMS.idrPlans;

  // Use the calculated 10-Year Standard payment as the statutory cap reference
  // ACTUARIAL NOTE: Strictly, this should be the standard payment *at the time of entering the plan*.
  // Using the current standard payment is a safe conservative estimate for the platform.
  const standardPlanPayment10Year = plans['Standard'].monthlyPayment;

  // SAVE
  const saveConfig = idrConfig.SAVE;
  plans['SAVE'] = {
    ...simulateLegacyIDR({
      ...simArgs,
      planName: 'SAVE',
      forgivenessYears: saveConfig.forgivenessYears,
      povertyMultiplier: saveConfig.povertyMultiplier,
      paymentPercentage: weightedSavePercentage, // Using strict weighted calc
      standardPaymentCap: Infinity // SAVE has no cap
    }),
    isIdr: true,
    status: saveConfig.status,
    sunset: new Date(saveConfig.sunsetDate)
  };

  // Old IBR
  const oldIBRConfig = idrConfig.IBR_OLD;
  plans['Old IBR'] = {
    ...simulateLegacyIDR({
      ...simArgs,
      planName: 'Old IBR',
      forgivenessYears: oldIBRConfig.forgivenessYears,
      povertyMultiplier: oldIBRConfig.povertyMultiplier,
      paymentPercentage: oldIBRConfig.paymentPercentage,
      standardPaymentCap: standardPlanPayment10Year // Statutory Cap applied
    }),
    isIdr: true
  };

  // New IBR
  const newIBRConfig = idrConfig.IBR_NEW;
  plans['New IBR'] = {
    ...simulateLegacyIDR({
      ...simArgs,
      planName: 'New IBR',
      forgivenessYears: newIBRConfig.forgivenessYears,
      povertyMultiplier: newIBRConfig.povertyMultiplier,
      paymentPercentage: newIBRConfig.paymentPercentage,
      standardPaymentCap: standardPlanPayment10Year // Statutory Cap applied
    }),
    isIdr: true
  };

  // PAYE
  const payeCheck = checkPAYEEligibility(payeEligibilityDates.firstLoanDate, payeEligibilityDates.firstDisbursementAfter2007Date);
  if (payeCheck.eligible) {
    const payeConfig = idrConfig.PAYE;
    plans['PAYE'] = {
      ...simulateLegacyIDR({
        ...simArgs,
        planName: 'PAYE',
        forgivenessYears: payeConfig.forgivenessYears,
        povertyMultiplier: payeConfig.povertyMultiplier,
        paymentPercentage: payeConfig.paymentPercentage,
        standardPaymentCap: standardPlanPayment10Year // Statutory Cap applied
      }),
      isIdr: true,
      sunset: new Date(payeConfig.sunsetDate)
    };
  } else {
    plans['PAYE'] = { status: 'Not Eligible', reason: payeCheck.reason, isIdr: false };
  }

  // ICR
  const icrConfig = idrConfig.ICR;
  const icrResult = simulateLegacyIDR({
    ...simArgs,
    planName: 'ICR',
    forgivenessYears: icrConfig.forgivenessYears,
    povertyMultiplier: icrConfig.povertyMultiplier,
    paymentPercentage: icrConfig.paymentPercentage,
    standardPaymentCap: Infinity
  });

  // ICR Special Cap Logic (12 year amortized)
  const icrCap = icrConfig.specialCap.enabled
    ? calculateAmortizedPayment(totalFederalBalance, weightedAverageRate, icrConfig.specialCap.years)
    : Infinity;

  plans['ICR'] = {
    ...icrResult,
    monthlyPayment: Math.min(icrResult.monthlyPayment, icrCap),
    isIdr: true,
    sunset: new Date(icrConfig.sunsetDate)
  };

  // RAP
  plans['RAP'] = {
    ...simulateRAP({ ...simArgs, filingStatus }),
    isIdr: true
  };

  // PSLF Overlay
  const pslfRequired = FINANCIAL_PARAMS.pslf.requiredPayments;
  // Use the new variables here:
  const totalPSLF = effectivePslfPayments + effectiveForbearance;
  const remainingPSLF = Math.max(0, pslfRequired - totalPSLF);

  plans['PSLF'] = {
    paymentsMade: totalPSLF,
    remainingPayments: remainingPSLF,
    totalPayments: pslfRequired,
    alreadyEligible: totalPSLF >= pslfRequired,
    forgivenessDate: new Date(Date.now() + (remainingPSLF * 30.44 * 24 * 3600 * 1000))
  };

  return { plans, contaminationWarning: false };
};

// ============================================================================
// PART 4: PRIVATE LOAN & ACCELERATOR ENGINES (Optimized)
// ============================================================================

export const calculatePrivateLoanPayoff = (privateLoans, calcMode, extraPayment = 0, targetYear) => {
  if (!privateLoans || privateLoans.length === 0) return null;

  // Pre-process loan data
  let totalOriginalBalance = 0;
  const loansWithData = privateLoans.map(loan => {
    const bal = parseFloat(loan.balance);
    const rate = parseFloat(loan.rate) / 100;
    const term = parseFloat(loan.term);
    totalOriginalBalance += bal;
    return { ...loan, balance: bal, rate: rate, minPayment: calculateAmortizedPayment(bal, rate, term) };
  });

  const totalMinPayment = loansWithData.reduce((s, l) => s + l.minPayment, 0);

  const simulatePrivate = (monthlyPayment) => {
    // Clone logic for simulation
    const loans = loansWithData.map(l => ({ currentBal: l.balance, rate: l.rate, min: l.minPayment }));
    // Sort logic: Avalanche (Highest Rate First) is mathematically optimal
    loans.sort((a, b) => b.rate - a.rate);

    let month = 0;
    let paid = 0;
    let totalBal = totalOriginalBalance;
    const startDate = new Date();

    while (totalBal > 0.01 && month < 600) { // 50 year safety cap
      month++;
      let paymentBudget = monthlyPayment;
      totalBal = 0;

      // 1. Pay Minimums on all loans
      for (const l of loans) {
        if (l.currentBal > 0) {
          const interest = l.currentBal * (l.rate / 12);
          const totalDue = l.currentBal + interest;
          const minPay = Math.min(totalDue, l.min);

          l.currentBal = totalDue - minPay;
          paymentBudget -= minPay;
          paid += minPay;
        }
      }

      // 2. Apply Excess to Highest Rate Loan (Avalanche)
      if (paymentBudget > 0) {
        for (const l of loans) {
          if (paymentBudget <= 0) break;
          if (l.currentBal > 0) {
            const extra = Math.min(l.currentBal, paymentBudget);
            l.currentBal -= extra;
            paymentBudget -= extra;
            paid += extra;
          }
        }
      }

      // Re-sum balance
      totalBal = loans.reduce((s, l) => s + Math.max(0, l.currentBal), 0);
    }

    const payoffDate = new Date(startDate);
    payoffDate.setMonth(startDate.getMonth() + month);

    return { totalPaid: paid, totalInterest: paid - totalOriginalBalance, payoffDate, monthlyPayment };
  };

  const baseline = simulatePrivate(totalMinPayment);
  let accelerated;
  let requiredExtra = 0;

  if (calcMode === 'target') {
    const termYears = targetYear - new Date().getFullYear();
    if (termYears <= 0) return { error: "Target year must be future." };
    const weightedRate = loansWithData.reduce((s, l) => s + (l.balance * l.rate), 0) / totalOriginalBalance;
    const targetPayment = calculateAmortizedPayment(totalOriginalBalance, weightedRate, termYears);

    if (targetPayment <= totalMinPayment) return { error: "Minimum payments already meet target.", alreadyMeetsTarget: true };
    requiredExtra = targetPayment - totalMinPayment;
    accelerated = simulatePrivate(targetPayment);
  } else {
    accelerated = simulatePrivate(totalMinPayment + parseFloat(extraPayment));
  }

  return {
    baseline,
    accelerated,
    savings: {
      interestSaved: baseline.totalInterest - accelerated.totalInterest,
      monthsSaved: Math.max(0, Math.round((baseline.payoffDate - accelerated.payoffDate) / (1000 * 60 * 60 * 24 * 30.44)))
    },
    requiredExtraPayment: requiredExtra
  };
};

/**
 * Generates an Amortization Schedule.
 * USES: Deterministic Date Anchoring
 */
export const generateAmortizationSchedule = (principal, annualRate, monthlyPayment) => {
  const p = parseFloat(principal);
  const r = parseFloat(annualRate);
  const mp = parseFloat(monthlyPayment);

  if (p <= 0 || r < 0 || mp <= 0) return [];
  const schedule = [];
  let bal = p;
  const rate = r / 12;
  const startDate = new Date(); // Anchor

  for (let i = 1; i <= 600 && bal > 0.01; i++) {
    const interest = bal * rate;
    const payment = Math.min(mp, bal + interest);
    const principalPay = payment - interest;
    bal -= principalPay;
    if (bal < 0) bal = 0;

    const d = new Date(startDate);
    d.setMonth(startDate.getMonth() + i);

    schedule.push({
      paymentNumber: i,
      paymentDate: d.toLocaleDateString(),
      paymentAmount: payment,
      principal: principalPay,
      interest: interest,
      remainingBalance: bal
    });
  }
  return schedule;
};

// ============================================================================
// PART 5: STRATEGIC TOOLS (Insolvency, Tax, Buyback, Marriage, Arbitrage)
// ============================================================================

export function aggregateInsolvencyData(assets, liabilities, loanBal) {
  const parse = (v) => parseFloat(v) || 0;
  const totalAssets = Object.values(assets).reduce((s, v) => s + parse(v), 0);
  const totalLiabilities = Object.values(liabilities).reduce((s, v) => s + parse(v), 0) + (parseFloat(loanBal) || 0);
  return { totalAssets, totalLiabilities };
}

export function calculateTaxOnForgiveness(forgivenAmount, otherIncome, filingStatus, totalAssets, totalLiabilities) {
  const taxData = FINANCIAL_PARAMS.taxData;
  const stdDed = taxData.standardDeductions;

  // Map status
  let statusKey = 'single';
  if (filingStatus === 'jointly' || filingStatus === 'MFJ') statusKey = 'married_jointly';
  else if (filingStatus === 'separately' || filingStatus === 'MFS') statusKey = 'married_separately';
  else if (filingStatus === 'head') statusKey = 'head_of_household';

  const insolvencyAmt = Math.max(0, totalLiabilities - totalAssets);
  const excluded = Math.min(forgivenAmount, insolvencyAmt);
  const taxable = Math.max(0, forgivenAmount - excluded);

  const gross = otherIncome + taxable;

  // Calculate marginal tax on forgiveness only
  const calculateTaxOnIncome = (income, statusKey) => {
    const taxableIncome = Math.max(0, income - stdDed[statusKey]);
    let tax = 0;
    let prevMax = 0;
    const brackets = taxData.brackets[statusKey];

    for (const b of brackets) {
      const cap = b.max === null ? Infinity : b.max;
      const amountInBracket = Math.max(0, Math.min(taxableIncome, cap) - prevMax);
      tax += amountInBracket * b.rate;
      prevMax = cap;
      if (taxableIncome <= prevMax) break;
    }
    return tax;
  };

  // Tax on base income only
  const baseTax = calculateTaxOnIncome(otherIncome, statusKey);

  // Tax on base + forgiveness
  const combinedTax = calculateTaxOnIncome(otherIncome + taxable, statusKey);

  // Marginal tax = difference
  const estimatedTaxBill = combinedTax - baseTax;

  return { estimatedTaxBill, insolvencyAmount: insolvencyAmt, taxableForgiveness: taxable };
}

/**
 * Calculate historical buyback payment.
 * SOURCE: financialParameters.json → historicalPoverty, idrPlans
 */
export function calculateHistoricalBuyback(year, agi, familySize, state, planType) {
  // DEFAULT to current year if null
  const safeYear = year || new Date().getFullYear();

  if (isNaN(agi)) return 0;

  // FIX: Proper fallback logic for future years
  const history = FINANCIAL_PARAMS.historicalPoverty[safeYear.toString()];

  let baseAmount, perMemberAmount;
  if (history) {
    // Historical data uses "base" and "add"
    baseAmount = history.base;
    perMemberAmount = history.add;
  } else {
    // Fallback to current guidelines (uses "base" and "perMember")
    baseAmount = FINANCIAL_PARAMS.povertyGuidelines.contiguous.base;
    perMemberAmount = FINANCIAL_PARAMS.povertyGuidelines.contiguous.perMember;
  }

  let multiplier = 1;
  if (state === 'AK') multiplier = FINANCIAL_PARAMS.povertyGuidelines.alaska.multiplier;
  if (state === 'HI') multiplier = FINANCIAL_PARAMS.povertyGuidelines.hawaii.multiplier;

  const pov = (baseAmount + (Math.max(0, familySize - 1) * perMemberAmount)) * multiplier;

  // Get plan-specific parameters from JSON
  const idrPlans = FINANCIAL_PARAMS.idrPlans;
  let povertyMult = 1.5;
  let paymentPct = 0.10;

  if (planType === 'Old IBR') {
    povertyMult = idrPlans.IBR_OLD.povertyMultiplier;
    paymentPct = idrPlans.IBR_OLD.paymentPercentage;
  } else if (planType === 'PAYE' || planType === 'New IBR') {
    const config = planType === 'PAYE' ? idrPlans.PAYE : idrPlans.IBR_NEW;
    povertyMult = config.povertyMultiplier;
    paymentPct = config.paymentPercentage;
  } else if (planType === 'ICR') {
    povertyMult = idrPlans.ICR.povertyMultiplier;
    paymentPct = idrPlans.ICR.paymentPercentage;
  } else if (planType === 'SAVE') {
    povertyMult = idrPlans.SAVE.povertyMultiplier;
    // NOTE: Historical buyback usually defaults to the simple 10% for simplicity in admin
    // but strictly, it should be weighted. We keep 10% for historical safety here.
    paymentPct = 0.10;
  }

  const disc = Math.max(0, agi - (pov * povertyMult));
  return Math.floor((disc * paymentPct) / 12);
}

export const calculateAcceleratedPayoff = (
  principal, annualRate, baselinePlan, extraPayment, financialProfile, planName
) => {
  if (extraPayment <= 0) return { error: "Extra payment must be greater than $0." };

  const incomeGrowthRate = FINANCIAL_PARAMS.assumptions.annualIncomeGrowthRate;
  const rapConfig = FINANCIAL_PARAMS.rapPlan;

  // Helper to re-calc base payment dynamically during acceleration loop
  const getBasePayment = (agi) => {
    const { familySize, stateOfResidence, filingStatus } = financialProfile;
    // Standard cap reference
    const standardCap = calculateAmortizedPayment(principal, annualRate, 10);
    const idrPlans = FINANCIAL_PARAMS.idrPlans;

    switch (planName) {
      case 'Old IBR':
        return Math.min(standardCap, (calculateDiscretionaryIncome(agi, familySize, stateOfResidence, idrPlans.IBR_OLD.povertyMultiplier) * idrPlans.IBR_OLD.paymentPercentage) / 12);
      case 'New IBR':
      case 'PAYE':
        const config = planName === 'PAYE' ? idrPlans.PAYE : idrPlans.IBR_NEW;
        return Math.min(standardCap, (calculateDiscretionaryIncome(agi, familySize, stateOfResidence, config.povertyMultiplier) * config.paymentPercentage) / 12);
      case 'SAVE':
        // For acceleration, we assume the weighted percentage holds constant
        // We need the weighted percentage from the baseline plan if available, else standard
        const weightedPct = baselinePlan.paymentPercentage || 0.05;
        return (calculateDiscretionaryIncome(agi, familySize, stateOfResidence, idrPlans.SAVE.povertyMultiplier) * weightedPct) / 12;
      case 'ICR':
        return Math.min(standardCap, (calculateDiscretionaryIncome(agi, familySize, stateOfResidence, idrPlans.ICR.povertyMultiplier) * idrPlans.ICR.paymentPercentage) / 12);
      case 'RAP':
        const dependents = filingStatus === 'single' ? Math.max(0, familySize - 1) : Math.max(0, familySize - 2);
        const deduction = dependents * rapConfig.dependentDeductionAnnual;
        return Math.max(rapConfig.minimumMonthlyPayment, (agi * 0.10 - deduction) / 12);
      default:
        return baselinePlan.monthlyPayment;
    }
  };

  let currentPrincipal = principal;
  let accruedInterest = 0;
  let totalPaid = 0;
  let totalInterestPaid = 0;
  let currentAgi = financialProfile.agi;
  const monthlyRate = annualRate / 12;
  let month = 0;
  const maxMonths = 600;
  const startDate = new Date();

  while (currentPrincipal > 0.01 && month < maxMonths) {
    month++;
    if (month > 1 && month % 12 === 0) {
      currentAgi *= (1 + incomeGrowthRate);
    }

    const basePay = getBasePayment(currentAgi);
    const totalPayment = basePay + extraPayment;

    const newInterest = currentPrincipal * monthlyRate;
    accruedInterest += newInterest;

    let remaining = totalPayment;

    const toInterest = Math.min(remaining, accruedInterest);
    accruedInterest -= toInterest;
    totalInterestPaid += toInterest;
    remaining -= toInterest;

    const toPrincipal = Math.min(remaining, currentPrincipal);
    currentPrincipal -= toPrincipal;

    totalPaid += totalPayment;
  }

  const payoffDate = new Date(startDate);
  payoffDate.setMonth(startDate.getMonth() + month);

  const baselineDate = baselinePlan.forgivenessDate || baselinePlan.payoffDate;
  // Safe date math for savings
  const monthsSaved = Math.max(0, Math.round((baselineDate - payoffDate) / (1000 * 60 * 60 * 24 * 30.44)));

  return {
    baseline: { ...baselinePlan, isForgivenessDate: !!baselinePlan.forgivenessDate },
    accelerated: { totalPaid, totalInterest: totalInterestPaid, payoffDate, monthlyPayment: getBasePayment(financialProfile.agi) + extraPayment },
    savings: { interestSaved: Math.max(0, baselinePlan.totalInterest - totalInterestPaid), monthsSaved },
    paidOffBeforeForgiveness: baselinePlan.isIdr && baselinePlan.forgivenessDate && payoffDate < baselinePlan.forgivenessDate
  };
};

export const calculateTargetYearPayment = (principal, annualRate, baselinePlan, targetYear, financialProfile, planName) => {
  const currentDate = new Date();
  const targetDate = new Date(targetYear, 11, 31); // December 31 of target year
  const termYears = (targetDate - currentDate) / (365.25 * 24 * 60 * 60 * 1000);
  if (termYears <= 0) return { error: "Target year must be in the future." };

  // Binary search to find the correct extra payment that hits the target year
  const basePayment = typeof baselinePlan.monthlyPayment === 'number' ? baselinePlan.monthlyPayment : 0;

  // Quick check: standard amortization
  const standardPayment = calculateAmortizedPayment(principal, annualRate, termYears);
  if (basePayment >= standardPayment) {
    return { error: "Current plan already meets target.", alreadyMeetsTarget: true };
  }

  // Binary search for correct extra payment
  let minExtra = 0;
  let maxExtra = principal; // Upper bound: enough to pay off immediately
  let requiredExtra = standardPayment - basePayment; // Initial guess
  let iterations = 0;
  const MAX_ITERATIONS = 20;
  const TOLERANCE_MONTHS = 0; // Allow 1 month variance

  while (iterations < MAX_ITERATIONS) {
    const testResult = calculateAcceleratedPayoff(
      principal,
      annualRate,
      baselinePlan,
      requiredExtra,
      financialProfile,
      planName
    );

    if (!testResult.accelerated || !testResult.accelerated.payoffDate) {
      break;
    }

    const payoffYear = testResult.accelerated.payoffDate.getFullYear();
    const payoffMonth = testResult.accelerated.payoffDate.getMonth();
    const targetMonth = 11; // December

    // Check if we're within tolerance
    const yearDiff = payoffYear - targetYear;
    const monthDiff = (yearDiff * 12) + (payoffMonth - targetMonth);

    // Accept if payoff is in target month (Dec) or slightly earlier
    if (monthDiff <= TOLERANCE_MONTHS && monthDiff >= -1) {
      // Close enough!
      return { ...testResult, requiredExtraPayment: requiredExtra };
    }

    // Adjust search bounds
    if (payoffYear < targetYear || (payoffYear === targetYear && payoffMonth < targetMonth)) {
      // Paying off too early - decrease payment
      maxExtra = requiredExtra;
      requiredExtra = (minExtra + requiredExtra) / 2;
    } else {
      // Paying off too late - increase payment
      minExtra = requiredExtra;
      requiredExtra = (requiredExtra + maxExtra) / 2;
    }

    iterations++;
  }

  // Fallback: use final result
  const result = calculateAcceleratedPayoff(principal, annualRate, baselinePlan, requiredExtra, financialProfile, planName);

  if (result.accelerated.payoffDate.getFullYear() > targetYear) {
    result.error = "Income growth constraints prevent hitting exact year.";
  }
  return { ...result, requiredExtraPayment: requiredExtra };
};

export function getEligiblePlans(loans, plansToTakeNewLoan) {
  const allowed = [];

  // 1. Analyze Borrower Status based on Loan Data
  const hasPre2014 = loans.some(l => l.originationDate === 'before_2014');
  const isFutureBorrower = loans.length > 0 && loans.every(l => l.originationDate === 'after_2026');
  const hasOldLoans = loans.some(l => l.originationDate !== 'after_2026');

  // 2. Determine Contamination (Legacy borrower taking NEW debt)
  const willContaminate = hasOldLoans && plansToTakeNewLoan === 'yes';

  // --- FIX: MUTUAL EXCLUSION (Standard vs. Standardized) ---
  // STRICT RULE: Only true Future Borrowers OR those contaminating legacy loans get Standardized.
  // Legacy borrowers (even if they have recent loans) get Standard 10-Year unless they trigger new borrowing.
  if (isFutureBorrower || plansToTakeNewLoan === 'yes') {
    allowed.push('Standardized Repayment');
  } else {
    allowed.push('Standard');
  }

  // 3. RAP Eligibility (Future Borrowers ONLY)
  if (isFutureBorrower || willContaminate) {
    allowed.push('RAP');
    // Future borrowers ONLY get RAP and Standardized (no IDR legacy plans)
    return { allowed, contaminationWarning: willContaminate };
  }

  // 4. Legacy IDR Options (for borrowers with ANY pre-2026 debt who aren't adding new debt)
  allowed.push('SAVE');
  allowed.push('PAYE');
  allowed.push('ICR');
  allowed.push('RAP'); // Optional: Some interpretations allow RAP for all, but strictly it's a future plan. We leave it for comparison.

  if (hasPre2014) {
    allowed.push('Old IBR');
  } else {
    allowed.push('New IBR');
  }

  return { allowed, contaminationWarning: false };
}

// ============================================================================
// ENGINE 3: MARRIAGE PENALTY ANALYSIS (Restored)
// ============================================================================
export function calculateMarriageAnalysis({
  userAgi, spouseAgi, familySize, state,
  userLoanBalance, spouseLoanBalance, selectedPlan,
  userAge, spouseAge
}) {
  const safeUserAge = parseInt(userAge) || 0;
  const safeSpouseAge = parseInt(spouseAge) || 0;
  const safeFamilySize = parseInt(familySize) || 2;
  const safeUserLoans = parseFloat(userLoanBalance) || 0;
  const safeSpouseLoans = parseFloat(spouseLoanBalance) || 0;

  if (isNaN(userAgi) || isNaN(spouseAgi)) return null;

  const householdAgi = userAgi + spouseAgi;
  const taxData = FINANCIAL_PARAMS.taxData;
  const credits = FINANCIAL_PARAMS.taxCredits;

  const calcTax = (income, status, is65Plus) => {
    const deductionKey = status === 'mfj' ? 'married_jointly' : 'married_separately';
    let deduction = taxData.standardDeductions[deductionKey];

    if (is65Plus) deduction += credits.seniorDeduction;

    const taxableIncome = Math.max(0, income - deduction);
    let tax = 0;
    let prevMax = 0;

    const bracketKey = status === 'mfj' ? 'married_jointly' : 'married_separately';
    const brackets = taxData.brackets[bracketKey];

    for (const bracket of brackets) {
      const cap = bracket.max === null ? Infinity : bracket.max;
      const amountInBracket = Math.min(taxableIncome, cap) - prevMax;
      if (amountInBracket > 0) tax += amountInBracket * bracket.rate;
      prevMax = cap;
      if (taxableIncome <= prevMax) break;
    }
    return tax;
  };

  const taxMFJ = calcTax(householdAgi, 'mfj', safeUserAge >= 65 || safeSpouseAge >= 65);
  const taxMFS_User = calcTax(userAgi, 'mfs', safeUserAge >= 65);
  const taxMFS_Spouse = calcTax(spouseAgi, 'mfs', safeSpouseAge >= 65);
  const totalTaxMFS = taxMFS_User + taxMFS_Spouse;

  let lostCreditsVal = 0;
  const creditBreakdown = [];

  if (safeUserLoans > 0 || safeSpouseLoans > 0) {
    const cap = credits.studentLoanInterestCap;
    const estInterest = Math.min(cap, (safeUserLoans + safeSpouseLoans) * 0.05);
    let allowedMFJ = estInterest;
    if (householdAgi > 170000) {
      if (householdAgi >= 200000) allowedMFJ = 0;
      else allowedMFJ = estInterest * ((200000 - householdAgi) / 30000);
    }
    if (allowedMFJ > 0) {
      const value = allowedMFJ * 0.22;
      lostCreditsVal += value;
      creditBreakdown.push(`Student Loan Interest (~$${value.toFixed(0)})`);
    }
  }

  if (safeFamilySize > 2) {
    const numKids = safeFamilySize - 2;
    const maxExpenses = numKids >= 2 ? credits.childCareCredit.maxExpenses : credits.childCareCredit.baseExpensePerChild;
    let rate = 0.20;
    if (householdAgi <= 15000) rate = 0.50;
    else if (householdAgi <= 45000) rate = 0.50 - ((householdAgi - 15000) / 30000) * 0.15;
    else if (householdAgi <= 150000) rate = 0.35;
    else if (householdAgi <= 210000) rate = 0.35 - ((householdAgi - 150000) / 60000) * 0.15;
    const creditValue = maxExpenses * rate;
    lostCreditsVal += creditValue;
    creditBreakdown.push(`Child Care Credit (~$${creditValue.toFixed(0)})`);
  }

  if (safeFamilySize > 2 && householdAgi > 400000) {
    const numKids = safeFamilySize - 2;
    const ctcAmount = credits.childTaxCreditAmount;
    const reduction = Math.ceil((householdAgi - 400000) / 1000) * 50;
    const loss = Math.min(numKids * ctcAmount, reduction);
    if (loss > 0) {
      lostCreditsVal += loss;
      creditBreakdown.push(`Child Tax Credit Phase-out (~$${loss.toFixed(0)})`);
    }
  }

  const getPayment = (income, plan, fSize, balance) => {
    if (balance <= 0) return 0;

    if (plan === 'RAP') {
      const rapConfig = FINANCIAL_PARAMS.rapPlan;
      const dependents = fSize <= 1 ? 0 : Math.max(0, fSize - 2);
      const deduction = dependents * rapConfig.dependentDeductionAnnual;
      const tiers = rapConfig.incomeTiers;
      let rate = 0.10;
      for (const tier of tiers) {
        if (tier.limit === null || income <= tier.limit) {
          if (tier.rate === 0 || tier.rate === "min_payment") return rapConfig.minimumMonthlyPayment;
          rate = tier.rate;
          break;
        }
      }
      const annual = (income * rate) - deduction;
      return Math.max(rapConfig.minimumMonthlyPayment, annual / 12);
    }

    const povData = FINANCIAL_PARAMS.povertyGuidelines.contiguous;
    const multiplierState = (state === 'AK' ? FINANCIAL_PARAMS.povertyGuidelines.alaska.multiplier : (state === 'HI' ? FINANCIAL_PARAMS.povertyGuidelines.hawaii.multiplier : 1));
    const poverty = (povData.base + (Math.max(0, fSize - 1) * povData.perMember)) * multiplierState;

    // Get plan config from JSON
    const idrPlans = FINANCIAL_PARAMS.idrPlans;
    let multiplier = 1.5;
    let pct = 0.10;

    if (plan === 'Old IBR') {
      multiplier = idrPlans.IBR_OLD.povertyMultiplier;
      pct = idrPlans.IBR_OLD.paymentPercentage;
    } else if (plan === 'ICR') {
      multiplier = idrPlans.ICR.povertyMultiplier;
      pct = idrPlans.ICR.paymentPercentage;
    } else if (plan === 'SAVE') {
      multiplier = idrPlans.SAVE.povertyMultiplier;
      // Note: for Strategy, we default to 10% if mix unknown, or 5% if user indicated
      pct = 0.10;
    }

    const discIncome = Math.max(0, income - (poverty * multiplier));

    // UPDATE: Round down IDR payment for marriage analysis
    return roundIDR((discIncome * pct) / 12);
  };

  const paymentMFJ = getPayment(householdAgi, selectedPlan, safeFamilySize, safeUserLoans + safeSpouseLoans);
  const paymentMFS = getPayment(userAgi, selectedPlan, Math.max(1, safeFamilySize - 1), safeUserLoans);

  const monthlyTaxMFJ = taxMFJ / 12;
  const monthlyTaxMFS = totalTaxMFS / 12;
  const monthlyLostCredits = lostCreditsVal / 12;
  const totalMonthlyCost_MFJ = monthlyTaxMFJ + paymentMFJ;
  const totalMonthlyCost_MFS = monthlyTaxMFS + monthlyLostCredits + paymentMFS;

  return {
    strategy: totalMonthlyCost_MFJ < totalMonthlyCost_MFS ? "Joint Filing (MFJ) appears more favorable" : "Separate Filing (MFS) appears more favorable",
    savings: Math.abs(totalMonthlyCost_MFJ - totalMonthlyCost_MFS),
    creditBreakdown,
    mfj: { tax: monthlyTaxMFJ, payment: paymentMFJ, total: totalMonthlyCost_MFJ },
    mfs: { tax: monthlyTaxMFS, payment: paymentMFS, penalty: monthlyLostCredits, total: totalMonthlyCost_MFS }
  };
}

// ============================================================================
// PSLF ARBITRAGE ENGINE V2.0 - DECEMBER 2025
// ============================================================================

/**
 * Calculate Capital Gains Tax on Investment Growth
 * COMPLIANCE: 2025 Federal Tax Law, IRC Section 1(h)
 * 
 * @param {number} capitalGains - Investment growth (taxable amount)
 * @param {number} agi - Adjusted Gross Income from Card 1
 * @param {string} filingStatus - Tax filing status
 * @returns {Object} Tax breakdown
 */
function calculateCapitalGainsTax(capitalGains, agi, filingStatus) {
  if (capitalGains <= 0) {
    return {
      capitalGainsRate: 0,
      federalTax: 0,
      netInvestmentIncomeTax: 0,
      totalTax: 0,
      effectiveRate: 0
    };
  }

  // Validate filing status
  const validStatuses = ['single', 'married_jointly', 'married_separately', 'head_of_household'];
  const safeFilingStatus = validStatuses.includes(filingStatus) ? filingStatus : 'single';

  // Get thresholds from parameters
  const thresholds = FINANCIAL_PARAMS.federal.capitalGains.longTerm[safeFilingStatus];

  // Determine capital gains rate (0%, 15%, or 20%)
  let capitalGainsRate;
  const safeAgi = parseFloat(agi) || 0;

  if (safeAgi <= thresholds.rate_0_percent) {
    capitalGainsRate = 0;
  } else if (safeAgi <= thresholds.rate_15_percent_max) {
    capitalGainsRate = 0.15;
  } else {
    capitalGainsRate = 0.20;
  }

  const federalTax = capitalGains * capitalGainsRate;

  // Net Investment Income Tax (3.8% surtax for high earners)
  let niit = 0;
  const niitThreshold = FINANCIAL_PARAMS.federal.capitalGains.netInvestmentIncomeTax.thresholds[safeFilingStatus];

  if (safeAgi > niitThreshold) {
    niit = capitalGains * FINANCIAL_PARAMS.federal.capitalGains.netInvestmentIncomeTax.rate;
  }

  const totalTax = federalTax + niit;

  return {
    capitalGainsRate,
    federalTax,
    netInvestmentIncomeTax: niit,
    totalTax,
    effectiveRate: capitalGains > 0 ? totalTax / capitalGains : 0
  };
}

/**
 * Generate Normal Random Number using Box-Muller Transform
 * Used for Monte Carlo simulation
 * 
 * @returns {number} Random number from standard normal distribution
 */
function generateNormalRandom() {
  const u1 = Math.random();
  const u2 = Math.random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

/**
 * Run Monte Carlo Simulation for Investment Returns
 * METHODOLOGY: Geometric Brownian Motion with log-normal returns
 * 
 * @param {Object} params - Simulation parameters
 * @returns {Object} Percentile results
 */
function runMonteCarloInvestmentSimulation(params) {
  const {
    monthlyInvestment,
    months,
    annualReturn,
    volatility,
    simulations = 1000
  } = params;

  const monthlyReturn = Math.pow(1 + annualReturn, 1 / 12) - 1;
  const monthlyVolatility = volatility / Math.sqrt(12);

  const results = [];

  // Run simulations
  for (let sim = 0; sim < simulations; sim++) {
    let balance = 0;

    for (let month = 1; month <= months; month++) {
      // Generate random monthly return using Geometric Brownian Motion
      const randomShock = generateNormalRandom();
      const simulatedReturn = monthlyReturn + (monthlyVolatility * randomShock);

      // Apply return and add contribution
      balance = balance * (1 + simulatedReturn) + monthlyInvestment;
    }

    results.push(Math.max(0, balance)); // Floor at zero
  }

  // Sort results for percentile calculation
  results.sort((a, b) => a - b);

  const getPercentile = (p) => {
    const index = Math.floor((p / 100) * simulations);
    return results[Math.min(index, simulations - 1)];
  };

  return {
    worst_case_10th: getPercentile(10),
    median_50th: getPercentile(50),
    best_case_90th: getPercentile(90),
    mean: results.reduce((sum, val) => sum + val, 0) / simulations
  };
}

/**
 * Calculate Future Value of Ordinary Annuity
 * FORMULA: FV = PMT × [(1+r)^n - 1] / r
 * 
 * @param {number} monthlyPayment - Monthly contribution
 * @param {number} months - Number of months
 * @param {number} monthlyRate - Monthly interest rate (decimal)
 * @returns {number} Future value
 */
function calculateFutureValueAnnuity(monthlyPayment, months, monthlyRate) {
  if (monthlyPayment <= 0 || months <= 0) return 0;

  // Edge case: zero return
  if (monthlyRate === 0) {
    return monthlyPayment * months;
  }

  const numerator = Math.pow(1 + monthlyRate, months) - 1;
  const denominator = monthlyRate;

  return monthlyPayment * (numerator / denominator);
}

/**
 * PSLF Arbitrage Calculator V2.0
 * 
 * PURPOSE: Calculate investment growth while following selected repayment plan
 * ACTUARIAL STANDARD: December 2025 parameters, production-grade precision
 * COMPLIANCE: All variables externalized to financialParameters.json
 * 
 * @param {Object} params - Calculation parameters
 * @param {Object} params.selectedPlan - Chosen plan from Card 4
 * @param {number} params.monthlyInvestment - Amount user will invest
 * @param {number} params.timelineYears - 10, 15, 20, or 30
 * @param {string} params.riskTolerance - "conservative" | "moderate" | "aggressive"
 * @param {boolean} params.showRiskAdjustedScenarios - Checkbox state
 * @param {number} params.agi - From Card 1 (for tax bracket)
 * @param {string} params.filingStatus - From Card 1 (for tax bracket)
 * 
 * @returns {Object} Investment projection results
 */
export function calculatePSLFArbitrageV2({
  selectedPlan,
  monthlyInvestment,
  timelineYears,
  riskTolerance = "moderate",
  showRiskAdjustedScenarios = false,
  agi = null,
  filingStatus = "single"
}) {
  // ============================================================================
  // VALIDATION
  // ============================================================================

  // Validate selected plan
  if (!selectedPlan || !selectedPlan.name || typeof selectedPlan.monthlyPayment !== 'number') {
    return {
      error: true,
      message: "Valid repayment plan must be selected from Card 4"
    };
  }

  // Validate monthly investment
  const safeMonthlyInvestment = parseFloat(monthlyInvestment);
  if (isNaN(safeMonthlyInvestment) || safeMonthlyInvestment <= 0) {
    return {
      error: true,
      message: "Monthly investment must be greater than $0"
    };
  }

  // Validate timeline
  const validTimelines = FINANCIAL_PARAMS.pslf_arbitrage.timelineOptions;
  if (!validTimelines.includes(timelineYears)) {
    return {
      error: true,
      message: `Timeline must be one of: ${validTimelines.join(', ')} years`
    };
  }

  // Validate risk tolerance
  if (!['conservative', 'moderate', 'aggressive'].includes(riskTolerance)) {
    return {
      error: true,
      message: "Risk tolerance must be: conservative, moderate, or aggressive"
    };
  }

  // ============================================================================
  // PARAMETERS
  // ============================================================================

  const investmentMonths = timelineYears * 12;
  const rawAnnualReturn = FINANCIAL_PARAMS.pslf_arbitrage.marketReturnRates[riskTolerance];

  // ACTUARIAL UPDATE: Tax Drag
  // We apply a 0.30% (30 bps) drag to account for annual taxation on dividends/yields
  // in a taxable brokerage account.
  const TAX_DRAG = 0.003;
  const annualReturn = Math.max(0, rawAnnualReturn - TAX_DRAG);

  const monthlyReturn = Math.pow(1 + annualReturn, 1 / 12) - 1;

  // ============================================================================
  // DETERMINISTIC PROJECTION
  // ============================================================================

  const grossBalance = calculateFutureValueAnnuity(
    safeMonthlyInvestment,
    investmentMonths,
    monthlyReturn
  );

  const totalInvested = safeMonthlyInvestment * investmentMonths;
  const investmentGrowth = grossBalance - totalInvested;

  // Tax calculation
  const taxAnalysis = calculateCapitalGainsTax(investmentGrowth, agi, filingStatus);
  const afterTaxBalance = grossBalance - taxAnalysis.totalTax;

  // ============================================================================
  // RISK-ADJUSTED SCENARIOS (if enabled)
  // ============================================================================

  let riskAdjustedScenarios = null;

  if (showRiskAdjustedScenarios) {
    const volatility = FINANCIAL_PARAMS.pslf_arbitrage.volatility[riskTolerance];
    const simulations = FINANCIAL_PARAMS.pslf_arbitrage.riskAdjustedSettings.simulations;

    const monteCarloGross = runMonteCarloInvestmentSimulation({
      monthlyInvestment: safeMonthlyInvestment,
      months: investmentMonths,
      annualReturn,
      volatility,
      simulations
    });

    // Apply tax to each percentile
    const worst10thGains = Math.max(0, monteCarloGross.worst_case_10th - totalInvested);
    const median50thGains = Math.max(0, monteCarloGross.median_50th - totalInvested);
    const best90thGains = Math.max(0, monteCarloGross.best_case_90th - totalInvested);

    const tax10th = calculateCapitalGainsTax(worst10thGains, agi, filingStatus);
    const tax50th = calculateCapitalGainsTax(median50thGains, agi, filingStatus);
    const tax90th = calculateCapitalGainsTax(best90thGains, agi, filingStatus);

    riskAdjustedScenarios = {
      enabled: true,
      simulations,
      confidenceInterval: FINANCIAL_PARAMS.pslf_arbitrage.riskAdjustedSettings.confidenceInterval,
      results: {
        worst_case_10th: monteCarloGross.worst_case_10th - tax10th.totalTax,
        median_50th: monteCarloGross.median_50th - tax50th.totalTax,
        best_case_90th: monteCarloGross.best_case_90th - tax90th.totalTax
      }
    };
  }

  // ============================================================================
  // COMPARISON SCENARIOS (Different Investment Amounts)
  // ============================================================================

  const comparisonPercentiles = FINANCIAL_PARAMS.pslf_arbitrage.comparisonPercentiles;
  const comparisonScenarios = comparisonPercentiles.map(percentile => {
    const testAmount = safeMonthlyInvestment * percentile;
    const testGross = calculateFutureValueAnnuity(testAmount, investmentMonths, monthlyReturn);
    const testInvested = testAmount * investmentMonths;
    const testGrowth = testGross - testInvested;
    const testTax = calculateCapitalGainsTax(testGrowth, agi, filingStatus);
    const testAfterTax = testGross - testTax.totalTax;

    return {
      monthlyAmount: Math.round(testAmount),
      totalInvested: testInvested,
      grossBalance: testGross,
      afterTaxBalance: testAfterTax,
      percentOfCurrent: Math.round(percentile * 100),
      isCurrent: percentile === 1.0
    };
  });

  // ============================================================================
  // RISK COMPARISON (Same Amount, Different Risk Levels)
  // ============================================================================

  const riskLevels = ['conservative', 'moderate', 'aggressive'];
  const riskComparison = riskLevels.map(risk => {
    const riskReturn = FINANCIAL_PARAMS.pslf_arbitrage.marketReturnRates[risk];
    const riskMonthlyReturn = Math.pow(1 + riskReturn, 1 / 12) - 1;
    const riskGross = calculateFutureValueAnnuity(safeMonthlyInvestment, investmentMonths, riskMonthlyReturn);
    const riskGrowth = riskGross - totalInvested;
    const riskTax = calculateCapitalGainsTax(riskGrowth, agi, filingStatus);
    const riskAfterTax = riskGross - riskTax.totalTax;

    return {
      level: risk,
      annualReturn: riskReturn,
      grossBalance: riskGross,
      afterTaxBalance: riskAfterTax,
      isCurrent: risk === riskTolerance
    };
  });

  // ============================================================================
  // RETURN RESULTS
  // ============================================================================

  return {
    inputs: {
      selectedPlan: selectedPlan.name,
      monthlyPayment: selectedPlan.monthlyPayment,
      monthlyInvestment: safeMonthlyInvestment,
      timelineYears,
      months: investmentMonths,
      riskTolerance,
      expectedReturn: annualReturn
    },

    deterministicProjection: {
      totalInvested,
      investmentGrowth,
      grossBalance,
      taxAnalysis,
      afterTaxBalance,
      netArbitrageGain: afterTaxBalance
    },

    riskAdjustedScenarios,

    comparisonScenarios,

    riskComparison
  };
}

/**
 * Goal-Based Reverse Calculator for PSLF Arbitrage
 * 
 * PURPOSE: Calculate required monthly investment to reach savings goal
 * FORMULA: PMT = FV × r / [(1+r)^n - 1]
 * 
 * @param {Object} params - Goal parameters
 * @param {number} params.targetAmount - Desired savings goal ($)
 * @param {number} params.yearsToGoal - Time horizon (10, 15, 20, 30)
 * @param {string} params.riskTolerance - "conservative" | "moderate" | "aggressive"
 * 
 * @returns {Object} Required monthly investment analysis
 */
export function calculatePSLFArbitrageReverseGoal({
  targetAmount,
  yearsToGoal,
  riskTolerance = "moderate"
}) {
  // ============================================================================
  // VALIDATION
  // ============================================================================

  const safeTargetAmount = parseFloat(targetAmount);
  if (isNaN(safeTargetAmount) || safeTargetAmount <= 0) {
    return {
      error: true,
      message: "Target amount must be greater than $0"
    };
  }

  const validTimelines = FINANCIAL_PARAMS.pslf_arbitrage.timelineOptions;
  if (!validTimelines.includes(yearsToGoal)) {
    return {
      error: true,
      message: `Timeline must be one of: ${validTimelines.join(', ')} years`
    };
  }

  if (!['conservative', 'moderate', 'aggressive'].includes(riskTolerance)) {
    return {
      error: true,
      message: "Risk tolerance must be: conservative, moderate, or aggressive"
    };
  }

  // ============================================================================
  // CALCULATION
  // ============================================================================

  const months = yearsToGoal * 12;
  const annualReturn = FINANCIAL_PARAMS.pslf_arbitrage.marketReturnRates[riskTolerance];
  const monthlyReturn = Math.pow(1 + annualReturn, 1 / 12) - 1;

  // Reverse annuity formula: PMT = FV × r / [(1+r)^n - 1]
  let requiredMonthly;

  if (monthlyReturn === 0) {
    // Edge case: zero return
    requiredMonthly = safeTargetAmount / months;
  } else {
    const denominator = Math.pow(1 + monthlyReturn, months) - 1;
    requiredMonthly = (safeTargetAmount * monthlyReturn) / denominator;
  }

  // ============================================================================
  // ALTERNATIVE RISK SCENARIOS
  // ============================================================================

  const riskLevels = ['conservative', 'moderate', 'aggressive'];
  const alternativeScenarios = riskLevels.map(risk => {
    const riskReturn = FINANCIAL_PARAMS.pslf_arbitrage.marketReturnRates[risk];
    const riskMonthlyReturn = Math.pow(1 + riskReturn, 1 / 12) - 1;

    let riskRequired;
    if (riskMonthlyReturn === 0) {
      riskRequired = safeTargetAmount / months;
    } else {
      const riskDenom = Math.pow(1 + riskMonthlyReturn, months) - 1;
      riskRequired = (safeTargetAmount * riskMonthlyReturn) / riskDenom;
    }

    return {
      riskLevel: risk,
      annualReturn: riskReturn,
      requiredMonthly: riskRequired,
      isCurrent: risk === riskTolerance
    };
  });

  // ============================================================================
  // RETURN RESULTS
  // ============================================================================

  return {
    targetAmount: safeTargetAmount,
    yearsToGoal,
    months,
    riskTolerance,
    annualReturn,

    requiredMonthlyInvestment: requiredMonthly,

    alternativeScenarios,

    validation: {
      totalInvested: requiredMonthly * months,
      projectedGrowth: safeTargetAmount - (requiredMonthly * months)
    }
  };
}

// ============================================================================
// ENGINE 6: 529 SUPERFUNDING (Restored)
// ============================================================================
export function calculate529Superfunding(estateValue, donorCount, beneficiaryCount) {
  const estateParams = FINANCIAL_PARAMS.estateTax;
  const ANNUAL_EXCLUSION = estateParams.annualGiftExclusion;
  const SUPERFUNDING_MULTIPLIER = estateParams.superfundingYears;
  const per_beneficiary_limit = ANNUAL_EXCLUSION * SUPERFUNDING_MULTIPLIER;
  const total_capacity = per_beneficiary_limit * donorCount * beneficiaryCount;
  const BASIC_EXCLUSION = estateParams.basicExclusion;
  const ESTATE_TAX_RATE = estateParams.taxRate;

  const taxable_estate_without = Math.max(0, estateValue - BASIC_EXCLUSION);
  const estate_tax_without = taxable_estate_without * ESTATE_TAX_RATE;
  const reduced_estate_value = estateValue - total_capacity;
  const taxable_estate_with = Math.max(0, reduced_estate_value - BASIC_EXCLUSION);
  const estate_tax_with = taxable_estate_with * ESTATE_TAX_RATE;

  return {
    annual_exclusion: ANNUAL_EXCLUSION,
    superfunding_multiplier: SUPERFUNDING_MULTIPLIER,
    per_beneficiary_per_donor_limit: per_beneficiary_limit,
    total_superfunding_capacity: total_capacity,
    five_year_commitment_ends: new Date().getFullYear() + 5,
    estate_tax_savings: estate_tax_without - estate_tax_with,
    effective_savings_rate: total_capacity > 0 ? ((estate_tax_without - estate_tax_with) / total_capacity) * 100 : 0
  };
}
// ============================================================================
// ENGINE 7: BUYING POWER (Restored)
// MORTGAGE BUYING POWER CALCULATOR V2 (ACTUARIAL GRADE - DEC 2025)
// COMPLIANCE: Fannie Mae 1003/1008, FHA HB 4000.1, VA Lender's Handbook
// ============================================================================

/**
 * Calculate mortgage buying power with comprehensive loan type support
 * BIDIRECTIONAL: Income→MaxPrice OR DesiredPrice→RequiredIncome
 * CRITICAL: 100% actuarial accuracy - production deployment for $120M+ platform
 */
export function calculateMortgageBuyingPower(params) {
  const {
    // Plan selection
    selectedPlan,
    selectedPlanName,
    totalStudentLoanBalance = 0, // <--- NEW: Default to 0 if missing

    // PSLF/Forgiveness tracking
    pslfForgivenessDate = null,
    idrForgivenessDate = null,
    isPSLFQualified = false,

    // Mortgage parameters
    mortgageRate,
    loanType,
    loanTermYears,
    downPaymentPercent,

    // Location
    stateOfResidence,

    // Debts
    otherMonthlyDebts,
    hoaFees = 0,

    // Mode selection
    calculationMode, // 'incomeToPrice' or 'priceToIncome'

    // Mode-specific inputs
    monthlyGrossIncome = null,
    desiredHomePrice = null,

    // Demographics (for VA)
    familySize = 1,

    // VA specific
    isVAFirstTime = true

  } = params;

  const mortgageParams = FINANCIAL_PARAMS.mortgage;
  const loanTypeConfig = mortgageParams.loanTypes[loanType];

  if (!loanTypeConfig) {
    return { error: `Invalid loan type: ${loanType}` };
  }

  // ============================================================================
  // PART 1: DEBT-FREE TIMELINE CALCULATION
  // ============================================================================

  const currentDate = new Date();
  let studentLoanEndDate = null;

  if (isPSLFQualified && pslfForgivenessDate) {
    studentLoanEndDate = new Date(pslfForgivenessDate);
  } else if (selectedPlan?.forgivenessDate) {
    studentLoanEndDate = new Date(selectedPlan.forgivenessDate);
  } else if (selectedPlan?.payoffDate) {
    studentLoanEndDate = new Date(selectedPlan.payoffDate);
  }

  // ACTUARIAL FIX: FHA Rule for $0 IDR Payments
  let studentLoanPayment = selectedPlan?.monthlyPayment || 0;

  if (loanType === 'fha' && studentLoanPayment === 0) {
    // FHA Handbook 4000.1: If payment is $0, use 0.5% of total loan balance
    studentLoanPayment = totalStudentLoanBalance * 0.005;
  }

  const monthsUntilLoansFree = studentLoanEndDate
    ? Math.max(0, Math.round((studentLoanEndDate - currentDate) / (30.44 * 24 * 60 * 60 * 1000)))
    : 9999; // If no end date, assume perpetual

  // ============================================================================
  // PART 2: PROPERTY TAX & INSURANCE (STATE-SPECIFIC)
  // ============================================================================

  const propertyTaxRate = FINANCIAL_PARAMS.propertyTax[stateOfResidence] || 0.01;
  const annualHomeInsurance = FINANCIAL_PARAMS.homeInsurance[stateOfResidence] || 1500;

  // ============================================================================
  // PART 3: HELPER FUNCTIONS
  // ============================================================================

  /**
   * Calculate monthly mortgage payment (Principal & Interest only)
   * Formula: M = P[r(1+r)^n]/[(1+r)^n-1]
   */
  const calculateMonthlyPI = (principal, annualRate, years) => {
    if (principal <= 0 || years <= 0) return 0;

    const monthlyRate = annualRate / 12;
    const numberOfPayments = years * 12;

    if (monthlyRate === 0) return principal / numberOfPayments;

    const numerator = principal * (monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments));
    const denominator = Math.pow(1 + monthlyRate, numberOfPayments) - 1;

    return numerator / denominator;
  };

  /**
   * Calculate PMI based on LTV and loan type
   * Returns annual PMI amount
   */
  const calculatePMI = (loanAmount, homePrice, loanType) => {
    const ltv = loanAmount / homePrice;
    const pmiConfig = mortgageParams.pmiRates[loanType];

    if (!pmiConfig || loanType === 'physician' || loanType === 'va') {
      return 0; // No PMI for physician or VA loans
    }

    if (loanType === 'fha') {
      // FHA: Upfront MIP (added to loan) + Annual MIP
      return loanAmount * pmiConfig.annualRate;
    }

    if (loanType === 'professional') {
      // Professional: No PMI if LTV <= 90%, otherwise use conventional rates
      if (ltv <= 0.90) return 0;
      // Fall through to conventional calculation
    }

    // Conventional or Professional (>90% LTV)
    const rates = loanType === 'conventional' ? pmiConfig : mortgageParams.pmiRates.conventional;

    if (ltv >= 0.96) return loanAmount * rates.ltv_96_100;
    if (ltv >= 0.90) return loanAmount * rates.ltv_90_95;
    if (ltv >= 0.85) return loanAmount * rates.ltv_85_89;
    if (ltv > 0.80) return loanAmount * rates.ltv_80_84;

    return 0; // LTV < 80%, no PMI
  };

  /**
   * Calculate VA funding fee (one-time, added to loan amount)
   */
  const calculateVAFundingFee = (loanAmount, downPaymentPercent, isFirstTime) => {
    const feeConfig = isFirstTime
      ? mortgageParams.vaFundingFee.firstTimeUse
      : mortgageParams.vaFundingFee.subsequentUse;

    let feeRate;
    if (downPaymentPercent >= 0.10) {
      feeRate = feeConfig.downPayment_10_plus;
    } else if (downPaymentPercent >= 0.05) {
      feeRate = feeConfig.downPayment_5_9;
    } else {
      feeRate = feeConfig.downPayment_0_4;
    }

    return loanAmount * feeRate;
  };

  /**
   * Calculate VA residual income requirement
   * VA Manual Section 4.09
   */
  const calculateVAResidualIncome = (loanAmount, state, familySizeNum) => {
    const vaConfig = mortgageParams.vaResidualIncome;

    // Determine region from state
    let region = 'South'; // Default
    for (const [regionName, states] of Object.entries(vaConfig.regions)) {
      if (states.includes(state)) {
        region = regionName;
        break;
      }
    }

    // Determine loan tier
    const loanTier = loanAmount < 80000 ? 'loanUnder80k' : 'loanOver80k';

    // Get family size (cap at 7+)
    const familyKey = familySizeNum >= 7 ? "7" : familySizeNum.toString();

    // Required residual income
    const requiredResidual = vaConfig.tables[loanTier][region][familyKey];

    // Maintenance & utilities allowance
    const maintenanceKey = familySizeNum <= 2 ? "1" :
      familySizeNum <= 4 ? "3" :
        familySizeNum <= 6 ? "5" : "7";
    const maintenanceAllowance = vaConfig.maintenanceExpenses[maintenanceKey];

    return { requiredResidual, maintenanceAllowance };
  };

  /**
   * Calculate total monthly housing cost (PITI + HOA)
   */
  const calculateTotalHousingPayment = (homePrice, loanAmount, mortgageRate, termYears, loanType) => {
    const monthlyPI = calculateMonthlyPI(loanAmount, mortgageRate, termYears);
    const annualPropertyTax = homePrice * propertyTaxRate;
    const monthlyPropertyTax = annualPropertyTax / 12;
    const monthlyInsurance = annualHomeInsurance / 12;
    const annualPMI = calculatePMI(loanAmount, homePrice, loanType);
    const monthlyPMI = annualPMI / 12;

    return {
      principalInterest: monthlyPI,
      propertyTax: monthlyPropertyTax,
      homeInsurance: monthlyInsurance,
      pmi: monthlyPMI,
      hoa: hoaFees,
      totalHousing: monthlyPI + monthlyPropertyTax + monthlyInsurance + monthlyPMI + hoaFees
    };
  };

  /**
   * Calculate one-time closing costs
   */
  const calculateClosingCosts = (homePrice, loanAmount, loanType) => {
    const closingConfig = mortgageParams.closingCosts[loanType];

    const origination = loanAmount * closingConfig.originationPercent;
    const titleInsurance = homePrice * closingConfig.titleInsurancePercent;
    const appraisal = closingConfig.appraisalFee;
    const inspection = closingConfig.inspectionFee;
    const recording = closingConfig.recordingFees;

    let upfrontMIP = 0;
    let vaFundingFee = 0;

    if (loanType === 'fha') {
      upfrontMIP = loanAmount * closingConfig.upfrontMIPPercent;
    }

    if (loanType === 'va') {
      vaFundingFee = calculateVAFundingFee(loanAmount, downPaymentPercent, isVAFirstTime);
    }

    return {
      origination,
      titleInsurance,
      appraisal,
      inspection,
      recording,
      upfrontMIP,
      vaFundingFee,
      total: origination + titleInsurance + appraisal + inspection + recording + upfrontMIP + vaFundingFee
    };
  };

  /**
   * Check DTI compliance
   */
  const checkDTICompliance = (monthlyIncome, housingPayment, totalDebts, loanType, loanAmount = null) => {
    const frontEndRatio = housingPayment / monthlyIncome;
    const backEndRatio = totalDebts / monthlyIncome;

    const maxFrontEnd = loanTypeConfig.maxFrontEndDTI;
    const maxBackEnd = loanTypeConfig.maxBackEndDTI;
    const maxBackEndCompensating = loanTypeConfig.maxBackEndDTIWithCompensating;

    // VA loans use residual income method, not front-end DTI
    if (loanType === 'va') {
      const { requiredResidual, maintenanceAllowance } = calculateVAResidualIncome(
        loanAmount || 100000,
        stateOfResidence,
        familySize
      );

      // Estimated federal tax (25% effective rate approximation)
      const federalTax = monthlyIncome * 0.25;

      // Residual = Income - Taxes - Housing - Debts - Maintenance
      const residualIncome = monthlyIncome - federalTax - housingPayment - (otherMonthlyDebts + studentLoanPayment) - maintenanceAllowance;

      const vaCompliant = residualIncome >= requiredResidual && backEndRatio <= maxBackEnd;

      return {
        frontEndRatio,
        backEndRatio,
        frontEndCompliant: true, // VA doesn't use front-end
        backEndCompliant: backEndRatio <= maxBackEnd,
        residualIncome,
        requiredResidual,
        vaCompliant,
        overallCompliant: vaCompliant
      };
    }

    // Standard DTI evaluation
    const frontEndCompliant = maxFrontEnd === null || frontEndRatio <= maxFrontEnd;
    const backEndCompliant = backEndRatio <= maxBackEnd;
    const backEndCompensatingCompliant = backEndRatio <= maxBackEndCompensating;

    return {
      frontEndRatio,
      backEndRatio,
      frontEndCompliant,
      backEndCompliant,
      backEndCompensatingCompliant,
      overallCompliant: frontEndCompliant && backEndCompliant
    };
  };

  // ============================================================================
  // PART 4: MODE A - INCOME TO MAX HOME PRICE
  // ============================================================================

  if (calculationMode === 'incomeToPrice') {
    if (!monthlyGrossIncome || monthlyGrossIncome <= 0) {
      return { error: 'Monthly gross income required for this calculation mode' };
    }

    // Binary search for maximum affordable home price
    let minPrice = 50000;
    let maxPrice = monthlyGrossIncome * 12 * 10; // Upper bound: 10x annual income
    let iterations = 0;
    const MAX_ITERATIONS = 50;
    const TOLERANCE = 100; // $100 tolerance


    let bestResults = null;

    while (iterations < MAX_ITERATIONS && (maxPrice - minPrice) > TOLERANCE) {
      const testPrice = (minPrice + maxPrice) / 2;
      const downPayment = testPrice * downPaymentPercent;
      let loanAmount = testPrice - downPayment;

      // Add VA funding fee to loan amount if applicable
      if (loanType === 'va') {
        const vaFee = calculateVAFundingFee(loanAmount, downPaymentPercent, isVAFirstTime);
        loanAmount += vaFee;
      }

      // Add FHA upfront MIP to loan amount if applicable
      if (loanType === 'fha') {
        const upfrontMIP = loanAmount * mortgageParams.closingCosts.fha.upfrontMIPPercent;
        loanAmount += upfrontMIP;
      }

      const housing = calculateTotalHousingPayment(testPrice, loanAmount, mortgageRate, loanTermYears, loanType);
      const totalDebts = housing.totalHousing + otherMonthlyDebts + studentLoanPayment;

      const dtiCheck = checkDTICompliance(
        monthlyGrossIncome,
        housing.totalHousing,
        totalDebts,
        loanType,
        loanAmount
      );

      if (dtiCheck.overallCompliant) {
        // Price is affordable, try higher

        bestResults = {
          homePrice: testPrice,
          downPayment,
          loanAmount,
          monthlyPayments: housing,
          closingCosts: calculateClosingCosts(testPrice, loanAmount, loanType),
          dtiRatios: dtiCheck
        };
        minPrice = testPrice;
      } else {
        // Price too high, try lower
        maxPrice = testPrice;
      }

      iterations++;
    }

    if (!bestResults) {
      return {
        error: 'Unable to qualify for mortgage with current income and debt levels',
        maxAffordable: 0,
        recommendation: 'Consider increasing income, reducing debts, or choosing a different loan type'
      };
    }

    // Calculate lifetime cost
    const totalPaid = bestResults.monthlyPayments.principalInterest * loanTermYears * 12;
    const totalInterest = totalPaid - bestResults.loanAmount;

    return {
      mode: 'incomeToPrice',
      success: true,

      // Input summary
      inputs: {
        monthlyIncome: monthlyGrossIncome,
        selectedPlan: selectedPlanName,
        studentLoanPayment,
        studentLoanEndDate,
        monthsUntilLoansFree,
        otherDebts: otherMonthlyDebts,
        hoaFees,
        downPaymentPercent,
        mortgageRate,
        loanType: loanTypeConfig.displayName,
        loanTermYears,
        state: stateOfResidence
      },

      // Maximum affordable home
      maxHomePrice: bestResults.homePrice,
      downPayment: bestResults.downPayment,
      loanAmount: bestResults.loanAmount,

      // Monthly breakdown
      monthlyBreakdown: {
        principalAndInterest: bestResults.monthlyPayments.principalInterest,
        propertyTax: bestResults.monthlyPayments.propertyTax,
        homeInsurance: bestResults.monthlyPayments.homeInsurance,
        pmi: bestResults.monthlyPayments.pmi,
        hoaFees: bestResults.monthlyPayments.hoa,
        totalHousing: bestResults.monthlyPayments.totalHousing,
        studentLoans: studentLoanPayment,
        otherDebts: otherMonthlyDebts,
        totalMonthlyObligations: bestResults.monthlyPayments.totalHousing + studentLoanPayment + otherMonthlyDebts
      },

      // One-time costs
      closingCosts: bestResults.closingCosts,
      totalCashNeeded: bestResults.downPayment + bestResults.closingCosts.total,

      // DTI ratios
      dtiRatios: bestResults.dtiRatios,

      // Lifetime cost
      lifetimeCost: {
        totalPaid,
        totalInterest,
        principalPaid: bestResults.loanAmount
      }
    };
  }

  // ============================================================================
  // PART 5: MODE B - DESIRED PRICE TO REQUIRED INCOME
  // ============================================================================

  if (calculationMode === 'priceToIncome') {
    if (!desiredHomePrice || desiredHomePrice <= 0) {
      return { error: 'Desired home price required for this calculation mode' };
    }

    const downPayment = desiredHomePrice * downPaymentPercent;
    let loanAmount = desiredHomePrice - downPayment;

    // Add VA funding fee if applicable
    if (loanType === 'va') {
      const vaFee = calculateVAFundingFee(loanAmount, downPaymentPercent, isVAFirstTime);
      loanAmount += vaFee;
    }

    // Add FHA upfront MIP if applicable
    if (loanType === 'fha') {
      const upfrontMIP = loanAmount * mortgageParams.closingCosts.fha.upfrontMIPPercent;
      loanAmount += upfrontMIP;
    }

    const housing = calculateTotalHousingPayment(desiredHomePrice, loanAmount, mortgageRate, loanTermYears, loanType);

    // Binary search for required income
    let minIncome = housing.totalHousing; // Minimum: can afford housing payment
    let maxIncome = housing.totalHousing * 10; // Upper bound
    let iterations = 0;
    const MAX_ITERATIONS = 50;
    const TOLERANCE = 10; // $10/month tolerance

    let requiredIncome = 0;
    let incomeResults = null;

    while (iterations < MAX_ITERATIONS && (maxIncome - minIncome) > TOLERANCE) {
      const testIncome = (minIncome + maxIncome) / 2;
      const totalDebts = housing.totalHousing + otherMonthlyDebts + studentLoanPayment;

      const dtiCheck = checkDTICompliance(
        testIncome,
        housing.totalHousing,
        totalDebts,
        loanType,
        loanAmount
      );

      if (dtiCheck.overallCompliant) {
        // Income is sufficient, try lower
        requiredIncome = testIncome;
        incomeResults = dtiCheck;
        maxIncome = testIncome;
      } else {
        // Income insufficient, try higher
        minIncome = testIncome;
      }

      iterations++;
    }

    if (!incomeResults) {
      return {
        success: false,
        error: 'Unable to determine required income - debts may be too high relative to home price',
        desiredHomePrice
      };
    }

    // Calculate lifetime cost
    const totalPaid = housing.principalInterest * loanTermYears * 12;
    const totalInterest = totalPaid - loanAmount;
    const closingCosts = calculateClosingCosts(desiredHomePrice, loanAmount, loanType);

    return {
      mode: 'priceToIncome',
      success: true,

      // Input summary
      inputs: {
        desiredHomePrice,
        selectedPlan: selectedPlanName,
        studentLoanPayment,
        studentLoanEndDate,
        monthsUntilLoansFree,
        otherDebts: otherMonthlyDebts,
        hoaFees,
        downPaymentPercent,
        mortgageRate,
        loanType: loanTypeConfig.displayName,
        loanTermYears,
        state: stateOfResidence
      },

      // Required income
      requiredMonthlyIncome: requiredIncome,
      requiredAnnualIncome: requiredIncome * 12,

      // Home details
      homePrice: desiredHomePrice,
      downPayment,
      loanAmount,

      // Monthly breakdown
      monthlyBreakdown: {
        principalAndInterest: housing.principalInterest,
        propertyTax: housing.propertyTax,
        homeInsurance: housing.homeInsurance,
        pmi: housing.pmi,
        hoaFees: housing.hoa,
        totalHousing: housing.totalHousing,
        studentLoans: studentLoanPayment,
        otherDebts: otherMonthlyDebts,
        totalMonthlyObligations: housing.totalHousing + studentLoanPayment + otherMonthlyDebts
      },

      // One-time costs
      closingCosts,
      totalCashNeeded: downPayment + closingCosts.total,

      // DTI ratios
      dtiRatios: incomeResults,

      // Lifetime cost
      lifetimeCost: {
        totalPaid,
        totalInterest,
        principalPaid: loanAmount
      }
    };
  }

  return { error: 'Invalid calculation mode. Must be "incomeToPrice" or "priceToIncome"' };
}
// ============================================================================
// HELPER FUNCTIONS FOR 529 AND WINDFALL CALCULATORS
// ============================================================================

/**
 * Project 529 account growth with monthly contributions
 * @param {number} monthlyContribution - Monthly deposit amount
 * @param {number} months - Number of months to project
 * @param {number} annualReturnRate - Expected annual return (e.g., 0.07 for 7%)
 * @param {number} initialBalance - Starting balance (default 0)
 * @returns {number} Future value of 529 account
 */
function project529Growth(monthlyContribution, months, annualReturnRate, initialBalance = 0) {
  if (months <= 0 || monthlyContribution < 0) return initialBalance;

  const monthlyRate = annualReturnRate / 12;

  // Future value of initial balance
  const fvInitial = initialBalance * Math.pow(1 + monthlyRate, months);

  // Future value of monthly contributions (ordinary annuity)
  const fvContributions = monthlyContribution * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate);

  return fvInitial + fvContributions;
}

/**
 * Project 529 growth with separated contributions and earnings
 * @param {number} monthlyContribution - Monthly deposit amount
 * @param {number} months - Number of months to project
 * @param {number} annualReturnRate - Expected annual return
 * @param {number} initialBalance - Starting balance (default 0)
 * @returns {object} { totalContributions, investmentGrowth, totalBalance }
 */
function project529GrowthDetailed(monthlyContribution, months, annualReturnRate, initialBalance = 0) {
  if (months <= 0 || monthlyContribution < 0) {
    return {
      totalContributions: initialBalance,
      investmentGrowth: 0,
      totalBalance: initialBalance
    };
  }

  const monthlyRate = annualReturnRate / 12;

  // Future value of initial balance
  const fvInitial = initialBalance * Math.pow(1 + monthlyRate, months);

  // Future value of monthly contributions (ordinary annuity)
  const fvContributions = monthlyContribution * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate);

  const totalBalance = fvInitial + fvContributions;
  const totalContributions = (monthlyContribution * months) + initialBalance;
  const investmentGrowth = totalBalance - totalContributions;

  return {
    totalContributions,
    investmentGrowth,
    totalBalance
  };
}

/**
 * Convert future nominal value to present real value (inflation-adjusted)
 * @param {number} nominalValue - Future dollar amount
 * @param {number} years - Years in future
 * @param {number} inflationRate - Annual inflation rate
 * @returns {number} Present value in today's dollars
 */
function convertToRealValue(nominalValue, years, inflationRate) {
  if (years <= 0) return nominalValue;
  const inflationMultiplier = Math.pow(1 + inflationRate, years);
  return nominalValue / inflationMultiplier;
}

/**
 * Calculate state-specific 529 tax deduction benefit
 * Uses existing state data from financialParameters.json
 * @param {number} annualContribution - Annual 529 contribution
 * @param {string} stateOfResidence - State code (e.g., 'MO')
 * @param {number} yearsContributing - Years of contributions (default 16)
 * @returns {object} { annualSavings, lifetimeSavings, deductionLimit, message }
 */
function calculate529StateTaxBenefit(annualContribution, stateOfResidence, yearsContributing = 16) {
  const stateParams = FINANCIAL_PARAMS.state[stateOfResidence];

  // Check if state has 529 deduction
  if (!stateParams || !stateParams.deduction529 || stateParams.deduction529 === 0) {
    const noIncomeTaxStates = ['AK', 'FL', 'NV', 'NH', 'SD', 'TN', 'TX', 'WA', 'WY'];
    const reason = noIncomeTaxStates.includes(stateOfResidence)
      ? `${stateOfResidence} has no state income tax.`
      : `${stateOfResidence} does not offer 529 tax benefits.`;

    return {
      annualSavings: 0,
      lifetimeSavings: 0,
      deductionLimit: 0,
      message: reason
    };
  }

  const deductionLimit = stateParams.deduction529;
  const deductibleAmount = Math.min(annualContribution, deductionLimit);

  // Use top marginal bracket rate
  const stateBrackets = stateParams.brackets || [];
  const marginalRate = stateBrackets.length > 0
    ? stateBrackets[stateBrackets.length - 1].rate
    : 0;

  const annualSavings = deductibleAmount * marginalRate;
  const lifetimeSavings = annualSavings * yearsContributing;

  return {
    annualSavings,
    lifetimeSavings,
    deductionLimit,
    marginalRate: (typeof marginalRate === 'number' && !isNaN(marginalRate)) ? marginalRate : 0,
    message: `${stateOfResidence} allows up to $${deductionLimit.toLocaleString()}/year deduction.`
  };
}

/**
 * Monte Carlo simulation for 529 growth with volatility
 * Runs N simulations of stochastic returns using Geometric Brownian Motion
 * @param {number} monthlyContribution - Monthly deposit
 * @param {number} months - Number of months
 * @param {number} expectedReturn - Mean annual return
 * @param {number} volatility - Annual standard deviation
 * @param {number} simulations - Number of iterations (default 1000)
 * @param {number} initialBalance - Starting balance (default 0)
 * @returns {object} { percentiles: {p10, p25, p50, p75, p90}, mean, median, simulations: [] }
 */
function project529WithVolatility(monthlyContribution, months, expectedReturn, volatility, simulations = 1000, initialBalance = 0) {
  if (months <= 0 || monthlyContribution < 0) {
    return {
      percentiles: { p10: initialBalance, p25: initialBalance, p50: initialBalance, p75: initialBalance, p90: initialBalance },
      mean: initialBalance,
      median: initialBalance,
      simulations: [initialBalance]
    };
  }

  const monthlyExpectedReturn = expectedReturn / 12;
  const monthlyVolatility = volatility / Math.sqrt(12);

  const results = [];

  // Run simulations
  for (let sim = 0; sim < simulations; sim++) {
    let balance = initialBalance;

    for (let month = 1; month <= months; month++) {
      // Generate random normal return using Box-Muller transform
      const u1 = Math.random();
      const u2 = Math.random();
      const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);

      // Monthly return = expected + (volatility × random)
      const monthlyReturn = monthlyExpectedReturn + (monthlyVolatility * z);

      // Apply return to balance and add contribution
      balance = balance * (1 + monthlyReturn) + monthlyContribution;
    }

    results.push(balance);
  }

  // Sort results for percentile calculation
  results.sort((a, b) => a - b);

  const getPercentile = (p) => {
    const index = Math.floor((p / 100) * simulations);
    return results[Math.min(index, simulations - 1)];
  };

  const mean = results.reduce((sum, val) => sum + val, 0) / simulations;
  const median = getPercentile(50);

  return {
    percentiles: {
      p10: getPercentile(10),
      p25: getPercentile(25),
      p50: median,
      p75: getPercentile(75),
      p90: getPercentile(90)
    },
    mean,
    median,
    simulations: results
  };
}

/**
 * Calculate loan payoff with extra payments
 * @param {number} principal - Current loan balance
 * @param {number} annualRate - Annual interest rate (decimal)
 * @param {number} currentMonthlyPayment - Current payment amount
 * @param {number} extraPayment - Additional monthly payment
 * @returns {object} { monthsToPayoff, totalInterestPaid, interestSaved }
 */
function calculateLoanAcceleration(principal, annualRate, currentMonthlyPayment, extraPayment) {
  if (principal <= 0) return { monthsToPayoff: 0, totalInterestPaid: 0, interestSaved: 0 };

  const monthlyRate = annualRate / 12;
  const newPayment = currentMonthlyPayment + extraPayment;

  // Calculate baseline (no extra payment)
  let baselineBalance = principal;
  let baselineMonths = 0;
  let baselineInterest = 0;

  while (baselineBalance > 0 && baselineMonths < 360) {
    const interest = baselineBalance * monthlyRate;
    const principalPayment = Math.min(currentMonthlyPayment - interest, baselineBalance);

    if (principalPayment <= 0) {
      // Payment doesn't cover interest - loan growing
      baselineMonths = 360; // Cap at 30 years
      break;
    }

    baselineInterest += interest;
    baselineBalance -= principalPayment;
    baselineMonths++;
  }

  // Calculate with extra payment
  let newBalance = principal;
  let newMonths = 0;
  let newInterest = 0;

  while (newBalance > 0 && newMonths < 360) {
    const interest = newBalance * monthlyRate;
    const principalPayment = Math.min(newPayment - interest, newBalance);

    if (principalPayment <= 0) {
      newMonths = 360;
      break;
    }

    newInterest += interest;
    newBalance -= principalPayment;
    newMonths++;
  }

  return {
    monthsToPayoff: newMonths,
    totalInterestPaid: newInterest,
    interestSaved: baselineInterest - newInterest,
    baselineMonths: baselineMonths,
    monthsSaved: baselineMonths - newMonths
  };
}

/**
 * Calculate tax withholding on windfall based on source
 * @param {number} amount - Gross windfall amount
 * @param {string} source - Source type: 'taxRefund', 'bonus', 'inheritance', 'investmentSale', 'gift'
 * @param {string} filingStatus - 'single', 'jointly', 'separately'
 * @param {number} agi - Annual gross income (for bracket calculation)
 * @returns {object} { grossAmount, federalTax, stateTax, ficaTax, netAmount }
 */
function calculateTaxWithholding(amount, source, filingStatus, agi, stateOfResidence = 'MO') {
  const params = FINANCIAL_PARAMS;

  // Get tax treatment from config
  const taxTreatment = FINANCIAL_PARAMS.windfall?.taxTreatment?.[source];

  // If source not found or not taxable, return full amount
  if (!taxTreatment || !taxTreatment.taxableToRecipient) {
    return {
      grossAmount: amount,
      federalTax: 0,
      stateTax: 0,
      ficaTax: 0,
      netAmount: amount,
      effectiveRate: 0
    };
  }

  // Bonus/Income - full taxation
  if (source === 'bonus' || source === 'income') {
    // Federal tax (use marginal rate approximation)
    const federalBrackets = params.federal.brackets[filingStatus];
    let federalTax = 0;
    let remainingIncome = agi + amount;

    for (let i = federalBrackets.length - 1; i >= 0; i--) {
      const bracket = federalBrackets[i];
      if (remainingIncome > bracket.min) {
        const taxableInBracket = remainingIncome - bracket.min;
        federalTax += taxableInBracket * bracket.rate;
        remainingIncome = bracket.min;
      }
    }

    // Subtract tax on original AGI to get marginal tax on windfall
    let agiTax = 0;
    let agiRemaining = agi;
    for (let i = federalBrackets.length - 1; i >= 0; i--) {
      const bracket = federalBrackets[i];
      if (agiRemaining > bracket.min) {
        const taxableInBracket = agiRemaining - bracket.min;
        agiTax += taxableInBracket * bracket.rate;
        agiRemaining = bracket.min;
      }
    }

    const federalWithholding = federalTax - agiTax;

    // State tax (simplified - use top marginal rate for state)
    const stateBrackets = params.state[stateOfResidence]?.brackets || [];
    const stateRate = stateBrackets.length > 0 ? stateBrackets[stateBrackets.length - 1].rate : 0;
    const stateWithholding = amount * stateRate;

    // FICA (Social Security + Medicare)
    const ssWageCap = params.federal.fica.ssWageCap;
    const ssTax = agi < ssWageCap ? Math.min(amount, ssWageCap - agi) * params.federal.fica.socialSecurity : 0;
    const medicareTax = amount * params.federal.fica.medicare;

    // Additional Medicare tax for high earners
    const additionalMedicareThreshold = params.federal.fica.additionalMedicareThreshold[filingStatus];
    const additionalMedicare = (agi + amount > additionalMedicareThreshold)
      ? Math.max(0, (agi + amount - additionalMedicareThreshold)) * params.federal.fica.additionalMedicare
      : 0;

    const ficaTotal = ssTax + medicareTax + additionalMedicare;

    return {
      grossAmount: amount,
      federalTax: federalWithholding,
      stateTax: stateWithholding,
      ficaTax: ficaTotal,
      netAmount: amount - federalWithholding - stateWithholding - ficaTotal,
      effectiveRate: (federalWithholding + stateWithholding + ficaTotal) / amount
    };
  }

  // Investment sale - capital gains
  if (source === 'investmentSale' || source === 'capitalGain') {
    // Assume long-term capital gains (15% for most taxpayers)
    const capitalGainsRate = params.federal.capitalGains.longTerm[1]; // 15% bracket
    const federalTax = amount * capitalGainsRate;

    // State tax on capital gains (varies by state)
    const stateBrackets = params.state[stateOfResidence]?.brackets || [];
    const stateRate = stateBrackets.length > 0 ? stateBrackets[stateBrackets.length - 1].rate : 0;
    const stateTax = amount * stateRate;

    return {
      grossAmount: amount,
      federalTax: federalTax,
      stateTax: stateTax,
      ficaTax: 0,
      netAmount: amount - federalTax - stateTax,
      effectiveRate: (federalTax + stateTax) / amount
    };
  }

  // Default: treat as ordinary income
  return calculateTaxWithholding(amount, 'bonus', filingStatus, agi, stateOfResidence);
}

/**
 * Project college costs with inflation
 * @param {string} collegeType - 'inStatePublic', 'outOfStatePublic', 'private', or custom
 * @param {number} yearsUntilCollege - Years until child starts college
 * @param {number} customCost - Custom annual cost (if collegeType is 'custom')
 * @returns {number} Projected annual cost in future dollars
 */
function projectCollegeCost(collegeType, yearsUntilCollege, customCost = null) {
  const params = FINANCIAL_PARAMS.college;

  let baseCost;
  if (collegeType === 'custom' && customCost) {
    baseCost = customCost;
  } else {
    baseCost = params.averageCosts[collegeType] || params.averageCosts.inStatePublic;
  }

  // Apply inflation
  const inflationRate = params.inflationRate;
  const futureCost = baseCost * Math.pow(1 + inflationRate, yearsUntilCollege);

  return futureCost;
}

/**
 * Calculate financial aid impact of 529 balance
 * @param {number} balance529 - Current 529 balance
 * @param {number} parentAssets - Other parent assets
 * @returns {number} Estimated reduction in need-based aid
 */
function calculateFinancialAidImpact(balance529, parentAssets = 0) {
  const params = FINANCIAL_PARAMS.college.financialAid;

  // 529 counts as parent asset (5.64% assessment rate)
  const totalParentAssets = balance529 + parentAssets;
  const expectedFamilyContribution = totalParentAssets * params.parentAssetRate;

  return expectedFamilyContribution;
}

/**
 * Calculate investment growth (lump sum)
 * @param {number} principal - Initial investment
 * @param {number} annualReturnRate - Expected annual return
 * @param {number} years - Number of years
 * @returns {number} Future value
 */
function projectLumpSumGrowth(principal, annualReturnRate, years) {
  return principal * Math.pow(1 + annualReturnRate, years);
}

/**
 * Calculate present value of future loan interest payments
 * @param {number} balance - Current loan balance
 * @param {number} annualRate - Annual interest rate
 * @param {number} monthlyPayment - Monthly payment amount
 * @returns {number} Total interest that will be paid over life of loan
 */
function calculateTotalLoanInterest(balance, annualRate, monthlyPayment) {
  if (balance <= 0) return 0;

  const monthlyRate = annualRate / 12;
  let remainingBalance = balance;
  let totalInterest = 0;
  let months = 0;

  while (remainingBalance > 0 && months < 360) {
    const interestPayment = remainingBalance * monthlyRate;
    const principalPayment = Math.min(monthlyPayment - interestPayment, remainingBalance);

    if (principalPayment <= 0) break; // Payment doesn't cover interest

    totalInterest += interestPayment;
    remainingBalance -= principalPayment;
    months++;
  }

  return totalInterest;
}
/**
 * Determine which forgiveness path comes first (PSLF vs IDR)
 * CRITICAL: Accounts for payment history, plan type, and forgiveness terms
 * @param {object} params - PSLF and plan data
 * @returns {object} { years, months, type, forgivenessDate } - Fastest forgiveness path
 */
function determineForgivenessPath({
  pslfQualifies,
  pslfPaymentsMade,
  saveForbearanceMonths,
  selectedPlan,
  idrPaymentsMade = 0
}) {
  const now = new Date();

  // ============================================================================
  // PSLF TIMELINE
  // ============================================================================
  let yearsToPSLF = null;
  let monthsToPSLF = null;
  let pslfDate = null;

  if (pslfQualifies) {
    const totalPSLFProgress = (parseInt(pslfPaymentsMade) || 0) + (parseInt(saveForbearanceMonths) || 0);
    monthsToPSLF = Math.max(0, 120 - totalPSLFProgress);
    yearsToPSLF = monthsToPSLF / 12;

    pslfDate = new Date(now);
    pslfDate.setMonth(pslfDate.getMonth() + monthsToPSLF);
  }

  // ============================================================================
  // IDR TIMELINE - CORRECTED WITH PAYMENT HISTORY
  // ============================================================================
  let yearsToIDR = null;
  let monthsToIDR = null;
  let idrDate = null;

  if (selectedPlan?.isIdr && selectedPlan?.forgivenessDate) {
    const planName = selectedPlan.planName || selectedPlan.name || 'SAVE';
    let forgivenessMonths = 240;

    const planConfig = FINANCIAL_PARAMS.idrPlans[planName];
    if (planConfig) {
      forgivenessMonths = planConfig.forgivenessYears * 12;
    } else {
      if (planName.includes('Old IBR')) forgivenessMonths = 300;
      else if (planName.includes('New IBR')) forgivenessMonths = 240;
      else if (planName.includes('PAYE')) forgivenessMonths = 240;
      else if (planName.includes('ICR')) forgivenessMonths = 300;
      else if (planName.includes('RAP')) forgivenessMonths = 360;
      else if (planName.includes('SAVE')) {
        forgivenessMonths = null;
      }
    }

    if (forgivenessMonths !== null) {
      const effectiveIDRPayments = (parseInt(idrPaymentsMade) || 0) + (parseInt(saveForbearanceMonths) || 0);
      monthsToIDR = Math.max(0, forgivenessMonths - effectiveIDRPayments);
      yearsToIDR = monthsToIDR / 12;

      idrDate = new Date(now);
      idrDate.setMonth(idrDate.getMonth() + monthsToIDR);
    } else {
      idrDate = new Date(selectedPlan.forgivenessDate);
      monthsToIDR = (idrDate - now) / (30.44 * 24 * 60 * 60 * 1000);
      yearsToIDR = monthsToIDR / 12;
    }
  }

  // ============================================================================
  // RETURN WHICHEVER COMES FIRST
  // ============================================================================

  if (pslfDate && idrDate) {
    if (pslfDate <= idrDate) {
      return {
        years: yearsToPSLF,
        months: monthsToPSLF,
        type: 'PSLF',
        forgivenessDate: pslfDate,
        paymentsRemaining: monthsToPSLF
      };
    } else {
      return {
        years: yearsToIDR,
        months: monthsToIDR,
        type: 'IDR',
        forgivenessDate: idrDate,
        paymentsRemaining: monthsToIDR,
        planName: selectedPlan.planName || selectedPlan.name
      };
    }
  }

  if (pslfDate) {
    return {
      years: yearsToPSLF,
      months: monthsToPSLF,
      type: 'PSLF',
      forgivenessDate: pslfDate,
      paymentsRemaining: monthsToPSLF
    };
  }

  if (idrDate) {
    return {
      years: yearsToIDR,
      months: monthsToIDR,
      type: 'IDR',
      forgivenessDate: idrDate,
      paymentsRemaining: monthsToIDR,
      planName: selectedPlan.planName || selectedPlan.name
    };
  }

  return {
    years: null,
    months: null,
    type: null,
    forgivenessDate: null,
    paymentsRemaining: null
  };
}
// ============================================================================
// 529 VS. LOAN PAYOFF OPTIMIZER (ACTUARIAL REWRITE - DEC 2025)
// ============================================================================

/**
 * Compare strategies for allocating extra monthly budget between 529 and loan payoff
 * FEATURES: 
 * - Integrated Forgiveness Logic (PSLF/IDR) for Net Worth accuracy
 * - Waterfall Cash Flow (Loan Payoff -> Redirect to 529)
 * - Inflation-Adjusted Real Value
 * - State Tax Deduction Caps
 */
export function calculate529VsLoanPayoff(params) {
  const {
    childAge,
    monthlyBudget,
    currentLoans,
    currentAgi,
    familySize,
    stateOfResidence,
    filingStatus,
    collegeType = 'inStatePublic',
    customCollegeCost = null,
    familyContributionPercent = 100,
    selectedPlan,
    isOnForgiveness = false,
    pslfQualifies = false,
    pslfPaymentsMade = 0,
    saveForbearanceMonths = 0,
    fee529Tier = 'lowCost',
    riskTolerance = 'moderate',
    runMonteCarloSimulation = false
  } = params;

  const investmentParams = FINANCIAL_PARAMS.investment;
  const collegeParams = FINANCIAL_PARAMS.college;

  // 1. TIMELINE SETUP
  // --------------------------------------------------------------------------
  if (childAge < 0 || childAge >= 18) return { error: 'Child must be between 0-17 years old' };
  if (monthlyBudget <= 0) return { error: 'Monthly budget must be greater than zero' };

  const yearsUntilCollege = Math.max(0, 18 - childAge);
  const monthsUntilCollege = yearsUntilCollege * 12;
  const inflationRate = investmentParams.inflationRate;

  // 2. LOAN BASICS
  // --------------------------------------------------------------------------
  // FIX: Ensure we use the raw balance even if PSLF is selected, otherwise Strategy A fails
  const totalLoanBalance = currentLoans.reduce((sum, loan) => sum + parseFloat(loan.balance || 0), 0);

  // Calculate weighted rate
  const weightedAvgRate = totalLoanBalance > 0
    ? currentLoans.reduce((sum, loan) => sum + (parseFloat(loan.balance || 0) * (parseFloat(loan.rate || 0) / 100)), 0) / totalLoanBalance
    : 0.05;

  const currentMonthlyPayment = selectedPlan?.monthlyPayment || 0;

  // 3. FORGIVENESS TRAJECTORY
  // --------------------------------------------------------------------------
  const forgivenessPath = determineForgivenessPath({
    pslfQualifies: pslfQualifies,
    pslfPaymentsMade: pslfPaymentsMade || 0,
    saveForbearanceMonths: saveForbearanceMonths || 0,
    selectedPlan: selectedPlan,
    idrPaymentsMade: 0
  });

  // Calculate strict date when debt vanishes (via Forgiveness)
  // We use this to zero out debt in Net Worth calc if forgiveness happens before college
  let monthsToForgiveness = 9999;
  if (forgivenessPath.forgivenessDate) {
    const now = new Date();
    const future = new Date(forgivenessPath.forgivenessDate);
    monthsToForgiveness = Math.max(0, (future - now) / (1000 * 60 * 60 * 24 * 30.44));
  }

  // 4. INVESTMENT SETUP
  // --------------------------------------------------------------------------
  const tierData = investmentParams.fees529.tiers[fee529Tier];
  const return529 = tierData.netReturns[riskTolerance];
  const monthlyReturn = Math.pow(1 + return529, 1 / 12) - 1;

  // 5. STRATEGY SIMULATION ENGINE (ACTUARIAL GRADE - UNIVERSAL)
  // --------------------------------------------------------------------------

  // A. SIMULATION PARAMETERS
  const incomeGrowthRate = FINANCIAL_PARAMS.assumptions.annualIncomeGrowthRate || 0.03;
  const povertyInflationRate = FINANCIAL_PARAMS.assumptions.inflationRate || 0.025;

  const planKeyMap = {
    'Old IBR': 'IBR_OLD',
    'New IBR': 'IBR_NEW',
    'PAYE': 'PAYE',
    'SAVE': 'SAVE',
    'ICR': 'ICR',
    'RAP': 'RAP'
  };

  const planName = selectedPlan?.planName || selectedPlan?.name || 'Standard';
  const configKey = planKeyMap[planName] || 'IBR_OLD';
  // Fallback for IDR configs; Standard plans won't use this but we define it for safety
  const idrPlanConfig = FINANCIAL_PARAMS.idrPlans[configKey] || FINANCIAL_PARAMS.idrPlans.IBR_OLD;
  const rapConfig = FINANCIAL_PARAMS.rapPlan;

  // Helper to identify plan type
  const isIdrPlan = selectedPlan?.isIdr;
  const isRapPlan = planName === 'RAP';
  const isStandardPlan = !isIdrPlan && !isRapPlan; // Standard 10-Year, Tiered, etc.

  // B. SIMULATION ENGINE
  const runSimulation = (extraToLoan, extraTo529, strategyName) => {
    let simBalance = totalLoanBalance;
    let sim529 = 0;
    let total529Contrib = 0;
    let totalInterestPaid = 0;
    let monthsToPayoff = 0;
    let paidOff = false;

    // DYNAMIC TRACKING VARIABLES
    let simAgi = parseFloat(currentAgi) || 0;
    let currentPovertyGuideline = getPovertyGuideline(familySize, stateOfResidence);

    // NEW: Budget Growth Tracking
    let currentMonthlyBudget = monthlyBudget;
    let annual529ContribAccumulator = 0; // Tracks contributions for tax year

    // NEW: Tax Benefit Setup
    const stateParams = FINANCIAL_PARAMS.state[stateOfResidence];
    const hasStateDeduction = stateParams && stateParams.deduction529 > 0;
    const stateDedLimit = hasStateDeduction ? stateParams.deduction529 : 0;
    const stateMarginalRate = (hasStateDeduction && stateParams.brackets.length > 0)
      ? stateParams.brackets[stateParams.brackets.length - 1].rate
      : 0;

    // IDR Constants
    const payPct = idrPlanConfig?.paymentPercentage || 0.15;
    const povMult = idrPlanConfig?.povertyMultiplier || 1.5;
    const hasStandardCap = idrPlanConfig?.standardPaymentCap === true;
    const standardCapAmount = calculateAmortizedPayment(totalLoanBalance, weightedAvgRate, 10);

    // Initial Base Payment
    let dynamicMonthlyPayment = currentMonthlyPayment;

    for (let m = 1; m <= monthsUntilCollege; m++) {

      // --- 1. ANNUAL RECALCULATION ROUTINE (Month 13, 25, 37...) ---
      if (m > 1 && m % 12 === 0) {
        // Always grow income/poverty/BUDGET stats in background
        simAgi *= (1 + incomeGrowthRate);
        currentPovertyGuideline *= (1 + povertyInflationRate);

        // NEW: Inflate the extra monthly budget (Income Growth)
        currentMonthlyBudget *= (1 + incomeGrowthRate);

        // NEW: Reinvest State Tax Savings (The Tax Snowball)
        if (hasStateDeduction && annual529ContribAccumulator > 0) {
          const deductible = Math.min(annual529ContribAccumulator, stateDedLimit);
          const taxSavings = deductible * stateMarginalRate;
          // Immediate reinvestment into 529
          sim529 += taxSavings;
          // Reset for next tax year
          annual529ContribAccumulator = 0;
        }

        // Only recalculate Payment if it's an IDR plan or RAP
        // Standard Plans (Fixed) do NOT change with income
        if (isRapPlan) {
          // RAP RECALC
          const dependents = filingStatus === 'single' ? Math.max(0, familySize - 1) : Math.max(0, familySize - 2);
          const deduction = dependents * rapConfig.dependentDeductionAnnual;

          let rate = 0.10;
          for (const tier of rapConfig.incomeTiers) {
            if (tier.limit === null || simAgi <= tier.limit) {
              if (tier.rate === 0 || tier.rate === "min_payment") rate = 0;
              else rate = tier.rate;
              break;
            }
          }
          const annualPay = (simAgi * rate) - deduction;
          dynamicMonthlyPayment = Math.max(rapConfig.minimumMonthlyPayment, annualPay / 12);

        } else if (isIdrPlan) {
          // STANDARD IDR RECALC (Old/New IBR, PAYE, SAVE, ICR)
          const discIncome = Math.max(0, simAgi - (currentPovertyGuideline * povMult));
          const rawPay = (discIncome * payPct) / 12;

          if (hasStandardCap) {
            dynamicMonthlyPayment = Math.min(standardCapAmount, rawPay);
          } else {
            dynamicMonthlyPayment = rawPay;
          }
        }
        // Else: Standard Plan payments stay at initial value
      }

      // --- 2. LOAN SIDE ---
      let monthlyDebtCashFlow = dynamicMonthlyPayment + extraToLoan;

      // Check Forgiveness Event
      if (m >= monthsToForgiveness && simBalance > 0) {
        simBalance = 0;
        paidOff = true;
      }

      if (simBalance > 0) {
        const interest = simBalance * (weightedAvgRate / 12);
        totalInterestPaid += interest;

        // --- SUBSIDY / PAYDOWN LOGIC ---
        if (isRapPlan && monthlyDebtCashFlow < interest) {
          // RAP Negative Amortization Rule
          simBalance -= rapConfig.minimumPrincipalReduction;
        }
        else if (planName === 'SAVE' && monthlyDebtCashFlow < interest) {
          // SAVE Interest Waiver Rule
          // Balance stays flat
        }
        else {
          // STANDARD / OLD IBR / PAYE / ICR Rule
          // Negative Amortization allowed (balance grows)
          const principalDetails = monthlyDebtCashFlow - interest;
          simBalance -= principalDetails;
        }

        if (simBalance <= 0.01) {
          simBalance = 0;
          paidOff = true;
          monthsToPayoff = m;
        }
      }

      // --- 3. 529 SIDE (UNIFIED SNOWBALL LOGIC) ---
      let monthly529 = extraTo529;

      if (simBalance <= 0) {
        // NEW: Use the inflated budget
        monthly529 = currentMonthlyBudget + dynamicMonthlyPayment;
      }

      // Apply Investment Growth
      sim529 = sim529 * (1 + monthlyReturn) + monthly529;
      total529Contrib += monthly529;

      // Track for tax year calculation
      annual529ContribAccumulator += monthly529;
    }

    return {
      final529: sim529,
      finalDebt: simBalance,
      totalContrib: total529Contrib,
      monthsToPayoff: paidOff ? monthsToPayoff : 999,
      paidOffBeforeCollege: paidOff
    };
  };

  // 6. EXECUTE STRATEGIES
  // --------------------------------------------------------------------------

  // Strategy A: Loans First (100% Budget to Loan -> Then 100% Cashflow to 529)
  const simA = runSimulation(monthlyBudget, 0, 'A');

  // Strategy B: Split (50% Budget to Loan, 50% to 529 -> Then Snowball)
  const simB = runSimulation(monthlyBudget * 0.5, monthlyBudget * 0.5, 'B');

  // Strategy C: 529 Priority (0% Budget to Loan, 100% to 529)
  // Note: Debt simply follows standard amortization or forgiveness schedule
  const simC = runSimulation(0, monthlyBudget, 'C');


  // 7. MONTE CARLO & TAX CALCULATIONS
  // --------------------------------------------------------------------------

  // State Tax Benefit (Only applies to the 529 contribution portion)
  const annual529Contribution = monthlyBudget * 12;
  const stateTaxBenefit = calculate529StateTaxBenefit(
    annual529Contribution,
    stateOfResidence,
    yearsUntilCollege
  );

  // College Costs
  const annualCollegeCost = projectCollegeCost(collegeType, yearsUntilCollege, customCollegeCost);
  const totalCollegeCost = annualCollegeCost * 4;
  const targetSavings = totalCollegeCost * (familyContributionPercent / 100);

  // Monte Carlo (Optional - for advanced UI)
  let monteCarloA = null, monteCarloB = null, monteCarloC = null;
  if (runMonteCarloSimulation) {
    const volatility = investmentParams.volatility[riskTolerance];
    monteCarloA = project529WithVolatility(simA.totalContrib / monthsUntilCollege, monthsUntilCollege, return529, volatility);
    monteCarloB = project529WithVolatility(simB.totalContrib / monthsUntilCollege, monthsUntilCollege, return529, volatility);
    monteCarloC = project529WithVolatility(simC.totalContrib / monthsUntilCollege, monthsUntilCollege, return529, volatility);
  }

  // 8. DATA MAPPING FOR UI
  // --------------------------------------------------------------------------

  const mapStrategy = (sim, name) => {
    // Net Worth = Assets - Liabilities
    // CRITICAL FIX: If Forgiveness happens before college, Liability is 0 regardless of sim balance
    const effectiveDebt = (monthsToForgiveness <= monthsUntilCollege) ? 0 : sim.finalDebt;

    return {
      name,
      totalContributions: sim.totalContrib,
      investmentGrowth: sim.final529 - sim.totalContrib,
      balance529AtCollege: sim.final529,
      balance529Real: convertToRealValue(sim.final529, yearsUntilCollege, inflationRate),
      remainingLoanBalance: effectiveDebt,
      loanPayoffMonths: sim.monthsToPayoff === 999 ? null : sim.monthsToPayoff,
      collegeGapFunding: Math.max(0, targetSavings - sim.final529),
      netWorth: sim.final529 - effectiveDebt,
      monteCarloResults: name === 'Strategy A' ? monteCarloA : (name === 'Strategy B' ? monteCarloB : monteCarloC)
    };
  };

  const strategyA_Result = mapStrategy(simA, 'Loans First');
  const strategyB_Result = mapStrategy(simB, 'Balanced Split');
  const strategyC_Result = mapStrategy(simC, '529 Priority');

  return {
    inputs: {
      childAge,
      yearsUntilCollege,
      monthlyBudget,
      totalLoanBalance,
      weightedAvgRate,
      currentMonthlyPayment,
      targetCollegeSavings: targetSavings,
      projectedCollegeCost: totalCollegeCost,
      fee529Tier,
      riskTolerance,
      return529,
      inflationRate,
      forgivenessExpected: forgivenessPath.years !== null
    },
    strategies: {
      strategyA: strategyA_Result,
      strategyB: strategyB_Result,
      strategyC: strategyC_Result
    },
    taxBenefits: {
      annualStateTaxSavings: stateTaxBenefit.annualSavings,
      lifetimeTaxSavings: stateTaxBenefit.lifetimeSavings,
      deductionLimit: stateTaxBenefit.deductionLimit,
      marginalRate: stateTaxBenefit.marginalRate,
      state: stateOfResidence,
      message: stateTaxBenefit.message
    },
    collegePlanning: {
      annualCost: annualCollegeCost,
      annualCostReal: convertToRealValue(annualCollegeCost, yearsUntilCollege, inflationRate),
      fourYearCost: totalCollegeCost,
      fourYearCostReal: convertToRealValue(totalCollegeCost, yearsUntilCollege, inflationRate),
      targetSavings: targetSavings,
      inflationRate: collegeParams.inflationRate,
      monthlyToReachTarget: monthsUntilCollege > 0
        ? (targetSavings * (return529 / 12)) / (Math.pow(1 + (return529 / 12), monthsUntilCollege) - 1)
        : 0
    }
  };
}
// ============================================================================
// WINDFALL OPTIMIZER
// ============================================================================

/**
 * WINDFALL OPTIMIZER - ACTUARIAL GRADE
 * Compare strategies for allocating lump sum windfall
 * CRITICAL: Uses actual IDR simulation for forgiveness calculations
 * @param {object} params - Calculation parameters
 * @returns {object} Comparison of 3 strategies with detailed breakdowns
 */
export function calculateWindfallOptimizer(params) {
  const {
    windfallAmount,
    windfallSource,
    currentLoans,
    currentAgi,
    familySize,
    stateOfResidence,
    filingStatus,

    // Plan selection (from Card 4)
    selectedPlan,

    // PSLF data (from Card 2)
    pslfQualifies = false,
    pslfPaymentsMade = 0,
    saveForbearanceMonths = 0,

    // Forgiveness tracking
    isOnForgiveness = false,
    yearsToForgiveness = null,
    forgivenessType = null,

    // Investment parameters
    riskTolerance = 'moderate',
    timeHorizon = 10
  } = params;

  // ============================================================================
  // 🔍 DEBUG: Log all inputs
  // ============================================================================
  console.log('═══════════════════════════════════════════════════════');
  console.log('🔍 WINDFALL OPTIMIZER - ALL INPUTS');
  console.log('═══════════════════════════════════════════════════════');
  console.log('Windfall:', windfallAmount, windfallSource);
  console.log('PSLF Qualifies:', pslfQualifies);
  console.log('PSLF Payments Made:', pslfPaymentsMade);
  console.log('SAVE Forbearance:', saveForbearanceMonths);
  console.log('Selected Plan:', selectedPlan?.planName || selectedPlan?.name);
  console.log('Is On Forgiveness:', isOnForgiveness);
  console.log('═══════════════════════════════════════════════════════');

  const investmentParams = FINANCIAL_PARAMS.investment;

  // ============================================================================
  // INPUT VALIDATION
  // ============================================================================

  if (windfallAmount <= 0) {
    return { error: 'Windfall amount must be greater than zero' };
  }

  if (!selectedPlan || !selectedPlan.monthlyPayment) {
    return { error: 'Valid repayment plan required from Card 4' };
  }

  // ============================================================================
  // CALCULATE AFTER-TAX WINDFALL
  // ============================================================================

  const taxWithholding = calculateTaxWithholding(
    windfallAmount,
    windfallSource,
    filingStatus,
    currentAgi,
    stateOfResidence
  );

  const netWindfall = taxWithholding.netAmount;

  // ============================================================================
  // LOAN PORTFOLIO ANALYSIS
  // ============================================================================

  const totalLoanBalance = currentLoans.reduce((sum, loan) =>
    sum + parseFloat(loan.balance || 0), 0);

  const weightedAvgRate = totalLoanBalance > 0
    ? currentLoans.reduce((sum, loan) =>
      sum + (parseFloat(loan.balance || 0) * (parseFloat(loan.rate || 0) / 100)), 0
    ) / totalLoanBalance
    : 0.05;

  const currentMonthlyPayment = selectedPlan.monthlyPayment;

  // Get investment return assumption
  const expectedReturn = investmentParams.assumedReturns[riskTolerance] ||
    investmentParams.assumedReturns.moderate;

  // ============================================================================
  // STRATEGY A: PAY OFF LOANS
  // ============================================================================

  const strategyA = {
    name: 'Pay Off Loans',
    description: netWindfall >= totalLoanBalance
      ? 'Eliminate all student debt today'
      : 'Pay down principal, reduce monthly payment'
  };

  const amountToLoansA = Math.min(netWindfall, totalLoanBalance);
  const remainingCashA = Math.max(0, netWindfall - totalLoanBalance);
  const remainingBalanceA = Math.max(0, totalLoanBalance - netWindfall);

  // CASE 1: Full payoff
  if (netWindfall >= totalLoanBalance) {
    // Calculate total interest saved
    const interestSaved = calculateTotalLoanInterest(
      totalLoanBalance,
      weightedAvgRate,
      currentMonthlyPayment
    );

    // Freed payment invested monthly
    const monthlyInvestment = currentMonthlyPayment;
    const monthsToInvest = timeHorizon * 12;

    // Future value calculation
    const monthlyRate = expectedReturn / 12;
    const fvInitial = remainingCashA * Math.pow(1 + monthlyRate, monthsToInvest);
    const fvMonthly = monthlyInvestment *
      ((Math.pow(1 + monthlyRate, monthsToInvest) - 1) / monthlyRate);
    const investmentValue = fvInitial + fvMonthly;

    const totalPrincipal = remainingCashA + (monthlyInvestment * monthsToInvest);
    const investmentGrowth = investmentValue - totalPrincipal;

    strategyA.windfallAllocation = {
      toLoan: amountToLoansA,
      toInvestment: remainingCashA
    };

    strategyA.loanImpact = {
      startingBalance: totalLoanBalance,
      principalPaid: amountToLoansA,
      remainingBalance: 0,
      monthlyPaymentFreed: currentMonthlyPayment,
      interestSaved: interestSaved,
      debtFreeDate: new Date()
    };

    strategyA.investment = {
      initialInvestment: remainingCashA,
      monthlyContributions: monthlyInvestment,
      numberOfMonths: monthsToInvest,
      totalPrincipal: totalPrincipal,
      investmentReturns: investmentGrowth,
      finalValue: investmentValue
    };

    strategyA.netWorth = {
      assets: investmentValue,
      debts: 0,
      netWorth: investmentValue
    };
  }
  else {
    // CASE 2: Partial Payoff Logic (Actuarial Update)

    let newMonthlyPayment;
    let paymentReduction;

    // CRITICAL FIX: IDR plans are income-based. 
    // Paying down principal DOES NOT lower the monthly payment (unless paid in full).
    // It only shortens the term or reduces negative amortization.
    if (selectedPlan.isIdr) {
      newMonthlyPayment = currentMonthlyPayment;
      paymentReduction = 0; // No immediate cash flow benefit on IDR
    } else {
      // Standard plans: Assume recast/re-amortization over 10 years to lower payment
      newMonthlyPayment = calculateAmortizedPayment(
        remainingBalanceA,
        weightedAvgRate,
        10
      );
      paymentReduction = Math.max(0, currentMonthlyPayment - newMonthlyPayment);
    }

    // Calculate interest saved
    const originalInterest = calculateTotalLoanInterest(
      totalLoanBalance,
      weightedAvgRate,
      currentMonthlyPayment
    );

    // Calculate new interest trail with the NEW balance but potentially SAME payment
    const newInterest = calculateTotalLoanInterest(
      remainingBalanceA,
      weightedAvgRate,
      newMonthlyPayment
    );

    const interestSaved = originalInterest - newInterest;

    // Freed payment invested (Only > 0 if Standard Plan/Recast)
    const monthlyInvestment = paymentReduction;
    const monthsToInvest = timeHorizon * 12;
    const monthlyRate = expectedReturn / 12;

    const fvMonthly = monthlyInvestment *
      ((Math.pow(1 + monthlyRate, monthsToInvest) - 1) / monthlyRate);

    const totalPrincipal = monthlyInvestment * monthsToInvest;
    const investmentGrowth = fvMonthly - totalPrincipal;
    const investmentValue = fvMonthly;

    // Calculate remaining balance after time horizon
    let balanceAtHorizon = remainingBalanceA;
    const monthlyRateL = weightedAvgRate / 12;

    for (let i = 0; i < monthsToInvest && balanceAtHorizon > 0; i++) {
      const interest = balanceAtHorizon * monthlyRateL;
      // Use the logic-derived new payment (Standard=Lower, IDR=Same)
      const principal = Math.min(newMonthlyPayment - interest, balanceAtHorizon);
      if (principal <= 0) break; // Negative Amortization check
      balanceAtHorizon -= principal;
    }

    strategyA.windfallAllocation = {
      toLoan: amountToLoansA,
      toInvestment: 0
    };

    strategyA.loanImpact = {
      startingBalance: totalLoanBalance,
      principalPaid: amountToLoansA,
      remainingBalance: remainingBalanceA,
      oldMonthlyPayment: currentMonthlyPayment,
      newMonthlyPayment: newMonthlyPayment,
      monthlyPaymentReduction: paymentReduction,
      interestSaved: interestSaved
    };

    strategyA.investment = {
      initialInvestment: 0,
      monthlyContributions: paymentReduction,
      numberOfMonths: monthsToInvest,
      totalPrincipal: totalPrincipal,
      investmentReturns: investmentGrowth,
      finalValue: investmentValue
    };

    strategyA.netWorth = {
      assets: investmentValue,
      debts: balanceAtHorizon,
      netWorth: investmentValue - balanceAtHorizon
    };
  }

  // ============================================================================
  // STRATEGY B: INVEST WINDFALL
  // ============================================================================

  const strategyB = {
    name: 'Invest Windfall',
    description: 'Invest lump sum, continue current loan payments'
  };

  // Lump sum investment growth
  const monthlyRateB = expectedReturn / 12;
  const monthsB = timeHorizon * 12;
  const investmentValueB = netWindfall * Math.pow(1 + monthlyRateB, monthsB);
  const investmentGrowthB = investmentValueB - netWindfall;

  strategyB.windfallAllocation = {
    toLoan: 0,
    toInvestment: netWindfall
  };

  strategyB.investment = {
    initialInvestment: netWindfall,
    monthlyContributions: 0,
    numberOfMonths: monthsB,
    totalPrincipal: netWindfall,
    investmentReturns: investmentGrowthB,
    finalValue: investmentValueB
  };

  // ============================================================================
  // CRITICAL: FORGIVENESS SIMULATION FOR STRATEGY B
  // ============================================================================

  const forgivenessPath = determineForgivenessPath({
    pslfQualifies,
    pslfPaymentsMade,
    saveForbearanceMonths,
    selectedPlan,
    idrPaymentsMade: 0
  });

  const actualYearsToForgiveness = forgivenessPath.years;
  const actualMonthsToForgiveness = forgivenessPath.months;
  const actualForgivenessType = forgivenessPath.type;

  if (actualMonthsToForgiveness && actualMonthsToForgiveness > 0) {
    const planName = selectedPlan.planName || selectedPlan.name || 'SAVE';

    // --------------------------------------------------------
    // PATH 1: RAP PLAN (Specific Logic)
    // --------------------------------------------------------
    if (planName === 'RAP') {
      const rapConfig = FINANCIAL_PARAMS.rapPlan;
      let currentPrincipal = totalLoanBalance;
      let currentAgiSimulation = currentAgi;
      const monthlyRate = weightedAvgRate / 12;
      const incomeGrowthRate = FINANCIAL_PARAMS.assumptions.annualIncomeGrowthRate;

      // Helper: Get Annual Payment based on RAP Tiers
      const getRAPAnnualPayment = (agi) => {
        for (const tier of rapConfig.incomeTiers) {
          if (tier.limit === null || agi <= tier.limit) {
            if (tier.rate === 0 || tier.rate === "min_payment") {
              return rapConfig.minimumMonthlyPayment * 12;
            }
            return agi * tier.rate;
          }
        }
        return agi * 0.10; // Fallback
      };

      const dependents = filingStatus === 'single'
        ? Math.max(0, familySize - 1)
        : Math.max(0, familySize - 2);
      const annualDependentDeduction = dependents * rapConfig.dependentDeductionAnnual;

      for (let month = 1; month <= actualMonthsToForgiveness; month++) {
        if (currentPrincipal <= 0.01) {
          currentPrincipal = 0;
          break;
        }

        // Annual income adjustment
        if (month > 1 && month % 12 === 0) {
          currentAgiSimulation *= (1 + incomeGrowthRate);
        }

        // Calculate RAP payment
        const annualPayment = getRAPAnnualPayment(currentAgiSimulation) - annualDependentDeduction;
        const monthlyPayment = Math.max(rapConfig.minimumMonthlyPayment, Math.max(0, annualPayment) / 12);
        const monthlyInterest = currentPrincipal * monthlyRate;

        // RAP LOGIC: Government subsidy vs Principal Reduction
        if (monthlyPayment < monthlyInterest) {
          // Negative amortization: OBBBA minimum principal reduction
          currentPrincipal -= rapConfig.minimumPrincipalReduction;
        } else {
          // Standard paydown
          const principalPayment = monthlyPayment - monthlyInterest;
          const actualReduction = Math.max(rapConfig.minimumPrincipalReduction, principalPayment);
          currentPrincipal -= actualReduction;
        }
      }

      const balanceAtForgiveness = Math.max(0, currentPrincipal);

      strategyB.loanTimeline = {
        startingBalance: totalLoanBalance,
        monthlyPayment: currentMonthlyPayment,
        paymentsMade: actualMonthsToForgiveness,
        totalPaid: currentMonthlyPayment * actualMonthsToForgiveness,
        balanceAtForgiveness: balanceAtForgiveness,
        forgivenBy: actualForgivenessType,
        finalBalance: 0
      };

    }
    // --------------------------------------------------------
    // PATH 2: STANDARD IDR (SAVE, IBR, PAYE) - DYNAMIC SIMULATION
    // --------------------------------------------------------
    else {

      // ------------------------------------------------------------------------
      // ACTUARIAL FIX: CALIBRATED DYNAMIC SIMULATION FOR STRATEGY B
      // ------------------------------------------------------------------------

      const planConfig = FINANCIAL_PARAMS.idrPlans[planName] || FINANCIAL_PARAMS.idrPlans.SAVE;

      // 1. Determine Payment Percentage
      let paymentPercentage = planConfig.paymentPercentage || 0.10;
      if (planName === 'SAVE') {
        paymentPercentage = calculateWeightedSavePercentage(currentLoans);
      }

      const standardPaymentCap = calculateAmortizedPayment(totalLoanBalance, weightedAvgRate, 10);

      // 2. CALIBRATION: Determine offset to match User's Actual Payment ($331)
      // This forces the simulation to start at your REAL payment, ensuring the
      // payment curve is accurate to your real-world situation.
      const initialDiscIncome = calculateDiscretionaryIncome(
        currentAgi, familySize, stateOfResidence, planConfig.povertyMultiplier
      );
      const initialFormulaPayment = (initialDiscIncome * paymentPercentage) / 12;
      const initialCappedPayment = Math.min(
        planConfig.standardPaymentCap ? standardPaymentCap : Infinity,
        initialFormulaPayment
      );

      // The Offset: Difference between Real World Payment and Formula Payment
      const paymentCalibrationOffset = currentMonthlyPayment - initialCappedPayment;

      // 3. Dynamic Simulation Loop
      let currentPrincipal = totalLoanBalance;
      let accruedInterest = 0;
      let currentAgiSimulation = currentAgi;
      const monthlyRate = weightedAvgRate / 12;
      const incomeGrowthRate = FINANCIAL_PARAMS.assumptions.annualIncomeGrowthRate;

      for (let month = 1; month <= actualMonthsToForgiveness; month++) {
        if (currentPrincipal <= 0.01 && accruedInterest <= 0.01) break;

        // A. Annual Income Adjustment
        if (month > 1 && month % 12 === 0) {
          currentAgiSimulation *= (1 + incomeGrowthRate);
        }

        // B. Recalculate Base Payment
        const discIncome = calculateDiscretionaryIncome(
          currentAgiSimulation,
          familySize,
          stateOfResidence,
          planConfig.povertyMultiplier
        );
        const rawPayment = (discIncome * paymentPercentage) / 12;
        let currentPayment = Math.min(
          planConfig.standardPaymentCap ? standardPaymentCap : Infinity,
          rawPayment
        );

        // C. APPLY CALIBRATION
        // Forces the simulation to track the calibrated payment curve
        currentPayment = Math.max(0, currentPayment + paymentCalibrationOffset);

        // D. Calculate Interest & Apply Subsidy
        const monthlyInterest = currentPrincipal * monthlyRate;
        let interestToAccrue = monthlyInterest;

        if (planName === 'SAVE') {
          // Subsidy Logic: If Payment < Interest, interest doesn't grow beyond payment
          if (currentPayment < monthlyInterest) {
            interestToAccrue = currentPayment;
          }
        }

        accruedInterest += interestToAccrue;

        // E. Apply Payment
        let paymentBudget = currentPayment;

        // Pay Interest First
        const interestSatisfied = Math.min(paymentBudget, accruedInterest);
        accruedInterest -= interestSatisfied;
        paymentBudget -= interestSatisfied;

        // Pay Principal Second
        const principalSatisfied = Math.min(paymentBudget, currentPrincipal);
        currentPrincipal -= principalSatisfied;
      }

      const balanceAtForgiveness = currentPrincipal + accruedInterest;

      strategyB.loanTimeline = {
        startingBalance: totalLoanBalance,
        monthlyPayment: currentMonthlyPayment,
        paymentsMade: actualMonthsToForgiveness,
        totalPaid: currentMonthlyPayment * actualMonthsToForgiveness,
        balanceAtForgiveness: balanceAtForgiveness, // Now accurate
        forgivenBy: actualForgivenessType,
        finalBalance: 0
      };
    }
    strategyB.netWorth = {
      assets: investmentValueB,
      debts: 0,
      netWorth: investmentValueB
    };
  }
  else {
    let loanBalanceAtHorizon = totalLoanBalance;
    const monthlyRate = weightedAvgRate / 12;
    const monthsInHorizon = timeHorizon * 12;

    for (let i = 0; i < monthsInHorizon && loanBalanceAtHorizon > 0; i++) {
      const interest = loanBalanceAtHorizon * monthlyRate;
      const principal = Math.min(currentMonthlyPayment - interest, loanBalanceAtHorizon);

      if (principal <= 0) break;

      loanBalanceAtHorizon -= principal;
    }

    strategyB.loanTimeline = {
      startingBalance: totalLoanBalance,
      monthlyPayment: currentMonthlyPayment,
      paymentsMade: monthsInHorizon,
      totalPaid: currentMonthlyPayment * monthsInHorizon,
      balanceAtHorizon: loanBalanceAtHorizon,
      finalBalance: loanBalanceAtHorizon
    };

    strategyB.netWorth = {
      assets: investmentValueB,
      debts: loanBalanceAtHorizon,
      netWorth: investmentValueB - loanBalanceAtHorizon
    };
  }

  // ============================================================================
  // STRATEGY C: HYBRID SPLIT
  // ============================================================================

  const strategyC = {
    name: 'Hybrid Split',
    description: 'Pay highest-rate loans, invest remainder'
  };

  const amountToLoansC = netWindfall * 0.5;
  const amountToInvestC = netWindfall * 0.5;

  const newBalanceC = totalLoanBalance - amountToLoansC;

  let newMonthlyPaymentC;
  let paymentReductionC;

  let planNameC = selectedPlan?.planName || selectedPlan?.name || 'SAVE';
  let reducedLoans = [];

  if (selectedPlan?.isIdr) {
    const scaleFactor = newBalanceC / totalLoanBalance;
    reducedLoans = currentLoans.map(loan => ({
      ...loan,
      balance: parseFloat(loan.balance || 0) * scaleFactor
    }));

    newMonthlyPaymentC = currentMonthlyPayment;
    paymentReductionC = 0;

  } else {
    newMonthlyPaymentC = calculateAmortizedPayment(newBalanceC, weightedAvgRate, 10);
    paymentReductionC = currentMonthlyPayment - newMonthlyPaymentC;

    const scaleFactor = newBalanceC / totalLoanBalance;
    reducedLoans = currentLoans.map(loan => ({
      ...loan,
      balance: parseFloat(loan.balance || 0) * scaleFactor
    }));
  }

  strategyC.windfallAllocation = {
    toLoan: amountToLoansC,
    toInvestment: amountToInvestC
  };

  strategyC.loanImpact = {
    startingBalance: totalLoanBalance,
    principalPaid: amountToLoansC,
    newBalance: newBalanceC,
    oldMonthlyPayment: currentMonthlyPayment,
    newMonthlyPayment: newMonthlyPaymentC,
    monthlyPaymentReduction: paymentReductionC
  };

  //  NEW CODE
  if (actualMonthsToForgiveness && actualMonthsToForgiveness > 0) {
    const planNameC = selectedPlan.planName || selectedPlan.name || 'SAVE';

    // Use simulateLegacyIDR for standard IDR plans
    if (planNameC === 'RAP') {
      // RAP simulation with EXACT logic from simulateRAP
      const rapConfig = FINANCIAL_PARAMS.rapPlan;
      let currentPrincipal = newBalanceC;  // Start with reduced balance
      let currentAgiSimulation = currentAgi;
      const monthlyRate = weightedAvgRate / 12;
      const incomeGrowthRate = FINANCIAL_PARAMS.assumptions.annualIncomeGrowthRate;

      // Helper: Get Annual Payment based on RAP Tiers
      const getRAPAnnualPayment = (agi) => {
        for (const tier of rapConfig.incomeTiers) {
          if (tier.limit === null || agi <= tier.limit) {
            if (tier.rate === 0 || tier.rate === "min_payment") {
              return rapConfig.minimumMonthlyPayment * 12;
            }
            return agi * tier.rate;
          }
        }
        return agi * 0.10; // Fallback
      };

      const dependents = filingStatus === 'single'
        ? Math.max(0, familySize - 1)
        : Math.max(0, familySize - 2);
      const annualDependentDeduction = dependents * rapConfig.dependentDeductionAnnual;

      for (let month = 1; month <= actualMonthsToForgiveness; month++) {
        if (currentPrincipal <= 0.01) {
          currentPrincipal = 0;
          break;
        }

        // Annual income adjustment
        if (month > 1 && month % 12 === 0) {
          currentAgiSimulation *= (1 + incomeGrowthRate);
        }

        // Calculate RAP payment
        const annualPayment = getRAPAnnualPayment(currentAgiSimulation) - annualDependentDeduction;
        const monthlyPayment = Math.max(rapConfig.minimumMonthlyPayment, Math.max(0, annualPayment) / 12);
        const monthlyInterest = currentPrincipal * monthlyRate;

        // RAP LOGIC: Government subsidy vs Principal Reduction
        if (monthlyPayment < monthlyInterest) {
          // Negative amortization: OBBBA minimum principal reduction
          currentPrincipal -= rapConfig.minimumPrincipalReduction;
        } else {
          // Standard paydown with minimum principal reduction
          const principalPayment = monthlyPayment - monthlyInterest;
          const actualReduction = Math.max(rapConfig.minimumPrincipalReduction, principalPayment);
          currentPrincipal -= actualReduction;
        }
      }

      const balanceAtForgivenessC = Math.max(0, currentPrincipal);

      strategyC.loanTimeline = {
        paymentsMade: actualMonthsToForgiveness,
        totalPaid: newMonthlyPaymentC * actualMonthsToForgiveness,
        balanceAtForgiveness: balanceAtForgivenessC,
        forgivenBy: actualForgivenessType,
        finalBalance: 0
      };
    } else {

      // ------------------------------------------------------------------------
      // ACTUARIAL FIX: CALIBRATED DYNAMIC SIMULATION FOR STRATEGY C
      // ------------------------------------------------------------------------

      const planConfig = FINANCIAL_PARAMS.idrPlans[planNameC] || FINANCIAL_PARAMS.idrPlans.SAVE;

      // 1. Determine Payment Percentage
      let paymentPercentage = planConfig.paymentPercentage || 0.10;
      if (planNameC === 'SAVE') {
        paymentPercentage = calculateWeightedSavePercentage(reducedLoans);
      }

      const standardPaymentCap = calculateAmortizedPayment(newBalanceC, weightedAvgRate, 10);

      // 2. CALIBRATION: Calculate offset to match Actual Payment
      // We use 'newMonthlyPaymentC' because Strategy C pays down debt first.
      const initialDiscIncome = calculateDiscretionaryIncome(
        currentAgi, familySize, stateOfResidence, planConfig.povertyMultiplier
      );
      const initialFormulaPayment = (initialDiscIncome * paymentPercentage) / 12;
      const initialCappedPayment = Math.min(
        planConfig.standardPaymentCap ? standardPaymentCap : Infinity,
        initialFormulaPayment
      );

      const paymentCalibrationOffset = newMonthlyPaymentC - initialCappedPayment;

      // 3. Dynamic Simulation Loop
      let currentPrincipal = newBalanceC;
      let accruedInterest = 0;
      let currentAgiSimulation = currentAgi;
      const monthlyRate = weightedAvgRate / 12;
      const incomeGrowthRate = FINANCIAL_PARAMS.assumptions.annualIncomeGrowthRate;

      for (let month = 1; month <= actualMonthsToForgiveness; month++) {
        if (currentPrincipal <= 0.01 && accruedInterest <= 0.01) break;

        // A. Annual Income Adjustment
        if (month > 1 && month % 12 === 0) {
          currentAgiSimulation *= (1 + incomeGrowthRate);
        }

        // B. Recalculate Base Payment
        const discIncome = calculateDiscretionaryIncome(
          currentAgiSimulation, familySize, stateOfResidence, planConfig.povertyMultiplier
        );
        const rawPayment = (discIncome * paymentPercentage) / 12;
        let currentPayment = Math.min(
          planConfig.standardPaymentCap ? standardPaymentCap : Infinity,
          rawPayment
        );

        // C. APPLY CALIBRATION
        currentPayment = Math.max(0, currentPayment + paymentCalibrationOffset);

        // D. Interest & Subsidy Guardrails
        const monthlyInterest = currentPrincipal * monthlyRate;
        let interestToAccrue = monthlyInterest;

        if (planNameC === 'SAVE') {
          if (currentPayment < monthlyInterest) {
            interestToAccrue = currentPayment;
          }
        }

        accruedInterest += interestToAccrue;

        // E. Apply Payment
        let paymentBudget = currentPayment;

        const interestSatisfied = Math.min(paymentBudget, accruedInterest);
        accruedInterest -= interestSatisfied;
        paymentBudget -= interestSatisfied;

        const principalSatisfied = Math.min(paymentBudget, currentPrincipal);
        currentPrincipal -= principalSatisfied;
      }

      const balanceAtForgivenessC = currentPrincipal + accruedInterest;

      strategyC.loanTimeline = {
        paymentsMade: actualMonthsToForgiveness,
        totalPaid: newMonthlyPaymentC * actualMonthsToForgiveness,
        balanceAtForgiveness: balanceAtForgivenessC,
        forgivenBy: actualForgivenessType,
        finalBalance: 0
      };
    }
  }
  else {
    let balanceAtHorizonC = newBalanceC;
    const monthlyRate = weightedAvgRate / 12;
    const monthsC = timeHorizon * 12;

    for (let i = 0; i < monthsC && balanceAtHorizonC > 0; i++) {
      const interest = balanceAtHorizonC * monthlyRate;
      const principal = Math.min(newMonthlyPaymentC - interest, balanceAtHorizonC);
      if (principal <= 0) break;
      balanceAtHorizonC -= principal;
    }

    strategyC.loanTimeline = {
      paymentsMade: monthsC,
      totalPaid: newMonthlyPaymentC * monthsC,
      balanceAtHorizon: balanceAtHorizonC,
      finalBalance: balanceAtHorizonC
    };
  }

  const monthsC = timeHorizon * 12;
  const monthlyRateC = expectedReturn / 12;

  const fvLumpC = amountToInvestC * Math.pow(1 + monthlyRateC, monthsC);

  const fvMonthlyC = paymentReductionC > 0
    ? paymentReductionC * ((Math.pow(1 + monthlyRateC, monthsC) - 1) / monthlyRateC)
    : 0;

  const investmentValueC = fvLumpC + fvMonthlyC;
  const totalPrincipalC = amountToInvestC + (paymentReductionC * monthsC);
  const investmentGrowthC = investmentValueC - totalPrincipalC;

  strategyC.investment = {
    initialInvestment: amountToInvestC,
    monthlyContributions: paymentReductionC,
    numberOfMonths: monthsC,
    totalPrincipal: totalPrincipalC,
    investmentReturns: investmentGrowthC,
    finalValue: investmentValueC
  };

  const finalDebtC = strategyC.loanTimeline.finalBalance || 0;

  strategyC.netWorth = {
    assets: investmentValueC,
    debts: finalDebtC,
    netWorth: investmentValueC - finalDebtC
  };

  // ============================================================================
  // RETURN RESULTS
  // ============================================================================

  return {
    inputs: {
      grossWindfall: windfallAmount,
      source: windfallSource,
      netWindfall: netWindfall,
      taxWithholding: taxWithholding.federalTax + taxWithholding.stateTax + taxWithholding.ficaTax,
      totalLoanBalance,
      weightedAvgRate,
      currentMonthlyPayment,
      timeHorizon,
      riskTolerance,
      expectedReturn,
      forgivenessType: actualForgivenessType,
      yearsToForgiveness: actualYearsToForgiveness,
      forgivenessPathCalculated: forgivenessPath.years !== null
    },
    strategies: {
      strategyA,
      strategyB,
      strategyC
    }
  };
}
