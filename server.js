require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { Schema } = mongoose;
const app = express();
const { nanoid } = require('nanoid')
const dns = require('dns');

// Basic Configuration
app.use(cors());
app.use('/public', express.static(`${process.cwd()}/public`));
app.use(express.urlencoded({extended: true}));
app.use(express.json());
app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});
//Connect to mongodb
mongoose.connect(process.env.DB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
//Create instance of database
const db = mongoose.connection;
//Create instance of URL Collection
let collection = db.collection('urls');
//Warn if connected or not
db.on('error', console.error.bind(console, 'Connection Error:'));
db.once('open', () => console.log('Connected!'));
//Create schema for urls
const URLSchema = new Schema({
  'shortURL': String,
  url: String
});

//Short link to full link
app.get('/api/shorturl/:shorturl', (req, res) => {
  const { shorturl } = req.params;
  
  collection.findOne(
    {"shortURL": shorturl},
    (err, doc) => {
      if(doc !== null) {
        res.redirect(doc.url)
      } else {
        res.json({'error': 'ShortURL cannot be found'})
      }
    }
  )
})

app.post('/api/shorturl/', (req,res) => {
  const link = req.body.url;
  collection.findOne(
    {"url": link},
    (err, doc) => {
      if(doc !== null) {
        res.json({ 'original_url': doc.url, 'short_url': doc.shortURL })
      } else {
        const prefixRegex =  /^https*:\/\//
        if(prefixRegex.test(link)) {
          const noPrefix = link.replace(prefixRegex, '');
          dns.lookup(noPrefix, (err) => {
            if(err) {
              return res.json({'error': 'invalid url', 'test': 'test'})
            } else {
              const shortened = nanoid(5);
              const record  = mongoose.model('URL', URLSchema);
              let url = new record({ 'shortURL': shortened, 'url': link });
              url.save((err, data) => {
                if(err) return console.error(err);
                return data
              });
              res.json({ 'original_url': link, 'short_url': shortened })
            } 
          })
        } else {
          console.log('failed first if')
          return res.json({'error': 'invalid url'})
        }
      }
    }
  )
})





app.listen(process.env.PORT, function() {
  console.log(`Listening on port ${process.env.PORT}`);
});