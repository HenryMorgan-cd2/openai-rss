import { DOMParser } from 'https://deno.land/x/deno_dom@v0.1.35-alpha/deno-dom-wasm.ts'

console.log('Hello world!')

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response(new TextEncoder().encode(''), {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    })
  }

  if (request.method !== 'GET' && request.method !== 'HEAD' && request.method !== 'OPTIONS') {
    return new Response(new TextEncoder().encode('Method not allowed\n'), {
      status: 405,
    })
  }

  const updates = await fetchUpdates()
  const rss = jsonToRss({ updates })
  return new Response(new TextEncoder().encode(rss))
})
type Update = {
  title: string
  date: string
  body: string
}

const UPDATE_URL = 'https://help.openai.com/en/articles/6825453-chatgpt-release-notes'

async function fetchUpdates() {
  const response = await fetch(UPDATE_URL)
  const html = await response.text()

  const document = new DOMParser().parseFromString(html, 'text/html')
  if (document === null) {
    throw new Error('Failed to parse HTML')
  }

  const updates: Update[] = []

  console.log('getting nodes')
  const nodes = Array.from(document.querySelector('article')!.childNodes).flatMap((node) => node.firstChild)
  console.log(`got ${nodes.length} nodes`)

  let update: Partial<Update> = {}

  while (nodes.length) {
    const node = nodes.shift()

    // if the node is a h2, then we have a new update
    if (node?.nodeName === 'H2') {
      if (update.title && update.date && update.body) {
        updates.push(update as Update)
      }
      update = {}
      update.title = node.textContent?.trim() ?? ''

      // the title always ends in (MMM D, YYYY)
      const date = update.title.match(/\((.*)\)/)?.[1]
      if (date) {
        update.date = new Date(date).toISOString()
        update.title = update.title.replace(/\((.*)\)/, '').trim()
      }

      continue
    }
  }

  updates.push(update as Update)

  return updates
}

function jsonToRss({
  updates,
  title = 'ChatGPT Updates',
  link = 'https://example.com',
  description = 'Latest ChatGPT Updates',
}: {
  updates: Update[]
  title?: string
  link?: string
  description?: string
}): string {
  let rss = '<?xml version="1.0" encoding="UTF-8" ?>'
  rss += '<rss version="2.0">'
  rss += '<channel>'
  rss += `<title>${title}</title>`
  rss += `<link>${link}</link>`
  rss += `<description>${description}</description>`

  for (const update of updates) {
    rss += '<item>'
    rss += `<title>${update.title}</title>`
    rss += `<link>${link}</link>` // Modify if different links are required for each update
    rss += `<description>${update.body}}</description>`
    rss += `<pubDate>${update.date}</pubDate>`
    rss += '</item>'
  }

  rss += '</channel>'
  rss += '</rss>'

  return rss
}
