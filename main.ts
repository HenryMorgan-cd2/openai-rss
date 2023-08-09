console.log('Hello world!')

Deno.serve((request) => {
  return new Response(new TextEncoder().encode('Hello World\n'))
})
