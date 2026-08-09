// src/app/sandbox.tsx
import React, { useState } from 'react';
import { ScrollView, StyleSheet, View, Text, TouchableOpacity, Platform, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAgentState } from '@/hooks/use-agent';
import { agentEngine } from '@/utils/agentEngine';

export default function SandboxScreen() {
  const safeAreaInsets = useSafeAreaInsets();
  const theme = useTheme();
  const agentState = useAgentState();

  const [activeApp, setActiveApp] = useState<'food' | 'grocery'>('food');

  const handleTriggerFoodOrder = () => {
    agentEngine.processCommand('order food');
  };

  const handleTriggerGroceryOrder = () => {
    agentEngine.processCommand('buy groceries');
  };

  const getSubtotal = () => {
    return agentState.foodApp.items
      .reduce((sum, item) => sum + item.price * item.quantity, 0)
      .toFixed(2);
  };

  const getGrocerySelectedTotal = () => {
    return agentState.groceryApp.items
      .filter(item => item.selected)
      .reduce((sum, item) => sum + item.price, 0)
      .toFixed(2);
  };

  const { width } = useWindowDimensions();
  const isSmallScreen = width < 640;

  const containerWidth = Math.min(360, width - Spacing.three * 2);
  const scale = containerWidth / 360;
  const containerHeight = 520 * scale;

  const contentPlatformStyle = Platform.select({
    android: {
      paddingTop: safeAreaInsets.top + Spacing.three,
      paddingLeft: safeAreaInsets.left,
      paddingRight: safeAreaInsets.right,
      paddingBottom: safeAreaInsets.bottom + BottomTabInset + Spacing.four,
    },
    web: {
      paddingTop: isSmallScreen ? Spacing.four : 85,
      paddingBottom: isSmallScreen ? 85 : Spacing.four,
    },
  });

  return (
    <ScrollView
      style={[styles.scrollView, { backgroundColor: theme.background }]}
      contentContainerStyle={[styles.contentContainer, contentPlatformStyle]}
    >
      <View style={styles.header}>
        <View>
          <ThemedText type="subtitle">Mega App Sandbox</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Simulate how the agent controls other apps through UI coordinates
          </ThemedText>
        </View>
      </View>

      {/* APP SELECTOR TABS */}
      <View style={[styles.selectorRow, { borderBottomColor: theme.border }]}>
        <TouchableOpacity
          style={[styles.selectorTab, activeApp === 'food' && { borderBottomColor: theme.primary }]}
          onPress={() => setActiveApp('food')}
        >
          <Text style={[styles.selectorTabText, { color: activeApp === 'food' ? theme.primary : theme.textSecondary }]}>
            🍔 EatEasy App
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.selectorTab, activeApp === 'grocery' && { borderBottomColor: theme.primary }]}
          onPress={() => setActiveApp('grocery')}
        >
          <Text style={[styles.selectorTabText, { color: activeApp === 'grocery' ? theme.primary : theme.textSecondary }]}>
            🛒 CartGo Grocery
          </Text>
        </TouchableOpacity>
      </View>

      {/* SIMULATOR CONTAINER */}
      <View style={styles.simulatorFrame}>
        <View style={{ width: containerWidth, height: containerHeight, justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ width: 360, height: 520, transform: [{ scale: scale }], position: 'absolute' }}>
            {/* MOCK MOBILE PHONE FRAME WRAPPER */}
            <ThemedView type="backgroundElement" style={[styles.phoneWrapper, { borderColor: theme.border }]}>
          
          {/* EATEASY SIMULATOR */}
          {activeApp === 'food' && (
            <View style={styles.appCanvas}>
              {/* App Status Header */}
              <View style={[styles.appHeader, { backgroundColor: '#10b981' }]}>
                <Text style={styles.appTitle}>🍔 EatEasy Mobile Delivery</Text>
                <Text style={styles.appSubtitle}>Status: {agentState.foodApp.status.toUpperCase()}</Text>
              </View>

              {/* SEARCH VIEW */}
              {agentState.foodApp.status === 'idle' && (
                <View style={styles.canvasCenter}>
                  <Text style={[styles.canvasInfoText, { color: theme.textSecondary }]}>
                    App is idle. Trigger the agent routine or type "order salad" in the terminal.
                  </Text>
                  <TouchableOpacity
                    style={[styles.testBtn, { backgroundColor: theme.primary }]}
                    onPress={handleTriggerFoodOrder}
                  >
                    <Text style={styles.testBtnText}>Order Meal via Agent</Text>
                  </TouchableOpacity>
                </View>
              )}

              {agentState.foodApp.status === 'searching' && (
                <View style={styles.paddedContent}>
                  <View style={[styles.mockInput, { borderColor: theme.border, backgroundColor: theme.background }]}>
                    <Text style={{ color: theme.text }}>
                      {agentState.foodApp.activeSearch || 'Searching for restaurants...'}
                    </Text>
                  </View>
                  <View style={styles.skeletonList}>
                    <View style={[styles.skeletonItem, { backgroundColor: theme.border }]} />
                    <View style={[styles.skeletonItem, { backgroundColor: theme.border }]} />
                  </View>
                </View>
              )}

              {/* MENU SELECTION VIEW */}
              {agentState.foodApp.status === 'cart' && (
                <View style={styles.menuContent}>
                  <Text style={[styles.menuHeaderTitle, { color: theme.text }]}>GreenLeaf Salads & Bowls</Text>
                  {agentState.foodApp.items.map((item, idx) => (
                    <View key={idx} style={[styles.menuItemCard, { backgroundColor: theme.background, borderColor: theme.border }]}>
                      <View>
                        <Text style={[styles.itemName, { color: theme.text }]}>{item.name}</Text>
                        <Text style={{ color: theme.primary, fontWeight: '700' }}>${item.price}</Text>
                      </View>
                      <View style={[styles.quantityBadge, { backgroundColor: item.quantity > 0 ? theme.accent : theme.border }]}>
                        <Text style={styles.qtyText}>{item.quantity > 0 ? `Selected: ${item.quantity}` : 'Add'}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* CHECKOUT SCREEN */}
              {agentState.foodApp.status === 'checking_out' && (
                <View style={styles.checkoutContent}>
                  <Text style={[styles.menuHeaderTitle, { color: theme.text }]}>Secure Checkout</Text>
                  <View style={[styles.summaryCard, { backgroundColor: theme.background, borderColor: theme.border }]}>
                    <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Subtotal</Text>
                    <Text style={[styles.summaryValue, { color: theme.text }]}>${getSubtotal()}</Text>
                  </View>
                  <View style={styles.paymentButtonMock}>
                    <Text style={styles.payBtnText}>Processing Payment...</Text>
                  </View>
                </View>
              )}

              {/* DELIVERY TRACKER */}
              {(agentState.foodApp.status === 'delivering' || agentState.foodApp.status === 'done') && (
                <View style={styles.deliveryContent}>
                  <Text style={[styles.menuHeaderTitle, { color: theme.text }]}>Live Map Tracking</Text>
                  
                  {/* Mock Map Grid */}
                  <View style={[styles.mapContainer, { backgroundColor: '#111827', borderColor: theme.border }]}>
                    {/* Gridlines */}
                    <View style={styles.mapGridLineH1} />
                    <View style={styles.mapGridLineH2} />
                    <View style={styles.mapGridLineV1} />
                    <View style={styles.mapGridLineV2} />

                    {/* Destination Home Icon */}
                    <View style={styles.userHomeMarker}>
                      <Text style={styles.markerText}>🏠 Home</Text>
                    </View>

                    {/* Active Rider */}
                    {agentState.foodApp.status === 'delivering' ? (
                      <View style={[styles.riderMarker, { left: `${agentState.foodApp.riderLocation.x}%`, top: `${agentState.foodApp.riderLocation.y}%` }]}>
                        <Text style={styles.markerText}>🚴 Panya's Courier</Text>
                      </View>
                    ) : (
                      <View style={[styles.riderMarker, { left: '90%', top: '20%', backgroundColor: theme.accent }]}>
                        <Text style={styles.markerText}>✅ Arrived</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.deliveryInfoText, { color: theme.text }]}>
                    {agentState.foodApp.status === 'delivering' ? 'Rider heading to destination...' : 'Delivery complete! enjoy your lunch.'}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* CARTGO SIMULATOR */}
          {activeApp === 'grocery' && (
            <View style={styles.appCanvas}>
              <View style={[styles.appHeader, { backgroundColor: theme.primary }]}>
                <Text style={styles.appTitle}>🛒 CartGo Companion</Text>
                <Text style={styles.appSubtitle}>Status: {agentState.groceryApp.status.toUpperCase()}</Text>
              </View>

              {/* SEARCH VIEW */}
              {agentState.groceryApp.status === 'idle' && (
                <View style={styles.canvasCenter}>
                  <Text style={[styles.canvasInfoText, { color: theme.textSecondary }]}>
                    App is idle. Trigger the grocery routine or type "buy milk" in the terminal.
                  </Text>
                  <TouchableOpacity
                    style={[styles.testBtn, { backgroundColor: theme.primary }]}
                    onPress={handleTriggerGroceryOrder}
                  >
                    <Text style={styles.testBtnText}>Order Groceries via Agent</Text>
                  </TouchableOpacity>
                </View>
              )}

              {agentState.groceryApp.status === 'searching' && (
                <View style={styles.menuContent}>
                  <Text style={[styles.menuHeaderTitle, { color: theme.text }]}>Selecting grocery checklist items...</Text>
                  {agentState.groceryApp.items.map((item, idx) => (
                    <View key={idx} style={[styles.menuItemCard, { backgroundColor: theme.background, borderColor: theme.border }]}>
                      <Text style={[styles.itemName, { color: theme.text }]}>{item.name}</Text>
                      <View style={styles.row}>
                        <Text style={{ color: theme.primary, fontWeight: '700', marginRight: Spacing.two }}>${item.price}</Text>
                        <View style={[styles.checkboxMock, { borderColor: item.selected ? theme.accent : theme.border }]}>
                          {item.selected && <View style={[styles.checkboxMockInner, { backgroundColor: theme.accent }]} />}
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* CART CHECKOUT */}
              {agentState.groceryApp.status === 'cart' && (
                <View style={styles.checkoutContent}>
                  <Text style={[styles.menuHeaderTitle, { color: theme.text }]}>Shopping Bag Summary</Text>
                  <View style={[styles.summaryCard, { backgroundColor: theme.background, borderColor: theme.border }]}>
                    <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Total Order Value</Text>
                    <Text style={[styles.summaryValue, { color: theme.text }]}>${getGrocerySelectedTotal()}</Text>
                  </View>
                  <View style={styles.paymentButtonMock}>
                    <Text style={styles.payBtnText}>Approving Checkout...</Text>
                  </View>
                </View>
              )}

              {/* TRANSACTION DONE */}
              {agentState.groceryApp.status === 'done' && (
                <View style={styles.canvasCenter}>
                  <SymbolView tintColor={theme.accent} name={{ ios: 'checkmark.seal.fill', android: 'verified', web: 'verified' }} size={40} />
                  <Text style={[styles.successTitle, { color: theme.text }]}>Payment Approved!</Text>
                  <Text style={[styles.canvasInfoText, { color: theme.textSecondary }]}>
                    CartGo dispatch api confirmed order list delivery. Scheduled slot is 6:00 PM today.
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* ACTIVE AGENT GHOST CURSOR INDICATOR */}
          {activeApp === 'food' && agentState.foodApp.cursorPos && (
            <View
              style={[
                styles.agentCursor,
                {
                  left: agentState.foodApp.cursorPos.x,
                  top: agentState.foodApp.cursorPos.y,
                  borderColor: theme.secondary,
                },
              ]}
            >
              <View style={[styles.cursorPulse, { backgroundColor: theme.secondary }]} />
              <View style={styles.cursorTag}>
                <Text style={styles.cursorTagText}>Panya Controller</Text>
              </View>
            </View>
          )}

          {activeApp === 'grocery' && agentState.groceryApp.cursorPos && (
            <View
              style={[
                styles.agentCursor,
                {
                  left: agentState.groceryApp.cursorPos.x,
                  top: agentState.groceryApp.cursorPos.y,
                  borderColor: theme.secondary,
                },
              ]}
            >
              <View style={[styles.cursorPulse, { backgroundColor: theme.secondary }]} />
              <View style={styles.cursorTag}>
                <Text style={styles.cursorTagText}>Panya Controller</Text>
              </View>
            </View>
          )}
        </ThemedView>
      </View>
    </View>
  </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: Spacing.three,
    gap: Spacing.four,
  },
  header: {
    marginTop: Spacing.three,
    marginBottom: Spacing.one,
  },
  selectorRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  selectorTab: {
    flex: 1,
    paddingVertical: Spacing.two,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  selectorTabText: {
    fontSize: 14,
    fontWeight: '700',
  },
  simulatorFrame: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: Spacing.one,
  },
  phoneWrapper: {
    width: 360,
    height: 520,
    borderRadius: Spacing.four,
    borderWidth: 6,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
  },
  appCanvas: {
    flex: 1,
  },
  appHeader: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  appTitle: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 12,
  },
  appSubtitle: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '600',
    opacity: 0.9,
  },
  canvasCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
    gap: Spacing.three,
  },
  canvasInfoText: {
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 18,
  },
  testBtn: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: 20,
  },
  testBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
  paddedContent: {
    padding: Spacing.three,
    gap: Spacing.three,
  },
  mockInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: Spacing.two,
    height: 36,
    justifyContent: 'center',
  },
  skeletonList: {
    gap: Spacing.two,
  },
  skeletonItem: {
    height: 60,
    borderRadius: 8,
  },
  menuContent: {
    padding: Spacing.three,
    gap: Spacing.two,
  },
  menuHeaderTitle: {
    fontWeight: '700',
    fontSize: 14,
    marginBottom: Spacing.one,
  },
  menuItemCard: {
    borderRadius: 8,
    borderWidth: 1,
    padding: Spacing.two,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  itemName: {
    fontSize: 13,
    fontWeight: '600',
  },
  quantityBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  qtyText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  checkoutContent: {
    padding: Spacing.three,
    gap: Spacing.three,
  },
  summaryCard: {
    borderWidth: 1,
    borderRadius: 8,
    padding: Spacing.three,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryLabel: {
    fontSize: 12,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '800',
  },
  paymentButtonMock: {
    backgroundColor: '#8b5cf6',
    borderRadius: 8,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  payBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  deliveryContent: {
    flex: 1,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  mapContainer: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    position: 'relative',
    minHeight: 180,
    overflow: 'hidden',
  },
  mapGridLineH1: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '33%',
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  mapGridLineH2: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '66%',
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  mapGridLineV1: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '33%',
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  mapGridLineV2: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '66%',
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  userHomeMarker: {
    position: 'absolute',
    right: 30,
    top: 25,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    padding: 6,
    borderRadius: 12,
  },
  riderMarker: {
    position: 'absolute',
    backgroundColor: '#f59e0b',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  markerText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  deliveryInfoText: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: Spacing.one,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkboxMock: {
    width: 16,
    height: 16,
    borderWidth: 1.5,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxMockInner: {
    width: 8,
    height: 8,
    borderRadius: 1.5,
  },
  successTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: Spacing.two,
  },
  agentCursor: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
    zIndex: 9999,
  },
  cursorPulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  cursorTag: {
    position: 'absolute',
    top: 22,
    left: 10,
    backgroundColor: '#06b6d4',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  cursorTagText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: '700',
  },
});
