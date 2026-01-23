const axios = require('axios');

// Configuration
const USER_SERVICE = process.env.USER_SERVICE_URL || 'http://localhost:3001';
const LOBBY_SERVICE = process.env.LOBBY_SERVICE_URL || 'http://localhost:3002';
const RATING_SERVICE = process.env.RATING_SERVICE_URL || 'http://localhost:3003';

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m'
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  section: (msg) => console.log(`\n${colors.bright}${colors.blue}═══ ${msg} ═══${colors.reset}\n`)
};

// Test users data
const testUsers = [
  {
    email: 'john.doe@test.com',
    password: 'Test123!',
    displayName: 'John Doe',
    favouriteSport: 'Football'
  },
  {
    email: 'jane.smith@test.com',
    password: 'Test123!',
    displayName: 'Jane Smith',
    favouriteSport: 'Basketball'
  },
  {
    email: 'mike.wilson@test.com',
    password: 'Test123!',
    displayName: 'Mike Wilson',
    favouriteSport: 'Tennis'
  },
  {
    email: 'sarah.jones@test.com',
    password: 'Test123!',
    displayName: 'Sarah Jones',
    favouriteSport: 'Football'
  },
  {
    email: 'alex.brown@test.com',
    password: 'Test123!',
    displayName: 'Alex Brown',
    favouriteSport: 'Volleyball'
  },
  {
    email: 'emma.davis@test.com',
    password: 'Test123!',
    displayName: 'Emma Davis',
    favouriteSport: 'Swimming'
  },
  {
    email: 'chris.taylor@test.com',
    password: 'Test123!',
    displayName: 'Chris Taylor',
    favouriteSport: 'Basketball'
  },
  {
    email: 'lisa.anderson@test.com',
    password: 'Test123!',
    displayName: 'Lisa Anderson',
    favouriteSport: 'Running'
  }
];

const users = {};

// Register users
async function registerUsers() {
  log.section('Registering Users');
  
  for (const userData of testUsers) {
    try {
      const response = await axios.post(`${USER_SERVICE}/users`, userData);
      users[userData.email] = {
        ...userData,
        id: response.data.id
      };
      log.success(`Registered: ${userData.displayName} (${userData.email})`);
      await delay(100);
    } catch (error) {
      if (error.response?.status === 409) {
        log.warn(`User already exists: ${userData.email}`);
        // Try to login to get ID
        try {
          const loginResponse = await axios.post(`${USER_SERVICE}/users/login`, {
            email: userData.email,
            password: userData.password
          });
          users[userData.email] = {
            ...userData,
            token: loginResponse.data.token
          };
        } catch (loginError) {
          log.error(`Failed to login existing user: ${userData.email}`);
        }
      } else {
        log.error(`Failed to register ${userData.email}: ${error.message}`);
      }
    }
  }
}

// Login users to get tokens
async function loginUsers() {
  log.section('Logging in Users');
  
  for (const email of Object.keys(users)) {
    try {
      const response = await axios.post(`${USER_SERVICE}/users/login`, {
        email: email,
        password: users[email].password
      });
      users[email].token = response.data.token;
      log.success(`Logged in: ${users[email].displayName}`);
      await delay(100);
    } catch (error) {
      log.error(`Failed to login ${email}: ${error.message}`);
    }
  }
}

// Create friend requests and accept them
async function createFriendships() {
  log.section('Creating Friendships');
  
  const friendships = [
    // John's friends
    ['john.doe@test.com', 'jane.smith@test.com'],
    ['john.doe@test.com', 'mike.wilson@test.com'],
    ['john.doe@test.com', 'sarah.jones@test.com'],
    ['john.doe@test.com', 'alex.brown@test.com'],
    
    // Jane's additional friends
    ['jane.smith@test.com', 'emma.davis@test.com'],
    ['jane.smith@test.com', 'chris.taylor@test.com'],
    ['jane.smith@test.com', 'sarah.jones@test.com'],
    
    // Mike's additional friends
    ['mike.wilson@test.com', 'lisa.anderson@test.com'],
    ['mike.wilson@test.com', 'alex.brown@test.com'],
    
    // Cross friendships
    ['sarah.jones@test.com', 'emma.davis@test.com'],
    ['alex.brown@test.com', 'chris.taylor@test.com'],
    ['chris.taylor@test.com', 'lisa.anderson@test.com']
  ];
  
  for (const [fromEmail, toEmail] of friendships) {
    try {
      const fromUser = users[fromEmail];
      const toUser = users[toEmail];
      
      // Send friend request
      await axios.post(
        `${USER_SERVICE}/users/friend-requests`,
        { toUserId: toUser.id },
        { headers: { Authorization: `Bearer ${fromUser.token}` } }
      );
      
      await delay(100);
      
      // Accept friend request
      await axios.post(
        `${USER_SERVICE}/users/friend-requests/${fromUser.id}/resolve`,
        { action: 'accept' },
        { headers: { Authorization: `Bearer ${toUser.token}` } }
      );
      
      log.success(`${fromUser.displayName} ↔ ${toUser.displayName}`);
      await delay(100);
    } catch (error) {
      if (error.response?.data?.error?.includes('already')) {
        log.warn(`Friendship already exists: ${fromEmail} ↔ ${toEmail}`);
      } else {
        log.error(`Failed to create friendship: ${error.response?.data?.error || error.message}`);
      }
    }
  }
}

// Create lobbies
async function createLobbies() {
  log.section('Creating Lobbies');
  
  const lobbiesData = [
    {
      owner: 'john.doe@test.com',
      sport: 'Football',
      location: 'Central Park Stadium',
      time: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days from now
      maxPlayers: 10,
      description: 'Friendly football match, all levels welcome!'
    },
    {
      owner: 'jane.smith@test.com',
      sport: 'Basketball',
      location: 'Downtown Sports Center',
      time: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      maxPlayers: 8,
      description: '3v3 basketball tournament'
    },
    {
      owner: 'mike.wilson@test.com',
      sport: 'Tennis',
      location: 'City Tennis Courts',
      time: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
      maxPlayers: 4,
      description: 'Doubles tennis match'
    },
    {
      owner: 'sarah.jones@test.com',
      sport: 'Football',
      location: 'University Stadium',
      time: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
      maxPlayers: 12,
      description: 'Competitive 5v5 match'
    },
    {
      owner: 'emma.davis@test.com',
      sport: 'Swimming',
      location: 'Olympic Pool',
      time: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      maxPlayers: 6,
      description: 'Morning swim session'
    },
    // FINISHED LOBBY for ratings
    {
      owner: 'john.doe@test.com',
      sport: 'Football',
      location: 'Victory Stadium',
      time: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
      maxPlayers: 8,
      description: 'Weekend match (FINISHED)',
      finished: true
    }
  ];
  
  const lobbies = [];
  
  for (const lobbyData of lobbiesData) {
    try {
      const owner = users[lobbyData.owner];
      const { finished, ...createData } = lobbyData;
      
      const response = await axios.post(
        `${LOBBY_SERVICE}/lobbies`,
        createData,
        { headers: { Authorization: `Bearer ${owner.token}` } }
      );
      
      lobbies.push({
        ...response.data,
        ownerEmail: lobbyData.owner,
        finished: finished || false
      });
      
      log.success(`Created lobby: ${lobbyData.sport} @ ${lobbyData.location} by ${owner.displayName}`);
      await delay(200);
    } catch (error) {
      log.error(`Failed to create lobby: ${error.response?.data?.error || error.message}`);
    }
  }
  
  return lobbies;
}

// Join users to lobbies
async function joinLobbies(lobbies) {
  log.section('Joining Lobbies');
  
  const joins = [
    // Football match 1
    { lobbyIndex: 0, emails: ['jane.smith@test.com', 'mike.wilson@test.com', 'sarah.jones@test.com', 'alex.brown@test.com'] },
    // Basketball
    { lobbyIndex: 1, emails: ['john.doe@test.com', 'chris.taylor@test.com', 'alex.brown@test.com'] },
    // Tennis
    { lobbyIndex: 2, emails: ['lisa.anderson@test.com', 'emma.davis@test.com'] },
    // Football match 2
    { lobbyIndex: 3, emails: ['john.doe@test.com', 'jane.smith@test.com', 'mike.wilson@test.com', 'alex.brown@test.com', 'chris.taylor@test.com'] },
    // Swimming
    { lobbyIndex: 4, emails: ['jane.smith@test.com', 'sarah.jones@test.com'] },
    // FINISHED lobby for ratings
    { lobbyIndex: 5, emails: ['jane.smith@test.com', 'mike.wilson@test.com', 'sarah.jones@test.com', 'alex.brown@test.com', 'emma.davis@test.com'] }
  ];
  
  for (const join of joins) {
    const lobby = lobbies[join.lobbyIndex];
    if (!lobby) continue;
    
    for (const email of join.emails) {
      try {
        const user = users[email];
        
        await axios.post(
          `${LOBBY_SERVICE}/lobbies/${lobby._id}/join`,
          {},
          { headers: { Authorization: `Bearer ${user.token}` } }
        );
        
        log.success(`${user.displayName} joined ${lobby.sport} @ ${lobby.location}`);
        await delay(150);
      } catch (error) {
        if (error.response?.data?.error?.includes('already')) {
          log.warn(`${email} already in lobby`);
        } else {
          log.error(`Failed to join lobby: ${error.response?.data?.error || error.message}`);
        }
      }
    }
  }
}

// Finish lobby for ratings
async function finishLobbies(lobbies) {
  log.section('Finishing Lobbies');
  
  for (const lobby of lobbies) {
    if (lobby.finished) {
      try {
        const owner = users[lobby.ownerEmail];
        
        await axios.patch(
          `${LOBBY_SERVICE}/lobbies/${lobby._id}/finish`,
          {},
          { headers: { Authorization: `Bearer ${owner.token}` } }
        );
        
        log.success(`Finished lobby: ${lobby.sport} @ ${lobby.location}`);
        await delay(200);
      } catch (error) {
        log.error(`Failed to finish lobby: ${error.response?.data?.error || error.message}`);
      }
    }
  }
}

// Submit ratings
async function submitRatings(lobbies) {
  log.section('Submitting Ratings');
  
  const finishedLobby = lobbies.find(l => l.finished);
  if (!finishedLobby) {
    log.warn('No finished lobby found for ratings');
    return;
  }
  
  const ratings = [
    // John rates others
    { from: 'john.doe@test.com', to: 'jane.smith@test.com', type: 'LIKE', category: 'Friendly' },
    { from: 'john.doe@test.com', to: 'mike.wilson@test.com', type: 'LIKE', category: 'Sporty' },
    { from: 'john.doe@test.com', to: 'sarah.jones@test.com', type: 'LIKE', category: 'Fair' },
    { from: 'john.doe@test.com', to: 'alex.brown@test.com', type: 'LIKE', category: 'Communicative' },
    
    // Jane rates others
    { from: 'jane.smith@test.com', to: 'john.doe@test.com', type: 'LIKE', category: 'Sporty' },
    { from: 'jane.smith@test.com', to: 'mike.wilson@test.com', type: 'LIKE', category: 'Fair' },
    { from: 'jane.smith@test.com', to: 'sarah.jones@test.com', type: 'LIKE', category: 'Friendly' },
    
    // Mike rates others
    { from: 'mike.wilson@test.com', to: 'john.doe@test.com', type: 'LIKE', category: 'Fair' },
    { from: 'mike.wilson@test.com', to: 'jane.smith@test.com', type: 'LIKE', category: 'Communicative' },
    { from: 'mike.wilson@test.com', to: 'alex.brown@test.com', type: 'DISLIKE', category: 'Sloppy' },
    
    // Sarah rates others
    { from: 'sarah.jones@test.com', to: 'john.doe@test.com', type: 'LIKE', category: 'Friendly' },
    { from: 'sarah.jones@test.com', to: 'jane.smith@test.com', type: 'LIKE', category: 'Sporty' },
    
    // Alex rates others
    { from: 'alex.brown@test.com', to: 'john.doe@test.com', type: 'LIKE', category: 'Fair' },
    { from: 'alex.brown@test.com', to: 'emma.davis@test.com', type: 'LIKE', category: 'Friendly' },
    
    // Emma rates others
    { from: 'emma.davis@test.com', to: 'john.doe@test.com', type: 'LIKE', category: 'Communicative' },
    { from: 'emma.davis@test.com', to: 'jane.smith@test.com', type: 'LIKE', category: 'Friendly' }
  ];
  
  for (const rating of ratings) {
    try {
      const fromUser = users[rating.from];
      const toUser = users[rating.to];
      
      const mutation = `
        mutation {
          submitRating(input: {
            toUserId: "${toUser.id}"
            lobbyId: "${finishedLobby._id}"
            type: ${rating.type}
            category: ${rating.category}
          }) {
            _id
            type
            category
          }
        }
      `;
      
      await axios.post(
        `${RATING_SERVICE}/graphql`,
        { query: mutation },
        { headers: { Authorization: `Bearer ${fromUser.token}` } }
      );
      
      log.success(`${fromUser.displayName} rated ${toUser.displayName}: ${rating.type} - ${rating.category}`);
      await delay(200);
    } catch (error) {
      if (error.response?.data?.errors) {
        log.error(`Rating failed: ${error.response.data.errors[0].message}`);
      } else {
        log.error(`Rating failed: ${error.message}`);
      }
    }
  }
}

// Main seed function
async function seed() {
  console.log(`${colors.bright}${colors.blue}`);
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                                                            ║');
  console.log('║              🌱 SEEDING DATABASE 🌱                        ║');
  console.log('║                                                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(colors.reset);
  
  log.info('Waiting for services to be ready...');
  await delay(5000);
  
  try {
    await registerUsers();
    await delay(1000);
    
    await loginUsers();
    await delay(1000);
    
    await createFriendships();
    await delay(1000);
    
    const lobbies = await createLobbies();
    await delay(1000);
    
    await joinLobbies(lobbies);
    await delay(1000);
    
    await finishLobbies(lobbies);
    await delay(1000);
    
    await submitRatings(lobbies);
    
    log.section('Seed Summary');
    log.success(`✓ ${Object.keys(users).length} users created`);
    log.success(`✓ Friendships established`);
    log.success(`✓ ${lobbies.length} lobbies created`);
    log.success(`✓ Users joined lobbies`);
    log.success(`✓ Ratings submitted`);
    
    console.log(`\n${colors.bright}${colors.green}`);
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║                                                            ║');
    console.log('║              ✅ SEEDING COMPLETED! ✅                      ║');
    console.log('║                                                            ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log(colors.reset);
    
    console.log(`\n${colors.bright}Main Test Accounts:${colors.reset}`);
    console.log(`${colors.yellow}Email:${colors.reset} john.doe@test.com`);
    console.log(`${colors.yellow}Password:${colors.reset} Test123!`);
    console.log(`\n${colors.yellow}Email:${colors.reset} jane.smith@test.com`);
    console.log(`${colors.yellow}Password:${colors.reset} Test123!\n`);
    
  } catch (error) {
    log.error(`Seeding failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Run seed
seed().then(() => {
  log.info('Seed script completed successfully');
  process.exit(0);
}).catch(error => {
  log.error(`Seed script failed: ${error.message}`);
  process.exit(1);
});