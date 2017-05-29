'use strict'

const http = require('http')
const express = require('express')
let app = express()

function gyuuu(bootstrap) {
  let s = []
  for (let i = Math.floor(Math.random()*bootstrap) + 1; i > 0; i--)
    s.push("gyu" + "u".repeat(Math.floor(Math.random()*5)))
  let merged = s.join(" ")
  let ender = ".?!".charAt(Math.floor(Math.random()*3))
  return "G" + merged.slice(1) + ender
}

app.get('/', function(req, res) {
  res.send('<h1>'+gyuuu(5)+'</h1>')
})

function predictBootstrap(message) {
  // basically counts gyuus in source message
  return (message.match(/gyu/ig) || []).length
}

// LINE init
const line = require('@line/bot-sdk')
const lineConfig = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
}
const lineClient = new line.Client(lineConfig)

app.post('/line-webhook', line.middleware(lineConfig), (req, res) => {
  Promise.all(req.body.events.map(handleLine)).then((result) => res.json(result))
})

function handleLine(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null)
  }
  return lineClient.replyMessage(event.replyToken, {type: 'text', text: gyuuu(5)})
}

// Facebook Messenger init
const crypto = require('crypto')
const bodyParser = require('body-parser')
const https = require('https')
const request = require('request')

const FB_APP_SECRET = process.env.MESSENGER_APP_SECRET,
      FB_VALID_TOKEN = process.env.MESSENGER_VALIDATION_TOKEN,
      FB_PAGE_TOKEN = process.env.MESSENGER_PAGE_TOKEN

function fbVerify(req, res, buf) {
  let signature = req.headers['x-hub-signature']
  if (signature) {
    let elements = signature.split('=')
    let method = elements[0]
    let signatureHash = elements[1]
    let expectedHash = crypto.createHmac('sha1', FB_APP_SECRET).update(buf).digest('hex')
    if (signatureHash == expectedHash) {
      return
    }
  }
  throw new Error('Could not validate the request signature.')
}

app.get('/fb-webhook', function(req, res) {
  if (req.query['hub-mode'] == 'subscribe' && req.query['hub.verify_token'] == FB_VALID_TOKEN) res.status(200).send(req.query['hub.challenge'])
  else res.sendStatus(403)
})

app.post('/fb-webhook', bodyParser.json({verify: fbVerify}), function(req, res) {
  let data = req.body
  if (data.object == 'page')
    data.entry.forEach(function(pageEntry) {
      let pageID = pageEntry.id
      let timeOfEvent = pageEntry.time
      pageEntry.messaging.forEach(function(messagingEvent) {
        if (messagingEvent.message) {
          request({
            uri: 'https://graph.facebook.com/v2.6/me/messages',
            qs: {access_token: FB_PAGE_TOKEN},
            method: 'POST',
            json: {recipient: {id: messagingEvent.sender.id}, message: {text: gyuuu(5), metadata: "GYUUU"}}
          }, function(error, response, body) {
            if (error || response.statusCode != 200)
              console.error(response.statusCode, response.statusMessage, body.error)
          })
        }
      })
    })
  res.sendStatus(200)
})

// Discord init
const Discord = require('discord.js')
let discord = new Discord.Client()
discord.on('message', msg => {
  if (msg.author.bot) return
  if (msg.content.toLowerCase().includes('gyu')) {
    msg.channel.sendMessage(gyuuu(predictBootstrap(msg.content)))
    return
  }
  if (msg.isMentioned(discord.user)) {
    msg.reply(gyuuu(5))
    return
  }
})


app.listen(parseInt(process.env.LISTEN_PORT), function() {
  console.log("up")
})

discord.login(process.env.DISCORD_BOT_TOKEN)
