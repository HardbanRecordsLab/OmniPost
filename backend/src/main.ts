import fastify from 'fastify';
import fastifyCors from 'fastify-cors';
import jwt from 'fastify-jwt';
import mongoose from 'mongoose';

// Create fastify instance
const app = fastify({ logger: true });

// Connect to MongoDB Database
mongoose.connect('mongodb://localhost:27017/yourdbname', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => app.log.info('Database connected'))
  .catch(err => app.log.error(err));

// Register CORS
app.register(fastifyCors);

// Register JWT
app.register(jwt, { secret: 'supersecret' });

// Health check endpoint
app.get('/health', async (request, reply) => {
  return { status: 'ok' };
});

// Start server
const start = async () => {
  try {
    await app.listen(3000);
    app.log.info(`Server listening on http://localhost:3000`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();