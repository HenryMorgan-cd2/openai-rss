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

  const articles = await fetchUpdates()
  return new Response(new TextEncoder().encode(JSON.stringify(articles)))
})
type Update = {
  title: string
  date: string
  description: string
  actions: string[]
}

async function fetchUpdates() {
  const url = 'https://help.openai.com/en/articles/6825453-chatgpt-release-notes'
  const response = await fetch(url)
  const html = await response.text()

  const document = new DOMParser().parseFromString(html, 'text/html')
  if (document === null) {
    throw new Error('Failed to parse HTML')
  }

  const updates: Update[] = []

  console.log('getting nodes')
  const nodes = Array.from(document.querySelector('article').childNodes).flatMap((node) => node.childNodes)
  console.log(`got ${nodes.length} nodes`)

  let update: Partial<Update> = {}

  while (nodes.length) {
    const node = nodes.shift()

    // if the node is a h2, then we have a new update
    if (node?.nodeName === 'H2') {
      if (update.title) {
        updates.push(update as Update)
      }
      update = {}
      update.title = node.textContent?.trim() ?? ''
      continue
    }
  }

  updates.push(update as Update)

  return updates
}

function jsonToRss(
  data: { updates: Update[] },
  title = 'ChatGPT Updates',
  link = 'https://example.com',
  description = 'Latest ChatGPT Updates',
): string {
  let rss = '<?xml version="1.0" encoding="UTF-8" ?>'
  rss += '<rss version="2.0">'
  rss += '<channel>'
  rss += `<title>${title}</title>`
  rss += `<link>${link}</link>`
  rss += `<description>${description}</description>`

  for (const update of data.updates) {
    rss += '<item>'
    rss += `<title>${update.title}</title>`
    rss += `<link>${link}</link>` // Modify if different links are required for each update
    rss += `<description>${update.description} Actions: ${update.actions.join(', ')}</description>`
    rss += `<pubDate>${update.date}</pubDate>`
    rss += '</item>'
  }

  rss += '</channel>'
  rss += '</rss>'

  return rss
}
