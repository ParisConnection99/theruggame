// services/MarketPhaseMessageService.js
import { Client } from "@upstash/qstash";

class MarketPhaseMessageService {
  constructor() {
    this.client = new Client({
      token: process.env.QSTASH_TOKEN,
    });
    this.apiEndpoint = `${process.env.NEXT_PUBLIC_API_URL}/api/markets/check-phase`;
  }

  /**
   * Schedule a phase check for a specific market
   * @param {string} marketId - ID of the market
   * @param {number} delaySeconds - Delay in seconds before the message should be delivered
   * @returns {Promise<string>} Message ID from QStash
   */
  async schedulePhaseCheck(marketId, delaySeconds = 0) {
    try {
      const response = await this.client.publishJSON({
        url: this.apiEndpoint,
        body: { marketId },
        delay: delaySeconds,
      });
      
      console.log(`Scheduled phase check for market ${marketId} with delay ${delaySeconds}s`);
      return response.messageId;
    } catch (error) {
      console.error(`Failed to schedule phase check for market ${marketId}:`, error);
      throw error;
    }
  }

  /**
   * Schedule both cutoff and resolution phase checks for a market
   * @param {string} marketId - ID of the market
   * @param {Date|string} startTime - Market start time
   * @param {number} durationMinutes - Market duration in minutes
   * @param {Date|string} endTime - Market end time
   * @returns {Promise<Object>} Object containing message IDs for both scheduled checks
   */
  async scheduleMarketPhaseChecks(marketId, startTime, durationMinutes, endTime) {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const now = new Date();
    
    // Calculate cutoff (50% duration) and end (100% duration) times
    const cutoffTime = new Date(start.getTime() + (durationMinutes * 30000));
    
    
    // Calculate delays in seconds (with safety check to not go negative)
    const cutoffDelay = Math.max(0, Math.floor((cutoffTime - now) / 1000));
    const endDelay = Math.max(0, Math.floor((end - now) / 1000));
    
    // Schedule both messages
    const cutoffMessageId = await this.schedulePhaseCheck(marketId, cutoffDelay);
    const endMessageId = await this.schedulePhaseCheck(marketId, endDelay);
    
    return {
      marketId,
      cutoffMessageId,
      cutoffScheduledFor: cutoffTime,
      endMessageId,
      endScheduledFor: end
    };
  }

  /**
   * Cancel a previously scheduled message
   * @param {string} messageId - ID of the message to cancel
   * @returns {Promise<boolean>} Success status
   */
  async cancelScheduledMessage(messageId) {
    try {
      await this.client.deleteMessage(messageId);
      return true;
    } catch (error) {
      console.error(`Failed to cancel message ${messageId}:`, error);
      return false;
    }
  }
}

export const marketPhaseMessageService = new MarketPhaseMessageService();