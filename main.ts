import { DOMParser, Element } from 'https://deno.land/x/deno_dom@v0.1.35-alpha/deno-dom-wasm.ts'

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
  return new Response(new TextEncoder().encode(rss), {
    headers: {
      'Content-Type': 'application/rss+xml',
    },
  })
})
type Update = {
  title: string
  date: Date
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
        update.date = new Date(date)
        update.title = update.title.replace(/\((.*)\)/, '').trim()
      }

      update.body ??= ''

      update.body += node.nodeType === node.ELEMENT_NODE ? (node as Element).innerHTML : node.textContent

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
  rss += '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">'
  rss += '<channel>'
  rss += `<title>${title}</title>`
  rss += `<link>${link}</link>`
  rss += `<description>${description}</description>`
  rss += `<atom:link href="${link}" rel="self" type="application/rss+xml" />`

  for (const update of updates) {
    rss += '<item>'
    rss += `<guid>${link}#${update.date.toISOString().toLowerCase().replace(/[\W ]/g, '-')}</guid>`
    rss += `<title>${update.title}</title>`
    rss += `<link>${link}</link>` // Modify if different links are required for each update
    rss += `<description><![CDATA[${update.body}}]]></description>`
    rss += `<pubDate>${toRFC822(update.date)}</pubDate>`
    rss += '</item>'
  }

  rss += '</channel>'
  rss += '</rss>'

  return rss
}

function toRFC822(date: Date): string {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  debugger
  const day = days[date.getUTCDay()]
  const month = months[date.getUTCMonth()]

  // Note: We're using a template string to make the format more readable.
  return `${day}, ${String(date.getUTCDate()).padStart(2, '0')} ${month} ${date.getUTCFullYear()} ${String(
    date.getUTCHours(),
  ).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}:${String(date.getUTCSeconds()).padStart(
    2,
    '0',
  )} GMT`
}
