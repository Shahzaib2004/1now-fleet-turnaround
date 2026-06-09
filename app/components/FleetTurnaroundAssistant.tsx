'use client';

import React, { useState, useEffect } from 'react';
import styles from './FleetTurnaroundAssistant.module.css';

// Client-side AI configuration is no longer needed since calls are proxied securely via /api/analyze

interface ActionItem {
  task: string;
  urgency: 'NOW' | 'BEFORE NEXT RENTAL' | 'THIS WEEK';
  estimated_minutes: number | null;
  note?: string;
}

interface MaintenanceAlert {
  alert: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  recommendation: string;
}

interface CleaningItem {
  item: string;
  flag: boolean;
}

interface Analysis {
  verdict: 'GO' | 'HOLD' | 'FLAG';
  verdict_reason: string;
  time_to_ready: string;
  revenue_impact: string;
  action_items: ActionItem[];
  maintenance_alerts: MaintenanceAlert[];
  cleaning_checklist: CleaningItem[];
  operator_note: string;
  timing_note: string;
}

interface FleetEntry {
  vehicleId: string;
  timestamp: string;
  verdict: 'GO' | 'HOLD' | 'FLAG';
  topIssue: string;
  timeToReady: string;
  mileage: number;
}

export default function FleetTurnaroundAssistant() {
  // Form state
  const [formData, setFormData] = useState({
    vehicleNickname: '',
    currentMileage: '',
    lastServiceMileage: '',
    fuelLevel: '',
    nextBooking: '',
    adr: '',
    returnConditionNotes: '',
    previousIssues: '',
  });

  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fleetHistory, setFleetHistory] = useState<FleetEntry[]>([]);
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});

  // Load fleet history on mount
  useEffect(() => {
    const stored = localStorage.getItem('fleet_history');
    if (stored) {
      try {
        setFleetHistory(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to load fleet history:', e);
      }
    }
  }, []);

  // Validate form inputs
  const validateForm = (): boolean => {
    const errors: { [key: string]: string } = {};

    // Vehicle Nickname
    if (!formData.vehicleNickname.trim()) {
      errors.vehicleNickname = 'Vehicle nickname or plate is required';
    } else if (formData.vehicleNickname.trim().length < 2) {
      errors.vehicleNickname = 'Vehicle nickname must be at least 2 characters';
    }

    // Current Mileage
    if (!formData.currentMileage) {
      errors.currentMileage = 'Current mileage is required';
    } else if (isNaN(parseInt(formData.currentMileage))) {
      errors.currentMileage = 'Current mileage must be a valid number';
    } else if (parseInt(formData.currentMileage) < 0) {
      errors.currentMileage = 'Current mileage cannot be negative';
    }

    // Last Service Mileage
    if (!formData.lastServiceMileage) {
      errors.lastServiceMileage = 'Last service mileage is required';
    } else if (isNaN(parseInt(formData.lastServiceMileage))) {
      errors.lastServiceMileage = 'Last service mileage must be a valid number';
    } else if (parseInt(formData.lastServiceMileage) < 0) {
      errors.lastServiceMileage = 'Last service mileage cannot be negative';
    } else if (parseInt(formData.currentMileage) && parseInt(formData.lastServiceMileage)) {
      if (parseInt(formData.currentMileage) < parseInt(formData.lastServiceMileage)) {
        errors.currentMileage = 'Current mileage cannot be less than last service mileage';
      }
    }

    // Fuel Level
    if (!formData.fuelLevel) {
      errors.fuelLevel = 'Fuel level is required';
    }

    // Next Booking
    if (!formData.nextBooking) {
      errors.nextBooking = 'Next booking time window is required';
    }

    // ADR
    if (!formData.adr) {
      errors.adr = 'Average daily rate is required';
    } else if (isNaN(parseFloat(formData.adr))) {
      errors.adr = 'ADR must be a valid number';
    } else if (parseFloat(formData.adr) < 0) {
      errors.adr = 'ADR cannot be negative';
    } else if (parseFloat(formData.adr) > 10000) {
      errors.adr = 'ADR seems unusually high. Please verify';
    }

    // Return Condition Notes
    if (!formData.returnConditionNotes.trim()) {
      errors.returnConditionNotes = 'Return condition notes are required';
    } else if (formData.returnConditionNotes.trim().length < 5) {
      errors.returnConditionNotes = 'Please provide more detailed condition notes (at least 5 characters)';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [id]: value
    }));
    // Clear error for this field when user starts typing
    if (formErrors[id]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[id];
        return newErrors;
      });
    }
  };

  // Calculate mileage difference
  const mileageDiff = formData.currentMileage && formData.lastServiceMileage
    ? parseInt(formData.currentMileage) - parseInt(formData.lastServiceMileage)
    : null;

  // Save to fleet history
  const saveFleetEntry = (vehicleId: string, verdict: string, actionItems: ActionItem[], timeToReady: string, mileage: number) => {
    const topIssue = actionItems && actionItems.length > 0 
      ? actionItems[0].task 
      : 'No issues flagged';

    const entry: FleetEntry = {
      vehicleId,
      timestamp: new Date().toISOString(),
      verdict: verdict as 'GO' | 'HOLD' | 'FLAG',
      topIssue,
      timeToReady,
      mileage
    };

    const updated = [...fleetHistory, entry];
    setFleetHistory(updated);
    localStorage.setItem('fleet_history', JSON.stringify(updated));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Validate form before submission
    if (!validateForm()) {
      setError('Please fix the errors above before submitting');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'API request failed');
      }

      const parsedAnalysis = await response.json();

      setAnalysis(parsedAnalysis);
      saveFleetEntry(formData.vehicleNickname, parsedAnalysis.verdict, parsedAnalysis.action_items, parsedAnalysis.time_to_ready, parseInt(formData.currentMileage));
      setCheckedItems(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Clear history
  const handleClearHistory = () => {
    if (confirm('Are you sure you want to clear all fleet history? This cannot be undone.')) {
      setFleetHistory([]);
      localStorage.removeItem('fleet_history');
    }
  };

  // New vehicle
  const handleNewVehicle = () => {
    setFormData({
      vehicleNickname: '',
      currentMileage: '',
      lastServiceMileage: '',
      fuelLevel: '',
      nextBooking: '',
      adr: '',
      returnConditionNotes: '',
      previousIssues: '',
    });
    setAnalysis(null);
    setError(null);
    setCheckedItems(new Set());
  };

  // WhatsApp summary
  const handleWhatsAppSummary = () => {
    if (!analysis) return;

    const verdictEmoji = analysis.verdict === 'GO' ? '✅' : 
                         analysis.verdict === 'HOLD' ? '⚠️' : '🚫';

    let summary = `${verdictEmoji} ${formData.vehicleNickname} — ${analysis.verdict}\n`;
    summary += `${analysis.verdict_reason}\n\n`;

    const urgentItems = analysis.action_items.filter(item => 
      item.urgency === 'NOW' || item.urgency === 'BEFORE NEXT RENTAL'
    );

    if (urgentItems.length > 0) {
      urgentItems.forEach(item => {
        const timeStr = item.estimated_minutes ? ` (~${item.estimated_minutes}min)` : '';
        summary += `- ${item.task}${timeStr}\n`;
      });
      summary += '\n';
    }

    const alerts = analysis.maintenance_alerts.filter(alert =>
      alert.severity === 'HIGH' || alert.severity === 'MEDIUM'
    );

    if (alerts.length > 0) {
      summary += '🔧 ';
      summary += alerts.map(a => a.alert).join(' | ');
      summary += '\n\n';
    }

    summary += `⏱ Est. ready: ${analysis.time_to_ready}\n`;
    summary += `💸 ${analysis.revenue_impact}\n\n`;
    summary += 'Via Fleet Turnaround Assistant';

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(summary).then(() => {
        const btn = document.getElementById('whatsappBtn');
        if (btn) {
          const originalText = btn.textContent;
          btn.textContent = '✓ Copied!';
          setTimeout(() => {
            btn.textContent = originalText;
          }, 2000);
        }
      }).catch(() => {
        fallbackCopy(summary);
      });
    } else {
      fallbackCopy(summary);
    }
  };

  const fallbackCopy = (text: string) => {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);

    const btn = document.getElementById('whatsappBtn');
    if (btn) {
      const originalText = btn.textContent;
      btn.textContent = '✓ Copied!';
      setTimeout(() => {
        btn.textContent = originalText;
      }, 2000);
    }
  };

  // Timing calculation
  const calculateTiming = () => {
    if (!analysis) return null;

    const timeMapping: { [key: string]: number } = {
      'Under 1 hour': 60,
      '1–2 hours': 90,
      '2–4 hours': 150,
      '4–8 hours': 360,
      '8+ hours': 999,
      'No booking yet': 999
    };

    const availableMinutes = timeMapping[formData.nextBooking] || 999;
    let totalMinutes = 0;

    analysis.action_items.forEach(item => {
      if (item.estimated_minutes) {
        totalMinutes += item.estimated_minutes;
      }
    });

    const ratio = totalMinutes / availableMinutes;

    return {
      totalMinutes,
      availableMinutes,
      ratio,
      tasks: analysis.action_items
    };
  };

  // Fleet health calculations
  const getVehicleStats = () => {
    const vehicleMap: { [key: string]: FleetEntry[] } = {};
    fleetHistory.forEach(entry => {
      if (!vehicleMap[entry.vehicleId]) {
        vehicleMap[entry.vehicleId] = [];
      }
      vehicleMap[entry.vehicleId].push(entry);
    });
    return vehicleMap;
  };

  const getRelativeTime = (timestamp: string) => {
    const lastTime = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - lastTime.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return diffDays === 0 ? 'Just now' : 
           diffDays === 1 ? '1 day ago' : 
           `${diffDays} days ago`;
  };

  const timing = calculateTiming();
  const vehicleStats = getVehicleStats();

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.headerTitle}>Fleet Turnaround Assistant</h1>
          <div className={styles.headerSubtitle}>powered by 1Now</div>
        </div>
      </div>

      {/* Main Container */}
      <div className={styles.mainContainer}>
        {/* Left Panel: Form */}
        <div className={styles.formPanel}>
          <form onSubmit={handleSubmit}>
            {/* Vehicle Return Details Section */}
            <div className={styles.formSection}>
              <div className={styles.formSectionTitle}>Vehicle Return Details</div>
              
              <div className={styles.formGroup}>
                <label htmlFor="vehicleNickname">Vehicle Nickname / Plate *</label>
                <input
                  type="text"
                  id="vehicleNickname"
                  placeholder="e.g. Civic-07 or 7ABC123"
                  value={formData.vehicleNickname}
                  onChange={handleInputChange}
                  required
                  style={formErrors.vehicleNickname ? { borderColor: '#dc2626', backgroundColor: '#7f1d1d' } : {}}
                />
                {formErrors.vehicleNickname && (
                  <div style={{ color: '#fca5a5', fontSize: '12px', marginTop: '4px' }}>
                    {formErrors.vehicleNickname}
                  </div>
                )}
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="currentMileage">Current Mileage *</label>
                <input
                  type="number"
                  id="currentMileage"
                  placeholder="e.g. 34820"
                  value={formData.currentMileage}
                  onChange={handleInputChange}
                  required
                  style={formErrors.currentMileage ? { borderColor: '#dc2626', backgroundColor: '#7f1d1d' } : {}}
                  max={999999}
                  min={0}
                />
                {formErrors.currentMileage && (
                  <div style={{ color: '#fca5a5', fontSize: '12px', marginTop: '4px' }}>
                    {formErrors.currentMileage}
                  </div>
                )}
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="lastServiceMileage">Mileage at Last Service *</label>
                <input
                  type="number"
                  id="lastServiceMileage"
                  placeholder="e.g. 32000"
                  value={formData.lastServiceMileage}
                  onChange={handleInputChange}
                  required
                  style={formErrors.lastServiceMileage ? { borderColor: '#dc2626', backgroundColor: '#7f1d1d' } : {}}
                  max={999999}
                  min={0}

                />
                {formErrors.lastServiceMileage && (
                  <div style={{ color: '#fca5a5', fontSize: '12px', marginTop: '4px' }}>
                    {formErrors.lastServiceMileage}
                  </div>
                )}
                {mileageDiff !== null && !formErrors.lastServiceMileage && !formErrors.currentMileage && (
                  <div className={styles.mileageDiff}>
                    Miles since last service: {mileageDiff.toLocaleString()}
                  </div>
                )}
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="fuelLevel">Fuel Level on Return *</label>
                <select
                  id="fuelLevel"
                  value={formData.fuelLevel}
                  onChange={handleInputChange}
                  required
                  style={formErrors.fuelLevel ? { borderColor: '#dc2626', backgroundColor: '#7f1d1d' } : {}}
                >
                  <option value="">Select fuel level</option>
                  <option value="Full">Full</option>
                  <option value="3/4">¾ Tank</option>
                  <option value="Half">Half Tank</option>
                  <option value="1/4">¼ Tank</option>
                  <option value="Nearly Empty">Nearly Empty</option>
                </select>
                {formErrors.fuelLevel && (
                  <div style={{ color: '#fca5a5', fontSize: '12px', marginTop: '4px' }}>
                    {formErrors.fuelLevel}
                  </div>
                )}
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="nextBooking">Next Booking In *</label>
                <select
                  id="nextBooking"
                  value={formData.nextBooking}
                  onChange={handleInputChange}
                  required
                  style={formErrors.nextBooking ? { borderColor: '#dc2626', backgroundColor: '#7f1d1d' } : {}}
                >
                  <option value="">Select time window</option>
                  <option value="Under 1 hour">Under 1 hour</option>
                  <option value="1–2 hours">1–2 hours</option>
                  <option value="2–4 hours">2–4 hours</option>
                  <option value="4–8 hours">4–8 hours</option>
                  <option value="8+ hours">8+ hours</option>
                  <option value="No booking yet">No booking yet</option>
                </select>
                {formErrors.nextBooking && (
                  <div style={{ color: '#fca5a5', fontSize: '12px', marginTop: '4px' }}>
                    {formErrors.nextBooking}
                  </div>
                )}
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="adr">Average Daily Rate (USD) *</label>
                <input
                  type="number"
                  id="adr"
                  placeholder="e.g. 65"
                  step="0.01"
                  value={formData.adr}
                  onChange={handleInputChange}
                  required
                  style={formErrors.adr ? { borderColor: '#dc2626', backgroundColor: '#7f1d1d' } : {}}
                  min={0}
                  max={10000}

                />
                {formErrors.adr && (
                  <div style={{ color: '#fca5a5', fontSize: '12px', marginTop: '4px' }}>
                    {formErrors.adr}
                  </div>
                )}
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="returnConditionNotes">Return Condition Notes *</label>
                <textarea
                  id="returnConditionNotes"
                  placeholder="e.g. minor scuff on rear bumper, smells like smoke, left rear tire looks low, passenger window won't roll up fully"
                  value={formData.returnConditionNotes}
                  onChange={handleInputChange}
                  required
                  style={formErrors.returnConditionNotes ? { borderColor: '#dc2626', backgroundColor: '#7f1d1d' } : {}}
                />
                {formErrors.returnConditionNotes && (
                  <div style={{ color: '#fca5a5', fontSize: '12px', marginTop: '4px' }}>
                    {formErrors.returnConditionNotes}
                  </div>
                )}
                {!formErrors.returnConditionNotes && (
                  <div className={styles.helperText}>Describe any damage, odors, mechanical issues, or other observations</div>
                )}
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="previousIssues">Previous Known Issues (optional)</label>
                <textarea
                  id="previousIssues"
                  placeholder="e.g. AC has been weak since last month, driver seat adjustment stiff"
                  value={formData.previousIssues}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <button type="submit" className={styles.submitBtn} disabled={loading}>
              <span id="submitBtnText">
                {loading ? (
                  <>
                    <span className={styles.spinner}></span>
                    Analyzing with AI...
                  </>
                ) : (
                  'Analyze Turnaround →'
                )}
              </span>
            </button>
          </form>

          {/* Fleet Health Section */}
          <div className={styles.fleetHealthDivider}></div>
          <div className={styles.fleetHealthSection}>
            <div className={styles.fleetHealthTitle}>Fleet Health</div>
            <div className={styles.fleetHealthContainer}>
              {Object.keys(vehicleStats).length === 0 ? (
                <div className={styles.fleetHealthPlaceholder}>
                  No vehicles tracked yet. Submit your first return above.
                </div>
              ) : (
                Object.entries(vehicleStats).map(([vehicleId, entries]) => {
                  const goCount = entries.filter(e => e.verdict === 'GO').length;
                  const holdCount = entries.filter(e => e.verdict === 'HOLD').length;
                  const flagCount = entries.filter(e => e.verdict === 'FLAG').length;
                  const total = entries.length;
                  const healthScore = Math.round((goCount * 100 + holdCount * 50) / total);
                  const healthColor = healthScore >= 75 ? 'green' : healthScore >= 40 ? 'amber' : 'red';

                  const issueMap: { [key: string]: number } = {};
                  entries.forEach(e => {
                    issueMap[e.topIssue] = (issueMap[e.topIssue] || 0) + 1;
                  });
                  const mostRecurring = Object.keys(issueMap).reduce((a, b) => 
                    issueMap[a] > issueMap[b] ? a : b, Object.keys(issueMap)[0]);

                  const lastEntry = entries[entries.length - 1];

                  return (
                    <div key={vehicleId} className={styles.vehicleCard}>
                      <div className={styles.vehicleCardHeader}>{vehicleId}</div>
                      
                      <div className={styles.healthScoreContainer}>
                        <div className={styles.healthScoreLabel}>Health Score</div>
                        <div className={styles.healthScoreBar}>
                          <div 
                            className={`${styles.healthScoreFill} ${styles[healthColor]}`}
                            style={{ width: `${healthScore}%` }}
                          ></div>
                        </div>
                        <div className={styles.healthScoreValue}>{healthScore}</div>
                      </div>

                      <div className={styles.vehicleStats}>
                        <div className={styles.vehicleStat}>Check-ins: {total}</div>
                        <div className={styles.vehicleStat}>Last: {getRelativeTime(lastEntry.timestamp)}</div>
                      </div>

                      <div className={styles.vehicleVerdictBadges}>
                        <div className={`${styles.verdictBadge} ${styles.go}`}>✓ GO {goCount}</div>
                        <div className={`${styles.verdictBadge} ${styles.hold}`}>⚠ HOLD {holdCount}</div>
                        <div className={`${styles.verdictBadge} ${styles.flag}`}>✗ FLAG {flagCount}</div>
                      </div>

                      <div className={styles.vehicleIssue}>
                        <span className={styles.vehicleIssueLabel}>Most recurring:</span>
                        {mostRecurring}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            {Object.keys(vehicleStats).length > 0 && (
              <button className={styles.clearHistoryBtn} onClick={handleClearHistory}>
                Clear History
              </button>
            )}
          </div>
        </div>

        {/* Right Panel: Output */}
        <div className={styles.outputPanel}>
          {error && (
            <div className={styles.errorMessage}>
              <strong>Analysis failed.</strong> {error}
            </div>
          )}

          {!analysis && !loading && !error && (
            <div className={styles.placeholderMessage}>
              Enter vehicle return details and click Analyze to get your turnaround report.
            </div>
          )}

          {loading && (
            <div className={styles.outputLoading}>
              <div className={styles.outputLoadingSpinner}></div>
              <div className={styles.outputLoadingText}>Analyzing vehicle condition...</div>
            </div>
          )}

          {analysis && (
            <div>
              {/* Verdict Banner */}
              <div className={`${styles.verdictBanner} ${styles[analysis.verdict.toLowerCase()]}`}>
                <div>
                  {analysis.verdict === 'GO' ? '✓' : analysis.verdict === 'HOLD' ? '⚠' : '✗'} {analysis.verdict}
                </div>
                <div className={styles.verdictReason}>{analysis.verdict_reason}</div>
              </div>

              {/* At a Glance */}
              <div className={styles.atGlance}>
                <div className={styles.metricCard}>
                  <div className={styles.metricLabel}>Est. Time to Ready</div>
                  <div className={styles.metricValue}>{analysis.time_to_ready}</div>
                </div>
                <div className={styles.metricCard}>
                  <div className={styles.metricLabel}>Revenue Impact</div>
                  <div className={styles.metricValue} style={{ fontSize: '13px', fontWeight: 600 }}>
                    {analysis.revenue_impact.substring(0, 50)}...
                  </div>
                </div>
              </div>

              {/* Timing Check */}
              {timing && (
                <div className={`${styles.timingCheck} ${timing.ratio > 1 ? styles.fail : timing.ratio > 0.85 ? styles.tight : styles.success}`}>
                  <div className={styles.timingMessage}>
                    {timing.ratio > 1 ? '✗ YOU WON\'T MAKE IT' : timing.ratio > 0.85 ? '⚠ TIGHT WINDOW' : '✓ YOU\'LL MAKE IT'}
                  </div>
                  <div className={styles.timingDetails}>
                    Total tasks: {timing.totalMinutes} min | Available: {timing.availableMinutes} min | 
                    {timing.ratio > 1 ? ` ${timing.totalMinutes - timing.availableMinutes} min over` : ` ${timing.availableMinutes - timing.totalMinutes} min buffer`}
                  </div>
                  {timing.ratio > 1 && (
                    <div className={styles.timingSuggestions}>
                      {timing.tasks.filter(t => t.urgency === 'BEFORE NEXT RENTAL').length > 0 ? (
                        <>
                          Consider skipping: {timing.tasks
                            .filter(t => t.urgency === 'BEFORE NEXT RENTAL')
                            .sort((a, b) => (a.estimated_minutes || 0) - (b.estimated_minutes || 0))
                            .map(t => `${t.task} (~${t.estimated_minutes}min)`)
                            .join(', ')}
                          <br />Or: contact the next renter to delay pickup by approximately {Math.ceil(timing.totalMinutes - timing.availableMinutes)} minutes.
                        </>
                      ) : (
                        'Cannot meet deadline. Contact the next renter immediately.'
                      )}
                    </div>
                  )}
                  {timing.ratio > 0.85 && timing.ratio <= 1 && (
                    <div className={styles.timingSuggestions}>
                      Recommend: start immediately, no breaks.
                    </div>
                  )}
                  {analysis.timing_note && (
                    <div className={styles.timingNote}>{analysis.timing_note}</div>
                  )}
                </div>
              )}

              {/* Action Items */}
              {analysis.action_items && analysis.action_items.length > 0 && (
                <div className={styles.section}>
                  <div className={styles.sectionTitle}>Action Items</div>
                  <div className={styles.actionList}>
                    {analysis.action_items.map((item, idx) => {
                      const urgencyClass = item.urgency === 'NOW' ? 'now' : 
                                          item.urgency === 'BEFORE NEXT RENTAL' ? 'before' : 'week';
                      const urgencyLabel = item.urgency === 'NOW' ? 'NOW' : 
                                          item.urgency === 'BEFORE NEXT RENTAL' ? 'BEFORE NEXT RENTAL' : 'THIS WEEK';
                      const timeStr = item.estimated_minutes ? ` (~${item.estimated_minutes} min)` : '';

                      return (
                        <div key={idx} className={`${styles.actionItem} ${styles[urgencyClass]}`}>
                          <div className={`${styles.urgencyBadge} ${styles[urgencyClass]}`}>{urgencyLabel}</div>
                          <div className={styles.actionContent}>
                            <div className={styles.actionTask}>{item.task}{timeStr}</div>
                            {item.note && <div className={styles.actionNote}>{item.note}</div>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Maintenance Alerts */}
              {analysis.maintenance_alerts && analysis.maintenance_alerts.length > 0 && (
                <div className={styles.section}>
                  <div className={styles.sectionTitle}>Maintenance Alerts</div>
                  <div className={styles.alertsList}>
                    {analysis.maintenance_alerts.map((alert, idx) => {
                      const severityClass = alert.severity.toLowerCase();
                      return (
                        <div key={idx} className={`${styles.alertItem} ${styles[severityClass]}`}>
                          <div className={`${styles.alertSeverity} ${styles[severityClass]}`}>{alert.severity}</div>
                          <div className={styles.alertText}>{alert.alert}</div>
                          <div className={styles.alertRecommendation}>{alert.recommendation}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Cleaning Checklist */}
              {analysis.cleaning_checklist && analysis.cleaning_checklist.length > 0 && (
                <div className={styles.section}>
                  <div className={styles.sectionTitle}>Cleaning Checklist</div>
                  <div className={styles.checklist}>
                    {analysis.cleaning_checklist.map((item, idx) => (
                      <div
                        key={idx}
                        className={`${styles.checklistItem} ${item.flag ? styles.flagged : ''} ${checkedItems.has(idx) ? styles.checked : ''}`}
                        onClick={() => {
                          const newChecked = new Set(checkedItems);
                          if (newChecked.has(idx)) {
                            newChecked.delete(idx);
                          } else {
                            newChecked.add(idx);
                          }
                          setCheckedItems(newChecked);
                        }}
                      >
                        <div className={`${styles.customCheckbox} ${checkedItems.has(idx) ? styles.checked : ''}`}>
                          {checkedItems.has(idx) && '✓'}
                        </div>
                        <div className={styles.checklistLabel}>{item.item}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Operator Note */}
              <div className={styles.operatorNote}>
                <div className={styles.operatorNoteLabel}>Fleet Manager's Note</div>
                {analysis.operator_note}
              </div>

              {/* Action Buttons */}
              <div className={styles.buttonGroup}>
                <button className={styles.newVehicleBtn} onClick={handleNewVehicle}>
                  New Vehicle →
                </button>
                <button className={styles.whatsappBtn} id="whatsappBtn" onClick={handleWhatsAppSummary}>
                  📋 Copy WhatsApp Summary
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}