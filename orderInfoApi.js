const express = require('express');
const Redis = require('ioredis');
const router = express.Router();
const redis = new Redis();

router.post('/', (req, res) => {
    const { MsgType, OperationType, ClientId, Token, TenantId, OrderId, OMSId } = req.body;
    const key = `${TenantId}_${OMSId}_${ClientId}_${Token}:${OrderId}`;

    if (!OperationType || !MsgType || !ClientId) {
        return res.status(400).json({ error: 'OperationType, ClientId, and MsgType are required' });
    }

    if (MsgType !== 1120) {
        return res.status(400).json({ error: 'Message type is not valid for order info' });
    }

    const body = req.body;
    const fieldValues = Object.entries(body).flat();

    if (OperationType === 100) {
        if (!OrderId || !TenantId || !OMSId || !ClientId) {
            return res.status(400).json({ error: 'OrderId, TenantId, OMSId, and ClientId are required' });
        }

        redis.exists(`${TenantId}_${OMSId}:${ClientId}`, (err, exists) => {
            if (err) {
                console.error('Redis error:', err);
                return res.status(500).json({ error: 'Internal server error' });
            }

            if (!exists) {
                return res.status(400).json({ error: 'User not found to place order' });
            }

            redis.hmset(key, fieldValues, (err, result) => {
                if (err) {
                    console.error('Redis error:', err);
                    return res.status(500).json({ error: 'Internal server error' });
                }
                res.status(201).json({ message: 'Order added successfully', result });
            });
        });
    } else if (OperationType === 101 || OperationType === 102) {
        if (!OrderId) {
            return res.status(400).json({ error: 'OrderId is required' });
        }

        if (OperationType === 101) {
            redis.hmset(key, fieldValues, (err, result) => {
                if (err) {
                    console.error('Redis error:', err);
                    return res.status(500).json({ error: 'Internal server error' });
                }
                res.status(201).json({ message: 'Order edited successfully', result });
            });
        } else {
            redis.del(key, (err, result) => {
                if (err) {
                    console.error('Redis error:', err);
                    return res.status(500).json({ error: 'Internal server error' });
                }
                if (result === 0) {
                    return res.status(404).json({ error: 'Order data not found' });
                }
                res.status(200).json({ message: 'Order deleted successfully', result });
            });
        }
    } else if (OperationType === 103) {
        if (!OrderId) {
            return res.status(400).json({ error: 'OrderId is required' });
        }

        redis.hgetall(key, (err, orderData) => {
            if (err) {
                console.error('Redis error:', err);
                return res.status(500).json({ error: 'Internal server error' });
            }
            if (!orderData) {
                return res.status(404).json({ error: 'Order data not found' });
            }
            res.json(orderData);
        });
    } else if (OperationType === 104) {
        redis.keys(`${TenantId}_${OMSId}_*:*`, (err, keys) => {
            if (err) {
                console.error('Redis error:', err);
                return res.status(500).json({ error: 'Internal server error' });
            }
            if (!keys || keys.length === 0) {
                return res.status(404).json({ error: 'No records found' });
            }

            const getAllDataPromises = keys.map(key => {
                return new Promise((resolve, reject) => {
                    redis.hgetall(key, (err, data) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(data);
                        }
                    });
                });
            });

            Promise.all(getAllDataPromises)
                .then(results => {
                    res.json(results);
                })
                .catch(err => {
                    console.error('Redis error:', err);
                    res.status(500).json({ error: 'Internal server error' });
                });
        });
    } else {
        return res.status(400).json({ error: 'Invalid OperationType' });
    }
});

module.exports = router;
