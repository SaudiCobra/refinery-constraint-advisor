/**
 * Deterministic Rule Engine
 * 
 * Evaluates system state using explicit conditions.
 * Outputs exactly one system state at any time.
 */

// Rule thresholds
const THRESHOLDS = {
  RATE_OF_RISE_LIMIT: 1.5,           // °C/min
  TEMPERATURE_MARGIN_CRITICAL: 15,    // °C from limit
  TEMPERATURE_MARGIN_WARNING: 30,     // °C from limit
  MODERATE_RATE_OF_RISE: 0.8,        // °C/min
  TIME_WINDOW_ALIGNMENT: 300,         // seconds (5 min)
};

/**
 * Derives H₂ Availability state from equipment status
 */
export const deriveH2Availability = (equipment, coolingCapacity, slope) => {
  const { h2Compressor } = equipment;
  
  if (!h2Compressor) return "Unavailable";
  
  if (coolingCapacity === "CONSTRAINED" && slope > 1.5) return "Restricted";
  
  if (coolingCapacity === "REDUCED" || coolingCapacity === "CONSTRAINED") return "Limited";
  
  if (slope > 1.0 && coolingCapacity === "NORMAL") return "Limited";
  
  return "Full";
};

/**
 * Calculates margin to nearest critical limit
 */
const getTemperatureMargin = (currentTemp, limits) => {
  const { hi, hihi, trip } = limits;
  
  const margins = [];
  if (hi) margins.push(hi - currentTemp);
  if (hihi) margins.push(hihi - currentTemp);
  if (trip) margins.push(trip - currentTemp);
  
  return Math.min(...margins.filter(m => m > 0));
};

/**
 * Evaluates if moderation is required
 */
const isModerationRequired = (slope, temperatureMargin) => {
  return slope > THRESHOLDS.MODERATE_RATE_OF_RISE && 
         temperatureMargin < THRESHOLDS.TEMPERATURE_MARGIN_WARNING;
};

/**
 * Detects sensor conflict (signals don't align)
 */
const detectSensorConflict = (inputs) => {
  const { slope, sensorQuality, coolingCapacity, timeToNearest } = inputs;
  
  // High slope but long time to constraint = conflict
  if (slope > THRESHOLDS.RATE_OF_RISE_LIMIT && timeToNearest > 1800) {
    return true;
  }
  
  // Poor sensor quality flags conflict
  if (sensorQuality === "poor" || sensorQuality === "degraded") {
    return true;
  }
  
  // Cooling constrained but low slope = potential conflict
  if (coolingCapacity === "CONSTRAINED" && slope < 0.3) {
    return true;
  }
  
  return false;
};

/**
 * Counts how many escalation conditions are active
 */
const countActiveConditions = (conditions) => {
  return Object.values(conditions).filter(Boolean).length;
};

/**
 * Main Rule Engine - Evaluates system state
 * 
 * Returns object with:
 * - state: "NORMAL" | "ESCALATION" | "CRITICAL" | "SENSOR_CONFLICT"
 * - activeConditions: object with boolean flags for each condition
 * - reason: human-readable explanation
 */
export const evaluateSystemState = (inputs) => {
  const {
    currentTemp,
    slope,
    coolingCapacity,
    h2Availability,
    limits,
    timeToNearest,
    sensorQuality = "good",
    equipment,
  } = inputs;
  
  // Calculate derived values
  const temperatureMargin = getTemperatureMargin(currentTemp, limits);
  const moderationRequired = isModerationRequired(slope, temperatureMargin);
  
  // Evaluate individual conditions
  const conditions = {
    highRateWithConstrainedCooling: 
      slope > THRESHOLDS.RATE_OF_RISE_LIMIT && coolingCapacity === "CONSTRAINED",
    
    criticalMarginWithRising: 
      temperatureMargin < THRESHOLDS.TEMPERATURE_MARGIN_CRITICAL && slope > 0,
    
    warningMarginWithRising: 
      temperatureMargin < THRESHOLDS.TEMPERATURE_MARGIN_WARNING && slope > THRESHOLDS.MODERATE_RATE_OF_RISE,
    
    limitedH2WithModerationNeeded: 
      (h2Availability === "Limited" || h2Availability === "Restricted") && moderationRequired,
    
    unavailableH2WithRising:
      h2Availability === "Unavailable" && slope > THRESHOLDS.MODERATE_RATE_OF_RISE,
    
    multipleSystemsCompromised:
      coolingCapacity === "CONSTRAINED" && 
      (h2Availability === "Limited" || h2Availability === "Restricted" || h2Availability === "Unavailable"),
    
    imminentLimit:
      timeToNearest < THRESHOLDS.TIME_WINDOW_ALIGNMENT && slope > 0,
  };
  
  // Check for sensor conflict first
  if (detectSensorConflict(inputs)) {
    return {
      state: "SENSOR_CONFLICT",
      activeConditions: conditions,
      reason: "Signal conflict detected - sensor quality degraded or data inconsistent",
      conditionCount: 0,
    };
  }
  
  // Count active conditions
  const conditionCount = countActiveConditions(conditions);
  
  // Classification logic
  
  // CRITICAL: Multiple severe conditions aligned
  if (conditions.criticalMarginWithRising && conditions.highRateWithConstrainedCooling) {
    return {
      state: "CRITICAL",
      activeConditions: conditions,
      reason: "Critical margin with high rate-of-rise and constrained cooling",
      conditionCount,
    };
  }
  
  if (conditions.imminentLimit && conditionCount >= 2) {
    return {
      state: "CRITICAL",
      activeConditions: conditions,
      reason: "Imminent limit with multiple escalation factors",
      conditionCount,
    };
  }
  
  if (conditions.unavailableH2WithRising && coolingCapacity === "CONSTRAINED") {
    return {
      state: "CRITICAL",
      activeConditions: conditions,
      reason: "No hydrogen moderation available and cooling constrained",
      conditionCount,
    };
  }
  
  // ESCALATION: 2+ conditions align (True Escalation)
  if (conditionCount >= 2) {
    return {
      state: "ESCALATION",
      activeConditions: conditions,
      reason: "Multiple escalation conditions align",
      conditionCount,
    };
  }
  
  // ESCALATION: Single critical condition
  if (conditions.highRateWithConstrainedCooling) {
    return {
      state: "ESCALATION",
      activeConditions: conditions,
      reason: "High rate-of-rise with constrained cooling",
      conditionCount,
    };
  }
  
  if (conditions.criticalMarginWithRising) {
    return {
      state: "ESCALATION",
      activeConditions: conditions,
      reason: "Critical temperature margin with positive rate-of-rise",
      conditionCount,
    };
  }
  
  if (conditions.limitedH2WithModerationNeeded) {
    return {
      state: "ESCALATION",
      activeConditions: conditions,
      reason: "Hydrogen availability limited while moderation required",
      conditionCount,
    };
  }
  
  // WARNING: Single non-critical condition
  if (conditionCount === 1) {
    return {
      state: "NORMAL",
      activeConditions: conditions,
      reason: "Single escalation factor present - monitoring",
      conditionCount,
    };
  }
  
  // NORMAL: No conditions met
  return {
    state: "NORMAL",
    activeConditions: conditions,
    reason: "All parameters within normal operating range",
    conditionCount: 0,
  };
};

/**
 * Maps rule engine state to legacy escalation level for backward compatibility
 */
export const mapStateToEscalationLevel = (ruleState) => {
  switch (ruleState) {
    case "CRITICAL":
      return 3;
    case "ESCALATION":
      return 2;
    case "SENSOR_CONFLICT":
      return 1;
    case "NORMAL":
    default:
      return 0;
  }
};