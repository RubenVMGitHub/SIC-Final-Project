const amqp = require('amqplib');
const logger = require('./logger');

let channel = null;
let connection = null;

const connect = async () => {
  try {
    const rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://guest:guest@rabbitmq:5672/';
    
    connection = await amqp.connect(rabbitmqUrl);
    channel = await connection.createChannel();
    
    // Declare the queue
    await channel.assertQueue('lobby.events', { durable: true });
    
    logger.info('RabbitMQ connected successfully');
    
    // Handle connection errors
    connection.on('error', (err) => {
      logger.error('RabbitMQ connection error:', err);
    });
    
    connection.on('close', () => {
      logger.warn('RabbitMQ connection closed, attempting to reconnect...');
      setTimeout(connect, 5000);
    });
    
    return channel;
  } catch (error) {
    logger.error('Failed to connect to RabbitMQ:', error);
    setTimeout(connect, 5000);
  }
};

const getChannel = () => {
  if (!channel) {
    logger.warn('RabbitMQ channel not initialized');
  }
  return channel;
};

const publishLobbyJoin = async (lobbyId, ownerId, playerId, lobbyName) => {
  try {
    const ch = getChannel();
    if (!ch) {
      logger.error('Cannot publish: RabbitMQ channel not available');
      return;
    }
    
    const event = {
      type: 'lobby.user.joined',
      lobbyId: lobbyId,
      ownerId: ownerId,
      playerId: playerId,
      lobbyName: lobbyName,
      createdAt: new Date().toISOString()
    };
    
    ch.sendToQueue(
      'lobby.events',
      Buffer.from(JSON.stringify(event)),
      { persistent: true }
    );
    
    logger.info(`Published lobby join event: ${playerId} joined ${lobbyName}`);
  } catch (error) {
    logger.error('Failed to publish lobby join event:', error);
  }
};

const close = async () => {
  try {
    if (channel) await channel.close();
    if (connection) await connection.close();
    logger.info('RabbitMQ connection closed');
  } catch (error) {
    logger.error('Error closing RabbitMQ connection:', error);
  }
};

module.exports = {
  connect,
  getChannel,
  publishLobbyJoin,
  close
};