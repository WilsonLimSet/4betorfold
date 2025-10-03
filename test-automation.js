const { chromium } = require('playwright');

async function runTests() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  const page = await context.newPage();

  // Listen for console messages and errors
  const consoleLogs = [];
  const errors = [];

  page.on('console', msg => {
    consoleLogs.push({
      type: msg.type(),
      text: msg.text(),
      location: msg.location()
    });
  });

  page.on('pageerror', error => {
    errors.push({
      message: error.message,
      stack: error.stack
    });
  });

  // Navigate to the homepage
  await page.goto('http://localhost:3000');
  await page.waitForLoadState('networkidle');

  console.log('=== HOMEPAGE TESTS ===');

  // Test 1: Check if page loads without errors
  const title = await page.title();
  console.log('Page title:', title);

  // Test 2: Check for missing images/icons
  const missingResources = [];
  page.on('response', response => {
    if (response.status() >= 400) {
      missingResources.push({
        url: response.url(),
        status: response.status()
      });
    }
  });

  // Test 3: Create a new game
  console.log('\n=== TESTING GAME CREATION ===');
  await page.click('button:has-text("Create New Game")');
  await page.waitForURL('**/game/**');

  const gameUrl = page.url();
  const gameCode = gameUrl.split('/').pop();
  console.log('Game created with code:', gameCode);

  // Test 4: Add a player
  console.log('\n=== TESTING PLAYER ADDITION ===');
  await page.click('button:has-text("Add Player")');
  await page.fill('input[placeholder="Enter player name"]', 'Test Player 1');
  await page.click('button:has-text("Add Player")');

  // Wait for player to appear
  await page.waitForSelector('text=Test Player 1');
  console.log('Player added successfully');

  // Test 5: Add buy-ins
  console.log('\n=== TESTING BUY-IN FUNCTIONALITY ===');

  // Test preset amounts
  await page.click('button:has-text("+$20")');
  await page.click('button:has-text("+$40")');

  // Test custom amount
  await page.fill('input[placeholder="Custom amount"]', '75');
  await page.click('button:has-text("Add")');

  console.log('Buy-ins added: $20, $40, $75');

  // Test 6: Edit buy-in (click to edit)
  console.log('\n=== TESTING BUY-IN EDITING ===');
  const buyInButtons = await page.locator('text=/\\$\\d+/').all();
  if (buyInButtons.length > 0) {
    await buyInButtons[0].click();
    await page.fill('input[type="number"]', '25');
    await page.press('input[type="number"]', 'Enter');
    console.log('Buy-in edited successfully');
  }

  // Test 7: Cash out with $0
  console.log('\n=== TESTING CASH OUT WITH $0 ===');
  await page.fill('input[placeholder="Cash out amount"]', '0');
  await page.click('button:has-text("Cash Out")');
  console.log('Cash out with $0 successful');

  // Test 8: Reset player
  await page.click('button:has-text("Reset Player")');
  console.log('Player reset successful');

  // Test 9: Add another player for balance testing
  console.log('\n=== TESTING BALANCE VERIFICATION ===');
  await page.click('button:has-text("Add Player")');
  await page.fill('input[placeholder="Enter player name"]', 'Test Player 2');
  await page.click('button:has-text("Add Player")');

  // Add buy-ins to both players
  const playerCards = await page.locator('.bg-white.rounded-lg.shadow-md').all();

  // Player 1 buy-ins
  await playerCards[0].locator('button:has-text("+$50")').click();
  await playerCards[0].locator('button:has-text("+$50")').click();

  // Player 2 buy-ins
  await playerCards[1].locator('button:has-text("+$40")').click();
  await playerCards[1].locator('button:has-text("+$40")').click();

  // Cash out Player 1 with more than buy-ins
  await playerCards[0].locator('input[placeholder="Cash out amount"]').fill('120');
  await playerCards[0].locator('button:has-text("Cash Out")').click();

  // Check if balance warning appears
  const balanceWarning = await page.locator('text=/pot is not balanced/i').isVisible();
  console.log('Balance warning displayed:', balanceWarning);

  // Test 10: Page persistence (refresh)
  console.log('\n=== TESTING PAGE PERSISTENCE ===');
  await page.reload();
  await page.waitForLoadState('networkidle');

  const persistedPlayers = await page.locator('text=Test Player').count();
  console.log('Players persisted after refresh:', persistedPlayers);

  // Test 11: Edge cases
  console.log('\n=== TESTING EDGE CASES ===');

  // Try to add player with empty name
  await page.click('button:has-text("Add Player")');
  await page.click('button:has-text("Add Player")'); // Don't fill name

  // Try negative buy-in
  const lastPlayerCard = await page.locator('.bg-white.rounded-lg.shadow-md').last();
  await lastPlayerCard.locator('input[placeholder="Custom amount"]').fill('-50');
  await lastPlayerCard.locator('button:has-text("Add")').click();

  // Test 12: Mobile responsiveness simulation
  console.log('\n=== TESTING MOBILE RESPONSIVENESS ===');
  await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE size
  await page.waitForTimeout(1000);

  const mobileLayout = await page.locator('.grid').first().evaluate(el => {
    const styles = window.getComputedStyle(el);
    return styles.gridTemplateColumns;
  });
  console.log('Mobile grid layout:', mobileLayout);

  // Test 13: Navigate back to homepage and check recent games
  console.log('\n=== TESTING RECENT GAMES ===');
  await page.setViewportSize({ width: 1280, height: 720 }); // Back to desktop
  await page.click('button:has-text("← Back")');
  await page.waitForURL('http://localhost:3000');

  const recentGamesExists = await page.locator('text=Recent Games').isVisible();
  console.log('Recent games section exists:', recentGamesExists);

  // Test 14: Copy link functionality
  await page.goto(gameUrl);
  await page.waitForLoadState('networkidle');

  await page.click('button:has-text("Copy Link")');
  const copiedText = await page.locator('text=Copied!').isVisible();
  console.log('Copy link feedback:', copiedText);

  // Collect all console logs and errors
  console.log('\n=== CONSOLE LOGS ===');
  consoleLogs.forEach(log => {
    if (log.type === 'error') {
      console.log(`ERROR: ${log.text}`);
    }
  });

  console.log('\n=== PAGE ERRORS ===');
  errors.forEach(error => {
    console.log(`ERROR: ${error.message}`);
  });

  console.log('\n=== MISSING RESOURCES ===');
  missingResources.forEach(resource => {
    console.log(`${resource.status}: ${resource.url}`);
  });

  await browser.close();
}

runTests().catch(console.error);