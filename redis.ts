import * as redis from 'redis';

const redisClient = redis.createClient();
redisClient.connect();

export default redisClient;