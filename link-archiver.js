const { WebClient } = require('@slack/client')
const { createEventAdapter } = require('@slack/events-api')
const linkify = require('linkifyjs')
const getUrls = require('get-urls')
const Url = require('url-parse')
const archive = require('archive.is')

const slackEvents = createEventAdapter(process.env.SIGNINGSECRET)
const web = new WebClient(process.env.OAUTHTOKEN)

const port = process.env.PORT || 3000

let currentUser
async function getUser() {
  if (!currentUser) {
    currentUser = await web.auth.test()
  }

  return currentUser
}

async function postMessage(channel, thread_ts, message) {
  try {
    await web.chat.postMessage({
      channel,
      thread_ts,
      text: message,
    })

    console.log('Message posted!')
  }
  catch (e) {
    console.error(e)
  }
}

slackEvents.on('message', async (event) => {
  let links = getUrls(event.text, { stripWWW: false, removeTrailingSlash: false, sortQueryParameters: false, removeQueryParameters: false })

  if (links.size < 1 || links.size > 1) {
    return
  }

  if (await getUser().user_id == event.user) {
    return
  }

  let link = Array.from(links)[0]
  let archiveResult = await archive.save(link)

  let responseText = `Hi! I've archived this link at ${archiveResult.shortUrl}.`

  postMessage(event.channel, event.ts, responseText)
})

slackEvents.on('error', console.error)

slackEvents.start(port).then(() => {
  console.log(`server listening on port ${port}`)
})