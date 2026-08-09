// src/utils/panyaAppAutomationPipeline.ts
import { Linking, Platform } from 'react-native';
import { PanyaAccessibilityBridge } from './panyaAccessibilityBridge';

export interface AppAutomationConfig {
  packageName: string;
  deepLinkUrl?: string;
  searchBarTextOrId?: string;
  query: string;
}

export class PanyaAppAutomationPipeline {
  /**
   * Executes app automation with automatic fallback:
   * 1. Try launching deep link URL if available.
   * 2. If deep link fails or is missing, fallback to opening package & using Accessibility Service to locate search bar & inject query.
   * 3. Continue full Accessibility Service automation for item selection & checkout.
   */
  public async executeAppAutomation(config: AppAutomationConfig): Promise<boolean> {
    console.log(`[PanyaAutomationPipeline] Starting execution for ${config.packageName}`);

    let launchedViaDeepLink = false;

    // STEP 1: Try Primary Direct Launch (Deep Link URL) if provided
    if (config.deepLinkUrl) {
      try {
        const canOpen = await Linking.canOpenURL(config.deepLinkUrl);
        if (canOpen) {
          console.log(`[PanyaAutomationPipeline] Launching primary deep link: ${config.deepLinkUrl}`);
          await Linking.openURL(config.deepLinkUrl);
          launchedViaDeepLink = true;
        }
      } catch (err) {
        console.warn('[PanyaAutomationPipeline] Deep link launch failed, falling back to Accessibility Service search:', err);
      }
    }

    // STEP 2: Fallback if Deep Link is missing or failed
    if (!launchedViaDeepLink) {
      console.log(`[PanyaAutomationPipeline] Fallback: Launching package ${config.packageName} and searching via Accessibility Service...`);

      // Try launching app by package name or fallback intent
      if (Platform.OS === 'android') {
        try {
          await Linking.openURL(`https://play.google.com/store/apps/details?id=${config.packageName}`);
        } catch (e) {}
      }

      // Use Accessibility Service to find search bar and set query text
      const searchIdentifier = config.searchBarTextOrId || 'Search';
      console.log(`[PanyaAutomationPipeline] Locating search bar node: "${searchIdentifier}"`);

      // Click search bar node
      await PanyaAccessibilityBridge.clickNodeByText(searchIdentifier);

      // Inject query into search bar input node
      await PanyaAccessibilityBridge.setInputText(searchIdentifier, config.query);
    }

    // STEP 3: Accessibility Service Full Automation Pipeline (Results -> Item Selection -> Cart -> Checkout)
    console.log(`[PanyaAutomationPipeline] Executing in-app automation for query: "${config.query}"`);

    // Automate selecting first matching item result
    await PanyaAccessibilityBridge.clickNodeByText(config.query);

    // Automate Add to Cart button
    await PanyaAccessibilityBridge.clickNodeByText('Add');

    // Automate Proceed to Checkout
    await PanyaAccessibilityBridge.clickNodeByText('Checkout');

    return true;
  }
}

export const panyaAutomationPipeline = new PanyaAppAutomationPipeline();
