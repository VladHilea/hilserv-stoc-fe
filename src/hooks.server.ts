import type { Handle } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

export const handle: Handle = async ({ event, resolve }) => {
  // Check if this is an API request that needs to be proxied
  if (event.url.pathname.startsWith('/api/v1') || event.url.pathname.startsWith('/uploads')) {
    const path = event.url.pathname + event.url.search;
    
    // Read backend URLs from environment, falling back to localhost defaults
    const NEST_BACKEND = env.NEST_BACKEND_URL || 'http://localhost:3001';
    const FASTAPI_BACKEND = env.FASTAPI_BACKEND_URL || 'http://localhost:8000';
    
    // Determine which backend should handle this route
    const isFastApiRoute = [
      '/api/v1/search',
      '/api/v1/brands',
      '/api/v1/filters',
      '/api/v1/models',
      '/api/v1/tires',
      '/uploads'
    ].some(route => event.url.pathname.startsWith(route));
    
    const targetBase = isFastApiRoute ? FASTAPI_BACKEND : NEST_BACKEND;
    const targetUrl = `${targetBase}${path}`;
    
    // Prepare headers for forwarding
    const requestHeaders = new Headers(event.request.headers);
    // Remove Host header to avoid routing mismatches on target servers
    requestHeaders.delete('host');
    
    try {
      const options: RequestInit = {
        method: event.request.method,
        headers: requestHeaders,
      };
      
      // Attach request body if method supports it
      if (event.request.method !== 'GET' && event.request.method !== 'HEAD') {
        options.body = await event.request.blob();
        // SvelteKit node fetch requires 'duplex: half' when sending stream/blob bodies
        (options as any).duplex = 'half';
      }
      
      const res = await fetch(targetUrl, options);
      
      // Forward the response back to SvelteKit / browser
      return res;
    } catch (err) {
      console.error(`[Proxy Gateway Error] Failed to fetch ${targetUrl}:`, err);
      return new Response(JSON.stringify({ 
        message: 'WMS Gateway Error connecting to internal api services.', 
        error: String(err) 
      }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  // Standard SvelteKit page resolution
  return resolve(event);
};
