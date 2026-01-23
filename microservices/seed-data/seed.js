require('dotenv').config();
const axios = require('axios');
const mongoose = require('mongoose');

// Config
const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://user-service:3001';
const LOBBY_SERVICE_URL = process.env.LOBBY_SERVICE_URL || 'http://lobby-service:3002';
const RATING_SERVICE_URL = process.env.RATING_SERVICE_URL || 'http://rating-service:3003';

const USER_MONGODB_URI = process.env.USER_MONGODB_URI;
const LOBBY_MONGODB_URI = process.env.LOBBY_MONGODB_URI;
const RATING_MONGODB_URI = process.env.RATING_MONGODB_URI;

// Wait for services to be ready
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const waitForService = async (url, serviceName, maxRetries = 30) => {
  console.log(`Waiting for ${serviceName} to be ready...`);
  for (let i = 0; i < maxRetries; i++) {
    try {
      await axios.get(`${url}/health`);
      console.log(`✓ ${serviceName} is ready!`);
      return true;
    } catch (err) {
      console.log(`  Attempt ${i + 1}/${maxRetries}: ${serviceName} not ready yet...`);
      await sleep(2000);
    }
  }
  throw new Error(`${serviceName} failed to start`);
};

// Clear existing data
const clearDatabases = async () => {
  console.log('\n=== CLEARING EXISTING DATA ===');
  
  const userConn = await mongoose.createConnection(USER_MONGODB_URI);
  const lobbyConn = await mongoose.createConnection(LOBBY_MONGODB_URI);
  const ratingConn = await mongoose.createConnection(RATING_MONGODB_URI);
  
  await userConn.dropDatabase();
  console.log('✓ User database cleared');
  
  await lobbyConn.dropDatabase();
  console.log('✓ Lobby database cleared');
  
  await ratingConn.dropDatabase();
  console.log('✓ Rating database cleared');
  
  await userConn.close();
  await lobbyConn.close();
  await ratingConn.close();
};

// Seed users
const seedUsers = async () => {
  console.log('\n=== SEEDING USERS ===');
  
  const users = [
    { email: 'john.doe@example.com', password: 'password123', displayName: 'John Doe', favouriteSport: 'Football' },
    { email: 'jane.smith@example.com', password: 'password123', displayName: 'Jane Smith', favouriteSport: 'Basketball' },
    { email: 'mike.johnson@example.com', password: 'password123', displayName: 'Mike Johnson', favouriteSport: 'Tennis' },
    { email: 'sarah.williams@example.com', password: 'password123', displayName: 'Sarah Williams', favouriteSport: 'Volleyball' },
    { email: 'david.brown@example.com', password: 'password123', displayName: 'David Brown', favouriteSport: 'Football' },
    { email: 'emma.davis@example.com', password: 'password123', displayName: 'Emma Davis', favouriteSport: 'Basketball' },
    { email: 'james.wilson@example.com', password: 'password123', displayName: 'James Wilson', favouriteSport: 'Swimming' },
    { email: 'olivia.taylor@example.com', password: 'password123', displayName: 'Olivia Taylor', favouriteSport: 'Running' },
    { email: 'robert.anderson@example.com', password: 'password123', displayName: 'Robert Anderson', favouriteSport: 'Cycling' },
    { email: 'sophia.thomas@example.com', password: 'password123', displayName: 'Sophia Thomas', favouriteSport: 'Badminton' }
  ];
  
  const createdUsers = [];
  const userTokens = [];
  
  for (const user of users) {
    try {
      // Register user
      const registerResponse = await axios.post(`${USER_SERVICE_URL}/users`, user);
      createdUsers.push({
        ...registerResponse.data,
        email: user.email,
        password: user.password
      });
      
      // Login to get token
      const loginResponse = await axios.post(`${USER_SERVICE_URL}/users/login`, {
        email: user.email,
        password: user.password
      });
      userTokens.push(loginResponse.data.token);
      
      console.log(`✓ Created user: ${user.displayName}`);
    } catch (err) {
      console.error(`✗ Failed to create user ${user.displayName}:`, err.response?.data || err.message);
    }
  }
  
  return { createdUsers, userTokens };
};

// Seed friend relationships
const seedFriendships = async (createdUsers, userTokens) => {
  console.log('\n=== SEEDING FRIENDSHIPS ===');
  
  // Focus user is index 0 (John Doe)
  const focusUserIndex = 0;
  const focusUserToken = userTokens[focusUserIndex];
  
  // John Doe (focus user) will have:
  // - 2 accepted friends (Jane, Mike)
  // - 4 pending requests received (Sarah, David, Emma, James)
  // - 4 sent requests pending (Olivia, Robert, Sophia, and one more)
  
  // 1. Create accepted friendships
  const acceptedFriends = [1, 2]; // Jane, Mike
  for (const friendIndex of acceptedFriends) {
    try {
      // John sends request
      const requestResponse = await axios.post(
        `${USER_SERVICE_URL}/users/friend-requests`,
        { toUserId: createdUsers[friendIndex].id },
        { headers: { Authorization: `Bearer ${focusUserToken}` } }
      );
      
      // Friend accepts
      await axios.post(
        `${USER_SERVICE_URL}/users/friend-requests/${requestResponse.data._id}/respond`,
        { action: 'accept' },
        { headers: { Authorization: `Bearer ${userTokens[friendIndex]}` } }
      );
      
      console.log(`✓ ${createdUsers[focusUserIndex].displayName} ↔ ${createdUsers[friendIndex].displayName} (friends)`);
    } catch (err) {
      console.error(`✗ Failed to create friendship:`, err.response?.data || err.message);
    }
  }
  
  // 2. Create pending requests received by John (others send to John)
  const pendingReceived = [3, 4, 5, 6]; // Sarah, David, Emma, James
  for (const requesterIndex of pendingReceived) {
    try {
      await axios.post(
        `${USER_SERVICE_URL}/users/friend-requests`,
        { toUserId: createdUsers[focusUserIndex].id },
        { headers: { Authorization: `Bearer ${userTokens[requesterIndex]}` } }
      );
      
      console.log(`✓ ${createdUsers[requesterIndex].displayName} → ${createdUsers[focusUserIndex].displayName} (pending)`);
    } catch (err) {
      console.error(`✗ Failed to create friend request:`, err.response?.data || err.message);
    }
  }
  
  // 3. Create pending requests sent by John
  const pendingSent = [7, 8, 9]; // Olivia, Robert, Sophia
  for (const recipientIndex of pendingSent) {
    try {
      await axios.post(
        `${USER_SERVICE_URL}/users/friend-requests`,
        { toUserId: createdUsers[recipientIndex].id },
        { headers: { Authorization: `Bearer ${focusUserToken}` } }
      );
      
      console.log(`✓ ${createdUsers[focusUserIndex].displayName} → ${createdUsers[recipientIndex].displayName} (pending)`);
    } catch (err) {
      console.error(`✗ Failed to create friend request:`, err.response?.data || err.message);
    }
  }
  
  // 4. Create some friendships between other users
  const otherFriendships = [
    [1, 3], // Jane ↔ Sarah
    [2, 4], // Mike ↔ David
    [5, 6], // Emma ↔ James
    [7, 8], // Olivia ↔ Robert
  ];
  
  for (const [user1, user2] of otherFriendships) {
    try {
      const requestResponse = await axios.post(
        `${USER_SERVICE_URL}/users/friend-requests`,
        { toUserId: createdUsers[user2].id },
        { headers: { Authorization: `Bearer ${userTokens[user1]}` } }
      );
      
      await axios.post(
        `${USER_SERVICE_URL}/users/friend-requests/${requestResponse.data._id}/respond`,
        { action: 'accept' },
        { headers: { Authorization: `Bearer ${userTokens[user2]}` } }
      );
      
      console.log(`✓ ${createdUsers[user1].displayName} ↔ ${createdUsers[user2].displayName} (friends)`);
    } catch (err) {
      console.error(`✗ Failed to create friendship:`, err.response?.data || err.message);
    }
  }
};

// Seed lobbies
const seedLobbies = async (createdUsers, userTokens) => {
  console.log('\n=== SEEDING LOBBIES ===');
  
  const lobbiesData = [
    {
      owner: 0,
      sport: 'Football',
      location: 'Central Park Stadium',
      time: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
      maxPlayers: 10,
      description: 'Friendly football match, all levels welcome!',
      status: 'OPEN',
      players: [0, 1, 2]
    },
    {
      owner: 1,
      sport: 'Basketball',
      location: 'Downtown Court',
      time: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      maxPlayers: 8,
      description: '3v3 basketball tournament',
      status: 'FULL',
      players: [1, 3, 4, 5, 6, 7, 8, 9]
    },
    {
      owner: 2,
      sport: 'Tennis',
      location: 'City Tennis Club',
      time: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
      maxPlayers: 4,
      description: 'Doubles tennis match',
      status: 'FINISHED',
      players: [2, 3, 4, 5]
    },
    {
      owner: 0,
      sport: 'Football',
      location: 'West Side Field',
      time: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
      maxPlayers: 12,
      description: 'Competitive match',
      status: 'FINISHED',
      players: [0, 1, 2, 3, 4, 5]
    },
    {
      owner: 3,
      sport: 'Volleyball',
      location: 'Beach Volleyball Court',
      time: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      maxPlayers: 6,
      description: 'Beach volleyball fun',
      status: 'OPEN',
      players: [3, 6, 7]
    },
    {
      owner: 4,
      sport: 'Swimming',
      location: 'Olympic Pool',
      time: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
      maxPlayers: 8,
      description: 'Swimming competition',
      status: 'FINISHED',
      players: [4, 6, 7, 8]
    },
    {
      owner: 5,
      sport: 'Running',
      location: 'City Marathon Route',
      time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      maxPlayers: 20,
      description: '10K run event',
      status: 'OPEN',
      players: [5, 8, 9]
    },
    {
      owner: 0,
      sport: 'Basketball',
      location: 'North Arena',
      time: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // 5 hours ago
      maxPlayers: 10,
      description: 'Quick pickup game',
      status: 'FINISHED',
      players: [0, 1, 6, 7, 8]
    },
    {
      owner: 6,
      sport: 'Cycling',
      location: 'Mountain Trail',
      time: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
      maxPlayers: 15,
      description: 'Mountain bike trail ride',
      status: 'OPEN',
      players: [6, 9]
    },
    {
      owner: 7,
      sport: 'Badminton',
      location: 'Sports Complex',
      time: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
      maxPlayers: 4,
      description: 'Badminton doubles',
      status: 'OPEN',
      players: [7, 9]
    }
  ];
  
  const createdLobbies = [];
  
  for (const lobbyData of lobbiesData) {
    try {
      // Create lobby
      const lobbyResponse = await axios.post(
        `${LOBBY_SERVICE_URL}/lobbies`,
        {
          sport: lobbyData.sport,
          location: lobbyData.location,
          time: lobbyData.time,
          maxPlayers: lobbyData.maxPlayers,
          description: lobbyData.description
        },
        { headers: { Authorization: `Bearer ${userTokens[lobbyData.owner]}` } }
      );
      
      const lobbyId = lobbyResponse.data._id;
      
      // Add other players (skip owner as they're automatically added)
      for (const playerIndex of lobbyData.players) {
        if (playerIndex !== lobbyData.owner) {
          try {
            await axios.post(
              `${LOBBY_SERVICE_URL}/lobbies/${lobbyId}/join`,
              { displayName: createdUsers[playerIndex].displayName },
              { headers: { Authorization: `Bearer ${userTokens[playerIndex]}` } }
            );
          } catch (err) {
            // Ignore join errors (player might already be in lobby)
          }
        }
      }
      
      // Finish lobby if needed
      if (lobbyData.status === 'FINISHED') {
        await axios.put(
          `${LOBBY_SERVICE_URL}/lobbies/${lobbyId}/finish`,
          {},
          { headers: { Authorization: `Bearer ${userTokens[lobbyData.owner]}` } }
        );
      }
      
      createdLobbies.push({
        ...lobbyResponse.data,
        _id: lobbyId,
        players: lobbyData.players
      });
      
      console.log(`✓ Created ${lobbyData.status} lobby: ${lobbyData.sport} at ${lobbyData.location}`);
    } catch (err) {
      console.error(`✗ Failed to create lobby:`, err.response?.data || err.message);
    }
  }
  
  return createdLobbies;
};

// Seed ratings
const seedRatings = async (createdUsers, userTokens, createdLobbies) => {
  console.log('\n=== SEEDING RATINGS ===');
  
  const focusUserIndex = 0; // John Doe
  
  // Map lobbies by their characteristics for easier reference
  const tennisLobby = createdLobbies.find(l => l.sport === 'Tennis' && l.status === 'FINISHED');
  const footballFinishedLobby = createdLobbies.find(l => 
    l.sport === 'Football' && 
    l.status === 'FINISHED' && 
    l.location === 'West Side Field'
  );
  const swimmingLobby = createdLobbies.find(l => l.sport === 'Swimming' && l.status === 'FINISHED');
  const basketballFinishedLobby = createdLobbies.find(l => 
    l.sport === 'Basketball' && 
    l.status === 'FINISHED' &&
    l.location === 'North Arena'
  );
  
  if (!tennisLobby || !footballFinishedLobby || !swimmingLobby || !basketballFinishedLobby) {
    console.error('✗ Could not find all required finished lobbies for ratings');
    console.log('Available lobbies:', createdLobbies.map(l => ({ sport: l.sport, status: l.status, location: l.location })));
    return;
  }
  
  const ratings = [
    // Ratings in Tennis match
    { from: 3, to: 2, lobby: tennisLobby, type: 'LIKE', category: 'Friendly' },
    { from: 4, to: 2, lobby: tennisLobby, type: 'LIKE', category: 'Sporty' },
    { from: 5, to: 3, lobby: tennisLobby, type: 'LIKE', category: 'Fair' },
    
    // Ratings in Football match - Focus user receives many
    { from: 1, to: 0, lobby: footballFinishedLobby, type: 'LIKE', category: 'Friendly' },
    { from: 2, to: 0, lobby: footballFinishedLobby, type: 'LIKE', category: 'Communicative' },
    { from: 3, to: 0, lobby: footballFinishedLobby, type: 'LIKE', category: 'Sporty' },
    { from: 4, to: 0, lobby: footballFinishedLobby, type: 'LIKE', category: 'Fair' },
    { from: 5, to: 0, lobby: footballFinishedLobby, type: 'DISLIKE', category: 'Aggressive' },
    // Focus user rates others
    { from: 0, to: 1, lobby: footballFinishedLobby, type: 'LIKE', category: 'Friendly' },
    { from: 0, to: 2, lobby: footballFinishedLobby, type: 'LIKE', category: 'Sporty' },
    { from: 0, to: 3, lobby: footballFinishedLobby, type: 'DISLIKE', category: 'Toxic' },
    
    // Ratings in Swimming match
    { from: 6, to: 4, lobby: swimmingLobby, type: 'LIKE', category: 'Sporty' },
    { from: 7, to: 4, lobby: swimmingLobby, type: 'LIKE', category: 'Fair' },
    { from: 8, to: 6, lobby: swimmingLobby, type: 'LIKE', category: 'Communicative' },
    
    // Ratings in Basketball match - Focus user involved
    { from: 1, to: 0, lobby: basketballFinishedLobby, type: 'LIKE', category: 'Friendly' },
    { from: 6, to: 0, lobby: basketballFinishedLobby, type: 'LIKE', category: 'Sporty' },
    { from: 7, to: 0, lobby: basketballFinishedLobby, type: 'LIKE', category: 'Fair' },
    { from: 8, to: 0, lobby: basketballFinishedLobby, type: 'DISLIKE', category: 'Sloppy' },
    // Focus user rates others
    { from: 0, to: 1, lobby: basketballFinishedLobby, type: 'LIKE', category: 'Communicative' },
    { from: 0, to: 6, lobby: basketballFinishedLobby, type: 'LIKE', category: 'Friendly' },
    { from: 0, to: 7, lobby: basketballFinishedLobby, type: 'DISLIKE', category: 'Unfair' },
  ];
  
  let successCount = 0;
  let failCount = 0;
  
  for (const rating of ratings) {
    try {
      if (!rating.lobby) {
        console.error(`✗ Lobby not found for rating`);
        failCount++;
        continue;
      }
      
      const mutation = `
        mutation {
          submitRating(input: {
            toUserId: "${createdUsers[rating.to].id}"
            lobbyId: "${rating.lobby._id}"
            type: ${rating.type}
            category: ${rating.category}
          }) {
            _id
            type
            category
          }
        }
      `;
      
      const response = await axios.post(
        `${RATING_SERVICE_URL}/graphql`,
        { query: mutation },
        { headers: { Authorization: `Bearer ${userTokens[rating.from]}` } }
      );
      
      if (response.data.errors) {
        console.error(`✗ GraphQL Error:`, response.data.errors[0].message);
        failCount++;
      } else {
        console.log(`✓ ${createdUsers[rating.from].displayName} → ${createdUsers[rating.to].displayName}: ${rating.type} (${rating.category})`);
        successCount++;
      }
    } catch (err) {
      console.error(`✗ Failed to create rating:`, err.response?.data || err.message);
      if (err.response?.data?.errors) {
        console.error('  GraphQL errors:', err.response.data.errors);
      }
      failCount++;
    }
  }
  
  console.log(`\n✓ Successfully created ${successCount} ratings`);
  if (failCount > 0) {
    console.log(`✗ Failed to create ${failCount} ratings`);
  }
};

// Main seeding function
const seed = async () => {
  try {
    console.log('=== SPORTS MATCHMAKING DATABASE SEEDING ===\n');
    
    // Wait for all services
    await waitForService(USER_SERVICE_URL, 'User Service');
    await waitForService(LOBBY_SERVICE_URL, 'Lobby Service');
    await waitForService(RATING_SERVICE_URL, 'Rating Service');
    
    // Clear existing data
    await clearDatabases();
    
    // Seed data
    const { createdUsers, userTokens } = await seedUsers();
    await seedFriendships(createdUsers, userTokens);
    const createdLobbies = await seedLobbies(createdUsers, userTokens);
    
    // Wait a bit for lobbies to be fully created
    await sleep(3000);
    
    await seedRatings(createdUsers, userTokens, createdLobbies);
    
    // Verify ratings were created
    console.log('\n=== VERIFYING RATINGS ===');
    try {
      const focusUserToken = userTokens[0];
      const ratingsQuery = `
        query {
          myRatings {
            _id
            type
            category
            lobbyId
            createdAt
          }
        }
      `;
      
      const ratingsResponse = await axios.post(
        `${RATING_SERVICE_URL}/graphql`,
        { query: ratingsQuery },
        { headers: { Authorization: `Bearer ${focusUserToken}` } }
      );
      
      if (ratingsResponse.data.errors) {
        console.error('✗ Error fetching ratings:', ratingsResponse.data.errors);
      } else {
        const ratings = ratingsResponse.data.data.myRatings;
        console.log(`✓ John Doe has ${ratings.length} ratings`);
        
        // Get stats
        const statsQuery = `
          query {
            myRatingStats {
              totalRatings
              likes {
                total
                Friendly
                Communicative
                Sporty
                Fair
              }
              dislikes {
                total
                Toxic
                Aggressive
                Sloppy
                Unfair
              }
            }
          }
        `;
        
        const statsResponse = await axios.post(
          `${RATING_SERVICE_URL}/graphql`,
          { query: statsQuery },
          { headers: { Authorization: `Bearer ${focusUserToken}` } }
        );
        
        if (statsResponse.data.errors) {
          console.error('✗ Error fetching stats:', statsResponse.data.errors);
        } else {
          const stats = statsResponse.data.data.myRatingStats;
          console.log('✓ Rating stats:', JSON.stringify(stats, null, 2));
        }
      }
    } catch (err) {
      console.error('✗ Failed to verify ratings:', err.response?.data || err.message);
    }
    
    console.log('\n=== SEEDING COMPLETED SUCCESSFULLY ===');
    console.log('\nFocus User (John Doe):');
    console.log(`  Email: john.doe@example.com`);
    console.log(`  Password: password123`);
    console.log(`  - 2 accepted friends`);
    console.log(`  - 4 pending friend requests received`);
    console.log(`  - 3 pending friend requests sent`);
    console.log(`  - Multiple ratings received and sent\n`);
    
    process.exit(0);
  } catch (err) {
    console.error('\n=== SEEDING FAILED ===');
    console.error(err);
    process.exit(1);
  }
};

// Run seeding
seed();