const express = require('express');
const Redis = require('ioredis');
const router = express.Router();
const redis = new Redis();

router.post('/', (req, res) => {
    const { MsgType, OperationType, ClientId, TenantId, OMSId } = req.body;

    if (!OperationType || !MsgType) {
        return res.status(400).json({ error: 'Both OperationType and MsgType are required' });
    }

    if (MsgType !== 1121) {
        return res.status(400).json({ error: 'Message type is not valid for client info' });
    }

    const fieldValues = Object.entries(req.body).flat();

    if (OperationType === 100 || OperationType === 101) {
        if (!ClientId || !TenantId || !OMSId) {
            return res.status(400).json({ error: 'ClientId, TenantId, and OMSId are required' });
        }

        const key = `${TenantId}_${OMSId}:${ClientId}`;

        redis.exists(key, (err, exists) => {
            if (err) {
                console.error('Redis error:', err);
                return res.status(500).json({ error: 'Internal Server Error' });
            }

            if (exists) {
                return res.status(400).json({ error: 'Client id already exists' });
            } else {
                redis.hmset(key, fieldValues, (err, result) => {
                    if (err) {
                        console.error('Redis error:', err);
                        return res.status(500).json({ error: 'Internal Server Error' });
                    }
                    res.status(201).json({ message: 'Client added successfully', result });
                });
            }
        });
    } else if (OperationType === 102 || OperationType === 103) {
        if (!ClientId) {
            return res.status(400).json({ error: 'ClientId is required' });
        }

        const key = `${TenantId}_${OMSId}:${ClientId}`;

        if (OperationType === 102) {
            redis.del(key, (err, result) => {
                if (err) {
                    console.error('Redis error:', err);
                    return res.status(500).json({ error: 'Internal server error' });
                }
                if (result === 0) {
                    return res.status(404).json({ error: 'Client data not found' });
                }
                res.status(200).json({ message: 'Client deleted successfully', result });
            });
        } else {
            redis.hgetall(key, (err, clientData) => {
                if (err) {
                    console.error('Redis error:', err);
                    return res.status(500).json({ error: 'Internal server error' });
                }
                if (!clientData) {
                    return res.status(404).json({ error: 'Client data not found' });
                }
                res.json(clientData);
            });
        }
    } else if (OperationType === 104) {
        redis.keys(`${TenantId}_${OMSId}:*`, (err, keys) => {
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
    }
});

module.exports = router;
