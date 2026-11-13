export async function onRequest(context) {
  const url = new URL(context.request.url)
  if (url.pathname === '/api' || url.pathname.startsWith('/api/')) return context.next()

  const response = await context.next()
  if (response.status !== 404 || context.request.method !== 'GET' || !context.env.ASSETS) {
    return response
  }
  return context.env.ASSETS.fetch(new URL('/index.html', url))
}
