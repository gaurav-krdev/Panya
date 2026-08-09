// src/utils/panyaAccessibilityBridge.ts
import { NativeModules, Platform } from 'react-native';

const { PanyaAccessibilityModule } = NativeModules;

export interface AccessibilityBridge {
  isServiceEnabled(): Promise<boolean>;
  clickNodeByText(targetText: string): Promise<boolean>;
  setInputText(viewId: string, textToSet: string): Promise<boolean>;
}

class PanyaAccessibilityBridgeImpl implements AccessibilityBridge {
  public async isServiceEnabled(): Promise<boolean> {
    if (Platform.OS === 'android' && PanyaAccessibilityModule) {
      try {
        return await PanyaAccessibilityModule.isServiceEnabled();
      } catch (e) {
        return false;
      }
    }
    // Web / Fallback simulation status
    return true;
  }

  public async clickNodeByText(targetText: string): Promise<boolean> {
    if (Platform.OS === 'android' && PanyaAccessibilityModule) {
      return await PanyaAccessibilityModule.clickNodeByText(targetText);
    }
    // Web / Fallback Simulation Mode
    console.log(`[PanyaAccessibilityBridge Web Simulation] Clicking node by text: "${targetText}"`);
    return true;
  }

  public async setInputText(viewId: string, textToSet: string): Promise<boolean> {
    if (Platform.OS === 'android' && PanyaAccessibilityModule) {
      return await PanyaAccessibilityModule.setInputText(viewId, textToSet);
    }
    // Web / Fallback Simulation Mode
    console.log(`[PanyaAccessibilityBridge Web Simulation] Setting text for viewId "${viewId}": "${textToSet}"`);
    return true;
  }
}

export const PanyaAccessibilityBridge = new PanyaAccessibilityBridgeImpl();
