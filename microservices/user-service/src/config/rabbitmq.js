const amqp = require('amqplib');
const logger = require('./logger');

let channel = null;
let connection = null;

const connect = async () => {
  try {
    const rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://guest:guest@rabbitmq:5672/';
    
    logger.info({ url: rabbitmqUrl.split('@')[1] }, 'Connecting to RabbitMQ');
    
    connection = await amqp.connect(rabbitmqUrl);
    channel = await connection.createChannel();
    
    // Declare the queue
    await channel.assertQueue('friend.requests', { durable: true });
    
    logger.info('RabbitMQ connected successfully');
    
    // Handle connection errors
    connection.on('error', (err) => {
      logger.error({ err }, 'RabbitMQ connection error');
    });
    
    connection.on('close', () => {
      logger.warn('RabbitMQ connection closed, attempting to reconnect in 5s...');
      setTimeout(connect, 5000);
    });
    
    return channel;
  } catch (error) {
    logger.error({ err: error }, 'Failed to connect to RabbitMQ, retrying in 5s...');
    setTimeout(connect, 5000);
  }
};

const getChannel = () => {
  if (!channel) {
    logger.warn('RabbitMQ channel not initialized');
  }
  return channel;
};

const publishFriendRequest = async (fromUserId, toUserId) => {
  try {
    const ch = getChannel();
    if (!ch) {
      logger.error('Cannot publish: RabbitMQ channel not available');
      return;
    }
    
    const event = {
      type: 'friend.request.sent',
      fromUserId: fromUserId,
      toUserId: toUserId,
      createdAt: new Date().toISOString()
    };
    
    ch.sendToQueue(
      'friend.requests',
      Buffer.from(JSON.stringify(event)),
      { persistent: true }
    );
    
    logger.info({
      fromUserId,
      toUserId,
      queue: 'friend.requests'
    }, 'Published friend request event to RabbitMQ');
  } catch (error) {
    logger.error({
      err: error,
      fromUserId,
      toUserId
    }, 'Failed to publish friend request event');
  }
};

const close = async () => {
  try {
    if (channel) {
      await channel.close();
      logger.debug('RabbitMQ channel closed');
    }
    if (connection) {
      await connection.close();
      logger.info('RabbitMQ connection closed');
    }
  } catch (error) {
    logger.error({ err: error }, 'Error closing RabbitMQ connection');
  }
};

module.exports = {
  connect,
  getChannel,
  publishFriendRequest,
  close
};