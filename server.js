const express = require('express');
const app = express();
const path = require('path');
const router = require('./routes'); // importer routes
const cookieParser = require('cookie-parser');

app.use(express.static(path.join(__dirname, 'client'))); // Gør hele client-mappen "public"
app.use(express.json());
app.use(cookieParser());

// Brug router
app.use(router);


app.listen(3000, () => {
    console.log("Server listening on port 3000");
  });