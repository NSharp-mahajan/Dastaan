import mongoose from 'mongoose';

// State tracking for health reporting
let connectionState = {
  status: 'disconnected',
  error: null,
  host: null,
  name: null
};

export const connectDB = async () => {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    connectionState = {
      status: 'disconnected',
      error: 'MONGODB_URI environment variable is not defined',
      host: null,
      name: null
    };
    console.warn('[MongoDB] Warning: MONGODB_URI is not set. Database remains disconnected.');
    return false;
  }

  connectionState.status = 'connecting';

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 4000 // Fast fail for local testing if no server
    });

    connectionState = {
      status: 'connected',
      error: null,
      host: conn.connection.host,
      name: conn.connection.name
    };
    console.log(`[MongoDB] Connected successfully to host: ${conn.connection.host}, database: ${conn.connection.name}`);
    return true;
  } catch (err) {
    connectionState = {
      status: 'disconnected',
      error: err.message || 'Failed to connect to MongoDB',
      host: null,
      name: null
    };
    console.warn(`[MongoDB] Connection failed: ${err.message}`);
    return false;
  }
};

// Mongoose connection event listeners
mongoose.connection.on('error', (err) => {
  connectionState.status = 'disconnected';
  connectionState.error = err.message || 'MongoDB connection error';
  console.warn(`[MongoDB] Connection error event: ${err.message}`);
});

mongoose.connection.on('disconnected', () => {
  if (connectionState.status === 'connected') {
    connectionState.status = 'disconnected';
    console.log('[MongoDB] Connection lost');
  }
});

mongoose.connection.on('reconnected', () => {
  connectionState.status = 'connected';
  connectionState.error = null;
  console.log('[MongoDB] Reconnected');
});

export const getDbStatus = () => {
  // Map mongoose.connection.readyState to human-readable status
  // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  const currentMongooseState = states[mongoose.connection.readyState] || 'disconnected';

  return {
    status: currentMongooseState,
    error: connectionState.error,
    database: currentMongooseState === 'connected' ? connectionState.name : undefined
  };
};
