import { describe, expect, it, vi } from 'vitest';
import { Resolver, tryParseResolvers } from '../src/lib/resolver';
import { NetworkId, NetworkType } from '../src/lib/consensus/network';

const MAIN_NET = new NetworkId(NetworkType.Mainnet);
describe('Resolver', () => {
  const mockToml = `
    [[group]]
    enable = true
    template = "https://*.example.org"
    nodes = ["alpha", "beta"]

    [[resolver]]
    enable = true
    address = "http://127.0.0.1:8888"
  `;

  it('should parse resolvers from TOML', () => {
    const urls = tryParseResolvers(mockToml);
    expect(urls).toEqual(['http://127.0.0.1:8888', 'https://alpha.example.org', 'https://beta.example.org']);
  });

  it('should return null for public URLs', () => {
    const resolver = new Resolver();
    expect(resolver.getUrls()).toBeNull();
  });

  it('should return URLs for custom configuration', () => {
    const customUrls = ['http://custom-url.com'];
    const resolver = new Resolver(customUrls, true);
    expect(resolver.getUrls()).toEqual(customUrls);
  });

  it('should return the correct TLS flag', () => {
    const resolver = new Resolver(null, true);
    expect(resolver.getTls()).toBe(true);
  });

  it('should make the correct URL', () => {
    const resolver = new Resolver(['http://example.com'], true);
    const url = resolver['makeUrl']('http://example.com', new NetworkId(NetworkType.Mainnet));
    expect(url).toBe('http://example.com/v2/kaspa/mainnet/tls/wrpc/json');
  });

  it('should fetch node info successfully', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({ uid: '123', url: 'http://node-url.com' }))
      })
    ) as unknown as typeof fetch;

    const resolver = new Resolver(['http://example.com'], true);
    const nodeInfo = await resolver['fetchNodeInfo']('http://example.com', MAIN_NET);
    expect(nodeInfo).toEqual({ uid: '123', url: 'http://node-url.com' });
  });

  it('should throw an error if fetch fails', async () => {
    global.fetch = vi.fn(() => Promise.reject('Network error')) as unknown as typeof fetch;

    const resolver = new Resolver(['http://example.com'], true);
    await expect(resolver['fetchNodeInfo']('http://example.com', MAIN_NET)).rejects.toThrow(
      'Failed to connect http://example.com/v2/kaspa/mainnet/tls/wrpc/json: Network error'
    );
  });

  it('should fetch node successfully from multiple URLs', async () => {
    global.fetch = vi.fn((url) => {
      if (url.includes('example1')) {
        return Promise.reject('Network error');
      }
      return Promise.resolve({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({ uid: '123', url: 'http://node-url.com' }))
      });
    }) as unknown as typeof fetch;

    const resolver = new Resolver(['http://example1.com', 'http://example2.com'], true);
    const nodeInfo = await resolver['fetch'](MAIN_NET);
    expect(nodeInfo).toEqual({ uid: '123', url: 'http://node-url.com' });
  });

  it('should throw an error if all fetch attempts fail', async () => {
    global.fetch = vi.fn(() => Promise.reject('Network error')) as unknown as typeof fetch;

    const resolver = new Resolver(['http://example1.com', 'http://example2.com'], true);
    await expect(resolver['fetch'](MAIN_NET)).rejects.toThrowError(/Network error,Error: Failed to connect/);
  });

  it('real', async () => {
    const resolver = new Resolver(null, true);
    const url = await resolver.getUrl(MAIN_NET);
    expect(url).length.greaterThan(0);
  },1000000);
});
