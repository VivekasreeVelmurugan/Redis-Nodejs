const express = require('express');
const bodyParser = require('body-parser');
const clientInfoApi = require('./clientInfoApi');
const orderInfoApi=require('./orderInfoApi');
const app = express();
app.use(bodyParser.json());
app.use('/api/client', clientInfoApi);
app.use('/api/order', orderInfoApi);
const PORT =2806;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
