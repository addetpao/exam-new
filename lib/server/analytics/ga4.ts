/**
 * Server-side Google Analytics 4 event tracking
 */

interface GA4Event {
  name: string;
  parameters: Record<string, any>;
}

class GA4Analytics {
  private measurementId: string;
  private apiSecret: string;
  private enabled: boolean;

  constructor() {
    this.measurementId = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID || "";
    this.apiSecret = process.env.GA4_API_SECRET || "";
    this.enabled = !!this.measurementId && !!this.apiSecret;
  }

  /**
   * Send event to GA4 Measurement Protocol
   */
  async trackEvent(clientId: string, events: GA4Event[]): Promise<void> {
    if (!this.enabled) {
      console.warn("GA4 tracking disabled - missing configuration");
      return;
    }

    try {
      const url = `https://www.google-analytics.com/mp/collect?measurement_id=${this.measurementId}&api_secret=${this.apiSecret}`;
      
      const payload = {
        client_id: clientId,
        events: events.map(event => ({
          name: event.name,
          params: {
            ...event.parameters,
            timestamp_micros: Date.now() * 1000,
          }
        }))
      };

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        console.error("Failed to send GA4 event:", response.statusText);
      }
    } catch (error) {
      console.error("Error sending GA4 event:", error);
    }
  }

  /**
   * Track practice session events
   */
  async trackPracticeSession(userId: string, sessionData: {
    session_id: string;
    domain: string;
    questions_count: number;
    correct_answers: number;
    session_duration: number;
  }): Promise<void> {
    await this.trackEvent(userId, [
      {
        name: "practice_session_complete",
        parameters: {
          session_id: sessionData.session_id,
          domain: sessionData.domain,
          questions_count: sessionData.questions_count,
          correct_answers: sessionData.correct_answers,
          accuracy_rate: (sessionData.correct_answers / sessionData.questions_count) * 100,
          session_duration_minutes: Math.round(sessionData.session_duration / 60),
          engagement_time_msec: sessionData.session_duration * 1000,
        }
      }
    ]);
  }

  /**
   * Track exam session events
   */
  async trackExamSession(userId: string, examData: {
    session_id: string;
    exam_type: string;
    score: number;
    passed: boolean;
    duration: number;
    questions_count: number;
  }): Promise<void> {
    await this.trackEvent(userId, [
      {
        name: "exam_session_complete",
        parameters: {
          session_id: examData.session_id,
          exam_type: examData.exam_type,
          score: examData.score,
          passed: examData.passed,
          duration_minutes: Math.round(examData.duration / 60),
          questions_count: examData.questions_count,
          engagement_time_msec: examData.duration * 1000,
        }
      }
    ]);
  }

  /**
   * Track subscription events
   */
  async trackSubscription(userId: string, subscriptionData: {
    event_type: "subscription_created" | "subscription_cancelled" | "subscription_upgraded";
    tier: string;
    value: number;
  }): Promise<void> {
    await this.trackEvent(userId, [
      {
        name: subscriptionData.event_type,
        parameters: {
          tier: subscriptionData.tier,
          value: subscriptionData.value,
          currency: "USD",
        }
      }
    ]);
  }

  /**
   * Track user authentication events
   */
  async trackAuth(userId: string, authData: {
    method: "email" | "google" | "github";
    event_type: "sign_up" | "sign_in";
  }): Promise<void> {
    await this.trackEvent(userId, [
      {
        name: authData.event_type,
        parameters: {
          method: authData.method,
        }
      }
    ]);
  }
}

export const ga4Analytics = new GA4Analytics();