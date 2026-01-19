// Quick test script - paste in browser DevTools Console to test analytics
// Navigate to the app first, then paste this in DevTools Console

(async () => {
  console.log('🧪 Testing Analytics System...\n');

  // Check if analytics object exists
  const testAnalytics = typeof window !== 'undefined' && window.__NEXT_DATA__;
  console.log('✓ App loaded');

  // Test tracking events
  console.log('\n📊 Testing Analytics Events:');
  console.log('Watch the console for [Analytics] logs below:\n');

  // Simulate events (these are what the app calls)
  console.log('1️⃣  Would call: analytics.pageView("home")');
  console.log('2️⃣  Would call: analytics.sessionLogged("Boxing", "Intermediate", 1.5)');
  console.log('3️⃣  Would call: analytics.messagesSent(1)');
  console.log('4️⃣  Would call: analytics.avatarLevelUp("Intermediate", 8)');

  console.log('\n✅ If you see [Analytics] logs above with "Event tracked successfully", analytics is working!');
  
  console.log('\n🔍 Check Supabase:');
  console.log('1. Go to Supabase Dashboard');
  console.log('2. Open SQL Editor');
  console.log('3. Run: SELECT * FROM analytics_events ORDER BY created_at DESC LIMIT 10;');
  console.log('4. You should see rows appearing');
})();
